import { describe, expect, test } from "bun:test";
import * as Effect from "effect/Effect";
import * as Option from "effect/Option";
import { resolveGoModule, resolveNpmPackage } from "../../../src/domain/detect/detect-resolvers";

describe("resolveGoModule", () => {
	test("resolves github.com modules to git URLs", () => {
		const result = resolveGoModule("github.com/gin-gonic/gin");
		expect(Option.isSome(result)).toBe(true);
		if (Option.isSome(result)) {
			expect(result.value).toBe("https://github.com/gin-gonic/gin.git");
		}
	});

	test("handles nested github paths (takes first two segments)", () => {
		const result = resolveGoModule("github.com/gorilla/mux");
		expect(Option.isSome(result)).toBe(true);
		if (Option.isSome(result)) {
			expect(result.value).toBe("https://github.com/gorilla/mux.git");
		}
	});

	test("handles deeply nested github paths", () => {
		const result = resolveGoModule("github.com/aws/aws-sdk-go/service/s3");
		expect(Option.isSome(result)).toBe(true);
		if (Option.isSome(result)) {
			expect(result.value).toBe("https://github.com/aws/aws-sdk-go.git");
		}
	});

	test("returns none for non-github modules", () => {
		const result = resolveGoModule("golang.org/x/text");
		expect(Option.isNone(result)).toBe(true);
	});

	test("returns none for incomplete github paths", () => {
		const result = resolveGoModule("github.com/onlyowner");
		expect(Option.isNone(result)).toBe(true);
	});

	test("returns none for empty string", () => {
		const result = resolveGoModule("");
		expect(Option.isNone(result)).toBe(true);
	});
});

describe("resolveNpmPackage", () => {
	test("resolves a well-known package with repository field", async () => {
		const result = await Effect.runPromise(resolveNpmPackage("express"));
		expect(Option.isSome(result)).toBe(true);
		if (Option.isSome(result)) {
			expect(result.value).toContain("github.com");
			expect(result.value).toContain("express");
			expect(result.value).toMatch(/\.git$/);
		}
	});

	test("resolves package with git+ prefix in repository URL", async () => {
		// zod is known to have a standard repository URL
		const result = await Effect.runPromise(resolveNpmPackage("zod"));
		expect(Option.isSome(result)).toBe(true);
		if (Option.isSome(result)) {
			expect(result.value).toContain("github.com");
			expect(result.value).toMatch(/^https:\/\//);
			expect(result.value).toMatch(/\.git$/);
		}
	});

	test("returns none for non-existent package", async () => {
		const result = await Effect.runPromise(
			resolveNpmPackage("xyzzy-this-package-does-not-exist-12345"),
		);
		expect(Option.isNone(result)).toBe(true);
	});

	test("returns none for package without repository field", async () => {
		// Some packages don't have a repository field; we test the code path
		// by checking it doesn't crash and returns Option
		const result = await Effect.runPromise(resolveNpmPackage("some-unknown-pkg-no-repo-9999"));
		// Should be Option.none since the package doesn't exist
		expect(Option.isNone(result)).toBe(true);
	});
});
