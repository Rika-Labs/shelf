import { describe, expect, test } from "bun:test";
import {
	classifyInput,
	expandOwnerRepo,
	expandPrefixed,
	deriveAliasFromOwnerRepo,
} from "../../../src/domain/resolve/resolve-utils";

describe("classifyInput", () => {
	test("classifies HTTPS URLs as url", () => {
		expect(classifyInput("https://github.com/facebook/react.git")).toBe("url");
		expect(classifyInput("https://gitlab.com/org/repo.git")).toBe("url");
		expect(classifyInput("http://example.com/repo.git")).toBe("url");
	});

	test("classifies SSH URLs as ssh", () => {
		expect(classifyInput("git@github.com:facebook/react.git")).toBe("ssh");
		expect(classifyInput("git@gitlab.com:org/repo.git")).toBe("ssh");
	});

	test("classifies prefixed inputs", () => {
		expect(classifyInput("github:facebook/react")).toBe("prefixed");
		expect(classifyInput("gitlab:org/repo")).toBe("prefixed");
		expect(classifyInput("bitbucket:org/repo")).toBe("prefixed");
	});

	test("classifies owner/repo inputs", () => {
		expect(classifyInput("facebook/react")).toBe("owner-repo");
		expect(classifyInput("Effect-TS/effect")).toBe("owner-repo");
		expect(classifyInput("vercel/next.js")).toBe("owner-repo");
	});

	test("classifies bare names", () => {
		expect(classifyInput("react")).toBe("bare-name");
		expect(classifyInput("effect")).toBe("bare-name");
		expect(classifyInput("my-cool-lib")).toBe("bare-name");
	});
});

describe("expandOwnerRepo", () => {
	test("expands to GitHub HTTPS URL", () => {
		expect(expandOwnerRepo("facebook/react")).toBe("https://github.com/facebook/react.git");
		expect(expandOwnerRepo("Effect-TS/effect")).toBe("https://github.com/Effect-TS/effect.git");
	});
});

describe("expandPrefixed", () => {
	test("expands github prefix", () => {
		const result = expandPrefixed("github:facebook/react");
		expect(result.url).toBe("https://github.com/facebook/react.git");
		expect(result.host).toBe("github.com");
		expect(result.ownerRepo).toBe("facebook/react");
	});

	test("expands gitlab prefix", () => {
		const result = expandPrefixed("gitlab:org/repo");
		expect(result.url).toBe("https://gitlab.com/org/repo.git");
		expect(result.host).toBe("gitlab.com");
	});

	test("expands bitbucket prefix", () => {
		const result = expandPrefixed("bitbucket:org/repo");
		expect(result.url).toBe("https://bitbucket.org/org/repo.git");
		expect(result.host).toBe("bitbucket.org");
	});
});

describe("deriveAliasFromOwnerRepo", () => {
	test("uses the repo name as alias", () => {
		expect(deriveAliasFromOwnerRepo("facebook/react")).toBe("react");
		expect(deriveAliasFromOwnerRepo("Effect-TS/effect")).toBe("effect");
	});

	test("strips .git suffix", () => {
		expect(deriveAliasFromOwnerRepo("facebook/react.git")).toBe("react");
	});
});
