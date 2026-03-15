import * as Effect from "effect/Effect";
import * as Layer from "effect/Layer";
import * as ServiceMap from "effect/ServiceMap";
import { join } from "node:path";
import { homedir } from "node:os";
import { ShelfConfig, defaultConfig, decodeConfig, encodeConfig } from "./config-schema";
import { ConfigParseError } from "./config-errors";

const SHELF_DIR = join(homedir(), ".config", "shelf");
const CONFIG_PATH = join(SHELF_DIR, "config.json");
const REPOS_DIR = join(SHELF_DIR, "repos");

export class ConfigService extends ServiceMap.Service<ConfigService>()(
	"shelf/domain/config/ConfigService",
	{
		make: Effect.gen(function* () {
			return {
				load: Effect.fn("ConfigService.load")(function* () {
					const file = Bun.file(CONFIG_PATH);
					const exists = yield* Effect.tryPromise({
						try: () => file.exists(),
						catch: () => new ConfigParseError({ message: "Failed to check config file" }),
					});
					if (!exists) {
						return defaultConfig;
					}
					const raw = yield* Effect.tryPromise({
						try: () => file.json(),
						catch: () => new ConfigParseError({ message: "Failed to read config file" }),
					});
					return yield* Effect.try({
						try: () => decodeConfig(raw),
						catch: () => new ConfigParseError({ message: "Invalid config schema" }),
					});
				}),

				save: Effect.fn("ConfigService.save")(function* (config: typeof ShelfConfig.Type) {
					const encoded = encodeConfig(config);
					yield* Effect.tryPromise({
						try: async () => {
							await Bun.write(CONFIG_PATH, JSON.stringify(encoded, null, "\t"));
						},
						catch: () => new ConfigParseError({ message: "Failed to write config file" }),
					});
				}),

				ensureDirectories: Effect.fn("ConfigService.ensureDirectories")(function* () {
					yield* Effect.tryPromise({
						try: async () => {
							const { mkdir } = await import("node:fs/promises");
							await mkdir(SHELF_DIR, { recursive: true });
							await mkdir(REPOS_DIR, { recursive: true });
						},
						catch: () =>
							new ConfigParseError({ message: "Failed to create shelf directories" }),
					});
				}),

				repoPath: (alias: string): string => join(REPOS_DIR, alias),

				configDir: SHELF_DIR,
				reposDir: REPOS_DIR,
				configPath: CONFIG_PATH,
			};
		}),
	},
) {
	static layer = Layer.effect(this, this.make);
}
