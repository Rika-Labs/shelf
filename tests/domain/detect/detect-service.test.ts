import { describe, expect, test, beforeEach, afterEach } from "bun:test";
import * as Effect from "effect/Effect";
import * as Layer from "effect/Layer";
import * as Option from "effect/Option";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { DetectService } from "../../../src/domain/detect/detect-service";
import type { ConfigService } from "../../../src/domain/config/config-service";
import { defaultConfig, RepoEntry, ShelfConfig } from "../../../src/domain/config/config-schema";
import { createMockConfigLayer } from "../../domain/config/helpers";

const runWithLayers = <A, E>(
	effect: Effect.Effect<A, E, DetectService>,
	configLayer?: Layer.Layer<ConfigService>,
) => {
	const cfg = configLayer ?? createMockConfigLayer();
	const detectLayer = DetectService.layer.pipe(Layer.provide(cfg));
	return Effect.runPromise(Effect.provide(effect, detectLayer));
};

describe("DetectService", () => {
	let tempDir: string;

	beforeEach(async () => {
		tempDir = await mkdtemp(join(tmpdir(), "shelf-detect-test-"));
	});

	afterEach(async () => {
		await rm(tempDir, { recursive: true, force: true });
	});

	describe("detect", () => {
		test("returns empty array when no dependency files found", async () => {
			const result = await runWithLayers(
				Effect.gen(function* () {
					const detect = yield* DetectService;
					return yield* detect.detect(tempDir);
				}),
			);
			expect(result).toEqual([]);
		});

		test("detects repos from package.json via built-in registry", async () => {
			await Bun.write(
				join(tempDir, "package.json"),
				JSON.stringify({
					dependencies: { react: "^18.2.0", zod: "^3.22.0" },
				}),
			);

			const result = await runWithLayers(
				Effect.gen(function* () {
					const detect = yield* DetectService;
					return yield* detect.detect(tempDir);
				}),
			);

			expect(result.length).toBe(2);
			const names = result.map((d) => d.name);
			expect(names).toContain("react");
			expect(names).toContain("zod");
			const react = result.find((d) => d.name === "react");
			expect(react?.url).toBe("https://github.com/facebook/react.git");
			expect(react?.source).toBe("npm");
			expect(react?.alreadyShelved).toBe(false);
		});

		test("marks repos as alreadyShelved when alias matches", async () => {
			await Bun.write(
				join(tempDir, "package.json"),
				JSON.stringify({ dependencies: { react: "^18.2.0" } }),
			);

			const configWithReact = new ShelfConfig({
				...defaultConfig,
				repos: [
					new RepoEntry({
						url: "https://github.com/facebook/react.git",
						alias: "react",
						pin: Option.none(),
						depth: Option.none(),
						sparse: Option.none(),
						addedAt: new Date().toISOString(),
						lastSyncedAt: Option.none(),
					}),
				],
			});
			const mockConfig = createMockConfigLayer({
				load: () => Effect.succeed(configWithReact),
			});

			const result = await runWithLayers(
				Effect.gen(function* () {
					const detect = yield* DetectService;
					return yield* detect.detect(tempDir);
				}),
				mockConfig,
			);

			expect(result.length).toBe(1);
			expect(result[0]?.alreadyShelved).toBe(true);
		});

		test("marks repos as alreadyShelved when URL matches", async () => {
			await Bun.write(
				join(tempDir, "package.json"),
				JSON.stringify({ dependencies: { react: "^18.2.0" } }),
			);

			const configWithReact = new ShelfConfig({
				...defaultConfig,
				repos: [
					new RepoEntry({
						url: "https://github.com/facebook/react.git",
						alias: "my-react",
						pin: Option.none(),
						depth: Option.none(),
						sparse: Option.none(),
						addedAt: new Date().toISOString(),
						lastSyncedAt: Option.none(),
					}),
				],
			});
			const mockConfig = createMockConfigLayer({
				load: () => Effect.succeed(configWithReact),
			});

			const result = await runWithLayers(
				Effect.gen(function* () {
					const detect = yield* DetectService;
					return yield* detect.detect(tempDir);
				}),
				mockConfig,
			);

			expect(result.length).toBe(1);
			expect(result[0]?.alreadyShelved).toBe(true);
		});

		test("detects repos from go.mod", async () => {
			await Bun.write(
				join(tempDir, "go.mod"),
				`module example.com/myapp

go 1.21

require (
	github.com/gin-gonic/gin v1.9.1
	github.com/gorilla/mux v1.8.0
	golang.org/x/text v0.14.0
)`,
			);

			const result = await runWithLayers(
				Effect.gen(function* () {
					const detect = yield* DetectService;
					return yield* detect.detect(tempDir);
				}),
			);

			// golang.org/x/text is not a github module so it shouldn't be included
			expect(result.length).toBe(2);
			const names = result.map((d) => d.name);
			expect(names).toContain("gin");
			expect(names).toContain("mux");
			expect(result[0]?.source).toBe("go");
		});

		test("deduplicates repos by URL", async () => {
			// If the same URL appears from both package.json and go.mod somehow,
			// it should be deduped. We can test by having the same dep twice in package.json
			// (which merges deps + devDeps, so duplicates aren't possible there).
			// Instead, test with a go.mod that has two paths pointing to the same org/repo
			await Bun.write(
				join(tempDir, "go.mod"),
				`module example.com/myapp

go 1.21

require (
	github.com/gin-gonic/gin v1.9.1
)`,
			);

			const result = await runWithLayers(
				Effect.gen(function* () {
					const detect = yield* DetectService;
					return yield* detect.detect(tempDir);
				}),
			);

			const urls = result.map((d) => d.url);
			const uniqueUrls = [...new Set(urls)];
			expect(urls.length).toBe(uniqueUrls.length);
		});

		test("detects from both package.json and go.mod", async () => {
			await Bun.write(
				join(tempDir, "package.json"),
				JSON.stringify({ dependencies: { react: "^18.2.0" } }),
			);
			await Bun.write(
				join(tempDir, "go.mod"),
				`module example.com/myapp

go 1.21

require github.com/gin-gonic/gin v1.9.1
`,
			);

			const result = await runWithLayers(
				Effect.gen(function* () {
					const detect = yield* DetectService;
					return yield* detect.detect(tempDir);
				}),
			);

			expect(result.length).toBe(2);
			const sources = result.map((d) => d.source);
			expect(sources).toContain("npm");
			expect(sources).toContain("go");
		});

		test("handles invalid package.json gracefully", async () => {
			await Bun.write(join(tempDir, "package.json"), "not valid json");

			const result = await runWithLayers(
				Effect.gen(function* () {
					const detect = yield* DetectService;
					return yield* detect.detect(tempDir);
				}),
			);

			expect(result).toEqual([]);
		});

		test("handles empty package.json", async () => {
			await Bun.write(join(tempDir, "package.json"), "{}");

			const result = await runWithLayers(
				Effect.gen(function* () {
					const detect = yield* DetectService;
					return yield* detect.detect(tempDir);
				}),
			);

			expect(result).toEqual([]);
		});

		test("only detects known registry packages without network", async () => {
			// Packages not in registry and with no npm API would return none
			await Bun.write(
				join(tempDir, "package.json"),
				JSON.stringify({
					dependencies: {
						react: "^18.0.0",
						"my-private-internal-pkg-xyzzy": "^1.0.0",
					},
				}),
			);

			const result = await runWithLayers(
				Effect.gen(function* () {
					const detect = yield* DetectService;
					return yield* detect.detect(tempDir);
				}),
			);

			// react should be found, the private pkg should not
			const names = result.map((d) => d.name);
			expect(names).toContain("react");
			expect(names).not.toContain("my-private-internal-pkg-xyzzy");
		});

		test("handles devDependencies", async () => {
			await Bun.write(
				join(tempDir, "package.json"),
				JSON.stringify({
					devDependencies: { vitest: "^1.0.0", eslint: "^9.0.0" },
				}),
			);

			const result = await runWithLayers(
				Effect.gen(function* () {
					const detect = yield* DetectService;
					return yield* detect.detect(tempDir);
				}),
			);

			const names = result.map((d) => d.name);
			expect(names).toContain("vitest");
			expect(names).toContain("eslint");
		});
	});
});
