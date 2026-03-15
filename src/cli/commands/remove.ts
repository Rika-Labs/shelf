import * as Effect from "effect/Effect";
import * as Console from "effect/Console";
import { Argument, Command } from "effect/unstable/cli";
import { RepoService } from "../../domain/repo/repo-service";

const aliasOrUrl = Argument.string("alias-or-url");

export const removeCommand = Command.make("remove", { aliasOrUrl }, (config) =>
	Effect.gen(function* () {
		const repo = yield* RepoService;
		const removed = yield* repo.remove(config.aliasOrUrl);
		yield* Console.log(`Removed repo "${removed}"`);
	}),
).pipe(Command.withDescription("Remove a repository from shelf"));
