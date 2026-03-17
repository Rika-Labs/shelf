import * as Effect from "effect/Effect";
import * as Layer from "effect/Layer";
import { DaemonService } from "../../../src/domain/daemon/daemon-service";

export const createMockDaemonLayer = (): Layer.Layer<DaemonService> => {
	return Layer.succeed(
		DaemonService,
		DaemonService.of({
			start: () => Effect.succeed(12_345 as number),
			stop: () => Effect.succeed(undefined),
			status: () => Effect.succeed({ running: false as const }),
			logs: () => Effect.succeed("" as string),
		}),
	);
};
