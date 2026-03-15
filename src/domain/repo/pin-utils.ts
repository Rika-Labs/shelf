export const stripSemverRange = (version: string): string => version.replace(/^[~^>=<]+/, "");

export const candidateTags = (packageName: string, version: string): string[] => {
	const bare = stripSemverRange(version);
	const shortName = packageName.includes("/")
		? (packageName.split("/").pop() ?? packageName)
		: packageName;
	return [`v${bare}`, `${shortName}@${bare}`, bare];
};

export const parseRemoteTags = (lsRemoteOutput: string): Set<string> => {
	const tags = new Set<string>();
	for (const line of lsRemoteOutput.split("\n")) {
		const trimmed = line.trim();
		if (!trimmed) continue;
		const parts = trimmed.split("\t");
		if (parts.length < 2) continue;
		let ref = parts[1] ?? "";
		if (!ref.startsWith("refs/tags/")) continue;
		ref = ref.replace("refs/tags/", "");
		if (ref.endsWith("^{}")) {
			ref = ref.slice(0, -3);
		}
		tags.add(ref);
	}
	return tags;
};

export const findMatchingTag = (
	packageName: string,
	version: string,
	remoteTags: Set<string>,
): string | null => {
	const candidates = candidateTags(packageName, version);
	for (const candidate of candidates) {
		if (remoteTags.has(candidate)) {
			return candidate;
		}
	}
	return null;
};
