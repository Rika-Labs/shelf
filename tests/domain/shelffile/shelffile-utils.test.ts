import { describe, test, expect } from "bun:test";
import * as Option from "effect/Option";
import { RepoPin } from "../../../src/domain/config/config-schema";
import {
	parseShelffile,
	serializeShelffile,
	parseShelffilePin,
	parseShelffileLine,
} from "../../../src/domain/shelffile/shelffile-utils";
import { ShelffileParseError } from "../../../src/domain/shelffile/shelffile-errors";

describe("shelffile-utils", () => {
	describe("parseShelffilePin", () => {
		test("parses branch pin", () => {
			const pin = parseShelffilePin("pin:branch:main");
			expect(pin.type).toBe("branch");
			expect(pin.value).toBe("main");
		});

		test("parses tag pin", () => {
			const pin = parseShelffilePin("pin:tag:v1.0.0");
			expect(pin.type).toBe("tag");
			expect(pin.value).toBe("v1.0.0");
		});

		test("parses commit pin (40-char hash)", () => {
			const hash = "abc123def456abc123def456abc123def456abc1";
			const pin = parseShelffilePin(`pin:${hash}`);
			expect(pin.type).toBe("commit");
			expect(pin.value).toBe(hash);
		});

		test("throws on missing pin: prefix", () => {
			expect(() => parseShelffilePin("branch:main")).toThrow(ShelffileParseError);
		});

		test("throws on invalid pin format", () => {
			expect(() => parseShelffilePin("pin:invalid")).toThrow(ShelffileParseError);
		});
	});

	describe("parseShelffileLine", () => {
		test("parses alias and url", () => {
			const entry = parseShelffileLine("effect https://github.com/Effect-TS/effect.git", 1);
			expect(entry.alias).toBe("effect");
			expect(entry.url).toBe("https://github.com/Effect-TS/effect.git");
			expect(Option.isNone(entry.pin)).toBe(true);
		});

		test("parses alias, url, and pin", () => {
			const entry = parseShelffileLine(
				"react https://github.com/facebook/react.git pin:tag:v19.0.0",
				1,
			);
			expect(entry.alias).toBe("react");
			expect(entry.url).toBe("https://github.com/facebook/react.git");
			expect(Option.isSome(entry.pin)).toBe(true);
			if (Option.isSome(entry.pin)) {
				expect(entry.pin.value.type).toBe("tag");
				expect(entry.pin.value.value).toBe("v19.0.0");
			}
		});

		test("throws on line with only alias", () => {
			expect(() => parseShelffileLine("effect", 1)).toThrow(ShelffileParseError);
		});
	});

	describe("parseShelffile", () => {
		test("parses valid shelffile", () => {
			const content = [
				"effect https://github.com/Effect-TS/effect.git pin:branch:main",
				"react https://github.com/facebook/react.git pin:tag:v19.0.0",
			].join("\n");
			const shelffile = parseShelffile(content);
			expect(shelffile.entries.length).toBe(2);
			expect(shelffile.entries[0]!.alias).toBe("effect");
			expect(shelffile.entries[1]!.alias).toBe("react");
		});

		test("ignores blank lines and comments", () => {
			const content = [
				"# This is a comment",
				"",
				"effect https://github.com/Effect-TS/effect.git",
				"",
				"# Another comment",
				"react https://github.com/facebook/react.git",
			].join("\n");
			const shelffile = parseShelffile(content);
			expect(shelffile.entries.length).toBe(2);
		});

		test("parses empty content", () => {
			const shelffile = parseShelffile("");
			expect(shelffile.entries.length).toBe(0);
		});

		test("parses entries without pins", () => {
			const content = "effect https://github.com/Effect-TS/effect.git\n";
			const shelffile = parseShelffile(content);
			expect(shelffile.entries.length).toBe(1);
			expect(Option.isNone(shelffile.entries[0]!.pin)).toBe(true);
		});

		test("throws on malformed line", () => {
			const content = "only-alias\n";
			expect(() => parseShelffile(content)).toThrow(ShelffileParseError);
		});
	});

	describe("serializeShelffile", () => {
		test("serializes entries without pins", () => {
			const shelffile = {
				entries: [
					{ alias: "effect", url: "https://github.com/Effect-TS/effect.git", pin: Option.none() },
				],
			};
			const result = serializeShelffile(shelffile);
			expect(result).toBe("effect https://github.com/Effect-TS/effect.git\n");
		});

		test("serializes entries with branch pin", () => {
			const shelffile = {
				entries: [
					{
						alias: "effect",
						url: "https://github.com/Effect-TS/effect.git",
						pin: Option.some(new RepoPin({ type: "branch", value: "main" })),
					},
				],
			};
			const result = serializeShelffile(shelffile);
			expect(result).toBe("effect https://github.com/Effect-TS/effect.git pin:branch:main\n");
		});

		test("serializes entries with tag pin", () => {
			const shelffile = {
				entries: [
					{
						alias: "react",
						url: "https://github.com/facebook/react.git",
						pin: Option.some(new RepoPin({ type: "tag", value: "v19.0.0" })),
					},
				],
			};
			const result = serializeShelffile(shelffile);
			expect(result).toBe("react https://github.com/facebook/react.git pin:tag:v19.0.0\n");
		});

		test("serializes entries with commit pin", () => {
			const hash = "abc123def456abc123def456abc123def456abc1";
			const shelffile = {
				entries: [
					{
						alias: "lib",
						url: "https://github.com/test/lib.git",
						pin: Option.some(new RepoPin({ type: "commit", value: hash })),
					},
				],
			};
			const result = serializeShelffile(shelffile);
			expect(result).toBe(`lib https://github.com/test/lib.git pin:${hash}\n`);
		});
	});

	describe("round-trip", () => {
		test("parse → serialize → parse produces same result", () => {
			const content = [
				"effect https://github.com/Effect-TS/effect.git pin:branch:main",
				"react https://github.com/facebook/react.git pin:tag:v19.0.0",
				"lib https://github.com/test/lib.git",
			].join("\n");
			const parsed = parseShelffile(content);
			const serialized = serializeShelffile(parsed);
			const reparsed = parseShelffile(serialized);
			expect(reparsed.entries.length).toBe(parsed.entries.length);
			for (let i = 0; i < parsed.entries.length; i++) {
				const original = parsed.entries[i]!;
				const roundTripped = reparsed.entries[i]!;
				expect(roundTripped.alias).toBe(original.alias);
				expect(roundTripped.url).toBe(original.url);
				const origPin = original.pin;
				const rtPin = roundTripped.pin;
				if (Option.isSome(origPin)) {
					expect(Option.isSome(rtPin)).toBe(true);
					if (Option.isSome(rtPin)) {
						expect(rtPin.value.type).toBe(origPin.value.type);
						expect(rtPin.value.value).toBe(origPin.value.value);
					}
				} else {
					expect(Option.isNone(rtPin)).toBe(true);
				}
			}
		});
	});
});
