import * as Effect from "effect/Effect";
import * as Console from "effect/Console";
import * as Option from "effect/Option";
import { Argument, Command } from "effect/unstable/cli";
import { ConfigService } from "../../domain/config/config-service";
import { ShelfConfig } from "../../domain/config/config-schema";

const key = Argument.string("key").pipe(Argument.optional);
const value = Argument.string("value").pipe(Argument.optional);

export const configCommand = Command.make("config", { key, value }, (args) =>
	Effect.gen(function* () {
		const configService = yield* ConfigService;
		const cfg = yield* configService.load();

		if (Option.isNone(args.key)) {
			yield* Console.log(JSON.stringify(cfg, null, "\t"));
			return;
		}

		const k = args.key.value;

		if (Option.isNone(args.value)) {
			if (k === "syncIntervalMinutes") {
				yield* Console.log(String(cfg.syncIntervalMinutes));
			} else if (k === "version") {
				yield* Console.log(String(cfg.version));
			} else {
				yield* Console.log(`Unknown config key: ${k}`);
			}
			return;
		}

		if (k === "syncIntervalMinutes") {
			const num = Number.parseInt(args.value.value, 10);
			if (Number.isNaN(num)) {
				yield* Console.log("syncIntervalMinutes must be a number");
				return;
			}
			yield* configService.save(new ShelfConfig({ ...cfg, syncIntervalMinutes: num }));
			yield* Console.log(`Set syncIntervalMinutes = ${num}`);
		} else {
			yield* Console.log(`Unknown config key: ${k}`);
		}
	}),
).pipe(Command.withDescription("View or modify shelf configuration"));
