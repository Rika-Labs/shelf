import { join } from "node:path";
import { randomBytes } from "node:crypto";

export const daemonStatePath = (configDir: string): string => join(configDir, "daemon.json");

export const daemonLogPath = (configDir: string): string => join(configDir, "daemon.log");

export const generateToken = (): string => randomBytes(16).toString("hex");
