#!/usr/bin/env bun
import * as Effect from "effect/Effect";
import { runMain } from "@effect/platform-bun/BunRuntime";
import { daemonProgram } from "../domain/daemon/daemon-service";
import { DaemonAppLayer } from "./layers/daemon";

daemonProgram.pipe(Effect.provide(DaemonAppLayer), runMain);
