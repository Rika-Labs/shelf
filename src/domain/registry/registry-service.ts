import * as Effect from "effect/Effect";
import * as Layer from "effect/Layer";
import * as ServiceMap from "effect/ServiceMap";
import { join } from "node:path";
import { ConfigService } from "../config/config-service";
import { ShelffileService } from "../shelffile/shelffile-service";
import { ShelfRegistry, defaultRegistry, decodeRegistry, encodeRegistry } from "./registry-schema";
import { RegistryParseError } from "./registry-errors";

const REGISTRY_FILE = "registry.json";

export class RegistryService extends ServiceMap.Service<RegistryService>()(
	"shelf/domain/registry/RegistryService",
	{
		make: Effect.gen(function* () {
			const config = yield* ConfigService;
			const shelffile = yield* ShelffileService;

			const registryPath = join(config.configDir, REGISTRY_FILE);

			const load = Effect.fn("RegistryService.load")(function* () {
				const file = Bun.file(registryPath);
				const exists = yield* Effect.tryPromise({
					try: () => file.exists(),
					catch: () => new RegistryParseError({ message: "Failed to check registry file" }),
				});
				if (!exists) {
					return defaultRegistry;
				}
				const raw = yield* Effect.tryPromise({
					try: () => file.json(),
					catch: () => new RegistryParseError({ message: "Failed to read registry file" }),
				});
				return yield* Effect.try({
					try: () => decodeRegistry(raw),
					catch: () => new RegistryParseError({ message: "Invalid registry schema" }),
				});
			});

			const save = Effect.fn("RegistryService.save")(function* (registry: typeof ShelfRegistry.Type) {
				const encoded = encodeRegistry(registry);
				yield* Effect.tryPromise({
					try: async () => {
						await Bun.write(registryPath, JSON.stringify(encoded, null, "\t"));
					},
					catch: () => new RegistryParseError({ message: "Failed to write registry file" }),
				});
			});

			return {
				load,
				save,

				registerProject: Effect.fn("RegistryService.registerProject")(function* (dir: string) {
					const registry = yield* load();
					if (registry.projects.includes(dir)) return;
					yield* save(
						new ShelfRegistry({
							...registry,
							projects: [...registry.projects, dir],
						}),
					);
				}),

				unregisterProject: Effect.fn("RegistryService.unregisterProject")(function* (dir: string) {
					const registry = yield* load();
					yield* save(
						new ShelfRegistry({
							...registry,
							projects: registry.projects.filter((p) => p !== dir),
						}),
					);
				}),

				addManual: Effect.fn("RegistryService.addManual")(function* (alias: string) {
					const registry = yield* load();
					if (registry.manual.includes(alias)) return;
					yield* save(
						new ShelfRegistry({
							...registry,
							manual: [...registry.manual, alias],
						}),
					);
				}),

				removeManual: Effect.fn("RegistryService.removeManual")(function* (alias: string) {
					const registry = yield* load();
					yield* save(
						new ShelfRegistry({
							...registry,
							manual: registry.manual.filter((m) => m !== alias),
						}),
					);
				}),

				getReferencedAliases: Effect.fn("RegistryService.getReferencedAliases")(function* () {
					const registry = yield* load();
					const aliases = new Set<string>(registry.manual);
					const validProjects: string[] = [];

					for (const projectDir of registry.projects) {
						const dirExists = yield* Effect.tryPromise({
							try: async () => {
								const { stat } = await import("node:fs/promises");
								await stat(projectDir);
								return true;
							},
							catch: () => false,
						});
						if (!dirExists) continue;
						validProjects.push(projectDir);

						const sf = yield* shelffile.read(projectDir).pipe(
							Effect.catch(() => Effect.succeed(null)),
						);
						if (sf === null) continue;
						for (const entry of sf.entries) {
							aliases.add(entry.alias);
						}
					}

					// Clean stale project paths
					if (validProjects.length !== registry.projects.length) {
						yield* save(new ShelfRegistry({ ...registry, projects: validProjects }));
					}

					return aliases;
				}),
			};
		}),
	},
) {
	static layer = Layer.effect(this, this.make);
}
