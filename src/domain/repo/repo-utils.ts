import * as Effect from "effect/Effect";
import { statSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { RepoPin } from "../config/config-schema";

export const deriveAlias = (url: string): string => {
	let cleaned = url.replace(/\/+$/, "").replace(/\.git$/, "");
	// Handle git@ URLs: git@github.com:user/repo
	if (cleaned.startsWith("git@")) {
		const colonIndex = cleaned.indexOf(":");
		if (colonIndex !== -1) {
			cleaned = cleaned.slice(colonIndex + 1);
		}
	}
	// Handle https:// URLs
	if (cleaned.includes("://")) {
		const urlObj = new URL(cleaned);
		cleaned = urlObj.pathname;
	}
	// Take the last path segment
	const segments = cleaned.split("/").filter((s) => s.length > 0);
	const last = segments.at(-1);
	return last ?? "unknown";
};

export const parsePin = (raw: string): RepoPin => {
	if (raw.startsWith("branch:")) {
		return new RepoPin({ type: "branch", value: raw.slice(7) });
	}
	if (raw.startsWith("tag:")) {
		return new RepoPin({ type: "tag", value: raw.slice(4) });
	}
	if (/^[0-9a-f]{7,40}$/i.test(raw)) {
		return new RepoPin({ type: "commit", value: raw });
	}
	return new RepoPin({ type: "branch", value: raw });
};

export const dirSize = (dirPath: string): Effect.Effect<number> =>
	Effect.try({
		try: () => {
			let total = 0;
			const stack = [dirPath];
			while (stack.length > 0) {
				const current = stack.pop() as string;
				const entries = readdirSync(current, { withFileTypes: true });
				for (const entry of entries) {
					const fullPath = join(current, entry.name);
					if (entry.isDirectory()) {
						stack.push(fullPath);
					} else {
						total += statSync(fullPath).size;
					}
				}
			}
			return total;
		},
		catch: () => 0,
	}).pipe(Effect.orElseSucceed(() => 0));
