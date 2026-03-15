import { describe, test, expect, beforeEach, afterEach } from "bun:test";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
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
	const stdout = await new Response(proc.stdout).text();
	const stderr = await new Response(proc.stderr).text();
	return { stdout, stderr, exitCode, output: stdout + stderr };
};

describe("CLI integration", () => {
	describe("list", () => {
		test("returns successfully", async () => {
			const result = await runShelf(["list"]);
			expect(result.exitCode).toBe(0);
		});
	});

	describe("remove", () => {
		test("shows clean error for non-existent repo", async () => {
			const result = await runShelf(["remove", "does-not-exist-xyzzy"]);
			expect(result.stderr).toContain('Repo "does-not-exist-xyzzy" not found');
			expect(result.stderr).not.toContain("at <anonymous>");
			expect(result.exitCode).toBe(0);
		});
	});

	describe("init", () => {
		let tempDir: string;

		beforeEach(async () => {
			tempDir = await mkdtemp(join(tmpdir(), "shelf-init-test-"));
		});

		afterEach(async () => {
			await rm(tempDir, { recursive: true, force: true });
		});

		test("default creates .agents/skills/shelf/SKILL.md", async () => {
			const proc = Bun.spawn(["bun", "run", CLI, "init"], {
				cwd: tempDir,
				stdout: "pipe",
				stderr: "pipe",
			});
			await proc.exited;
			const skillFile = Bun.file(join(tempDir, ".agents", "skills", "shelf", "SKILL.md"));
			expect(await skillFile.exists()).toBe(true);
			const content = await skillFile.text();
			expect(content).toContain("shelf");
		});

		test("--agent claude creates .claude/skills/shelf/SKILL.md", async () => {
			const proc = Bun.spawn(["bun", "run", CLI, "init", "--agent", "claude"], {
				cwd: tempDir,
				stdout: "pipe",
				stderr: "pipe",
			});
			await proc.exited;
			const skillFile = Bun.file(join(tempDir, ".claude", "skills", "shelf", "SKILL.md"));
			expect(await skillFile.exists()).toBe(true);
		});

		test("--agent opencode creates .opencode/skills/shelf/SKILL.md", async () => {
			const proc = Bun.spawn(["bun", "run", CLI, "init", "--agent", "opencode"], {
				cwd: tempDir,
				stdout: "pipe",
				stderr: "pipe",
			});
			await proc.exited;
			const skillFile = Bun.file(join(tempDir, ".opencode", "skills", "shelf", "SKILL.md"));
			expect(await skillFile.exists()).toBe(true);
		});

		test("--agent gemini creates .gemini/skills/shelf/SKILL.md", async () => {
			const proc = Bun.spawn(["bun", "run", CLI, "init", "--agent", "gemini"], {
				cwd: tempDir,
				stdout: "pipe",
				stderr: "pipe",
			});
			await proc.exited;
			const skillFile = Bun.file(join(tempDir, ".gemini", "skills", "shelf", "SKILL.md"));
			expect(await skillFile.exists()).toBe(true);
		});
	});

	describe("add + remove lifecycle", () => {
		test("add clones a repo and remove deletes it", async () => {
			const alias = uniqueAlias("lifecycle");
			const bareRepo = await createBareRepo({ "lib.ts": "export const x = 1;" });

			const addResult = await runShelf(["add", bareRepo.dir, "--alias", alias]);
			expect(addResult.exitCode).toBe(0);
			expect(addResult.output).toContain("Added");

			const listResult = await runShelf(["list"]);
			expect(listResult.output).toContain(alias);

			const removeResult = await runShelf(["remove", alias]);
			expect(removeResult.exitCode).toBe(0);
			expect(removeResult.output).toContain("Removed");

			await bareRepo.cleanup();
		});
	});

	describe("error formatting", () => {
		test("add duplicate repo shows clean error", async () => {
			const alias = uniqueAlias("dup");
			const bareRepo = await createBareRepo({ "test.ts": "export {};" });

			await runShelf(["add", bareRepo.dir, "--alias", alias]);
			const dupResult = await runShelf(["add", bareRepo.dir, "--alias", alias]);
			expect(dupResult.stderr).toContain("already exists");
			expect(dupResult.stderr).not.toContain("at <anonymous>");

			// Cleanup
			await runShelf(["remove", alias]);
			await bareRepo.cleanup();
		});
	});
});
