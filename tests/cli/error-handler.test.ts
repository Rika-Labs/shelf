import { describe, test, expect } from "bun:test";
import { formatUserError } from "../../src/cli/error-handler";

describe("formatUserError", () => {
	test("formats ResolveError", () => {
		const error = { _tag: "ResolveError", input: "foobar", message: "Not found" };
		const result = formatUserError(error);
		expect(result).toBe('Could not resolve "foobar": Not found');
	});

	test("formats DetectError", () => {
		const error = { _tag: "DetectError", message: "No package.json found" };
		const result = formatUserError(error);
		expect(result).toBe("Detection failed: No package.json found");
	});

	test("formats DaemonAlreadyRunningError", () => {
		const error = { _tag: "DaemonAlreadyRunningError", pid: 12_345 };
		const result = formatUserError(error);
		expect(result).toBe("Daemon is already running (PID: 12345).");
	});

	test("formats DaemonNotRunningError", () => {
		const error = { _tag: "DaemonNotRunningError" };
		const result = formatUserError(error);
		expect(result).toBe("No daemon is currently running.");
	});

	test("formats DaemonStartError", () => {
		const error = { _tag: "DaemonStartError", message: "Spawn failed" };
		const result = formatUserError(error);
		expect(result).toBe("Failed to start daemon: Spawn failed");
	});

	test("formats RepoNotFoundError", () => {
		const error = { _tag: "RepoNotFoundError", alias: "test-repo" };
		const result = formatUserError(error);
		expect(result).toContain("test-repo");
		expect(result).toContain("not found");
	});

	test("formats RepoAlreadyExistsError", () => {
		const error = { _tag: "RepoAlreadyExistsError", alias: "test-repo" };
		const result = formatUserError(error);
		expect(result).toContain("already exists");
	});

	test("formats GitOperationError", () => {
		const error = { _tag: "GitOperationError", message: "clone failed" };
		const result = formatUserError(error);
		expect(result).toContain("Git error");
	});

	test("formats ShelffileNotFoundError", () => {
		const error = { _tag: "ShelffileNotFoundError", path: "/tmp/shelffile" };
		const result = formatUserError(error);
		expect(result).toContain("No shelffile found");
	});

	test("returns null for unknown error types", () => {
		const error = { _tag: "SomeRandomError" };
		expect(formatUserError(error)).toBeNull();
	});

	test("returns null for non-tagged errors", () => {
		expect(formatUserError(new Error("plain error"))).toBeNull();
	});

	test("returns null for null", () => {
		expect(formatUserError(null)).toBeNull();
	});

	test("returns null for undefined", () => {
		expect(formatUserError(undefined)).toBeNull();
	});

	test("returns null for string", () => {
		expect(formatUserError("some error")).toBeNull();
	});
});
