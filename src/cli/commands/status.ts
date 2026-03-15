import * as Effect from "effect/Effect";
import * as Console from "effect/Console";
import * as Option from "effect/Option";
import { Command } from "effect/unstable/cli";
import { ConfigService } from "../../domain/config/config-service";
import { RepoService } from "../../domain/repo/repo-service";
import { RegistryService } from "../../domain/registry/registry-service";
import { ShelffileService } from "../../domain/shelffile/shelffile-service";
import type { RepoEntry } from "../../domain/config/config-schema";
import { dirSize } from "../../domain/repo/repo-utils";

export const statusCommand = Command.make("status", {}, () =>
	Effect.gen(function* () {
		const repo = yield* RepoService;
		const configService = yield* ConfigService;
		const registry = yield* RegistryService;
		const shelffileService = yield* ShelffileService;
		const repos = yield* repo.list();
		if (repos.length === 0) {
			yield* Console.log("No repos configured. Use `shelf add <url>` to add one.");
			return;
		}
		const reg = yield* registry.load();
		// Build a map of alias → referencing projects
		const refMap = new Map<string, string[]>();
		for (const projectDir of reg.projects) {
			const sf = yield* shelffileService
				.read(projectDir)
				.pipe(Effect.catch(() => Effect.succeed(null)));
			if (sf === null) continue;
			for (const entry of sf.entries) {
				const list = refMap.get(entry.alias) ?? [];
				list.push(projectDir);
				refMap.set(entry.alias, list);
			}
		}
		const manualSet = new Set(reg.manual);
		for (const r of repos as ReadonlyArray<RepoEntry>) {
			const pinStr = Option.match(r.pin, {
				onNone: () => "(default branch)",
				onSome: (p) => `${p.type}:${p.value}`,
			});
			const syncStr = Option.match(r.lastSyncedAt, {
				onNone: () => "never",
				onSome: (s: string) => s,
			});
			const repoDir = configService.repoPath(r.alias);
			const size = yield* dirSize(repoDir).pipe(Effect.catch(() => Effect.succeed(0)));
			const sizeMb = (size / (1024 * 1024)).toFixed(1);
			yield* Console.log(`  ${r.alias} — ${r.url}`);
			yield* Console.log(`    Pin: ${pinStr}  |  Synced: ${syncStr}  |  Size: ${sizeMb} MB`);
			const refs: string[] = [];
			if (manualSet.has(r.alias)) refs.push("manual");
			const projects = refMap.get(r.alias);
			if (projects) refs.push(...projects);
			yield* refs.length > 0
				? Console.log(`    Referenced by: ${refs.join(", ")}`)
				: Console.log(`    ⚠ Unreferenced (candidate for \`shelf prune\`)`);
		}
	}),
).pipe(Command.withDescription("Show detailed status of all repos"));
