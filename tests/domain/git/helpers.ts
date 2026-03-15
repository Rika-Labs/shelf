import * as Effect from "effect/Effect";
import * as Layer from "effect/Layer";
import type * as Option from "effect/Option";
import type { RepoPin } from "../../../src/domain/config/config-schema";
import type { GitOperationError } from "../../../src/domain/git/git-errors";
import { GitService } from "../../../src/domain/git/git-service";

export type GitOverrides = {
	readonly clone?: (
		url: string,
		targetDir: string,
		pin: Option.Option<RepoPin>,
	) => Effect.Effect<void, GitOperationError>;
	readonly fetch?: (repoDir: string) => Effect.Effect<void, GitOperationError>;
	readonly checkout?: (repoDir: string, ref: string) => Effect.Effect<void, GitOperationError>;
	readonly pull?: (repoDir: string) => Effect.Effect<void, GitOperationError>;
	readonly getDefaultBranch?: (repoDir: string) => Effect.Effect<string, GitOperationError>;
};

const defaultGitImpl = {
	clone: (): Effect.Effect<void, GitOperationError> => Effect.void,
	fetch: (): Effect.Effect<void, GitOperationError> => Effect.void,
	checkout: (): Effect.Effect<void, GitOperationError> => Effect.void,
	pull: (): Effect.Effect<void, GitOperationError> => Effect.void,
	getDefaultBranch: (): Effect.Effect<string, GitOperationError> => Effect.succeed("main"),
};

export const createMockGitLayer = (overrides: GitOverrides = {}): Layer.Layer<GitService> => {
	const impl = { ...defaultGitImpl, ...overrides };
	return Layer.succeed(GitService, GitService.of(impl));
};
