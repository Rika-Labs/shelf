import * as Schema from "effect/Schema";

export class RegistryParseError extends Schema.TaggedErrorClass<RegistryParseError>()(
	"RegistryParseError",
	{ message: Schema.String },
) {}
