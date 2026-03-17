import * as Effect from "effect/Effect";
import * as Layer from "effect/Layer";
import type { ResolvedRepo } from "../../../src/domain/resolve/resolve-schema";
import type { ResolveError } from "../../../src/domain/resolve/resolve-errors";
import { ResolveService } from "../../../src/domain/resolve/resolve-service";

export type ResolveOverrides = {
	readonly resolve?: (input: string) => Effect.Effect<ResolvedRepo, ResolveError>;
};

const defaultResolveImpl = {
	resolve: () =>
		Effect.succeed({
			url: "https://github.com/test/repo.git",
			suggestedAlias: "repo",
			source: "direct",
		} as ResolvedRepo),
};

export const createMockResolveLayer = (
	overrides: ResolveOverrides = {},
): Layer.Layer<ResolveService> => {
	const impl = { ...defaultResolveImpl, ...overrides };
	return Layer.succeed(ResolveService, ResolveService.of(impl));
};
