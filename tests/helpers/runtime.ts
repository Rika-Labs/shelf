import * as Effect from "effect/Effect";
import * as Exit from "effect/Exit";
import type * as Layer from "effect/Layer";

export const runWithLayer = <A, E>(
	effect: Effect.Effect<A, E>,
	layer: Layer.Layer<never>,
): Promise<A> => Effect.runPromise(effect.pipe(Effect.provide(layer)));

export const runWithLayerExit = <A, E>(
	effect: Effect.Effect<A, E>,
	layer: Layer.Layer<never>,
): Promise<Exit.Exit<A, E>> => Effect.runPromiseExit(effect.pipe(Effect.provide(layer)));
