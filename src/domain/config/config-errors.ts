import * as Schema from "effect/Schema";

export class ConfigNotFoundError extends Schema.TaggedErrorClass<ConfigNotFoundError>()(
	"ConfigNotFoundError",
	{ path: Schema.String },
) {}

export class ConfigParseError extends Schema.TaggedErrorClass<ConfigParseError>()(
	"ConfigParseError",
	{ message: Schema.String },
) {}
