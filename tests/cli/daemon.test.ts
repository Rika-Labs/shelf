import { describe, test, expect } from "bun:test";
import { join } from "node:path";

const CLI = join(import.meta.dir, "../../src/startup/index.ts");

const runShelf = async (
	args: string[],
): Promise<{ stdout: string; stderr: string; exitCode: number; output: string }> => {
	const proc = Bun.spawn(["bun", "run", CLI, ...args], {
		stdout: "pipe",
		stderr: "pipe",
	});
	const exitCode = await proc.exited;
	const stdout = await new Response(proc.stdout).text();
	const stderr = await new Response(proc.stderr).text();
	return { stdout, stderr, exitCode, output: stdout + stderr };
};

describe("daemon command", () => {
	test("daemon status returns successfully", async () => {
		const result = await runShelf(["daemon", "status"]);
		expect(result.exitCode).toBe(0);
		// Should report running or not running
		const output = result.output.toLowerCase();
		expect(output.includes("running") || output.includes("not running")).toBe(true);
	});

	test("daemon stop shows clean output", async () => {
		const result = await runShelf(["daemon", "stop"]);
		// Should either stop a running daemon or show a clean error
		expect(result.output).not.toContain("at <anonymous>");
		const output = result.output.toLowerCase();
		expect(output.includes("stopped") || output.includes("no daemon")).toBe(true);
	});

	test("daemon logs returns successfully", async () => {
		const result = await runShelf(["daemon", "logs"]);
		expect(result.exitCode).toBe(0);
	});

	test("daemon logs with --lines flag works", async () => {
		const result = await runShelf(["daemon", "logs", "--lines", "10"]);
		expect(result.exitCode).toBe(0);
	});
});
