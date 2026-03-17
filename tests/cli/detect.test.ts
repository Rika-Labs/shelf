import { describe, test, expect, beforeEach, afterEach } from "bun:test";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

const CLI = join(import.meta.dir, "../../src/startup/index.ts");

const runShelf = async (
	args: string[],
	cwd?: string,
): Promise<{ stdout: string; stderr: string; exitCode: number; output: string }> => {
	const proc = Bun.spawn(["bun", "run", CLI, ...args], {
		stdout: "pipe",
		stderr: "pipe",
		cwd: cwd ?? process.cwd(),
	});
	const exitCode = await proc.exited;
	const stdout = await new Response(proc.stdout as ReadableStream).text();
	const stderr = await new Response(proc.stderr as ReadableStream).text();
	return { stdout, stderr, exitCode, output: stdout + stderr };
};

describe("detect command", () => {
	let tempDir: string;

	beforeEach(async () => {
		tempDir = await mkdtemp(join(tmpdir(), "shelf-detect-cli-"));
	});

	afterEach(async () => {
		await rm(tempDir, { recursive: true, force: true });
	});

	test("reports no repos when no dependency files exist", async () => {
		const result = await runShelf(["detect", "--dir", tempDir]);
		expect(result.exitCode).toBe(0);
		expect(result.output).toContain("No repos detected");
	});

	test("detects known repos from package.json", async () => {
		await Bun.write(
			join(tempDir, "package.json"),
			JSON.stringify({ dependencies: { react: "^18.2.0", zod: "^3.22.0" } }),
		);
		const result = await runShelf(["detect", "--dir", tempDir]);
		expect(result.exitCode).toBe(0);
		// Should mention react and zod regardless of shelved status
		expect(result.output).toContain("react");
		expect(result.output).toContain("zod");
	});

	test("detects repos from go.mod", async () => {
		await Bun.write(
			join(tempDir, "go.mod"),
			`module example.com/myapp

go 1.21

require (
	github.com/gin-gonic/gin v1.9.1
)`,
		);
		const result = await runShelf(["detect", "--dir", tempDir]);
		expect(result.exitCode).toBe(0);
		expect(result.output).toContain("gin");
	});

	test("handles empty directory gracefully", async () => {
		const result = await runShelf(["detect", "--dir", tempDir]);
		expect(result.exitCode).toBe(0);
		expect(result.output).toContain("No repos detected");
	});

	test("handles directory with invalid package.json", async () => {
		await Bun.write(join(tempDir, "package.json"), "not valid json");
		const result = await runShelf(["detect", "--dir", tempDir]);
		expect(result.exitCode).toBe(0);
		// Should not crash
	});

	test("detects packages not in registry from npm", async () => {
		// Use a package that's likely NOT already shelved and IS in npm
		await Bun.write(
			join(tempDir, "package.json"),
			JSON.stringify({ dependencies: { express: "^4.18.0" } }),
		);
		const result = await runShelf(["detect", "--dir", tempDir]);
		expect(result.exitCode).toBe(0);
		expect(result.output).toContain("express");
	});
});
