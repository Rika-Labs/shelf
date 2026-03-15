import * as Schema from "effect/Schema";

export class RepoNotFoundError extends Schema.TaggedErrorClass<RepoNotFoundError>()(
	"RepoNotFoundError",
	{ alias: Schema.String },
) {}

export class RepoAlreadyExistsError extends Schema.TaggedErrorClass<RepoAlreadyExistsError>()(
	"RepoAlreadyExistsError",
	{ alias: Schema.String },
) {}

