import * as Schema from "effect/Schema";

export class ShelfRegistry extends Schema.Class<ShelfRegistry>("ShelfRegistry")({
	projects: Schema.Array(Schema.String),
	manual: Schema.Array(Schema.String),
}) {}

export const defaultRegistry = new ShelfRegistry({
	projects: [],
	manual: [],
});

export const encodeRegistry = Schema.encodeSync(ShelfRegistry);
export const decodeRegistry = Schema.decodeUnknownSync(ShelfRegistry);
