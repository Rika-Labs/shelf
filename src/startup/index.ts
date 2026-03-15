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
import { AppLayer } from "./layers/app";

const shelf = Command.make("shelf").pipe(
	Command.withSubcommands([
		addCommand,
		removeCommand,
		listCommand,
		updateCommand,
		configCommand,
		initCommand,
	]),
	Command.withDescription("A global cache of code reference repositories for AI agents"),
);

const program = Command.run(shelf, { version: "0.1.0" });

program.pipe(
	Effect.provide(Layer.mergeAll(AppLayer, BunServicesLayer)),
	runMain,
);
