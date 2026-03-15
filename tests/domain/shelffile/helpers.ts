import * as Effect from "effect/Effect";
import * as Layer from "effect/Layer";
import type { ShelffileNotFoundError, ShelffileParseError } from "../../../src/domain/shelffile/shelffile-errors";
import type { Shelffile } from "../../../src/domain/shelffile/shelffile-schema";
import { ShelffileService } from "../../../src/domain/shelffile/shelffile-service";

export type ShelffileOverrides = {
	readonly read?: (dir: string) => Effect.Effect<Shelffile, ShelffileNotFoundError | ShelffileParseError>;
	readonly write?: (dir: string, shelffile: Shelffile) => Effect.Effect<void, ShelffileParseError>;
	readonly exists?: (dir: string) => Effect.Effect<boolean>;
};

const defaultShelffileImpl = {
	read: (): Effect.Effect<Shelffile, ShelffileNotFoundError | ShelffileParseError> =>
		Effect.succeed({ entries: [] }),
	write: (): Effect.Effect<void, ShelffileParseError> => Effect.void,
	exists: (): Effect.Effect<boolean> => Effect.succeed(false),
};

export const createMockShelffileLayer = (
	overrides: ShelffileOverrides = {},
): Layer.Layer<ShelffileService> => {
	const impl = { ...defaultShelffileImpl, ...overrides };
	return Layer.succeed(ShelffileService, ShelffileService.of(impl));
};
