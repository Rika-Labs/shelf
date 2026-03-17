import { join } from "node:path";

export const isPidAlive = (pid: number): boolean => {
	try {
		process.kill(pid, 0);
		return true;
	} catch {
		return false;
	}
};

export const daemonStatePath = (configDir: string): string => join(configDir, "daemon.json");

export const daemonLogPath = (configDir: string): string => join(configDir, "daemon.log");

export const formatUptime = (startedAt: string): string => {
	const ms = Date.now() - new Date(startedAt).getTime();
	const seconds = Math.floor(ms / 1000);
	const minutes = Math.floor(seconds / 60);
	const hours = Math.floor(minutes / 60);
	const days = Math.floor(hours / 24);

	if (days > 0) return `${days}d ${hours % 24}h`;
	if (hours > 0) return `${hours}h ${minutes % 60}m`;
	if (minutes > 0) return `${minutes}m ${seconds % 60}s`;
	return `${seconds}s`;
};
