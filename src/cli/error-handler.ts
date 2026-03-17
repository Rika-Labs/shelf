const errorMessages: Record<string, (error: Record<string, unknown>) => string> = {
	RepoNotFoundError: (e) =>
		`Repo "${String(e["alias"])}" not found. Run \`shelf list\` to see available repos.`,
	RepoAlreadyExistsError: (e) => `Repo "${String(e["alias"])}" already exists.`,
	GitOperationError: (e) => `Git error: ${String(e["message"])}`,
	AutoPinResolutionError: (e) => `Auto-pin failed: ${String(e["message"])}`,
	ConfigParseError: (e) => `Config error: ${String(e["message"])}`,
	ConfigNotFoundError: (e) => `Config not found: ${String(e["path"])}`,
	ShelffileNotFoundError: (e) =>
		`No shelffile found at ${String(e["path"])}. Create one or use \`shelf share\` to generate one.`,
	ShelffileParseError: (e) => `Shelffile error: ${String(e["message"])}`,
	RegistryParseError: (e) => `Registry error: ${String(e["message"])}`,
	ResolveError: (e) => `Could not resolve "${String(e["input"])}": ${String(e["message"])}`,
	DetectError: (e) => `Detection failed: ${String(e["message"])}`,
	DaemonAlreadyRunningError: (e) => `Daemon is already running (PID: ${String(e["pid"])}).`,
	DaemonNotRunningError: () => `No daemon is currently running.`,
	DaemonStartError: (e) => `Failed to start daemon: ${String(e["message"])}`,
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
