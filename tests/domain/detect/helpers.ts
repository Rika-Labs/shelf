import * as Effect from "effect/Effect";
import * as Layer from "effect/Layer";
import type { DetectedRepo } from "../../../src/domain/detect/detect-schema";
import { DetectService } from "../../../src/domain/detect/detect-service";

export type DetectOverrides = {
	readonly detect?: (dir: string) => Effect.Effect<DetectedRepo[]>;
};

const defaultDetectImpl = {
	detect: () => Effect.succeed([] as DetectedRepo[]),
};

export const createMockDetectLayer = (
	overrides: DetectOverrides = {},
): Layer.Layer<DetectService> => {
	const impl = { ...defaultDetectImpl, ...overrides };
	return Layer.succeed(DetectService, DetectService.of(impl));
};
