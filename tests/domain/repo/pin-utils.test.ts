import { describe, test, expect } from "bun:test";
import {
	stripSemverRange,
	candidateTags,
	parseRemoteTags,
	findMatchingTag,
} from "../../../src/domain/repo/pin-utils";

describe("pin-utils", () => {
	describe("stripSemverRange", () => {
		test("strips ^ prefix", () => {
			expect(stripSemverRange("^1.2.3")).toBe("1.2.3");
		});

		test("strips ~ prefix", () => {
			expect(stripSemverRange("~1.2.3")).toBe("1.2.3");
		});

		test("strips >= prefix", () => {
			expect(stripSemverRange(">=1.0.0")).toBe("1.0.0");
		});

		test("passes through bare version", () => {
			expect(stripSemverRange("1.2.3")).toBe("1.2.3");
		});

		test("handles prerelease versions", () => {
			expect(stripSemverRange("^4.0.0-beta.31")).toBe("4.0.0-beta.31");
		});
	});

	describe("candidateTags", () => {
		test("generates candidates in priority order", () => {
			const tags = candidateTags("effect", "4.0.0-beta.31");
			expect(tags).toEqual(["v4.0.0-beta.31", "effect@4.0.0-beta.31", "4.0.0-beta.31"]);
		});

		test("handles scoped packages", () => {
			const tags = candidateTags("@effect/platform-bun", "4.0.0-beta.31");
			expect(tags).toEqual(["v4.0.0-beta.31", "platform-bun@4.0.0-beta.31", "4.0.0-beta.31"]);
		});
	});

	describe("parseRemoteTags", () => {
		test("parses ls-remote output", () => {
			const output = [
				"abc123\trefs/tags/v1.0.0",
				"def456\trefs/tags/v2.0.0",
				"ghi789\trefs/tags/v2.0.0^{}",
			].join("\n");
			const tags = parseRemoteTags(output);
			expect(tags.has("v1.0.0")).toBe(true);
			expect(tags.has("v2.0.0")).toBe(true);
			expect(tags.has("v2.0.0^{}")).toBe(false);
			expect(tags.size).toBe(2);
		});

		test("handles empty output", () => {
			expect(parseRemoteTags("").size).toBe(0);
		});

		test("ignores non-tag refs", () => {
			const output = "abc123\trefs/heads/main\ndef456\trefs/tags/v1.0.0";
			const tags = parseRemoteTags(output);
			expect(tags.size).toBe(1);
			expect(tags.has("v1.0.0")).toBe(true);
		});
	});

	describe("findMatchingTag", () => {
		test("matches v-prefixed tag first", () => {
			const tags = new Set(["v1.0.0", "effect@1.0.0", "1.0.0"]);
			expect(findMatchingTag("effect", "1.0.0", tags)).toBe("v1.0.0");
		});

		test("falls back to package@version format", () => {
			const tags = new Set(["effect@1.0.0", "1.0.0"]);
			expect(findMatchingTag("effect", "1.0.0", tags)).toBe("effect@1.0.0");
		});

		test("falls back to bare version", () => {
			const tags = new Set(["1.0.0"]);
			expect(findMatchingTag("effect", "1.0.0", tags)).toBe("1.0.0");
		});

		test("returns null when no match", () => {
			const tags = new Set(["v2.0.0"]);
			expect(findMatchingTag("effect", "1.0.0", tags)).toBe(null);
		});
	});
});
