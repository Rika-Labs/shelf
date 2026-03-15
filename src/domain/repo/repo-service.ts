import * as Effect from "effect/Effect";
import * as Layer from "effect/Layer";
import * as Option from "effect/Option";
import * as ServiceMap from "effect/ServiceMap";
import { join } from "node:path";
import { RepoEntry, RepoPin, ShelfConfig } from "../config/config-schema";
import { ConfigService } from "../config/config-service";
import { GitService } from "../git/git-service";
import { SyncService } from "../sync/sync-service";
import { AutoPinResolutionError, RepoAlreadyExistsError, RepoNotFoundError } from "./repo-errors";
import { deriveAlias } from "./repo-utils";
import { stripSemverRange, parseRemoteTags, findMatchingTag } from "./pin-utils";

export class RepoService extends ServiceMap.Service<RepoService>()(
	"shelf/domain/repo/RepoService",
	{
		make: Effect.gen(function* () {
			const config = yield* ConfigService;
			const git = yield* GitService;
			const sync = yield* SyncService;

			return {
				add: Effect.fn("RepoService.add")(function* (
					url: string,
					alias: Option.Option<string>,
					pin: Option.Option<RepoPin>,
					depth: Option.Option<number>,
					sparse: Option.Option<ReadonlyArray<string>>,
				) {
					yield* config.ensureDirectories();
					const resolvedAlias = Option.getOrElse(alias, () => deriveAlias(url));
					const cfg = yield* config.load();
					const existing = cfg.repos.find((r: RepoEntry) => r.alias === resolvedAlias);
					if (existing) {
						return yield* new RepoAlreadyExistsError({ alias: resolvedAlias });
					}
					const targetDir = config.repoPath(resolvedAlias);
					yield* git.clone(url, targetDir, pin, depth, sparse);
					const now = new Date().toISOString();
					const newRepo = new RepoEntry({
						url,
						alias: resolvedAlias,
						pin,
						depth,
						sparse,
						addedAt: now,
						lastSyncedAt: Option.some(now),
					});
					yield* config.save(new ShelfConfig({ ...cfg, repos: [...cfg.repos, newRepo] }));
					return resolvedAlias;
				}),

				remove: Effect.fn("RepoService.remove")(function* (aliasOrUrl: string) {
					const cfg = yield* config.load();
					const repo = cfg.repos.find(
						(r: RepoEntry) => r.alias === aliasOrUrl || r.url === aliasOrUrl,
					);
					if (!repo) {
						return yield* new RepoNotFoundError({ alias: aliasOrUrl });
					}
					const repoDir = config.repoPath(repo.alias);
					yield* Effect.tryPromise({
						try: async () => {
							const { rm } = await import("node:fs/promises");
							await rm(repoDir, { recursive: true, force: true });
						},
						catch: () => undefined,
					}).pipe(Effect.ignore);
					yield* config.save(
						new ShelfConfig({
							...cfg,
							repos: cfg.repos.filter((r: RepoEntry) => r.alias !== repo.alias),
						}),
					);
					return repo.alias;
				}),

				list: Effect.fn("RepoService.list")(function* () {
					const cfg = yield* config.load();
					return cfg.repos;
				}),

				resolveAutoPin: Effect.fn("RepoService.resolveAutoPin")(function* (url: string) {
					const packageName = deriveAlias(url);
					const pkgJson = yield* Effect.tryPromise({
						try: async () => {
							const file = Bun.file(join(process.cwd(), "package.json"));
							return (await file.json()) as Record<string, unknown>;
						},
						catch: () =>
							new AutoPinResolutionError({
								message: "No package.json found in current directory",
							}),
					});
					const deps = (pkgJson["dependencies"] ?? {}) as Record<string, string>;
					const devDeps = (pkgJson["devDependencies"] ?? {}) as Record<string, string>;
					const version = deps[packageName] ?? devDeps[packageName];
					if (!version) {
						return yield* new AutoPinResolutionError({
							message: `Package "${packageName}" not found in dependencies or devDependencies`,
						});
					}
					const stripped = stripSemverRange(version);
					const lsRemoteOutput = yield* git.lsRemoteTags(url);
					const remoteTags = parseRemoteTags(lsRemoteOutput);
					const matchedTag = findMatchingTag(packageName, stripped, remoteTags);
					if (!matchedTag) {
						return yield* new AutoPinResolutionError({
							message: `No matching tag found for ${packageName}@${stripped}`,
						});
					}
					return Option.some(new RepoPin({ type: "tag", value: matchedTag }));
				}),

				update: Effect.fn("RepoService.update")(function* (alias: Option.Option<string>) {
					if (Option.isSome(alias)) {
						const cfg = yield* config.load();
						const repo = cfg.repos.find((r: RepoEntry) => r.alias === alias.value);
						if (!repo) {
							return yield* new RepoNotFoundError({ alias: alias.value });
						}
						yield* sync.syncRepo(repo);
					} else {
						yield* sync.syncAll();
					}
				}),
			};
		}),
	},
) {
	static layer = Layer.effect(this, this.make);
}
