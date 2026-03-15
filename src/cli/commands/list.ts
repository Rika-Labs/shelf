import * as Effect from "effect/Effect";
import * as Console from "effect/Console";
import * as Option from "effect/Option";
import { Command } from "effect/unstable/cli";
import { RepoService } from "../../domain/repo/repo-service";
import { ConfigService } from "../../domain/config/config-service";
import type { RepoEntry } from "../../domain/config/config-schema";

export const listCommand = Command.make("list", {}, () =>
	Effect.gen(function* () {
		const repo = yield* RepoService;
		const config = yield* ConfigService;
		const repos = yield* repo.list();
		if (repos.length === 0) {
			yield* Console.log("No repos configured. Use `shelf add <url>` to add one.");
			return;
		}
		for (const r of repos as ReadonlyArray<RepoEntry>) {
			const pinStr = Option.match(r.pin, {
				onNone: () => "(default branch)",
				onSome: (p) => `${p.type}:${p.value}`,
			});
			const syncStr = Option.match(r.lastSyncedAt, {
				onNone: () => "never",
				onSome: (s: string) => s,
			});
			yield* Console.log(`  ${r.alias} — ${r.url} [${pinStr}] (synced: ${syncStr})`);
			yield* Console.log(`    → ${config.repoPath(r.alias)}`);
		}
	}),
).pipe(Command.withDescription("List all configured repositories"));
