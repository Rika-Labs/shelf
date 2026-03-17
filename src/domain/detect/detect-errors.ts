import * as Schema from "effect/Schema";

export class DetectError extends Schema.TaggedErrorClass<DetectError>()("DetectError", {
	message: Schema.String,
}) {}
