import * as Effect from "effect/Effect";
import * as Duration from "effect/Duration";
import * as Option from "effect/Option";
import { ConfigService } from "../config/config-service";
import { SyncService } from "../sync/sync-service";
import { DaemonState, encodeDaemonState } from "./daemon-schema";
import { daemonStatePath } from "./daemon-utils";

const SHELF_VERSION = "0.1.1";

const appendLog = (message: string): void => {
	const timestamp = new Date().toISOString();
	// eslint-disable-next-line no-console -- daemon logs to stdout which is redirected to log file
	console.log(`[${timestamp}] ${message}`);
};

const writeState = (statePath: string, lastTickAt: Option.Option<string>): Effect.Effect<void> =>
	Effect.tryPromise({
		try: async () => {
			const state = new DaemonState({
				pid: process.pid,
				startedAt: new Date().toISOString(),
				lastTickAt,
				version: SHELF_VERSION,
			});
			const encoded = encodeDaemonState(state);
			const tmpPath = `${statePath}.tmp`;
			await Bun.write(tmpPath, JSON.stringify(encoded, null, "\t"));
			const { rename } = await import("node:fs/promises");
			await rename(tmpPath, statePath);
		},
		catch: () => undefined,
	}).pipe(Effect.catch(() => Effect.void));

const cleanupState = (statePath: string): Effect.Effect<void> =>
	Effect.tryPromise({
		try: async () => {
			const { rm } = await import("node:fs/promises");
			await rm(statePath, { force: true });
		},
		catch: () => undefined,
	}).pipe(Effect.catch(() => Effect.void));

export const daemonProgram = Effect.gen(function* () {
	const config = yield* ConfigService;
	const sync = yield* SyncService;
	const statePath = daemonStatePath(config.configDir);

	const state = { running: true };

	process.on("SIGTERM", () => {
		state.running = false;
		appendLog("Received SIGTERM, shutting down...");
	});
	process.on("SIGINT", () => {
		state.running = false;
		appendLog("Received SIGINT, shutting down...");
	});

	appendLog("Daemon started");
	yield* writeState(statePath, Option.none());

	while (state.running) {
		const cfg = yield* config.load().pipe(Effect.catch(() => Effect.succeed(null)));
		if (!cfg) {
			appendLog("Failed to load config, retrying in 60s");
			yield* Effect.sleep(Duration.minutes(1));
			continue;
		}

		const intervalMinutes = cfg.syncIntervalMinutes;
		appendLog(`Starting sync cycle (interval: ${intervalMinutes}m)`);

		yield* sync.syncAll().pipe(
			Effect.catch((error: unknown) => {
				appendLog(`Sync cycle failed: ${error}`);
				return Effect.void;
			}),
		);

		appendLog("Sync cycle complete");
		yield* writeState(statePath, Option.some(new Date().toISOString()));

		yield* Effect.sleep(Duration.minutes(intervalMinutes));
	}

	yield* cleanupState(statePath);
	appendLog("Daemon stopped");
});
