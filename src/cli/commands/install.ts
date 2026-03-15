import * as Effect from "effect/Effect";
import * as Console from "effect/Console";
import * as Option from "effect/Option";
import { Command, Flag } from "effect/unstable/cli";
import { RepoService } from "../../domain/repo/repo-service";
import { ShelffileService } from "../../domain/shelffile/shelffile-service";
import { RegistryService } from "../../domain/registry/registry-service";
import type { ShelffileEntry } from "../../domain/shelffile/shelffile-schema";

const dir = Flag.string("dir").pipe(
	Flag.optional,
	Flag.withDescription("Directory containing the shelffile (defaults to cwd)"),
);

export const installCommand = Command.make("install", { dir }, (config) =>
	Effect.gen(function* () {
		const repo = yield* RepoService;
		const shelffileService = yield* ShelffileService;
		const registry = yield* RegistryService;
		const targetDir = Option.getOrElse(config.dir, () => process.cwd());
		const shelffile = yield* shelffileService.read(targetDir);
		let added = 0;
		let existing = 0;
		let failed = 0;
		for (const entry of shelffile.entries as ReadonlyArray<ShelffileEntry>) {
			const result = yield* repo
				.add(entry.url, Option.some(entry.alias), entry.pin, Option.none(), Option.none())
				.pipe(
					Effect.map(() => "added" as const),
					Effect.catchTag("RepoAlreadyExistsError", () => Effect.succeed("existing" as const)),
					Effect.catchTag("GitOperationError", (e) =>
						Effect.gen(function* () {
							yield* Console.error(`  Warning: failed to add "${entry.alias}": ${e.message}`);
							return "failed" as const;
						}),
					),
				);
			if (result === "added") {
				added++;
				yield* Console.log(`  Added "${entry.alias}"`);
			} else if (result === "existing") {
				existing++;
				yield* Console.log(`  Already shelved "${entry.alias}"`);
			} else {
				failed++;
			}
		}
		yield* registry.registerProject(targetDir);
		yield* Console.log(
			`\nInstall complete: ${added} added, ${existing} already present${failed > 0 ? `, ${failed} failed` : ""}`,
		);
	}),
).pipe(Command.withDescription("Install repos from a shelffile"));
