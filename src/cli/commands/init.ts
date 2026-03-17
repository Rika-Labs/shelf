import * as Effect from "effect/Effect";
import * as Console from "effect/Console";
import * as Option from "effect/Option";
import { Command, Flag } from "effect/unstable/cli";
import { join } from "node:path";
import { skillTemplate } from "../templates/skill";
import { DetectService } from "../../domain/detect/detect-service";
import type { DetectedRepo } from "../../domain/detect/detect-schema";
import { RepoService } from "../../domain/repo/repo-service";
import { RegistryService } from "../../domain/registry/registry-service";

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
const noDetect = Flag.boolean("no-detect").pipe(
	Flag.withDefault(false),
	Flag.withDescription("Skip dependency detection (just write skill file)"),
);

export const initCommand = Command.make("init", { agent, noDetect }, (config) =>
	Effect.gen(function* () {
		const cwd = process.cwd();

		// Step 1: Write skill file (always)
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

		// Step 2: Detect and add repos (unless --no-detect)
		if (config.noDetect) return;

		const detect = yield* DetectService;
		const detected = yield* detect
			.detect(cwd)
			.pipe(Effect.catch(() => Effect.succeed([] as DetectedRepo[])));

		const newRepos = detected.filter((d) => !d.alreadyShelved);

		if (newRepos.length === 0) {
			yield* Console.log("\nNo new repos detected from project dependencies.");
			return;
		}

		yield* Console.log(`\nDetected ${newRepos.length} repo(s) from project dependencies:`);
		for (const d of newRepos) {
			yield* Console.log(`  ${d.name.padEnd(20)} ${d.url}`);
		}

		yield* Console.log("\nAdding detected repos...");
		const repo = yield* RepoService;
		const registry = yield* RegistryService;
		const results = yield* Effect.forEach(
			newRepos,
			(d) =>
				repo.add(d.url, Option.some(d.name), Option.none(), Option.none(), Option.none()).pipe(
					Effect.map((alias) => ({ alias, status: "added" as const })),
					Effect.catch((error: unknown) =>
						Console.log(`  Failed to add "${d.name}": ${error}`).pipe(
							Effect.map(() => ({ alias: d.name, status: "failed" as const })),
						),
					),
				),
			{ concurrency: 4 },
		);
		for (const result of results) {
			if (result.status === "added") {
				yield* registry.addManual(result.alias);
				yield* Console.log(`  Added "${result.alias}"`);
			}
		}

		yield* Console.log("\nShelf is ready. Your agent can read repos at ~/.agents/shelf/repos/");
	}),
).pipe(Command.withDescription("Scaffold a shelf skill file and detect project repos"));
