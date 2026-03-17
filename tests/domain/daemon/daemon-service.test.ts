import { describe, expect, test, beforeEach, afterEach } from "bun:test";
import * as Effect from "effect/Effect";
import * as Exit from "effect/Exit";
import * as Layer from "effect/Layer";
import * as Option from "effect/Option";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { DaemonService } from "../../../src/domain/daemon/daemon-service";
import { DaemonState, encodeDaemonState } from "../../../src/domain/daemon/daemon-schema";
import { ConfigService } from "../../../src/domain/config/config-service";

describe("DaemonService", () => {
	let tempDir: string;

	const createTestLayer = () => {
		const configLayer = Layer.succeed(
			ConfigService,
			ConfigService.of({
				load: () => Effect.succeed({ version: 1 as const, syncIntervalMinutes: 60, repos: [] }),
				save: () => Effect.void,
				ensureDirectories: () => Effect.void,
				repoPath: (alias: string) => join(tempDir, "repos", alias),
				configDir: tempDir,
				reposDir: join(tempDir, "repos"),
				configPath: join(tempDir, "config.json"),
			}),
		);
		return DaemonService.layer.pipe(Layer.provide(configLayer));
	};

	beforeEach(async () => {
		tempDir = await mkdtemp(join(tmpdir(), "shelf-daemon-test-"));
	});

	afterEach(async () => {
		await rm(tempDir, { recursive: true, force: true });
	});

	describe("status", () => {
		test("returns not running when no state file exists", async () => {
			const result = await Effect.runPromise(
				Effect.gen(function* () {
					const daemon = yield* DaemonService;
					return yield* daemon.status();
				}).pipe(Effect.provide(createTestLayer())),
			);
			expect(result.running).toBe(false);
		});

		test("returns not running when PID is dead (stale state)", async () => {
			const state = new DaemonState({
				pid: 999_999_999,
				token: "deadbeef".repeat(4),
				startedAt: new Date().toISOString(),
				lastTickAt: Option.none(),
				version: "0.1.1",
			});
			const encoded = encodeDaemonState(state);
			await writeFile(join(tempDir, "daemon.json"), JSON.stringify(encoded, null, "\t"));

			const result = await Effect.runPromise(
				Effect.gen(function* () {
					const daemon = yield* DaemonService;
					return yield* daemon.status();
				}).pipe(Effect.provide(createTestLayer())),
			);
			expect(result.running).toBe(false);
			// Should have cleaned up the stale state file
			const exists = await Bun.file(join(tempDir, "daemon.json")).exists();
			expect(exists).toBe(false);
		});

		test("returns running with details when PID is alive", async () => {
			// Use current process PID as a known-alive PID
			const state = new DaemonState({
				pid: process.pid,
				token: "testtoken1234567".repeat(2),
				startedAt: new Date(Date.now() - 60_000).toISOString(),
				lastTickAt: Option.some(new Date().toISOString()),
				version: "0.1.1",
			});
			const encoded = encodeDaemonState(state);
			await writeFile(join(tempDir, "daemon.json"), JSON.stringify(encoded, null, "\t"));

			const result = await Effect.runPromise(
				Effect.gen(function* () {
					const daemon = yield* DaemonService;
					return yield* daemon.status();
				}).pipe(Effect.provide(createTestLayer())),
			);
			expect(result.running).toBe(true);
			if (result.running) {
				expect(result.pid).toBe(process.pid);
				expect(result.uptime).toMatch(/\d/);
				expect(result.version).toBe("0.1.1");
				expect(Option.isSome(result.lastTickAt)).toBe(true);
			}
		});
	});

	describe("stop", () => {
		test("fails with DaemonNotRunningError when no state file", async () => {
			const exit = await Effect.runPromiseExit(
				Effect.gen(function* () {
					const daemon = yield* DaemonService;
					yield* daemon.stop();
				}).pipe(Effect.provide(createTestLayer())),
			);
			expect(Exit.isFailure(exit)).toBe(true);
		});

		test("fails with DaemonNotRunningError when PID is dead", async () => {
			const state = new DaemonState({
				pid: 999_999_999,
				token: "deadbeef".repeat(4),
				startedAt: new Date().toISOString(),
				lastTickAt: Option.none(),
				version: "0.1.1",
			});
			const encoded = encodeDaemonState(state);
			await writeFile(join(tempDir, "daemon.json"), JSON.stringify(encoded, null, "\t"));

			const exit = await Effect.runPromiseExit(
				Effect.gen(function* () {
					const daemon = yield* DaemonService;
					yield* daemon.stop();
				}).pipe(Effect.provide(createTestLayer())),
			);
			expect(Exit.isFailure(exit)).toBe(true);
		});
	});

	describe("start", () => {
		test("fails with DaemonAlreadyRunningError when daemon is already running", async () => {
			// Write a state file with current PID (which is alive)
			const state = new DaemonState({
				pid: process.pid,
				token: "testtoken1234567".repeat(2),
				startedAt: new Date().toISOString(),
				lastTickAt: Option.none(),
				version: "0.1.1",
			});
			const encoded = encodeDaemonState(state);
			await writeFile(join(tempDir, "daemon.json"), JSON.stringify(encoded, null, "\t"));

			const exit = await Effect.runPromiseExit(
				Effect.gen(function* () {
					const daemon = yield* DaemonService;
					yield* daemon.start();
				}).pipe(Effect.provide(createTestLayer())),
			);
			expect(Exit.isFailure(exit)).toBe(true);
			if (Exit.isFailure(exit)) {
				expect(String(exit.cause)).toContain("DaemonAlreadyRunningError");
			}
		});

		test("cleans up stale state before starting", async () => {
			// Write state with dead PID
			const state = new DaemonState({
				pid: 999_999_999,
				token: "deadbeef".repeat(4),
				startedAt: new Date().toISOString(),
				lastTickAt: Option.none(),
				version: "0.1.1",
			});
			const encoded = encodeDaemonState(state);
			await writeFile(join(tempDir, "daemon.json"), JSON.stringify(encoded, null, "\t"));

			// start() should clean up the stale state and proceed to spawn
			// It may fail at the spawn step (daemon.ts path resolution in test env)
			// but it should NOT fail with DaemonAlreadyRunningError
			const exit = await Effect.runPromiseExit(
				Effect.gen(function* () {
					const daemon = yield* DaemonService;
					yield* daemon.start();
				}).pipe(Effect.provide(createTestLayer())),
			);

			if (Exit.isFailure(exit)) {
				// Should NOT be "already running" — the stale one was cleaned up
				expect(String(exit.cause)).not.toContain("DaemonAlreadyRunningError");
			}
		});
	});

	describe("logs", () => {
		test("returns 'No daemon logs found.' when no log file", async () => {
			const result = await Effect.runPromise(
				Effect.gen(function* () {
					const daemon = yield* DaemonService;
					return yield* daemon.logs(50);
				}).pipe(Effect.provide(createTestLayer())),
			);
			expect(result).toBe("No daemon logs found.");
		});

		test("returns last N lines from log file", async () => {
			const lines = Array.from({ length: 100 }, (_, i) => `[2024-01-01] Log line ${i + 1}`);
			await writeFile(join(tempDir, "daemon.log"), lines.join("\n"));

			const result = await Effect.runPromise(
				Effect.gen(function* () {
					const daemon = yield* DaemonService;
					return yield* daemon.logs(10);
				}).pipe(Effect.provide(createTestLayer())),
			);

			const outputLines = result.split("\n").filter((l) => l.length > 0);
			expect(outputLines.length).toBeLessThanOrEqual(10);
			expect(result).toContain("Log line 100");
		});

		test("returns all lines when fewer than requested", async () => {
			await writeFile(join(tempDir, "daemon.log"), "line 1\nline 2\nline 3");

			const result = await Effect.runPromise(
				Effect.gen(function* () {
					const daemon = yield* DaemonService;
					return yield* daemon.logs(50);
				}).pipe(Effect.provide(createTestLayer())),
			);

			expect(result).toContain("line 1");
			expect(result).toContain("line 3");
		});
	});
});
