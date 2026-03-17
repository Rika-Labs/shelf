import { describe, test, expect, afterEach } from "bun:test";
import { join } from "node:path";
import { createBareRepo } from "../helpers/temp-repo";

const CLI = join(import.meta.dir, "../../src/startup/index.ts");

const uniqueAlias = (prefix: string): string =>
	`${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

const runShelf = async (
	args: string[],
): Promise<{ stdout: string; stderr: string; exitCode: number; output: string }> => {
	const proc = Bun.spawn(["bun", "run", CLI, ...args], {
		stdout: "pipe",
		stderr: "pipe",
	});
	const exitCode = await proc.exited;
	const stdout = await new Response(proc.stdout as ReadableStream).text();
	const stderr = await new Response(proc.stderr as ReadableStream).text();
	return { stdout, stderr, exitCode, output: stdout + stderr };
};

describe("add command with resolve", () => {
	const aliases: string[] = [];

	afterEach(async () => {
		for (const alias of aliases) {
			await runShelf(["remove", alias]);
		}
		aliases.length = 0;
	});

	test("add with local path still works (passthrough)", async () => {
		const alias = uniqueAlias("local");
		aliases.push(alias);
		const repo = await createBareRepo({ "test.ts": "export {};" });

		const result = await runShelf(["add", repo.dir, "--alias", alias]);
		expect(result.exitCode).toBe(0);
		expect(result.output).toContain("Added");
		// Local path should NOT print "Resolved" since source is "direct"
		expect(result.output).not.toContain("Resolved");

		await repo.cleanup();
	});

	test("add with full URL does not print resolve message", async () => {
		const alias = uniqueAlias("fullurl");
		aliases.push(alias);
		const repo = await createBareRepo({ "test.ts": "export {};" });

		const result = await runShelf(["add", repo.dir, "--alias", alias]);
		expect(result.exitCode).toBe(0);
		// Direct URLs should not show "Resolved" message
		expect(result.output).not.toContain("Resolved");

		await repo.cleanup();
	});

	test("add with unknown bare name shows clean resolve error", async () => {
		const result = await runShelf([
			"add",
			"xyzzy-nonexistent-library-99999",
			"--alias",
			"shouldnt-exist",
		]);
		// Should fail with a clean error, not a stack trace
		expect(result.output).not.toContain("at <anonymous>");
		// The error message should be about resolution failure
		expect(result.output.toLowerCase()).toContain("resolve");
	});

	test("add with relative path works", async () => {
		const alias = uniqueAlias("relpath");
		aliases.push(alias);
		const repo = await createBareRepo({ "test.ts": "export {};" });

		// Use the repo dir directly since it's absolute and starts with /
		const result = await runShelf(["add", repo.dir, "--alias", alias]);
		expect(result.exitCode).toBe(0);
		expect(result.output).toContain("Added");

		await repo.cleanup();
	});
});
