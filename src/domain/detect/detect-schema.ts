import * as Schema from "effect/Schema";

const DetectSource = Schema.Union([Schema.Literal("npm"), Schema.Literal("go")]);

export class PackageDependency extends Schema.Class<PackageDependency>("PackageDependency")({
	name: Schema.String,
	version: Schema.String,
	source: DetectSource,
}) {}

export class DetectedRepo extends Schema.Class<DetectedRepo>("DetectedRepo")({
	name: Schema.String,
	url: Schema.String,
	source: DetectSource,
	alreadyShelved: Schema.Boolean,
}) {}
