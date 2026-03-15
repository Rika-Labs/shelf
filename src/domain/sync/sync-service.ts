import * as Effect from "effect/Effect";
import * as Layer from "effect/Layer";
import * as Option from "effect/Option";
import * as ServiceMap from "effect/ServiceMap";
import { RepoEntry, ShelfConfig } from "../config/config-schema";
import { ConfigService } from "../config/config-service";
import { GitService } from "../git/git-service";
import { isStale } from "./sync-utils";

export class SyncService extends ServiceMap.Service<SyncService>()(
	"shelf/domain/sync/SyncService",
	{
		make: Effect.gen(function* () {
			const config = yield* ConfigService;
			const git = yield* GitService;

			const doSync = (repo: RepoEntry): Effect.Effect<void, unknown, never> =>
				Effect.gen(function* () {
					const repoDir = config.repoPath(repo.alias);
					yield* git.fetch(repoDir);
					if (Option.isSome(repo.pin)) {
						const ref =
							repo.pin.value.type === "branch"
								? `origin/${repo.pin.value.value}`
								: repo.pin.value.value;
						yield* git.checkout(repoDir, ref);
						if (repo.pin.value.type === "branch") {
							yield* git.pull(repoDir).pipe(Effect.ignore);
						}
					} else {
						const defaultBranch = yield* git.getDefaultBranch(repoDir);
						yield* git.checkout(repoDir, `origin/${defaultBranch}`);
					}
					const now = new Date().toISOString();
					const cfg = yield* config.load();
					const updatedRepos = cfg.repos.map((r: RepoEntry) =>
						r.alias === repo.alias ? new RepoEntry({ ...r, lastSyncedAt: Option.some(now) }) : r,
					);
					yield* config.save(new ShelfConfig({ ...cfg, repos: updatedRepos }));
				});

			return {
				syncRepo: Effect.fn("SyncService.syncRepo")(function* (repo: RepoEntry) {
					yield* doSync(repo);
				}),

				syncIfStale: Effect.fn("SyncService.syncIfStale")(function* (repo: RepoEntry) {
					const cfg = yield* config.load();
					if (!isStale(repo.lastSyncedAt, cfg.syncIntervalMinutes)) {
						return;
					}
					yield* Effect.logInfo("Syncing stale repo").pipe(
						Effect.annotateLogs({ alias: repo.alias }),
					);
					yield* doSync(repo).pipe(
						Effect.catch((error: unknown) =>
							Effect.logWarning("Sync failed, using stale content").pipe(
								Effect.annotateLogs({
									alias: repo.alias,
									error: String(error),
								}),
							),
						),
					);
				}),

				syncAll: Effect.fn("SyncService.syncAll")(function* () {
					const cfg = yield* config.load();
					for (const repo of cfg.repos) {
						yield* doSync(repo).pipe(
							Effect.catch((error: unknown) =>
								Effect.logWarning("Sync failed for repo").pipe(
									Effect.annotateLogs({
										alias: repo.alias,
										error: String(error),
									}),
								),
							),
						);
					}
				}),
			};
		}),
	},
) {
	static layer = Layer.effect(this, this.make);
}
