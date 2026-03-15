import * as Effect from "effect/Effect";
import * as Console from "effect/Console";
import * as Option from "effect/Option";
import { Argument, Command, Flag } from "effect/unstable/cli";
import { RepoPin } from "../../domain/config/config-schema";
import { RepoService } from "../../domain/repo/repo-service";

const url = Argument.string("url");
const alias = Flag.string("alias").pipe(Flag.optional, Flag.withDescription("Alias for the repo"));
const pin = Flag.string("pin").pipe(
	Flag.optional,
	Flag.withDescription("Pin to branch:<name>, tag:<name>, or a commit hash"),
);

const parsePin = (raw: string): RepoPin => {
	if (raw.startsWith("branch:")) {
		return new RepoPin({ type: "branch", value: raw.slice(7) });
	}
	if (raw.startsWith("tag:")) {
		return new RepoPin({ type: "tag", value: raw.slice(4) });
	}
	if (/^[0-9a-f]{7,40}$/i.test(raw)) {
		return new RepoPin({ type: "commit", value: raw });
	}
	return new RepoPin({ type: "branch", value: raw });
};

export const addCommand = Command.make(
	"add",
	{ url, alias, pin },
	(config) =>
		Effect.gen(function* () {
			const repo = yield* RepoService;
			const resolvedPin = Option.map(config.pin, parsePin);
			const result = yield* repo.add(config.url, config.alias, resolvedPin);
			yield* Console.log(`Added repo "${result}"`);
		}),
).pipe(Command.withDescription("Add a code reference repository to shelf"));
