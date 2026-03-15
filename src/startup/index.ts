#!/usr/bin/env bun
import * as Effect from "effect/Effect";
import * as Layer from "effect/Layer";
import { runMain } from "@effect/platform-bun/BunRuntime";
import { layer as BunServicesLayer } from "@effect/platform-bun/BunServices";
import { Command } from "effect/unstable/cli";
import { addCommand } from "../cli/commands/add";
import { removeCommand } from "../cli/commands/remove";
import { listCommand } from "../cli/commands/list";
import { updateCommand } from "../cli/commands/update";
import { configCommand } from "../cli/commands/config";
import { initCommand } from "../cli/commands/init";
import { installCommand } from "../cli/commands/install";
import { shareCommand } from "../cli/commands/share";
import { pruneCommand } from "../cli/commands/prune";
import { statusCommand } from "../cli/commands/status";
import { infoCommand } from "../cli/commands/info";
import { pinCommand } from "../cli/commands/pin";
import { aliasCommand } from "../cli/commands/alias";
import { AppLayer } from "./layers/app";
import { formatUserError } from "../cli/error-handler";

const shelf = Command.make("shelf").pipe(
	Command.withSubcommands([
		addCommand,
		removeCommand,
		listCommand,
		updateCommand,
		configCommand,
		initCommand,
		installCommand,
		shareCommand,
		pruneCommand,
		statusCommand,
		infoCommand,
		pinCommand,
		aliasCommand,
	]),
	Command.withDescription("A global cache of code reference repositories for AI agents"),
);

const program = Command.run(shelf, { version: "0.1.0" });

program.pipe(
	Effect.provide(Layer.mergeAll(AppLayer, BunServicesLayer)),
	Effect.catch((error: unknown) => {
		const message = formatUserError(error);
		if (message !== null) {
			console.error(message); // eslint-disable-line no-console
			return Effect.void;
		}
		return Effect.fail(error);
	}),
	runMain,
);
