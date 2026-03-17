import * as Effect from "effect/Effect";
import * as Option from "effect/Option";

const normalizeGitUrl = (url: string): string => {
	let normalized = url
		.replace(/^git\+/, "")
		.replace(/^git:\/\//, "https://")
		.replace(/^ssh:\/\/git@github\.com/, "https://github.com");

	if (normalized.startsWith("github:")) {
		const ownerRepo = normalized.slice("github:".length);
		normalized = `https://github.com/${ownerRepo}`;
	}

	if (!normalized.endsWith(".git")) {
		normalized = `${normalized}.git`;
	}

	return normalized;
};

export const resolveNpmPackage = (name: string): Effect.Effect<Option.Option<string>> =>
	Effect.gen(function* () {
		const response = yield* Effect.tryPromise({
			try: () => fetch(`https://registry.npmjs.org/${encodeURIComponent(name)}`),
			catch: () => "fetch-failed" as const,
		}).pipe(Effect.catch(() => Effect.succeed(null)));

		if (!response || !response.ok) return Option.none();

		const data = yield* Effect.tryPromise({
			try: () =>
				response.json() as Promise<{
					repository?: { type?: string; url?: string } | string;
				}>,
			catch: () => "parse-failed" as const,
		}).pipe(Effect.catch(() => Effect.succeed(null)));

		if (!data) return Option.none();

		const repoField = data.repository;
		if (!repoField) return Option.none();

		const repoUrl = typeof repoField === "string" ? repoField : repoField.url;
		if (!repoUrl) return Option.none();

		return Option.some(normalizeGitUrl(repoUrl));
	});

export const resolveGoModule = (modulePath: string): Option.Option<string> => {
	if (modulePath.startsWith("github.com/")) {
		const parts = modulePath.split("/");
		if (parts.length >= 3) {
			return Option.some(`https://github.com/${parts[1]}/${parts[2]}.git`);
		}
	}
	return Option.none();
};
