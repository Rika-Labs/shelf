import { describe, test, expect } from "bun:test";
import * as Effect from "effect/Effect";
import * as Layer from "effect/Layer";
import * as Option from "effect/Option";
import { RepoEntry, ShelfConfig, RepoPin } from "../../../src/domain/config/config-schema";
import { RepoService } from "../../../src/domain/repo/repo-service";
import { createMockConfigLayer } from "../config/helpers";
import { createMockGitLayer } from "../git/helpers";
import { createMockSyncLayer } from "../sync/helpers";

const buildRepoLayer = (configOverrides = {}, gitOverrides = {}, syncOverrides = {}) => {
	const configLayer = createMockConfigLayer(configOverrides);
	const gitLayer = createMockGitLayer(gitOverrides);
	const syncLayer = createMockSyncLayer(syncOverrides);
	return RepoService.layer.pipe(
		Layer.provide(configLayer),
		Layer.provide(gitLayer),
		Layer.provide(syncLayer),
	);
};

describe("RepoService", () => {
	describe("add", () => {
		test("adds a repo and derives alias from URL", async () => {
			let savedConfig: typeof ShelfConfig.Type | undefined;
			const layer = buildRepoLayer({
				save: (config: typeof ShelfConfig.Type) => {
					savedConfig = config;
					return Effect.void;
				},
			});
			const result = await Effect.runPromise(
				Effect.gen(function* () {
					const repo = yield* RepoService;
					return yield* repo.add(
						"https://github.com/Effect-TS/effect.git",
						Option.none(),
						Option.none(),
						Option.none(),
						Option.none(),
					);
				}).pipe(Effect.provide(layer)),
			);
			expect(result).toBe("effect");
			expect(savedConfig?.repos.length).toBe(1);
		});

		test("uses provided alias", async () => {
			const layer = buildRepoLayer();
			const result = await Effect.runPromise(
				Effect.gen(function* () {
					const repo = yield* RepoService;
					return yield* repo.add(
						"https://github.com/Effect-TS/effect.git",
						Option.some("my-effect"),
						Option.none(),
						Option.none(),
						Option.none(),
					);
				}).pipe(Effect.provide(layer)),
			);
			expect(result).toBe("my-effect");
		});

		test("rejects duplicate alias", async () => {
			const existingRepo = new RepoEntry({
				url: "https://github.com/test/repo.git",
				alias: "effect",
				addedAt: "2026-01-01",
				pin: Option.none(),
				depth: Option.none(),
				sparse: Option.none(),
				lastSyncedAt: Option.none(),
			});
			const layer = buildRepoLayer({
				load: () =>
					Effect.succeed(
						new ShelfConfig({ version: 1, syncIntervalMinutes: 60, repos: [existingRepo] }),
					),
			});
			const exit = await Effect.runPromiseExit(
				Effect.gen(function* () {
					const repo = yield* RepoService;
					return yield* repo.add(
						"https://github.com/Effect-TS/effect.git",
						Option.none(),
						Option.none(),
						Option.none(),
						Option.none(),
					);
				}).pipe(Effect.provide(layer)),
			);
			expect(exit._tag).toBe("Failure");
		});

		test("applies pin on clone", async () => {
			let clonedPin: Option.Option<RepoPin> = Option.none();
			const layer = buildRepoLayer(
				{},
				{
					clone: (_url: string, _dir: string, pin: Option.Option<RepoPin>) => {
						clonedPin = pin;
						return Effect.void;
					},
				},
			);
			await Effect.runPromise(
				Effect.gen(function* () {
					const repo = yield* RepoService;
					yield* repo.add(
						"https://github.com/test/repo.git",
						Option.some("test"),
						Option.some(new RepoPin({ type: "branch", value: "develop" })),
						Option.none(),
						Option.none(),
					);
				}).pipe(Effect.provide(layer)),
			);
			expect(Option.isSome(clonedPin)).toBe(true);
			if (Option.isSome(clonedPin)) {
				expect(clonedPin.value.value).toBe("develop");
			}
		});

		test("forwards depth and sparse to git clone", async () => {
			let clonedDepth: Option.Option<number> = Option.none();
			let clonedSparse: Option.Option<ReadonlyArray<string>> = Option.none();
			const layer = buildRepoLayer(
				{},
				{
					clone: (
						_url: string,
						_dir: string,
						_pin: Option.Option<RepoPin>,
						d: Option.Option<number>,
						s: Option.Option<ReadonlyArray<string>>,
					) => {
						clonedDepth = d;
						clonedSparse = s;
						return Effect.void;
					},
				},
			);
			await Effect.runPromise(
				Effect.gen(function* () {
					const repo = yield* RepoService;
					yield* repo.add(
						"https://github.com/test/repo.git",
						Option.some("test"),
						Option.none(),
						Option.some(1),
						Option.some(["src", "packages/core"]),
					);
				}).pipe(Effect.provide(layer)),
			);
			expect(Option.isSome(clonedDepth)).toBe(true);
			if (Option.isSome(clonedDepth)) {
				expect(clonedDepth.value).toBe(1);
			}
			expect(Option.isSome(clonedSparse)).toBe(true);
			if (Option.isSome(clonedSparse)) {
				expect(clonedSparse.value).toEqual(["src", "packages/core"]);
			}
		});

		test("handles various URL formats", async () => {
			const layer = buildRepoLayer();
			const gitSshResult = await Effect.runPromise(
				Effect.gen(function* () {
					const repo = yield* RepoService;
					return yield* repo.add(
						"git@github.com:user/my-lib.git",
						Option.none(),
						Option.none(),
						Option.none(),
						Option.none(),
					);
				}).pipe(Effect.provide(layer)),
			);
			expect(gitSshResult).toBe("my-lib");
		});
	});

	describe("remove", () => {
		test("removes existing repo", async () => {
			const existingRepo = new RepoEntry({
				url: "https://github.com/test/repo.git",
				alias: "test-repo",
				addedAt: "2026-01-01",
				pin: Option.none(),
				depth: Option.none(),
				sparse: Option.none(),
				lastSyncedAt: Option.none(),
			});
			let savedConfig: typeof ShelfConfig.Type | undefined;
			const layer = buildRepoLayer({
				load: () =>
					Effect.succeed(
						new ShelfConfig({ version: 1, syncIntervalMinutes: 60, repos: [existingRepo] }),
					),
				save: (config: typeof ShelfConfig.Type) => {
					savedConfig = config;
					return Effect.void;
				},
			});
			const result = await Effect.runPromise(
				Effect.gen(function* () {
					const repo = yield* RepoService;
					return yield* repo.remove("test-repo");
				}).pipe(Effect.provide(layer)),
			);
			expect(result).toBe("test-repo");
			expect(savedConfig?.repos.length).toBe(0);
		});

		test("fails for unknown alias", async () => {
			const layer = buildRepoLayer();
			const exit = await Effect.runPromiseExit(
				Effect.gen(function* () {
					const repo = yield* RepoService;
					return yield* repo.remove("nonexistent");
				}).pipe(Effect.provide(layer)),
			);
			expect(exit._tag).toBe("Failure");
		});
	});

	describe("list", () => {
		test("returns empty list", async () => {
			const layer = buildRepoLayer();
			const result = await Effect.runPromise(
				Effect.gen(function* () {
					const repo = yield* RepoService;
					return yield* repo.list();
				}).pipe(Effect.provide(layer)),
			);
			expect(result).toEqual([]);
		});

		test("returns repos with status info", async () => {
			const existingRepo = new RepoEntry({
				url: "https://github.com/test/repo.git",
				alias: "test-repo",
				addedAt: "2026-01-01",
				pin: Option.some(new RepoPin({ type: "branch", value: "main" })),
				depth: Option.none(),
				sparse: Option.none(),
				lastSyncedAt: Option.some("2026-01-01T12:00:00Z"),
			});
			const layer = buildRepoLayer({
				load: () =>
					Effect.succeed(
						new ShelfConfig({ version: 1, syncIntervalMinutes: 60, repos: [existingRepo] }),
					),
			});
			const result = await Effect.runPromise(
				Effect.gen(function* () {
					const repo = yield* RepoService;
					return yield* repo.list();
				}).pipe(Effect.provide(layer)),
			);
			expect(result.length).toBe(1);
			expect(result[0]!.alias).toBe("test-repo");
		});
	});

	describe("update", () => {
		test("syncs single repo by alias", async () => {
			let syncedRepo: string | undefined;
			const existingRepo = new RepoEntry({
				url: "https://github.com/test/repo.git",
				alias: "test-repo",
				addedAt: "2026-01-01",
				pin: Option.none(),
				depth: Option.none(),
				sparse: Option.none(),
				lastSyncedAt: Option.none(),
			});
			const layer = buildRepoLayer(
				{
					load: () =>
						Effect.succeed(
							new ShelfConfig({ version: 1, syncIntervalMinutes: 60, repos: [existingRepo] }),
						),
				},
				{},
				{
					syncRepo: (repo: RepoEntry) => {
						syncedRepo = repo.alias;
						return Effect.void;
					},
				},
			);
			await Effect.runPromise(
				Effect.gen(function* () {
					const repo = yield* RepoService;
					yield* repo.update(Option.some("test-repo"));
				}).pipe(Effect.provide(layer)),
			);
			expect(syncedRepo).toBe("test-repo");
		});

		test("syncs all when no alias", async () => {
			let syncAllCalled = false;
			const layer = buildRepoLayer(
				{},
				{},
				{
					syncAll: () => {
						syncAllCalled = true;
						return Effect.void;
					},
				},
			);
			await Effect.runPromise(
				Effect.gen(function* () {
					const repo = yield* RepoService;
					yield* repo.update(Option.none());
				}).pipe(Effect.provide(layer)),
			);
			expect(syncAllCalled).toBe(true);
		});
	});

	describe("resolveAutoPin", () => {
		test("resolves matching tag from package.json", async () => {
			const lsRemoteOutput = [
				"abc123\trefs/tags/v4.0.0-beta.31",
				"def456\trefs/tags/v4.0.0-beta.31^{}",
			].join("\n");
			const layer = buildRepoLayer(
				{},
				{
					lsRemoteTags: () => Effect.succeed(lsRemoteOutput),
				},
			);
			const result = await Effect.runPromise(
				Effect.gen(function* () {
					const repo = yield* RepoService;
					return yield* repo.resolveAutoPin("https://github.com/Effect-TS/effect.git");
				}).pipe(Effect.provide(layer)),
			);
			expect(Option.isSome(result)).toBe(true);
			if (Option.isSome(result)) {
				expect(result.value.type).toBe("tag");
				expect(result.value.value).toBe("v4.0.0-beta.31");
			}
		});

		test("fails when package not in dependencies", async () => {
			const layer = buildRepoLayer(
				{},
				{
					lsRemoteTags: () => Effect.succeed(""),
				},
			);
			const exit = await Effect.runPromiseExit(
				Effect.gen(function* () {
					const repo = yield* RepoService;
					return yield* repo.resolveAutoPin("https://github.com/test/nonexistent-pkg.git");
				}).pipe(Effect.provide(layer)),
			);
			expect(exit._tag).toBe("Failure");
		});
	});
});
