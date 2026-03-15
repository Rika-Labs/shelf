import * as Effect from "effect/Effect";
import * as Console from "effect/Console";
import * as Option from "effect/Option";
import { Argument, Command } from "effect/unstable/cli";
import { ConfigService } from "../../domain/config/config-service";
import { SyncService } from "../../domain/sync/sync-service";
import { RepoNotFoundError } from "../../domain/repo/repo-errors";
import { RepoEntry, ShelfConfig } from "../../domain/config/config-schema";
import { parsePin } from "../../domain/repo/repo-utils";

const alias = Argument.string("alias");
const ref = Argument.string("ref");

export const pinCommand = Command.make("pin", { alias, ref }, (config) =>
	Effect.gen(function* () {
		const configService = yield* ConfigService;
		const sync = yield* SyncService;
		const cfg = yield* configService.load();
		const repo = cfg.repos.find((r: RepoEntry) => r.alias === config.alias);
		if (!repo) {
			return yield* new RepoNotFoundError({ alias: config.alias });
		}
		const newPin = parsePin(config.ref);
		const updatedRepo = new RepoEntry({ ...repo, pin: Option.some(newPin) });
		const updatedRepos = cfg.repos.map((r: RepoEntry) =>
			r.alias === config.alias ? updatedRepo : r,
		);
		yield* configService.save(new ShelfConfig({ ...cfg, repos: updatedRepos }));
		yield* sync.syncRepo(updatedRepo);
		yield* Console.log(`Pinned "${config.alias}" to ${newPin.type}:${newPin.value}`);
	}),
).pipe(Command.withDescription("Pin a repo to a specific branch, tag, or commit"));
