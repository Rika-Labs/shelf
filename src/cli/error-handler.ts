const errorMessages: Record<string, (error: Record<string, unknown>) => string> = {
	RepoNotFoundError: (e) =>
		`Repo "${String(e["alias"])}" not found. Run \`shelf list\` to see available repos.`,
	RepoAlreadyExistsError: (e) => `Repo "${String(e["alias"])}" already exists.`,
	GitOperationError: (e) => `Git error: ${String(e["message"])}`,
	AutoPinResolutionError: (e) => `Auto-pin failed: ${String(e["message"])}`,
	ConfigParseError: (e) => `Config error: ${String(e["message"])}`,
	ConfigNotFoundError: (e) => `Config not found: ${String(e["path"])}`,
};

export const formatUserError = (error: unknown): string | null => {
	if (error !== null && typeof error === "object" && "_tag" in error) {
		const tagged = error as Record<string, unknown>;
		const tag = String(tagged["_tag"]);
		const formatter = errorMessages[tag];
		if (formatter) {
			return formatter(tagged);
		}
	}
	return null;
};
