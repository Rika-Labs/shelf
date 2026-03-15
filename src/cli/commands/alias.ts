import * as Effect from "effect/Effect";
import * as Console from "effect/Console";
import { Argument, Command } from "effect/unstable/cli";
import { ConfigService } from "../../domain/config/config-service";
import { RegistryService } from "../../domain/registry/registry-service";
import { RepoNotFoundError, RepoAlreadyExistsError } from "../../domain/repo/repo-errors";
import { RepoEntry, ShelfConfig } from "../../domain/config/config-schema";

const oldAlias = Argument.string("old");
const newAlias = Argument.string("new");

export const aliasCommand = Command.make("alias", { oldAlias, newAlias }, (config) =>
	Effect.gen(function* () {
		const configService = yield* ConfigService;
		const registry = yield* RegistryService;
		const cfg = yield* configService.load();
		const repo = cfg.repos.find((r: RepoEntry) => r.alias === config.oldAlias);
		if (!repo) {
			return yield* new RepoNotFoundError({ alias: config.oldAlias });
		}
		const conflict = cfg.repos.find((r: RepoEntry) => r.alias === config.newAlias);
		if (conflict) {
			return yield* new RepoAlreadyExistsError({ alias: config.newAlias });
		}
		// Rename directory on disk
		const oldPath = configService.repoPath(config.oldAlias);
		const newPath = configService.repoPath(config.newAlias);
		yield* Effect.tryPromise({
			try: async () => {
				const { rename } = await import("node:fs/promises");
				await rename(oldPath, newPath);
			},
			catch: () => undefined,
		}).pipe(Effect.ignore);
		// Update config
		const updatedRepos = cfg.repos.map((r: RepoEntry) =>
			r.alias === config.oldAlias ? new RepoEntry({ ...r, alias: config.newAlias }) : r,
		);
		yield* configService.save(new ShelfConfig({ ...cfg, repos: updatedRepos }));
		// Update registry manual list
		const reg = yield* registry.load();
		if (reg.manual.includes(config.oldAlias)) {
			yield* registry.removeManual(config.oldAlias);
			yield* registry.addManual(config.newAlias);
		}
		yield* Console.log(`Renamed "${config.oldAlias}" → "${config.newAlias}"`);
	}),
).pipe(Command.withDescription("Rename a repo alias"));
