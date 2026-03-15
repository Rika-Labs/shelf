import * as Schema from "effect/Schema";
import * as Option from "effect/Option";

const PinType = Schema.Union([
	Schema.Literal("branch"),
	Schema.Literal("tag"),
	Schema.Literal("commit"),
]);

export class RepoPin extends Schema.Class<RepoPin>("RepoPin")({
	type: PinType,
	value: Schema.String,
}) {}

export class RepoEntry extends Schema.Class<RepoEntry>("RepoEntry")({
	url: Schema.String,
	alias: Schema.String,
	pin: Schema.OptionFromOptionalKey(RepoPin),
	addedAt: Schema.String,
	lastSyncedAt: Schema.OptionFromOptionalKey(Schema.String),
}) {}

export class ShelfConfig extends Schema.Class<ShelfConfig>("ShelfConfig")({
	version: Schema.Literal(1),
	syncIntervalMinutes: Schema.Number,
	repos: Schema.Array(RepoEntry),
}) {}

export const defaultConfig = new ShelfConfig({
	version: 1,
	syncIntervalMinutes: 60,
	repos: [],
});

export const encodeConfig = Schema.encodeSync(ShelfConfig);
export const decodeConfig = Schema.decodeUnknownSync(ShelfConfig);

export const makeRepoEntry = (params: {
	readonly url: string;
	readonly alias: string;
	readonly pin: Option.Option<RepoPin>;
	readonly addedAt: string;
	readonly lastSyncedAt: Option.Option<string>;
}): RepoEntry =>
	new RepoEntry({
		url: params.url,
		alias: params.alias,
		pin: params.pin,
		addedAt: params.addedAt,
		lastSyncedAt: params.lastSyncedAt,
	});
