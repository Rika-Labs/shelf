import { describe, test, expect, beforeEach, afterEach } from "bun:test";
import * as Effect from "effect/Effect";
import * as Layer from "effect/Layer";
import * as Option from "effect/Option";
import { mkdtemp, rm, mkdir } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { RegistryService } from "../../../src/domain/registry/registry-service";
import { ConfigService } from "../../../src/domain/config/config-service";
import { defaultConfig } from "../../../src/domain/config/config-schema";
import { createMockShelffileLayer } from "../shelffile/helpers";
import { ShelffileNotFoundError } from "../../../src/domain/shelffile/shelffile-errors";
import type { Shelffile } from "../../../src/domain/shelffile/shelffile-schema";
import type { ShelffileOverrides } from "../shelffile/helpers";

describe("RegistryService", () => {
	let tempDir: string;

	beforeEach(async () => {
		tempDir = await mkdtemp(join(tmpdir(), "shelf-registry-test-"));
		await mkdir(tempDir, { recursive: true });
	});

	afterEach(async () => {
		await rm(tempDir, { recursive: true, force: true });
	});

	const buildLayer = (shelffileOverrides: ShelffileOverrides = {}) => {
		const configLayer = Layer.succeed(
			ConfigService,
			ConfigService.of({
				load: () => Effect.succeed(defaultConfig),
				save: () => Effect.void,
				ensureDirectories: () => Effect.void,
				repoPath: (alias: string) => join(tempDir, "repos", alias),
				configDir: tempDir,
				reposDir: join(tempDir, "repos"),
				configPath: join(tempDir, "config.json"),
			}),
		);
		const shelffileLayer = createMockShelffileLayer(shelffileOverrides);
		return RegistryService.layer.pipe(
			Layer.provide(configLayer),
			Layer.provide(shelffileLayer),
		);
	};

	test("load returns default when no file", async () => {
		const result = await Effect.runPromise(
			Effect.gen(function* () {
				const svc = yield* RegistryService;
				return yield* svc.load();
			}).pipe(Effect.provide(buildLayer())),
		);
		expect(result.projects).toEqual([]);
		expect(result.manual).toEqual([]);
	});

	test("registerProject adds project path (deduped)", async () => {
		const result = await Effect.runPromise(
			Effect.gen(function* () {
				const svc = yield* RegistryService;
				yield* svc.registerProject("/tmp/project-a");
				yield* svc.registerProject("/tmp/project-a"); // duplicate
				yield* svc.registerProject("/tmp/project-b");
				return yield* svc.load();
			}).pipe(Effect.provide(buildLayer())),
		);
		expect(result.projects).toEqual(["/tmp/project-a", "/tmp/project-b"]);
	});

	test("unregisterProject removes project path", async () => {
		const result = await Effect.runPromise(
			Effect.gen(function* () {
				const svc = yield* RegistryService;
				yield* svc.registerProject("/tmp/project-a");
				yield* svc.registerProject("/tmp/project-b");
				yield* svc.unregisterProject("/tmp/project-a");
				return yield* svc.load();
			}).pipe(Effect.provide(buildLayer())),
		);
		expect(result.projects).toEqual(["/tmp/project-b"]);
	});

	test("addManual adds alias (deduped)", async () => {
		const result = await Effect.runPromise(
			Effect.gen(function* () {
				const svc = yield* RegistryService;
				yield* svc.addManual("effect");
				yield* svc.addManual("effect"); // duplicate
				yield* svc.addManual("react");
				return yield* svc.load();
			}).pipe(Effect.provide(buildLayer())),
		);
		expect(result.manual).toEqual(["effect", "react"]);
	});

	test("removeManual removes alias", async () => {
		const result = await Effect.runPromise(
			Effect.gen(function* () {
				const svc = yield* RegistryService;
				yield* svc.addManual("effect");
				yield* svc.addManual("react");
				yield* svc.removeManual("effect");
				return yield* svc.load();
			}).pipe(Effect.provide(buildLayer())),
		);
		expect(result.manual).toEqual(["react"]);
	});

	test("getReferencedAliases returns union of shelffile aliases + manual", async () => {
		const projectDir = await mkdtemp(join(tmpdir(), "shelf-project-"));
		const shelffileData: Shelffile = {
			entries: [
				{ alias: "lib-a", url: "https://github.com/test/lib-a.git", pin: Option.none() },
				{ alias: "lib-b", url: "https://github.com/test/lib-b.git", pin: Option.none() },
			],
		};
		const layer = buildLayer({
			read: (dir: string) => {
				if (dir === projectDir) return Effect.succeed(shelffileData);
				return Effect.fail(new ShelffileNotFoundError({ path: dir }));
			},
		});
		const result = await Effect.runPromise(
			Effect.gen(function* () {
				const svc = yield* RegistryService;
				yield* svc.addManual("manual-repo");
				yield* svc.registerProject(projectDir);
				return yield* svc.getReferencedAliases();
			}).pipe(Effect.provide(layer)),
		);
		expect(result.has("lib-a")).toBe(true);
		expect(result.has("lib-b")).toBe(true);
		expect(result.has("manual-repo")).toBe(true);
		await rm(projectDir, { recursive: true, force: true });
	});

	test("getReferencedAliases gracefully handles missing shelffiles", async () => {
		const projectDir = await mkdtemp(join(tmpdir(), "shelf-project-"));
		const layer = buildLayer({
			read: () => Effect.fail(new ShelffileNotFoundError({ path: "test" })),
		});
		const result = await Effect.runPromise(
			Effect.gen(function* () {
				const svc = yield* RegistryService;
				yield* svc.addManual("manual-repo");
				yield* svc.registerProject(projectDir);
				return yield* svc.getReferencedAliases();
			}).pipe(Effect.provide(layer)),
		);
		expect(result.has("manual-repo")).toBe(true);
		expect(result.size).toBe(1);
		await rm(projectDir, { recursive: true, force: true });
	});
});
