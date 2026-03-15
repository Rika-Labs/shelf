import * as Effect from "effect/Effect";
import * as Layer from "effect/Layer";
import * as Option from "effect/Option";
import * as ServiceMap from "effect/ServiceMap";
import type { RepoPin } from "../config/config-schema";
import { runGit } from "./git-utils";

export class GitService extends ServiceMap.Service<GitService>()(
	"shelf/domain/git/GitService",
	{
		make: Effect.gen(function* () {
			return {
				clone: Effect.fn("GitService.clone")(function* (
					url: string,
					targetDir: string,
					pin: Option.Option<RepoPin>,
				) {
					const args = ["clone"];
					if (Option.isSome(pin)) {
						const pinType = pin.value.type;
						if (pinType === "branch" || pinType === "tag") {
							args.push("--branch", pin.value.value);
						}
					}
					args.push(url, targetDir);
					yield* runGit(args);
					if (Option.isSome(pin) && pin.value.type === "commit") {
						yield* runGit(["checkout", pin.value.value], targetDir);
					}
				}),

				fetch: Effect.fn("GitService.fetch")(function* (repoDir: string) {
					yield* runGit(["fetch", "--all", "--prune"], repoDir);
				}),

				checkout: Effect.fn("GitService.checkout")(function* (repoDir: string, ref: string) {
					yield* runGit(["checkout", ref], repoDir);
				}),

				pull: Effect.fn("GitService.pull")(function* (repoDir: string) {
					yield* runGit(["pull", "--ff-only"], repoDir);
				}),

				getDefaultBranch: Effect.fn("GitService.getDefaultBranch")(function* (
					repoDir: string,
				) {
					const ref = yield* runGit(
						["symbolic-ref", "refs/remotes/origin/HEAD", "--short"],
						repoDir,
					);
					return ref.replace("origin/", "");
				}),
			};
		}),
	},
) {
	static layer = Layer.effect(this, this.make);
}
