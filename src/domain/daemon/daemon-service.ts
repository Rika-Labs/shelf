import * as Effect from "effect/Effect";
import * as Duration from "effect/Duration";
import * as Layer from "effect/Layer";
import * as Option from "effect/Option";
import * as ServiceMap from "effect/ServiceMap";
import { ConfigService } from "../config/config-service";
import { SyncService } from "../sync/sync-service";
import { DaemonState, encodeDaemonState, decodeDaemonState } from "./daemon-schema";
import {
	DaemonAlreadyRunningError,
	DaemonNotRunningError,
	DaemonStartError,
} from "./daemon-errors";
import { isPidAlive, daemonStatePath, daemonLogPath, formatUptime } from "./daemon-utils";

const SHELF_VERSION = "0.1.1";
const LOG_MAX_BYTES = 5_242_880; // 5 MB

export class DaemonService extends ServiceMap.Service<DaemonService>()(
	"shelf/domain/daemon/DaemonService",
	{
		make: Effect.gen(function* () {
			const config = yield* ConfigService;
			const statePath = daemonStatePath(config.configDir);
			const logPath = daemonLogPath(config.configDir);

			const readState = (): Effect.Effect<DaemonState | null> =>
				Effect.tryPromise({
					try: async () => {
						const file = Bun.file(statePath);
						if (!(await file.exists())) return null;
						const raw = await file.json();
						return decodeDaemonState(raw);
					},
					catch: () => null,
				}).pipe(Effect.catch(() => Effect.succeed(null)));

			const writeState = (state: DaemonState): Effect.Effect<void> =>
				Effect.tryPromise({
					try: async () => {
						const encoded = encodeDaemonState(state);
						const tmpPath = `${statePath}.tmp`;
						await Bun.write(tmpPath, JSON.stringify(encoded, null, "\t"));
						const { rename } = await import("node:fs/promises");
						await rename(tmpPath, statePath);
					},
					catch: () => undefined,
				}).pipe(Effect.catch(() => Effect.void));

			const removeState = (): Effect.Effect<void> =>
				Effect.tryPromise({
					try: async () => {
						const { rm } = await import("node:fs/promises");
						await rm(statePath, { force: true });
					},
					catch: () => undefined,
				}).pipe(Effect.catch(() => Effect.void));

			return {
				start: Effect.fn("DaemonService.start")(function* () {
					yield* config.ensureDirectories();
					const existing = yield* readState();
					if (existing && isPidAlive(existing.pid)) {
						return yield* Effect.fail(new DaemonAlreadyRunningError({ pid: existing.pid }));
					}
					if (existing) {
						yield* removeState();
					}

					// Rotate log if too large
					yield* Effect.tryPromise({
						try: async () => {
							const logFile = Bun.file(logPath);
							if ((await logFile.exists()) && logFile.size > LOG_MAX_BYTES) {
								const { rename } = await import("node:fs/promises");
								await rename(logPath, `${logPath}.1`);
							}
						},
						catch: () => undefined,
					}).pipe(Effect.catch(() => Effect.void));

					const daemonEntry = new URL("../../startup/daemon.ts", import.meta.url).pathname;
					const child = yield* Effect.tryPromise({
						try: async () => {
							const proc = Bun.spawn(["bun", "run", daemonEntry], {
								stdout: Bun.file(logPath),
								stderr: Bun.file(logPath),
								stdin: "ignore",
								env: { ...process.env, SHELF_DAEMON: "1" },
							});
							return proc;
						},
						catch: (err) =>
							new DaemonStartError({ message: `Failed to spawn daemon process: ${err}` }),
					});

					const daemonState = new DaemonState({
						pid: child.pid,
						startedAt: new Date().toISOString(),
						lastTickAt: Option.none(),
						version: SHELF_VERSION,
					});
					yield* writeState(daemonState);
					return child.pid;
				}),

				stop: Effect.fn("DaemonService.stop")(function* () {
					const existing = yield* readState();
					if (!existing) {
						return yield* Effect.fail(new DaemonNotRunningError());
					}
					if (!isPidAlive(existing.pid)) {
						yield* removeState();
						return yield* Effect.fail(new DaemonNotRunningError());
					}
					try {
						process.kill(existing.pid, "SIGTERM");
					} catch {
						// already dead
					}
					// Wait briefly for graceful shutdown
					yield* Effect.sleep("1 second");
					if (isPidAlive(existing.pid)) {
						try {
							process.kill(existing.pid, "SIGKILL");
						} catch {
							// already dead
						}
					}
					yield* removeState();
				}),

				status: Effect.fn("DaemonService.status")(function* () {
					const existing = yield* readState();
					if (!existing) {
						return { running: false as const };
					}
					if (!isPidAlive(existing.pid)) {
						yield* removeState();
						return { running: false as const, wasStale: true };
					}
					return {
						running: true as const,
						pid: existing.pid,
						uptime: formatUptime(existing.startedAt),
						startedAt: existing.startedAt,
						lastTickAt: existing.lastTickAt,
						version: existing.version,
					};
				}),

				logs: Effect.fn("DaemonService.logs")(function* (lines: number) {
					const content = yield* Effect.tryPromise({
						try: async () => {
							const file = Bun.file(logPath);
							if (!(await file.exists())) return "";
							return await file.text();
						},
						catch: () => "",
					}).pipe(Effect.catch(() => Effect.succeed("")));

					if (!content) return "No daemon logs found.";
					const allLines = content.split("\n");
					return allLines.slice(-lines).join("\n");
				}),
			};
		}),
	},
) {
	static layer = Layer.effect(this, this.make);
}

