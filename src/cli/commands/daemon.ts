import * as Effect from "effect/Effect";
import * as Console from "effect/Console";
import * as Option from "effect/Option";
import { Command, Flag } from "effect/unstable/cli";
import { DaemonService } from "../../domain/daemon/daemon-service";

const startForeground = Flag.boolean("foreground").pipe(
	Flag.withDefault(false),
	Flag.withDescription("Run daemon in foreground (for debugging)"),
);

const startCommand = Command.make("start", { foreground: startForeground }, (config) =>
	Effect.gen(function* () {
		const daemon = yield* DaemonService;
		if (config.foreground) {
			yield* Console.log("Running daemon in foreground (Ctrl+C to stop)...");
			const { daemonProgram } = yield* Effect.tryPromise({
				try: () => import("../../domain/daemon/daemon-service"),
				catch: (e) => new Error(`Failed to load daemon program: ${e}`),
			});
			yield* daemonProgram;
		} else {
			const pid = yield* daemon.start();
			yield* Console.log(`Daemon started (PID: ${pid})`);
		}
	}),
).pipe(Command.withDescription("Start the background sync daemon"));

const stopCommand = Command.make("stop", {}, () =>
	Effect.gen(function* () {
		const daemon = yield* DaemonService;
		yield* daemon.stop();
		yield* Console.log("Daemon stopped");
	}),
).pipe(Command.withDescription("Stop the background sync daemon"));

const statusCommand = Command.make("status", {}, () =>
	Effect.gen(function* () {
		const daemon = yield* DaemonService;
		const status = yield* daemon.status();
		if (!status.running) {
			const suffix = "wasStale" in status && status.wasStale ? " (cleaned up stale PID file)" : "";
			yield* Console.log(`Daemon is not running${suffix}`);
			return;
		}
		yield* Console.log(`Daemon is running`);
		yield* Console.log(`  PID:        ${status.pid}`);
		yield* Console.log(`  Uptime:     ${status.uptime}`);
		yield* Console.log(`  Started:    ${status.startedAt}`);
		const lastTick = Option.getOrElse(status.lastTickAt, () => "never");
		yield* Console.log(`  Last sync:  ${lastTick}`);
		yield* Console.log(`  Version:    ${status.version}`);
	}),
).pipe(Command.withDescription("Show daemon status"));

const logLines = Flag.integer("lines").pipe(
	Flag.withDefault(50),
	Flag.withDescription("Number of log lines to show"),
);

const logsCommand = Command.make("logs", { lines: logLines }, (config) =>
	Effect.gen(function* () {
		const daemon = yield* DaemonService;
		const output = yield* daemon.logs(config.lines);
		yield* Console.log(output);
	}),
).pipe(Command.withDescription("Show daemon logs"));

const restartCommand = Command.make("restart", {}, () =>
	Effect.gen(function* () {
		const daemon = yield* DaemonService;
		yield* daemon.stop().pipe(Effect.catch(() => Effect.void));
		const pid = yield* daemon.start();
		yield* Console.log(`Daemon restarted (PID: ${pid})`);
	}),
).pipe(Command.withDescription("Restart the background sync daemon"));

export const daemonCommand = Command.make("daemon").pipe(
	Command.withSubcommands([startCommand, stopCommand, statusCommand, logsCommand, restartCommand]),
	Command.withDescription("Manage the background sync daemon"),
);
