import { describe, test, expect, beforeEach, afterEach } from "bun:test";
import * as Effect from "effect/Effect";
import * as Option from "effect/Option";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { runGit } from "../../../src/domain/git/git-utils";
import { RepoPin } from "../../../src/domain/config/config-schema";
import { GitService } from "../../../src/domain/git/git-service";
import { createBareRepo, createTempRepo } from "../../helpers/temp-repo";

describe("runGit", () => {
	let tempDir: string;

	beforeEach(async () => {
		tempDir = await mkdtemp(join(tmpdir(), "shelf-git-test-"));
	});

	afterEach(async () => {
		await rm(tempDir, { recursive: true, force: true });
	});

	describe("clone", () => {
		test("clones a repo to target dir", async () => {
			const source = await createBareRepo({ "hello.txt": "world" });
			const targetDir = join(tempDir, "cloned");
			await Effect.runPromise(runGit(["clone", source.dir, targetDir]));
			const file = Bun.file(join(targetDir, "hello.txt"));
			expect(await file.exists()).toBe(true);
			expect(await file.text()).toBe("world");
			await source.cleanup();
		});

		test("clones with branch pin", async () => {
			const bareSource = await createBareRepo({ "file.txt": "content" });
			const proc = Bun.spawn(["git", "symbolic-ref", "HEAD", "--short"], {
				cwd: bareSource.dir,
				stdout: "pipe",
				stderr: "pipe",
			});
			await proc.exited;
			const defaultBranch = (await new Response(proc.stdout as ReadableStream).text()).trim();
			const targetDir = join(tempDir, "branch-clone");
			await Effect.runPromise(
				runGit(["clone", "--branch", defaultBranch, bareSource.dir, targetDir]),
			);
			const file = Bun.file(join(targetDir, "file.txt"));
			expect(await file.exists()).toBe(true);
			await bareSource.cleanup();
		});

		test("fails on invalid URL", async () => {
			const targetDir = join(tempDir, "bad-clone");
			const result = await Effect.runPromiseExit(
				runGit(["clone", "https://invalid.example.com/nonexistent.git", targetDir]),
			);
			expect(result._tag).toBe("Failure");
		});
	});

	describe("fetch", () => {
		test("fetches successfully from a cloned repo", async () => {
			const source = await createBareRepo();
			const targetDir = join(tempDir, "fetch-test");
			await Effect.runPromise(runGit(["clone", source.dir, targetDir]));
			await Effect.runPromise(runGit(["fetch", "--all", "--prune"], targetDir));
			await source.cleanup();
		});

		test("fails for non-repo directory", async () => {
			const result = await Effect.runPromiseExit(
				runGit(["fetch", "--all"], tempDir),
			);
			expect(result._tag).toBe("Failure");
		});
	});

	describe("checkout", () => {
		test("checks out a commit by hash", async () => {
			const source = await createTempRepo({ "file.txt": "initial content" });
			await Bun.spawn(["git", "checkout", "-b", "feature-branch"], {
				cwd: source.dir,
				stdout: "pipe",
				stderr: "pipe",
			}).exited;
			await Bun.write(join(source.dir, "file.txt"), "feature content");
			await Bun.spawn(["git", "add", "."], {
				cwd: source.dir,
				stdout: "pipe",
				stderr: "pipe",
			}).exited;
			await Bun.spawn(["git", "commit", "-m", "feature commit"], {
				cwd: source.dir,
				stdout: "pipe",
				stderr: "pipe",
			}).exited;

			const hashProc = Bun.spawn(["git", "rev-list", "--max-parents=0", "HEAD"], {
				cwd: source.dir,
				stdout: "pipe",
				stderr: "pipe",
			});
			await hashProc.exited;
			const initialHash = (await new Response(hashProc.stdout as ReadableStream).text()).trim();

			await Effect.runPromise(runGit(["checkout", initialHash], source.dir));
			const file = Bun.file(join(source.dir, "file.txt"));
			expect(await file.text()).toBe("initial content");
			await source.cleanup();
		});

		test("checks out a named branch", async () => {
			const source = await createTempRepo({ "file.txt": "v1" });
			await Bun.spawn(["git", "checkout", "-b", "release-v2"], {
				cwd: source.dir,
				stdout: "pipe",
				stderr: "pipe",
			}).exited;
			await Bun.write(join(source.dir, "file.txt"), "v2");
			await Bun.spawn(["git", "add", "."], {
				cwd: source.dir,
				stdout: "pipe",
				stderr: "pipe",
			}).exited;
			await Bun.spawn(["git", "commit", "-m", "v2"], {
				cwd: source.dir,
				stdout: "pipe",
				stderr: "pipe",
			}).exited;

			await Effect.runPromise(runGit(["checkout", "release-v2"], source.dir));
			const file = Bun.file(join(source.dir, "file.txt"));
			expect(await file.text()).toBe("v2");
			await source.cleanup();
		});
	});

	describe("pull", () => {
		test("pulls ff-only on a simple repo", async () => {
			const source = await createBareRepo({ "file.txt": "original" });
			const targetDir = join(tempDir, "pull-test");
			await Effect.runPromise(runGit(["clone", source.dir, targetDir]));
			await Effect.runPromise(runGit(["pull", "--ff-only"], targetDir));
			await source.cleanup();
		});
	});
});

