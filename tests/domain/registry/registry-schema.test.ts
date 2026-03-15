import { describe, test, expect } from "bun:test";
import {
	ShelfRegistry,
	defaultRegistry,
	encodeRegistry,
	decodeRegistry,
} from "../../../src/domain/registry/registry-schema";

describe("registry-schema", () => {
	describe("defaultRegistry", () => {
		test("has empty arrays", () => {
			expect(defaultRegistry.projects).toEqual([]);
			expect(defaultRegistry.manual).toEqual([]);
		});
	});

	describe("encodeRegistry / decodeRegistry", () => {
		test("round-trips default registry", () => {
			const encoded = encodeRegistry(defaultRegistry);
			const decoded = decodeRegistry(encoded);
			expect(decoded.projects).toEqual([]);
			expect(decoded.manual).toEqual([]);
		});

		test("round-trips registry with data", () => {
			const registry = new ShelfRegistry({
				projects: ["/Users/test/project-a", "/Users/test/project-b"],
				manual: ["effect", "react"],
			});
			const encoded = encodeRegistry(registry);
			const decoded = decodeRegistry(encoded);
			expect(decoded.projects).toEqual(["/Users/test/project-a", "/Users/test/project-b"]);
			expect(decoded.manual).toEqual(["effect", "react"]);
		});

		test("decodes valid JSON", () => {
			const raw = { projects: ["/tmp/proj"], manual: ["lib"] };
			const decoded = decodeRegistry(raw);
			expect(decoded.projects).toEqual(["/tmp/proj"]);
			expect(decoded.manual).toEqual(["lib"]);
		});

		test("throws on invalid schema", () => {
			expect(() => decodeRegistry({ projects: "invalid" })).toThrow();
		});

		test("throws on missing fields", () => {
			expect(() => decodeRegistry({})).toThrow();
		});
	});
});
