import * as Schema from "effect/Schema";

const ResolveSource = Schema.Union([
	Schema.Literal("direct"),
	Schema.Literal("owner-repo"),
	Schema.Literal("prefixed"),
	Schema.Literal("registry"),
	Schema.Literal("github-api"),
]);

export class ResolvedRepo extends Schema.Class<ResolvedRepo>("ResolvedRepo")({
	url: Schema.String,
	suggestedAlias: Schema.String,
	source: ResolveSource,
}) {}
