import { describe, test, expect } from "bun:test";
import * as Option from "effect/Option";
import { resolveSkillDir } from "../../src/cli/commands/init";

describe("init command", () => {
	describe("resolveSkillDir", () => {
		test("defaults to .agents/skills/shelf when no agent specified", () => {
			expect(resolveSkillDir(Option.none())).toBe(".agents/skills/shelf");
		});

		test("--agent claude writes to .claude/skills/shelf", () => {
			expect(resolveSkillDir(Option.some("claude"))).toBe(".claude/skills/shelf");
		});

		test("--agent opencode writes to .opencode/skills/shelf", () => {
			expect(resolveSkillDir(Option.some("opencode"))).toBe(".opencode/skills/shelf");
		});

		test("--agent gemini writes to .gemini/skills/shelf", () => {
			expect(resolveSkillDir(Option.some("gemini"))).toBe(".gemini/skills/shelf");
		});

		test("unknown agent falls back to default .agents/skills/shelf", () => {
			expect(resolveSkillDir(Option.some("unknown"))).toBe(".agents/skills/shelf");
		});
	});
});
