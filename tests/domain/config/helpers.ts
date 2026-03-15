import * as Effect from "effect/Effect";
import * as Layer from "effect/Layer";
import type { ShelfConfig } from "../../../src/domain/config/config-schema";
import { defaultConfig } from "../../../src/domain/config/config-schema";
import type { ConfigParseError } from "../../../src/domain/config/config-errors";
import { ConfigService } from "../../../src/domain/config/config-service";

export type ConfigOverrides = {
	readonly load?: () => Effect.Effect<typeof ShelfConfig.Type, ConfigParseError>;
	readonly save?: (config: typeof ShelfConfig.Type) => Effect.Effect<void, ConfigParseError>;
	readonly ensureDirectories?: () => Effect.Effect<void, ConfigParseError>;
	readonly repoPath?: (alias: string) => string;
};

const defaultConfigImpl = {
	load: (): Effect.Effect<typeof ShelfConfig.Type, ConfigParseError> =>
		Effect.succeed(defaultConfig),
	save: (): Effect.Effect<void, ConfigParseError> => Effect.void,
	ensureDirectories: (): Effect.Effect<void, ConfigParseError> => Effect.void,
	repoPath: (alias: string): string => `/tmp/shelf-test/repos/${alias}`,
	configDir: "/tmp/shelf-test",
	reposDir: "/tmp/shelf-test/repos",
	configPath: "/tmp/shelf-test/config.json",
};

export const createMockConfigLayer = (
	overrides: ConfigOverrides = {},
): Layer.Layer<ConfigService> => {
	const impl = { ...defaultConfigImpl, ...overrides };
	return Layer.succeed(ConfigService, ConfigService.of(impl));
};
