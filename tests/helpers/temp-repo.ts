import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

export const createTempRepo = async (
	files: Record<string, string> = { "README.md": "# Test Repo" },
): Promise<{ dir: string; cleanup: () => Promise<void> }> => {
	const dir = await mkdtemp(join(tmpdir(), "shelf-test-"));
	const spawn = (args: string[]) =>
		Bun.spawn(["git", ...args], { cwd: dir, stdout: "pipe", stderr: "pipe" }).exited;
	await spawn(["init"]);
	await spawn(["config", "user.email", "test@test.com"]);
	await spawn(["config", "user.name", "Test"]);
	for (const [name, content] of Object.entries(files)) {
		const filePath = join(dir, name);
		const parentDir = join(filePath, "..");
		const { mkdir } = await import("node:fs/promises");
		await mkdir(parentDir, { recursive: true });
		await Bun.write(filePath, content);
	}
	await spawn(["add", "."]);
	await spawn(["commit", "-m", "initial"]);
	return {
		dir,
		cleanup: () => rm(dir, { recursive: true, force: true }),
	};
};

export const createBareRepo = async (
	files: Record<string, string> = { "README.md": "# Test Repo" },
): Promise<{ dir: string; cleanup: () => Promise<void> }> => {
	// Create a regular repo first, then clone bare
	const source = await createTempRepo(files);
	const bareDir = await mkdtemp(join(tmpdir(), "shelf-bare-"));
	await rm(bareDir, { recursive: true, force: true });
	const proc = Bun.spawn(["git", "clone", "--bare", source.dir, bareDir], {
		stdout: "pipe",
		stderr: "pipe",
	});
	await proc.exited;
	await source.cleanup();
	return {
		dir: bareDir,
		cleanup: () => rm(bareDir, { recursive: true, force: true }),
	};
};
