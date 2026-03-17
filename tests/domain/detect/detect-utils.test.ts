import { describe, expect, test } from "bun:test";
import { parsePackageJson, parseGoMod } from "../../../src/domain/detect/detect-utils";

describe("parsePackageJson", () => {
	test("parses dependencies and devDependencies", () => {
		const content = JSON.stringify({
			dependencies: { react: "^18.2.0", next: "^14.0.0" },
			devDependencies: { vitest: "^1.0.0" },
		});
		const result = parsePackageJson(content);
		expect(result.length).toBe(3);
		expect(result[0]!.name).toBe("react");
		expect(result[0]!.version).toBe("^18.2.0");
		expect(result[0]!.source).toBe("npm");
		expect(result[2]!.name).toBe("vitest");
	});

	test("handles missing dependencies", () => {
		const content = JSON.stringify({ name: "my-package" });
		const result = parsePackageJson(content);
		expect(result.length).toBe(0);
	});

	test("handles invalid JSON", () => {
		const result = parsePackageJson("not json");
		expect(result.length).toBe(0);
	});

	test("handles empty object", () => {
		const result = parsePackageJson("{}");
		expect(result.length).toBe(0);
	});

	test("deduplicates deps that appear in both", () => {
		const content = JSON.stringify({
			dependencies: { react: "^18.2.0" },
			devDependencies: { react: "^18.3.0" },
		});
		const result = parsePackageJson(content);
		// devDependencies version overwrites since spread is { ...deps, ...devDeps }
		expect(result.length).toBe(1);
		expect(result[0]!.version).toBe("^18.3.0");
	});
});

describe("parseGoMod", () => {
	test("parses require block", () => {
		const content = `module example.com/myapp

go 1.21

require (
	github.com/gin-gonic/gin v1.9.1
	github.com/gorilla/mux v1.8.0
)`;
		const result = parseGoMod(content);
		expect(result.length).toBe(2);
		expect(result[0]!.name).toBe("github.com/gin-gonic/gin");
		expect(result[0]!.version).toBe("v1.9.1");
		expect(result[0]!.source).toBe("go");
	});

	test("parses single-line require", () => {
		const content = `module example.com/myapp

require github.com/gorilla/mux v1.8.0
`;
		const result = parseGoMod(content);
		expect(result.length).toBe(1);
		expect(result[0]!.name).toBe("github.com/gorilla/mux");
	});

	test("handles empty content", () => {
		const result = parseGoMod("");
		expect(result.length).toBe(0);
	});

	test("handles module with no requires", () => {
		const content = `module example.com/myapp

go 1.21
`;
		const result = parseGoMod(content);
		expect(result.length).toBe(0);
	});
});
