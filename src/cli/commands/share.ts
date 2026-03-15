import * as Effect from "effect/Effect";
import * as Console from "effect/Console";
import * as Option from "effect/Option";
import { Command, Flag } from "effect/unstable/cli";
import { RepoService } from "../../domain/repo/repo-service";
import { ShelffileService } from "../../domain/shelffile/shelffile-service";
import type { RepoEntry } from "../../domain/config/config-schema";
import { serializeShelffile } from "../../domain/shelffile/shelffile-utils";
import type { ShelffileEntry } from "../../domain/shelffile/shelffile-schema";

const filter = Flag.string("filter").pipe(
	Flag.optional,
	Flag.withDescription("Comma-separated aliases to include"),
);
const stdout = Flag.boolean("stdout").pipe(
	Flag.withDefault(false),
	Flag.withDescription("Print to stdout instead of writing shelffile"),
);

export const shareCommand = Command.make("share", { filter, stdout }, (config) =>
	Effect.gen(function* () {
		const repo = yield* RepoService;
		const shelffileService = yield* ShelffileService;
		let repos = yield* repo.list();
		if (Option.isSome(config.filter)) {
			const allowed = new Set(config.filter.value.split(",").map((s) => s.trim()));
			repos = repos.filter((r: RepoEntry) => allowed.has(r.alias));
		}
		const entries: ShelffileEntry[] = repos.map((r: RepoEntry) => ({
			alias: r.alias,
			url: r.url,
			pin: r.pin,
		}));
		const shelffile = { entries };
		if (config.stdout) {
			yield* Console.log(serializeShelffile(shelffile).trimEnd());
		} else {
			yield* shelffileService.write(process.cwd(), shelffile);
			yield* Console.log(`Wrote shelffile with ${entries.length} entries`);
		}
	}),
).pipe(Command.withDescription("Generate a shelffile from current repos"));
