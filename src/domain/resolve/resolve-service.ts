import * as Effect from "effect/Effect";
import * as Layer from "effect/Layer";
import * as ServiceMap from "effect/ServiceMap";
import { ResolvedRepo } from "./resolve-schema";
import { ResolveError } from "./resolve-errors";
import {
	classifyInput,
	expandOwnerRepo,
	expandPrefixed,
	deriveAliasFromOwnerRepo,
	builtinRegistry,
} from "./resolve-utils";
import { deriveAlias } from "../repo/repo-utils";

const resolveViaGitHubApi = Effect.fn("resolveViaGitHubApi")(function* (name: string) {
	const response = yield* Effect.tryPromise({
		try: () =>
			fetch(
				`https://api.github.com/search/repositories?q=${encodeURIComponent(name)}&sort=stars&per_page=1`,
				{ headers: { Accept: "application/vnd.github.v3+json" } },
			),
		catch: () => new ResolveError({ input: name, message: "Failed to reach GitHub API" }),
	});

	if (!response.ok) {
		return yield* Effect.fail(
			new ResolveError({
				input: name,
				message: `GitHub API returned ${response.status}. Try: shelf add owner/repo or shelf add <full-url>`,
			}),
		);
	}

	const data = yield* Effect.tryPromise({
		try: () => response.json() as Promise<{ items: Array<{ clone_url: string; name: string }> }>,
		catch: () => new ResolveError({ input: name, message: "Failed to parse GitHub API response" }),
	});

	const firstItem = data.items?.at(0);
	if (!firstItem) {
		return yield* Effect.fail(
			new ResolveError({
				input: name,
				message: `No repositories found for "${name}". Try: shelf add owner/repo or shelf add <full-url>`,
			}),
		);
	}

	return new ResolvedRepo({
		url: firstItem.clone_url,
		suggestedAlias: name,
		source: "github-api",
	});
});

export class ResolveService extends ServiceMap.Service<ResolveService>()(
	"shelf/domain/resolve/ResolveService",
	{
		make: Effect.gen(function* () {
			return {
				resolve: Effect.fn("ResolveService.resolve")(function* (input: string) {
					const type = classifyInput(input);

					switch (type) {
						case "url": {
							return new ResolvedRepo({
								url: input,
								suggestedAlias: deriveAlias(input),
								source: "direct",
							});
						}

						case "ssh":
						case "path": {
							return new ResolvedRepo({
								url: input,
								suggestedAlias: deriveAlias(input),
								source: "direct",
							});
						}

						case "owner-repo": {
							const url = expandOwnerRepo(input);
							return new ResolvedRepo({
								url,
								suggestedAlias: deriveAliasFromOwnerRepo(input),
								source: "owner-repo",
							});
						}

						case "prefixed": {
							const { url, ownerRepo } = expandPrefixed(input);
							return new ResolvedRepo({
								url,
								suggestedAlias: deriveAliasFromOwnerRepo(ownerRepo),
								source: "prefixed",
							});
						}

						case "bare-name": {
							const registryUrl = builtinRegistry[input];
							if (registryUrl) {
								return new ResolvedRepo({
									url: registryUrl,
									suggestedAlias: input,
									source: "registry",
								});
							}
							return yield* resolveViaGitHubApi(input);
						}

						default: {
							return yield* Effect.fail(
								new ResolveError({ input, message: "Unrecognized input format" }),
							);
						}
					}
				}),
			};
		}),
	},
) {
	static layer = Layer.effect(this, this.make);
}
