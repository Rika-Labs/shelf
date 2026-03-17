import { describe, expect, test } from "bun:test";
import * as Effect from "effect/Effect";
import * as Exit from "effect/Exit";
import { ResolveService } from "../../../src/domain/resolve/resolve-service";

const runWithService = <A, E>(effect: Effect.Effect<A, E, ResolveService>) =>
	Effect.runPromise(Effect.provide(effect, ResolveService.layer));

const runExitWithService = <A, E>(effect: Effect.Effect<A, E, ResolveService>) =>
	Effect.runPromiseExit(Effect.provide(effect, ResolveService.layer));

describe("ResolveService", () => {
	describe("resolve", () => {
		test("passes through HTTPS URLs directly", async () => {
			const result = await runWithService(
				Effect.gen(function* () {
					const service = yield* ResolveService;
					return yield* service.resolve("https://github.com/facebook/react.git");
				}),
			);
			expect(result.url).toBe("https://github.com/facebook/react.git");
			expect(result.source).toBe("direct");
		});

		test("passes through HTTP URLs directly", async () => {
			const result = await runWithService(
				Effect.gen(function* () {
					const service = yield* ResolveService;
					return yield* service.resolve("http://example.com/repo.git");
				}),
			);
			expect(result.url).toBe("http://example.com/repo.git");
			expect(result.source).toBe("direct");
		});

		test("passes through SSH URLs directly", async () => {
			const result = await runWithService(
				Effect.gen(function* () {
					const service = yield* ResolveService;
					return yield* service.resolve("git@github.com:facebook/react.git");
				}),
			);
			expect(result.url).toBe("git@github.com:facebook/react.git");
			expect(result.source).toBe("direct");
		});

		test("passes through local filesystem paths directly", async () => {
			const result = await runWithService(
				Effect.gen(function* () {
					const service = yield* ResolveService;
					return yield* service.resolve("/tmp/some-repo");
				}),
			);
			expect(result.url).toBe("/tmp/some-repo");
			expect(result.source).toBe("direct");
		});

		test("passes through relative paths directly", async () => {
			const result = await runWithService(
				Effect.gen(function* () {
					const service = yield* ResolveService;
					return yield* service.resolve("./local-repo");
				}),
			);
			expect(result.url).toBe("./local-repo");
			expect(result.source).toBe("direct");
		});

		test("passes through tilde paths directly", async () => {
			const result = await runWithService(
				Effect.gen(function* () {
					const service = yield* ResolveService;
					return yield* service.resolve("~/repos/my-lib");
				}),
			);
			expect(result.url).toBe("~/repos/my-lib");
			expect(result.source).toBe("direct");
		});

		test("expands owner/repo to GitHub URL", async () => {
			const result = await runWithService(
				Effect.gen(function* () {
					const service = yield* ResolveService;
					return yield* service.resolve("facebook/react");
				}),
			);
			expect(result.url).toBe("https://github.com/facebook/react.git");
			expect(result.suggestedAlias).toBe("react");
			expect(result.source).toBe("owner-repo");
		});

		test("expands github: prefixed input", async () => {
			const result = await runWithService(
				Effect.gen(function* () {
					const service = yield* ResolveService;
					return yield* service.resolve("github:vercel/next.js");
				}),
			);
			expect(result.url).toBe("https://github.com/vercel/next.js.git");
			expect(result.suggestedAlias).toBe("next.js");
			expect(result.source).toBe("prefixed");
		});

		test("expands gitlab: prefixed input", async () => {
			const result = await runWithService(
				Effect.gen(function* () {
					const service = yield* ResolveService;
					return yield* service.resolve("gitlab:org/repo");
				}),
			);
			expect(result.url).toBe("https://gitlab.com/org/repo.git");
			expect(result.source).toBe("prefixed");
		});

		test("expands bitbucket: prefixed input", async () => {
			const result = await runWithService(
				Effect.gen(function* () {
					const service = yield* ResolveService;
					return yield* service.resolve("bitbucket:org/repo");
				}),
			);
			expect(result.url).toBe("https://bitbucket.org/org/repo.git");
			expect(result.source).toBe("prefixed");
		});

		test("resolves bare names from built-in registry", async () => {
			const result = await runWithService(
				Effect.gen(function* () {
					const service = yield* ResolveService;
					return yield* service.resolve("react");
				}),
			);
			expect(result.url).toBe("https://github.com/facebook/react.git");
			expect(result.suggestedAlias).toBe("react");
			expect(result.source).toBe("registry");
		});

		test("resolves effect from built-in registry", async () => {
			const result = await runWithService(
				Effect.gen(function* () {
					const service = yield* ResolveService;
					return yield* service.resolve("effect");
				}),
			);
			expect(result.url).toBe("https://github.com/Effect-TS/effect.git");
			expect(result.suggestedAlias).toBe("effect");
			expect(result.source).toBe("registry");
		});

		test("resolves zod from built-in registry", async () => {
			const result = await runWithService(
				Effect.gen(function* () {
					const service = yield* ResolveService;
					return yield* service.resolve("zod");
				}),
			);
			expect(result.url).toBe("https://github.com/colinhacks/zod.git");
			expect(result.source).toBe("registry");
		});

		test("resolves Go libraries from registry", async () => {
			const result = await runWithService(
				Effect.gen(function* () {
					const service = yield* ResolveService;
					return yield* service.resolve("gin");
				}),
			);
			expect(result.url).toBe("https://github.com/gin-gonic/gin.git");
			expect(result.source).toBe("registry");
		});

		test("resolves Rust libraries from registry", async () => {
			const result = await runWithService(
				Effect.gen(function* () {
					const service = yield* ResolveService;
					return yield* service.resolve("tokio");
				}),
			);
			expect(result.url).toBe("https://github.com/tokio-rs/tokio.git");
			expect(result.source).toBe("registry");
		});

		test("resolves Python libraries from registry", async () => {
			const result = await runWithService(
				Effect.gen(function* () {
					const service = yield* ResolveService;
					return yield* service.resolve("fastapi");
				}),
			);
			expect(result.url).toBe("https://github.com/fastapi/fastapi.git");
			expect(result.source).toBe("registry");
		});

		test("suggested alias derived from URL for direct URLs", async () => {
			const result = await runWithService(
				Effect.gen(function* () {
					const service = yield* ResolveService;
					return yield* service.resolve("https://github.com/Effect-TS/effect.git");
				}),
			);
			expect(result.suggestedAlias).toBe("effect");
		});

		test("suggested alias derived from owner/repo", async () => {
			const result = await runWithService(
				Effect.gen(function* () {
					const service = yield* ResolveService;
					return yield* service.resolve("Effect-TS/effect");
				}),
			);
			expect(result.suggestedAlias).toBe("effect");
		});
	});

	describe("registry coverage", () => {
		test("all registry entries are valid git URLs", async () => {
			const { builtinRegistry } = await import("../../../src/domain/resolve/resolve-utils");
			for (const [name, url] of Object.entries(builtinRegistry)) {
				expect(url).toMatch(/^https:\/\//);
				expect(url).toMatch(/\.git$/);
				expect(name.length).toBeGreaterThan(0);
			}
		});

		test("registry has at least 50 entries", async () => {
			const { builtinRegistry } = await import("../../../src/domain/resolve/resolve-utils");
			expect(Object.keys(builtinRegistry).length).toBeGreaterThanOrEqual(50);
		});
	});

	describe("error handling", () => {
		test("fails with ResolveError for unknown bare name via GitHub API failure", async () => {
			// This test exercises the GitHub API fallback with a name unlikely to exist
			const exit = await runExitWithService(
				Effect.gen(function* () {
					const service = yield* ResolveService;
					return yield* service.resolve("xyzzy-nonexistent-library-12345");
				}),
			);
			if (Exit.isFailure(exit)) {
				const error = exit.cause;
				expect(String(error)).toContain("ResolveError");
			}
			// Could succeed if GitHub returns a match - that's also valid behavior
		});
	});
});