// --- Daemon loop program (runs in subprocess) ---

const appendLog = (message: string): void => {
	const timestamp = new Date().toISOString();
	// eslint-disable-next-line no-console -- daemon logs to stdout which is redirected to log file
	console.log(`[${timestamp}] ${message}`);
};

const writeDaemonState = (
	path: string,
	startedAt: string,
	lastTickAt: Option.Option<string>,
): Effect.Effect<void> =>
	Effect.tryPromise({
		try: async () => {
			const state = new DaemonState({
				pid: process.pid,
				startedAt,
				lastTickAt,
				version: SHELF_VERSION,
			});
			const encoded = encodeDaemonState(state);
			const tmpPath = `${path}.tmp`;
			await Bun.write(tmpPath, JSON.stringify(encoded, null, "\t"));
			const { rename } = await import("node:fs/promises");
			await rename(tmpPath, path);
		},
		catch: () => undefined,
	}).pipe(Effect.catch(() => Effect.void));

const cleanupState = (path: string): Effect.Effect<void> =>
	Effect.tryPromise({
		try: async () => {
			const { rm } = await import("node:fs/promises");
			await rm(path, { force: true });
		},
		catch: () => undefined,
	}).pipe(Effect.catch(() => Effect.void));

export const daemonProgram = Effect.gen(function* () {
	const cfg = yield* ConfigService;
	const sync = yield* SyncService;
	const path = daemonStatePath(cfg.configDir);

	const state = { running: true };

	process.on("SIGTERM", () => {
		state.running = false;
		appendLog("Received SIGTERM, shutting down...");
	});
	process.on("SIGINT", () => {
		state.running = false;
		appendLog("Received SIGINT, shutting down...");
	});

	const startedAt = new Date().toISOString();
	appendLog("Daemon started");
	yield* writeDaemonState(path, startedAt, Option.none());

	while (state.running) {
		const config = yield* cfg.load().pipe(Effect.catch(() => Effect.succeed(null)));
		if (!config) {
			appendLog("Failed to load config, retrying in 60s");
			yield* Effect.sleep(Duration.minutes(1));
			continue;
		}

		const intervalMinutes = config.syncIntervalMinutes;
		appendLog(`Starting sync cycle (interval: ${intervalMinutes}m)`);

		yield* sync.syncAll().pipe(
			Effect.catch((error: unknown) => {
				appendLog(`Sync cycle failed: ${error}`);
				return Effect.void;
			}),
		);

		appendLog("Sync cycle complete");
		yield* writeDaemonState(path, startedAt, Option.some(new Date().toISOString()));

		yield* Effect.sleep(Duration.minutes(intervalMinutes));
	}

	yield* cleanupState(path);
	appendLog("Daemon stopped");
});
