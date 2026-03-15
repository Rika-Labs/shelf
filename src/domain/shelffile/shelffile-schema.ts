import type * as Option from "effect/Option";
import type { RepoPin } from "../config/config-schema";

export interface ShelffileEntry {
	readonly alias: string;
	readonly url: string;
	readonly pin: Option.Option<RepoPin>;
}

export interface Shelffile {
	readonly entries: ReadonlyArray<ShelffileEntry>;
}
