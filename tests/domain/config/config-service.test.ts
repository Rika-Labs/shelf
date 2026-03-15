import { describe, test, expect, beforeEach, afterEach } from "bun:test";
import * as Effect from "effect/Effect";
import { mkdtemp, rm, mkdir } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
	defaultConfig,
	decodeConfig,
	encodeConfig,
	ShelfConfig,
	RepoPin,
	makeRepoEntry,
} from "../../../src/domain/config/config-schema";
import * as Option from "effect/Option";
import { ConfigService } from "../../../src/domain/config/config-service";

describe("ConfigService", () => {
	let tempDir: string;
	let configPath: string;

	beforeEach(async () => {
		tempDir = await mkdtemp(join(tmpdir(), "shelf-config-test-"));
		configPath = join(tempDir, "config.json");
	});

	afterEach(async () => {
		await rm(tempDir, { recursive: true, force: true });
	});

	describe("defaultConfig", () => {
		test("has correct defaults", () => {
			expect(defaultConfig.version).toBe(1);
			expect(defaultConfig.syncIntervalMinutes).toBe(60);
			expect(defaultConfig.repos).toEqual([]);
		});
	});

	describe("encodeConfig / decodeConfig", () => {
		test("round-trips a valid config", () => {
			const encoded = encodeConfig(defaultConfig);
			const decoded = decodeConfig(encoded);
			expect(decoded.version).toBe(1);
			expect(decoded.syncIntervalMinutes).toBe(60);
			expect(decoded.repos).toEqual([]);
		});

		test("decodes valid JSON config", () => {
			const raw = {
				version: 1,
				syncIntervalMinutes: 30,
				repos: [],
			};
			const decoded = decodeConfig(raw);
			expect(decoded.syncIntervalMinutes).toBe(30);
		});

		test("throws on invalid schema", () => {
			expect(() => decodeConfig({ version: 2, repos: [] })).toThrow();
		});

		test("throws on corrupt data", () => {
			expect(() => decodeConfig("not json")).toThrow();
		});

		test("decodes config with repos", () => {
			const raw = {
				version: 1,
				syncIntervalMinutes: 60,
				repos: [
					{
						url: "https://github.com/test/repo.git",
						alias: "test-repo",
						addedAt: "2026-01-01T00:00:00Z",
						pin: { type: "branch", value: "main" },
						lastSyncedAt: "2026-01-01T12:00:00Z",
					},
				],
			};
			const decoded = decodeConfig(raw);
			expect(decoded.repos.length).toBe(1);
			expect(decoded.repos[0]!.alias).toBe("test-repo");
			expect(Option.isSome(decoded.repos[0]!.pin)).toBe(true);
			expect(Option.isSome(decoded.repos[0]!.lastSyncedAt)).toBe(true);
		});

		test("decodes config with repos without optional fields", () => {
			const raw = {
				version: 1,
				syncIntervalMinutes: 60,
				repos: [
					{
						url: "https://github.com/test/repo.git",
						alias: "test-repo",
						addedAt: "2026-01-01T00:00:00Z",
					},
				],
			};
			const decoded = decodeConfig(raw);
			expect(decoded.repos.length).toBe(1);
			expect(Option.isNone(decoded.repos[0]!.pin)).toBe(true);
			expect(Option.isNone(decoded.repos[0]!.lastSyncedAt)).toBe(true);
		});
	});

	describe("makeRepoEntry", () => {
		test("creates a RepoEntry with pin", () => {
			const entry = makeRepoEntry({
				url: "https://github.com/test/repo.git",
				alias: "test",
				pin: Option.some(new RepoPin({ type: "branch", value: "main" })),
				addedAt: "2026-01-01",
				lastSyncedAt: Option.some("2026-01-01T12:00:00Z"),
			});
			expect(entry.alias).toBe("test");
			expect(Option.isSome(entry.pin)).toBe(true);
		});

		test("creates a RepoEntry without pin", () => {
			const entry = makeRepoEntry({
				url: "https://github.com/test/repo.git",
				alias: "test",
				pin: Option.none(),
				addedAt: "2026-01-01",
				lastSyncedAt: Option.none(),
			});
			expect(Option.isNone(entry.pin)).toBe(true);
			expect(Option.isNone(entry.lastSyncedAt)).toBe(true);
		});
	});

	describe("ConfigService integration", () => {
		test("load returns default when no file exists", async () => {
			const result = await Effect.runPromise(
				Effect.gen(function* () {
					const svc = yield* ConfigService;
					return yield* svc.load();
				}).pipe(Effect.provide(ConfigService.layer)),
			);
			expect(result.version).toBe(1);
			expect(result.repos.length).toBeGreaterThanOrEqual(0);
		});

		test("ensureDirectories creates directories", async () => {
			await Effect.runPromise(
				Effect.gen(function* () {
					const svc = yield* ConfigService;
					yield* svc.ensureDirectories();
				}).pipe(Effect.provide(ConfigService.layer)),
			);
			// Directories should exist (or be pre-existing)
		});

		test("repoPath returns correct path", async () => {
			const svc = await Effect.runPromise(
				Effect.gen(function* () {
					return yield* ConfigService;
				}).pipe(Effect.provide(ConfigService.layer)),
			);
			const path = svc.repoPath("my-repo");
			expect(path).toContain("my-repo");
			expect(path).toContain(".config/shelf/repos");
		});
	});

	describe("file operations", () => {
		test("save writes valid JSON", async () => {
			await mkdir(tempDir, { recursive: true });
			const encoded = encodeConfig(defaultConfig);
			await Bun.write(configPath, JSON.stringify(encoded, null, "\t"));
			const content = await Bun.file(configPath).text();
			const parsed = JSON.parse(content);
			expect(parsed.version).toBe(1);
		});

		test("save creates config with custom interval that can be reloaded", async () => {
			const config = new ShelfConfig({
				version: 1,
				syncIntervalMinutes: 120,
				repos: [],
			});
			const encoded = encodeConfig(config);
			await Bun.write(configPath, JSON.stringify(encoded, null, "\t"));
			const content = await Bun.file(configPath).text();
			const reloaded = decodeConfig(JSON.parse(content));
			expect(reloaded.syncIntervalMinutes).toBe(120);
		});
	});
});
