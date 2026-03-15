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
	Flag.withDescription(
		"Pin to branch:<name>, tag:<name>, a commit hash, or 'auto' to resolve from package.json",
	),
);
const depth = Flag.integer("depth").pipe(
	Flag.optional,
	Flag.withDescription("Clone depth for shallow clones (e.g., 1 for latest only)"),
);
const sparse = Flag.string("sparse").pipe(
	Flag.optional,
	Flag.withDescription("Comma-separated sparse checkout paths (e.g., 'src,packages/core')"),
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

export const addCommand = Command.make("add", { url, alias, pin, depth, sparse }, (config) =>
	Effect.gen(function* () {
		const repo = yield* RepoService;
		const resolvedPin =
			Option.isSome(config.pin) && config.pin.value === "auto"
				? yield* repo.resolveAutoPin(config.url)
				: config.pin.pipe(Option.map((raw) => parsePin(raw)));
		const resolvedSparse = config.sparse.pipe(
			Option.map((raw) => raw.split(",").map((s) => s.trim())),
		);
		const result = yield* repo.add(
			config.url,
			config.alias,
			resolvedPin,
			config.depth,
			resolvedSparse,
		);
		yield* Console.log(`Added repo "${result}"`);
	}),
).pipe(Command.withDescription("Add a code reference repository to shelf"));
