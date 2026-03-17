import * as Effect from "effect/Effect";
import * as Console from "effect/Console";
import * as Option from "effect/Option";
import { Command, Flag } from "effect/unstable/cli";
import { DetectService } from "../../domain/detect/detect-service";
import { RepoService } from "../../domain/repo/repo-service";
import { RegistryService } from "../../domain/registry/registry-service";

const apply = Flag.boolean("apply").pipe(
	Flag.withDefault(false),
	Flag.withDescription("Add all detected repos to shelf"),
);
const format = Flag.string("format").pipe(
	Flag.optional,
	Flag.withDescription("Output format: 'shelffile' for shelffile-compatible output"),
);
const dir = Flag.string("dir").pipe(
	Flag.optional,
	Flag.withDescription("Directory to scan (defaults to current directory)"),
);

export const detectCommand = Command.make("detect", { apply, format, dir }, (config) =>
	Effect.gen(function* () {
		const detect = yield* DetectService;
		const scanDir = Option.getOrElse(config.dir, () => process.cwd());
		const detected = yield* detect.detect(scanDir);

		if (detected.length === 0) {
			yield* Console.log("No repos detected from project dependencies.");
			return;
		}

		const newRepos = detected.filter((d) => !d.alreadyShelved);
		const existingRepos = detected.filter((d) => d.alreadyShelved);

		if (Option.isSome(config.format) && config.format.value === "shelffile") {
			for (const d of newRepos) {
				yield* Console.log(`${d.name} ${d.url}`);
			}
			return;
		}

		if (newRepos.length > 0) {
			yield* Console.log(`Detected ${newRepos.length} new repo(s):`);
			for (const d of newRepos) {
				yield* Console.log(`  ${d.name.padEnd(20)} ${d.url}`);
			}
		}

		if (existingRepos.length > 0) {
			yield* Console.log(`\nAlready shelved (${existingRepos.length}):`);
			for (const d of existingRepos) {
				yield* Console.log(`  ${d.name.padEnd(20)} (skipped)`);
			}
		}

		if (config.apply && newRepos.length > 0) {
			const repo = yield* RepoService;
			const registry = yield* RegistryService;
			yield* Console.log("\nAdding repos...");
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
		} else if (!config.apply && newRepos.length > 0) {
			yield* Console.log(`\nRun \`shelf detect --apply\` to add them.`);
		}
	}),
).pipe(Command.withDescription("Detect repos from project dependencies"));
