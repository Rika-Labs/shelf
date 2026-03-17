import * as Effect from "effect/Effect";
import * as Layer from "effect/Layer";
import * as Option from "effect/Option";
import * as ServiceMap from "effect/ServiceMap";
import { join } from "node:path";
import { ConfigService } from "../config/config-service";
import { builtinRegistry } from "../resolve/resolve-utils";
import { DetectedRepo } from "./detect-schema";
import { parsePackageJson, parseGoMod, resolveNpmPackage, resolveGoModule } from "./detect-utils";

const readFileOrNone = (path: string): Effect.Effect<Option.Option<string>> =>
	Effect.tryPromise({
		try: async () => {
			const file = Bun.file(path);
			if (!(await file.exists())) return Option.none<string>();
			const text = await file.text();
			return Option.some(text);
		},
		catch: () => Option.none<string>(),
	}).pipe(Effect.catch(() => Effect.succeed(Option.none<string>())));

export class DetectService extends ServiceMap.Service<DetectService>()(
	"shelf/domain/detect/DetectService",
	{
		make: Effect.gen(function* () {
			const config = yield* ConfigService;

			return {
				detect: Effect.fn("DetectService.detect")(function* (dir: string) {
					const cfg = yield* config.load();
					const shelvedAliases = new Set(cfg.repos.map((r) => r.alias));
					const shelvedUrls = new Set(cfg.repos.map((r) => r.url));

					const detected: DetectedRepo[] = [];

					// Try package.json
					const pkgJsonPath = join(dir, "package.json");
					const pkgContent = yield* readFileOrNone(pkgJsonPath);
					if (Option.isSome(pkgContent)) {
						const deps = parsePackageJson(pkgContent.value);
						for (const dep of deps) {
							const registryUrl = builtinRegistry[dep.name];
							if (registryUrl) {
								detected.push(
									new DetectedRepo({
										name: dep.name,
										url: registryUrl,
										source: "npm",
										alreadyShelved: shelvedAliases.has(dep.name) || shelvedUrls.has(registryUrl),
									}),
								);
								continue;
							}
							const npmUrl = yield* resolveNpmPackage(dep.name);
							if (Option.isSome(npmUrl)) {
								detected.push(
									new DetectedRepo({
										name: dep.name,
										url: npmUrl.value,
										source: "npm",
										alreadyShelved: shelvedAliases.has(dep.name) || shelvedUrls.has(npmUrl.value),
									}),
								);
							}
						}
					}

					// Try go.mod
					const goModPath = join(dir, "go.mod");
					const goContent = yield* readFileOrNone(goModPath);
					if (Option.isSome(goContent)) {
						const deps = parseGoMod(goContent.value);
						for (const dep of deps) {
							const goUrl = resolveGoModule(dep.name);
							if (Option.isSome(goUrl)) {
								detected.push(
									new DetectedRepo({
										name: dep.name.split("/").pop() ?? dep.name,
										url: goUrl.value,
										source: "go",
										alreadyShelved:
											shelvedAliases.has(dep.name.split("/").pop() ?? dep.name) ||
											shelvedUrls.has(goUrl.value),
									}),
								);
							}
						}
					}

					// Deduplicate by URL
					const seen = new Set<string>();
					return detected.filter((d) => {
						if (seen.has(d.url)) return false;
						seen.add(d.url);
						return true;
					});
				}),
			};
		}),
	},
) {
	static layer = Layer.effect(this, this.make);
}
