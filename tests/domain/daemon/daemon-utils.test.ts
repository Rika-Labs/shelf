import { describe, expect, test } from "bun:test";
import {
	daemonStatePath,
	daemonLogPath,
	generateToken,
} from "../../../src/domain/daemon/daemon-utils";

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

describe("generateToken", () => {
	test("returns a 32-character hex string", () => {
		const token = generateToken();
		expect(token).toMatch(/^[0-9a-f]{32}$/);
	});

	test("generates unique tokens", () => {
		const tokens = new Set(Array.from({ length: 10 }, () => generateToken()));
		expect(tokens.size).toBe(10);
	});
});
