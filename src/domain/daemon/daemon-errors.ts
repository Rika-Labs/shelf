import * as Schema from "effect/Schema";

export class DaemonAlreadyRunningError extends Schema.TaggedErrorClass<DaemonAlreadyRunningError>()(
	"DaemonAlreadyRunningError",
	{ pid: Schema.Number },
) {}

export class DaemonNotRunningError extends Schema.TaggedErrorClass<DaemonNotRunningError>()(
	"DaemonNotRunningError",
	{},
) {}

export class DaemonStartError extends Schema.TaggedErrorClass<DaemonStartError>()(
	"DaemonStartError",
	{ message: Schema.String },
) {}
