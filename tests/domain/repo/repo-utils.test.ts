import { describe, test, expect } from "bun:test";
import { deriveAlias } from "../../../src/domain/repo/repo-utils";

describe("deriveAlias", () => {
	test("derives from HTTPS URL", () => {
		expect(deriveAlias("https://github.com/Effect-TS/effect.git")).toBe("effect");
	});

	test("derives from git@ URL", () => {
		expect(deriveAlias("git@github.com:Effect-TS/effect.git")).toBe("effect");
	});

	test("strips .git suffix", () => {
		expect(deriveAlias("https://github.com/user/my-repo.git")).toBe("my-repo");
	});

	test("handles trailing slashes", () => {
		expect(deriveAlias("https://github.com/user/my-repo/")).toBe("my-repo");
	});

	test("handles URL without .git suffix", () => {
		expect(deriveAlias("https://github.com/user/my-repo")).toBe("my-repo");
	});

	test("handles git@ URL with trailing slash", () => {
		expect(deriveAlias("git@github.com:user/my-repo.git/")).toBe("my-repo");
	});

	test("handles simple path-like URL", () => {
		expect(deriveAlias("https://gitlab.com/group/subgroup/project")).toBe("project");
	});
});
