import { describe, expect, test } from "bun:test";
import {
	isPidAlive,
	daemonStatePath,
	daemonLogPath,
	formatUptime,
} from "../../../src/domain/daemon/daemon-utils";

describe("isPidAlive", () => {
	test("returns true for current process", () => {
		expect(isPidAlive(process.pid)).toBe(true);
	});

	test("returns false for non-existent PID", () => {
		expect(isPidAlive(999_999_999)).toBe(false);
	});
});

describe("daemonStatePath", () => {
	test("returns correct path", () => {
		expect(daemonStatePath("/home/user/.agents/shelf")).toBe(
			"/home/user/.agents/shelf/daemon.json",
		);
	});
});

describe("daemonLogPath", () => {
	test("returns correct path", () => {
		expect(daemonLogPath("/home/user/.agents/shelf")).toBe("/home/user/.agents/shelf/daemon.log");
	});
});

describe("formatUptime", () => {
	test("formats seconds", () => {
		const now = new Date();
		const tenSecondsAgo = new Date(now.getTime() - 10_000).toISOString();
		const result = formatUptime(tenSecondsAgo);
		expect(result).toMatch(/^\d+s$/);
	});

	test("formats minutes", () => {
		const now = new Date();
		const fiveMinutesAgo = new Date(now.getTime() - 5 * 60 * 1000).toISOString();
		const result = formatUptime(fiveMinutesAgo);
		expect(result).toMatch(/^\d+m \d+s$/);
	});

	test("formats hours", () => {
		const now = new Date();
		const twoHoursAgo = new Date(now.getTime() - 2 * 60 * 60 * 1000).toISOString();
		const result = formatUptime(twoHoursAgo);
		expect(result).toMatch(/^\d+h \d+m$/);
	});

	test("formats days", () => {
		const now = new Date();
		const threeDaysAgo = new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000).toISOString();
		const result = formatUptime(threeDaysAgo);
		expect(result).toMatch(/^\d+d \d+h$/);
	});
});
