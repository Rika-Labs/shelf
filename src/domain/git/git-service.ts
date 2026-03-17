import * as Effect from "effect/Effect";
import * as Layer from "effect/Layer";
import * as Option from "effect/Option";
import * as ServiceMap from "effect/ServiceMap";
import type { RepoPin } from "../config/config-schema";
import { runGit } from "./git-utils";

export class GitService extends ServiceMap.Service<GitService>()("shelf/domain/git/GitService", {
	make: Effect.gen(function* () {
		return {
			clone: Effect.fn("GitService.clone")(function* (
				url: string,
				targetDir: string,
				pin: Option.Option<RepoPin>,
				depth: Option.Option<number>,
				sparse: Option.Option<ReadonlyArray<string>>,
			) {
				const args = ["clone"];
				// Default to depth 1 — repos are for code reference, not history
				if (Option.isSome(depth)) {
					args.push("--depth", String(depth.value));
				} else {
					args.push("--depth", "1");
				}
				// Use blobless filter for faster clones when not shallow-pinned to commit
				if (Option.isNone(depth) && !(Option.isSome(pin) && pin.value.type === "commit")) {
					args.push("--filter=blob:none");
				}
				if (Option.isSome(pin)) {
					const pinType = pin.value.type;
					if (pinType === "branch" || pinType === "tag") {
						args.push("--branch", pin.value.value);
					}
				}
				args.push("--single-branch");
				if (Option.isSome(sparse)) {
					args.push("--no-checkout");
				}
				args.push(url, targetDir);
				yield* runGit(args);
				if (Option.isSome(sparse)) {
					yield* runGit(["sparse-checkout", "init", "--cone"], targetDir);
					yield* runGit(["sparse-checkout", "set", ...sparse.value], targetDir);
					yield* runGit(["checkout"], targetDir);
				}
				if (Option.isSome(pin) && pin.value.type === "commit") {
					yield* runGit(["checkout", pin.value.value], targetDir);
				}
			}),

			fetch: Effect.fn("GitService.fetch")(function* (
				repoDir: string,
				depth: Option.Option<number>,
			) {
				const args = ["fetch", "--all", "--prune"];
				// Default to depth 1 on fetch — keep repo lightweight
				if (Option.isSome(depth)) {
					args.push("--depth", String(depth.value));
				} else {
					args.push("--depth", "1");
				}
				yield* runGit(args, repoDir);
			}),

			checkout: Effect.fn("GitService.checkout")(function* (repoDir: string, ref: string) {
				yield* runGit(["checkout", ref], repoDir);
			}),

			pull: Effect.fn("GitService.pull")(function* (repoDir: string) {
				yield* runGit(["pull", "--ff-only"], repoDir);
			}),

			getDefaultBranch: Effect.fn("GitService.getDefaultBranch")(function* (repoDir: string) {
				const ref = yield* runGit(["symbolic-ref", "refs/remotes/origin/HEAD", "--short"], repoDir);
				return ref.replace("origin/", "");
			}),

			lsRemoteTags: Effect.fn("GitService.lsRemoteTags")(function* (url: string) {
				return yield* runGit(["ls-remote", "--tags", url]);
			}),
		};
	}),
}) {
	static layer = Layer.effect(this, this.make);
}
