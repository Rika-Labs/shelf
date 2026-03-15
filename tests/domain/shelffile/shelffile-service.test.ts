import { describe, test, expect, beforeEach, afterEach } from "bun:test";
import * as Effect from "effect/Effect";
import * as Option from "effect/Option";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { ShelffileService } from "../../../src/domain/shelffile/shelffile-service";
import { RepoPin } from "../../../src/domain/config/config-schema";

describe("ShelffileService", () => {
	let tempDir: string;

	beforeEach(async () => {
		tempDir = await mkdtemp(join(tmpdir(), "shelf-shelffile-test-"));
	});

	afterEach(async () => {
		await rm(tempDir, { recursive: true, force: true });
	});

	const run = <A, E>(effect: Effect.Effect<A, E, ShelffileService>) =>
		Effect.runPromise(effect.pipe(Effect.provide(ShelffileService.layer)));

	const runExit = <A, E>(effect: Effect.Effect<A, E, ShelffileService>) =>
		Effect.runPromiseExit(effect.pipe(Effect.provide(ShelffileService.layer)));

	test("read returns ShelffileNotFoundError when file missing", async () => {
		const exit = await runExit(
			Effect.gen(function* () {
				const svc = yield* ShelffileService;
				return yield* svc.read(tempDir);
			}),
		);
		expect(exit._tag).toBe("Failure");
	});

	test("read parses valid shelffile", async () => {
		await Bun.write(
			join(tempDir, "shelffile"),
			"effect https://github.com/Effect-TS/effect.git pin:branch:main\n",
		);
		const result = await run(
			Effect.gen(function* () {
				const svc = yield* ShelffileService;
				return yield* svc.read(tempDir);
			}),
		);
		expect(result.entries.length).toBe(1);
		expect(result.entries[0]!.alias).toBe("effect");
	});

	test("read returns ShelffileParseError on corrupt content", async () => {
		await Bun.write(join(tempDir, "shelffile"), "only-alias\n");
		const exit = await runExit(
			Effect.gen(function* () {
				const svc = yield* ShelffileService;
				return yield* svc.read(tempDir);
			}),
		);
		expect(exit._tag).toBe("Failure");
	});

	test("write + read round-trip", async () => {
		const shelffile = {
			entries: [
				{
					alias: "react",
					url: "https://github.com/facebook/react.git",
					pin: Option.some(new RepoPin({ type: "tag", value: "v19.0.0" })),
				},
			],
		};
		const result = await run(
			Effect.gen(function* () {
				const svc = yield* ShelffileService;
				yield* svc.write(tempDir, shelffile);
				return yield* svc.read(tempDir);
			}),
		);
		expect(result.entries.length).toBe(1);
		expect(result.entries[0]!.alias).toBe("react");
		expect(Option.isSome(result.entries[0]!.pin)).toBe(true);
	});

	test("exists returns false when no file", async () => {
		const result = await run(
			Effect.gen(function* () {
				const svc = yield* ShelffileService;
				return yield* svc.exists(tempDir);
			}),
		);
		expect(result).toBe(false);
	});

	test("exists returns true when file present", async () => {
		await Bun.write(join(tempDir, "shelffile"), "effect https://github.com/test/effect.git\n");
		const result = await run(
			Effect.gen(function* () {
				const svc = yield* ShelffileService;
				return yield* svc.exists(tempDir);
			}),
		);
		expect(result).toBe(true);
	});
});
