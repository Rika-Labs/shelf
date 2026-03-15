import * as Effect from "effect/Effect";
import * as Console from "effect/Console";
import * as Option from "effect/Option";
import { Command, Flag } from "effect/unstable/cli";
import { join } from "node:path";
import { skillTemplate } from "../templates/skill";

const agentPaths: Record<string, string> = {
	claude: ".claude/skills/shelf",
	opencode: ".opencode/skills/shelf",
	gemini: ".gemini/skills/shelf",
};

const defaultSkillDir = ".agents/skills/shelf";

export const resolveSkillDir = (agent: Option.Option<string>): string =>
	Option.match(agent, {
		onNone: () => defaultSkillDir,
		onSome: (a) => agentPaths[a] ?? defaultSkillDir,
	});

const agent = Flag.string("agent").pipe(
	Flag.optional,
	Flag.withDescription("Target agent: claude, opencode, or gemini (default: universal .agents/)"),
);

export const initCommand = Command.make(
	"init",
	{ agent },
	(config) =>
		Effect.gen(function* () {
			const cwd = process.cwd();
			const skillDir = join(cwd, resolveSkillDir(config.agent));
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