describe("GitService", () => {
	let tempDir: string;

	beforeEach(async () => {
		tempDir = await mkdtemp(join(tmpdir(), "shelf-gitsvc-test-"));
	});

	afterEach(async () => {
		await rm(tempDir, { recursive: true, force: true });
	});

	test("clone with no pin", async () => {
		const source = await createBareRepo({ "test.txt": "hello" });
		const targetDir = join(tempDir, "svc-clone");
		await Effect.runPromise(
			Effect.gen(function* () {
				const git = yield* GitService;
				yield* git.clone(source.dir, targetDir, Option.none());
			}).pipe(Effect.provide(GitService.layer)),
		);
		expect(await Bun.file(join(targetDir, "test.txt")).exists()).toBe(true);
		await source.cleanup();
	});

	test("clone with branch pin", async () => {
		const source = await createBareRepo({ "test.txt": "hello" });
		const proc = Bun.spawn(["git", "symbolic-ref", "HEAD", "--short"], {
			cwd: source.dir,
			stdout: "pipe",
			stderr: "pipe",
		});
		await proc.exited;
		const defaultBranch = (await new Response(proc.stdout as ReadableStream).text()).trim();
		const targetDir = join(tempDir, "svc-branch-clone");
		await Effect.runPromise(
			Effect.gen(function* () {
				const git = yield* GitService;
				yield* git.clone(
					source.dir,
					targetDir,
					Option.some(new RepoPin({ type: "branch", value: defaultBranch })),
				);
			}).pipe(Effect.provide(GitService.layer)),
		);
		expect(await Bun.file(join(targetDir, "test.txt")).exists()).toBe(true);
		await source.cleanup();
	});

	test("clone with tag pin", async () => {
		const source = await createTempRepo({ "test.txt": "hello" });
		await Bun.spawn(["git", "tag", "v1.0.0"], {
			cwd: source.dir,
			stdout: "pipe",
			stderr: "pipe",
		}).exited;
		const bareSource = await createBareRepo({ "test.txt": "hello" });
		// Add tag to bare repo manually
		await Bun.spawn(["git", "tag", "v1.0.0"], {
			cwd: bareSource.dir,
			stdout: "pipe",
			stderr: "pipe",
		}).exited;
		const targetDir = join(tempDir, "svc-tag-clone");
		await Effect.runPromise(
			Effect.gen(function* () {
				const git = yield* GitService;
				yield* git.clone(
					bareSource.dir,
					targetDir,
					Option.some(new RepoPin({ type: "tag", value: "v1.0.0" })),
				);
			}).pipe(Effect.provide(GitService.layer)),
		);
		expect(await Bun.file(join(targetDir, "test.txt")).exists()).toBe(true);
		await source.cleanup();
		await bareSource.cleanup();
	});

	test("fetch on a cloned repo", async () => {
		const source = await createBareRepo();
		const targetDir = join(tempDir, "svc-fetch");
		await Effect.runPromise(runGit(["clone", source.dir, targetDir]));
		await Effect.runPromise(
			Effect.gen(function* () {
				const git = yield* GitService;
				yield* git.fetch(targetDir);
			}).pipe(Effect.provide(GitService.layer)),
		);
		await source.cleanup();
	});

	test("getDefaultBranch returns correct branch", async () => {
		const source = await createBareRepo();
		const targetDir = join(tempDir, "svc-default-branch");
		await Effect.runPromise(runGit(["clone", source.dir, targetDir]));
		const branch = await Effect.runPromise(
			Effect.gen(function* () {
				const git = yield* GitService;
				return yield* git.getDefaultBranch(targetDir);
			}).pipe(Effect.provide(GitService.layer)),
		);
		expect(typeof branch).toBe("string");
		expect(branch.length).toBeGreaterThan(0);
		await source.cleanup();
	});
});
