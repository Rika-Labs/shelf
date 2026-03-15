import * as Effect from "effect/Effect";
import * as Layer from "effect/Layer";
import type { ShelfRegistry } from "../../../src/domain/registry/registry-schema";
import { defaultRegistry } from "../../../src/domain/registry/registry-schema";
import type { RegistryParseError } from "../../../src/domain/registry/registry-errors";
import { RegistryService } from "../../../src/domain/registry/registry-service";

export type RegistryOverrides = {
	readonly load?: () => Effect.Effect<typeof ShelfRegistry.Type, RegistryParseError>;
	readonly save?: (registry: typeof ShelfRegistry.Type) => Effect.Effect<void, RegistryParseError>;
	readonly registerProject?: (dir: string) => Effect.Effect<void, RegistryParseError>;
	readonly unregisterProject?: (dir: string) => Effect.Effect<void, RegistryParseError>;
	readonly addManual?: (alias: string) => Effect.Effect<void, RegistryParseError>;
	readonly removeManual?: (alias: string) => Effect.Effect<void, RegistryParseError>;
	readonly getReferencedAliases?: () => Effect.Effect<Set<string>, RegistryParseError>;
};

const defaultRegistryImpl = {
	load: (): Effect.Effect<typeof ShelfRegistry.Type, RegistryParseError> =>
		Effect.succeed(defaultRegistry),
	save: (): Effect.Effect<void, RegistryParseError> => Effect.void,
	registerProject: (): Effect.Effect<void, RegistryParseError> => Effect.void,
	unregisterProject: (): Effect.Effect<void, RegistryParseError> => Effect.void,
	addManual: (): Effect.Effect<void, RegistryParseError> => Effect.void,
	removeManual: (): Effect.Effect<void, RegistryParseError> => Effect.void,
	getReferencedAliases: (): Effect.Effect<Set<string>, RegistryParseError> =>
		Effect.succeed(new Set<string>()),
};

export const createMockRegistryLayer = (
	overrides: RegistryOverrides = {},
): Layer.Layer<RegistryService> => {
	const impl = { ...defaultRegistryImpl, ...overrides };
	return Layer.succeed(RegistryService, RegistryService.of(impl));
};
