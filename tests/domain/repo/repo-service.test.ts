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
					);
				}).pipe(Effect.provide(layer)),
			);
			expect(Option.isSome(clonedPin)).toBe(true);
			if (Option.isSome(clonedPin)) {
				expect(clonedPin.value.value).toBe("develop");
			}
		});

		test("handles various URL formats", async () => {
			const layer = buildRepoLayer();
			const gitSshResult = await Effect.runPromise(
				Effect.gen(function* () {
					const repo = yield* RepoService;
					return yield* repo.add("git@github.com:user/my-lib.git", Option.none(), Option.none());
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
});
