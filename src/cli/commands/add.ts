import * as Effect from "effect/Effect";
import * as Console from "effect/Console";
import * as Option from "effect/Option";
import { Argument, Command, Flag } from "effect/unstable/cli";
import { RepoService } from "../../domain/repo/repo-service";
import { RegistryService } from "../../domain/registry/registry-service";
import { ResolveService } from "../../domain/resolve/resolve-service";
import { parsePin } from "../../domain/repo/repo-utils";

const repo = Argument.string("repo");
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

export const addCommand = Command.make("add", { repo, alias, pin, depth, sparse }, (config) =>
	Effect.gen(function* () {
		const repoService = yield* RepoService;
		const registry = yield* RegistryService;
		const resolve = yield* ResolveService;
		const resolved = yield* resolve.resolve(config.repo);
		if (resolved.source !== "direct") {
			yield* Console.log(`Resolved "${config.repo}" → ${resolved.url}`);
		}
		const url = resolved.url;
		const effectiveAlias = Option.isSome(config.alias)
			? config.alias
			: Option.some(resolved.suggestedAlias);
		const resolvedPin =
			Option.isSome(config.pin) && config.pin.value === "auto"
				? yield* repoService.resolveAutoPin(url)
				: config.pin.pipe(Option.map((raw) => parsePin(raw)));
		const resolvedSparse = config.sparse.pipe(
			Option.map((raw) => raw.split(",").map((s) => s.trim())),
		);
		const result = yield* repoService.add(
			url,
			effectiveAlias,
			resolvedPin,
			config.depth,
			resolvedSparse,
		);
		yield* registry.addManual(result);
		yield* Console.log(`Added repo "${result}"`);
	}),
).pipe(Command.withDescription("Add a code reference repository to shelf"));
