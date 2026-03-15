import * as Option from "effect/Option";

export const isStale = (
	lastSyncedAt: Option.Option<string>,
	syncIntervalMinutes: number,
): boolean => {
	if (Option.isNone(lastSyncedAt)) {
		return true;
	}
	const lastSync = new Date(lastSyncedAt.value).getTime();
	const now = Date.now();
	const elapsed = now - lastSync;
	return elapsed >= syncIntervalMinutes * 60 * 1000;
};
