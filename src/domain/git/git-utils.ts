import * as Effect from "effect/Effect";
import { GitOperationError } from "./git-errors";

export const runGit = (
	args: ReadonlyArray<string>,
	cwd?: string | undefined,
): Effect.Effect<string, GitOperationError> =>
	Effect.tryPromise({
		try: async () => {
			const proc = Bun.spawn(["git", ...args], {
				cwd: cwd ?? process.cwd(),
				stdout: "pipe",
				stderr: "pipe",
			});
			const exitCode = await proc.exited;
			const stdout = await new Response(proc.stdout as ReadableStream).text();
			const stderr = await new Response(proc.stderr as ReadableStream).text();
			if (exitCode !== 0) {
				throw new Error(stderr.trim() || `git ${args[0]} failed with exit code ${exitCode}`);
			}
			return stdout.trim();
		},
		catch: (error) =>
			new GitOperationError({
				command: `git ${args.join(" ")}`,
				message: error instanceof Error ? error.message : String(error),
			}),
	});
