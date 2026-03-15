import { describe, test, expect } from "bun:test";
import * as Option from "effect/Option";
import { isStale } from "../../../src/domain/sync/sync-utils";

describe("isStale", () => {
	test("returns true when lastSyncedAt is None", () => {
		expect(isStale(Option.none(), 60)).toBe(true);
	});

	test("returns true when elapsed exceeds interval", () => {
		const twoHoursAgo = new Date(Date.now() - 120 * 60 * 1000).toISOString();
		expect(isStale(Option.some(twoHoursAgo), 60)).toBe(true);
	});

	test("returns false when sync is fresh", () => {
		const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString();
		expect(isStale(Option.some(fiveMinutesAgo), 60)).toBe(false);
	});

	test("returns true at exact boundary", () => {
		const exactlyOneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
		expect(isStale(Option.some(exactlyOneHourAgo), 60)).toBe(true);
	});

	test("handles zero interval (always stale)", () => {
		const now = new Date().toISOString();
		expect(isStale(Option.some(now), 0)).toBe(true);
	});
});
