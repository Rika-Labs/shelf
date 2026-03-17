export type InputType = "url" | "ssh" | "owner-repo" | "prefixed" | "bare-name" | "path";

const URL_PATTERN = /^https?:\/\//;
const SSH_PATTERN = /^git@/;
const OWNER_REPO_PATTERN = /^[a-zA-Z0-9_.-]+\/[a-zA-Z0-9_.-]+$/;
const PREFIXED_PATTERN = /^(github|gitlab|bitbucket):/;
const PATH_PATTERN = /^[./~]/;

export const classifyInput = (input: string): InputType => {
	if (URL_PATTERN.test(input)) return "url";
	if (SSH_PATTERN.test(input)) return "ssh";
	if (PATH_PATTERN.test(input)) return "path";
	if (PREFIXED_PATTERN.test(input)) return "prefixed";
	if (OWNER_REPO_PATTERN.test(input)) return "owner-repo";
	return "bare-name";
};

export const expandOwnerRepo = (ownerRepo: string): string => `https://github.com/${ownerRepo}.git`;

export const expandPrefixed = (input: string): { host: string; ownerRepo: string; url: string } => {
	const colonIdx = input.indexOf(":");
	const prefix = input.slice(0, colonIdx);
	const ownerRepo = input.slice(colonIdx + 1);

	const hosts: Record<string, string> = {
		github: "github.com",
		gitlab: "gitlab.com",
		bitbucket: "bitbucket.org",
	};

	const host = hosts[prefix] ?? "github.com";
	return {
		host,
		ownerRepo,
		url: `https://${host}/${ownerRepo}.git`,
	};
};

export const deriveAliasFromOwnerRepo = (ownerRepo: string): string => {
	const parts = ownerRepo.split("/");
	const repo = parts.at(-1) ?? ownerRepo;
	return repo.replace(/\.git$/, "");
};
