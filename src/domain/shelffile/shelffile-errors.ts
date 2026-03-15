import * as Schema from "effect/Schema";

export class ShelffileNotFoundError extends Schema.TaggedErrorClass<ShelffileNotFoundError>()(
	"ShelffileNotFoundError",
	{ path: Schema.String },
) {}

export class ShelffileParseError extends Schema.TaggedErrorClass<ShelffileParseError>()(
	"ShelffileParseError",
	{ message: Schema.String },
) {}
