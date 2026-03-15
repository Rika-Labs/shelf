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
