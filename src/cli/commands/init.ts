import * as Effect from "effect/Effect";
import * as Console from "effect/Console";
import { Command } from "effect/unstable/cli";
import { join } from "node:path";
import { skillTemplate } from "../templates/skill";

export const initCommand = Command.make(
	"init",
	{},
	() =>
		Effect.gen(function* () {
			const cwd = process.cwd();
			const skillDir = join(cwd, ".claude", "skills", "shelf");
			const skillPath = join(skillDir, "SKILL.md");
			yield* Effect.tryPromise({
				try: async () => {
					const { mkdir } = await import("node:fs/promises");
					await mkdir(skillDir, { recursive: true });
					await Bun.write(skillPath, skillTemplate);
				},
				catch: (error) => new Error(`Failed to write skill file: ${error}`),
			});
			yield* Console.log(`Created ${skillPath}`);
		}),
).pipe(Command.withDescription("Scaffold a shelf skill file into the current project"));
