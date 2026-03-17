import * as Schema from "effect/Schema";

export class DaemonState extends Schema.Class<DaemonState>("DaemonState")({
	pid: Schema.Number,
	startedAt: Schema.String,
	lastTickAt: Schema.OptionFromOptionalKey(Schema.String),
	version: Schema.String,
}) {}

export const encodeDaemonState = Schema.encodeSync(DaemonState);
export const decodeDaemonState = Schema.decodeUnknownSync(DaemonState);
