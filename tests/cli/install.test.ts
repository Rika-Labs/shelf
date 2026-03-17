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

describe("install command", () => {
	let tempDir: string;
	const aliases: string[] = [];

	beforeEach(async () => {
		tempDir = await mkdtemp(join(tmpdir(), "shelf-install-test-"));
	});

	afterEach(async () => {
		for (const alias of aliases) {
			await runShelf(["remove", alias]);
		}
		aliases.length = 0;
		await rm(tempDir, { recursive: true, force: true });
	});

	test("installs single repo from shelffile", async () => {
		const alias = uniqueAlias("install");
		aliases.push(alias);

		const repo = await createBareRepo({ "lib.ts": "export const a = 1;" });
		await Bun.write(join(tempDir, "shelffile"), `${alias} ${repo.dir}\n`);

		const result = await runShelf(["install", "--dir", tempDir]);
		expect(result.exitCode).toBe(0);
		expect(result.output).toContain("Install complete");
		expect(result.output).toContain("1 added");
		expect(result.output).toContain(`Added "${alias}"`);

		await repo.cleanup();
	});

	test("installs multiple repos from shelffile", async () => {
		const alias1 = uniqueAlias("multi1");
		const alias2 = uniqueAlias("multi2");
		aliases.push(alias1, alias2);

		const repo1 = await createBareRepo({ "lib1.ts": "export const a = 1;" });
		const repo2 = await createBareRepo({ "lib2.ts": "export const b = 2;" });

		await Bun.write(join(tempDir, "shelffile"), `${alias1} ${repo1.dir}\n${alias2} ${repo2.dir}\n`);

		const result = await runShelf(["install", "--dir", tempDir]);
		expect(result.exitCode).toBe(0);
		expect(result.output).toContain("Install complete");
		expect(result.output).toContain("2 added");

		await repo1.cleanup();
		await repo2.cleanup();
	});

	test("reports already-present repos on re-install", async () => {
		const alias = uniqueAlias("reinstall");
		aliases.push(alias);

		const repo = await createBareRepo({ "lib.ts": "export {};" });
		await Bun.write(join(tempDir, "shelffile"), `${alias} ${repo.dir}\n`);

		await runShelf(["install", "--dir", tempDir]);
		const result = await runShelf(["install", "--dir", tempDir]);
		expect(result.exitCode).toBe(0);
		expect(result.output).toContain("1 already present");

		await repo.cleanup();
	});

	test("reports error for missing shelffile", async () => {
		const result = await runShelf(["install", "--dir", tempDir]);
		expect(result.output).toContain("No shelffile found");
	});

	test("accepts --concurrency flag", async () => {
		const alias = uniqueAlias("conc");
		aliases.push(alias);

		const repo = await createBareRepo({ "lib.ts": "export {};" });
		await Bun.write(join(tempDir, "shelffile"), `${alias} ${repo.dir}\n`);

		const result = await runShelf(["install", "--dir", tempDir, "--concurrency", "2"]);
		expect(result.exitCode).toBe(0);
		expect(result.output).toContain("concurrency: 2");

		await repo.cleanup();
	});
});
