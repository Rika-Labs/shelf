import * as Effect from "effect/Effect";
import * as Layer from "effect/Layer";
import * as ServiceMap from "effect/ServiceMap";
import { join } from "node:path";
import { ShelffileNotFoundError, ShelffileParseError } from "./shelffile-errors";
import { parseShelffile, serializeShelffile } from "./shelffile-utils";
import type { Shelffile } from "./shelffile-schema";

const SHELFFILE_NAME = "shelffile";

export class ShelffileService extends ServiceMap.Service<ShelffileService>()(
	"shelf/domain/shelffile/ShelffileService",
	{
		make: Effect.gen(function* () {
			return {
				read: Effect.fn("ShelffileService.read")(function* (dir: string) {
					const filePath = join(dir, SHELFFILE_NAME);
					const file = Bun.file(filePath);
					const fileExists = yield* Effect.tryPromise({
						try: () => file.exists(),
						catch: () => new ShelffileNotFoundError({ path: filePath }),
					});
					if (!fileExists) {
						return yield* new ShelffileNotFoundError({ path: filePath });
					}
					const content = yield* Effect.tryPromise({
						try: () => file.text(),
						catch: () => new ShelffileParseError({ message: `Failed to read ${filePath}` }),
					});
					return yield* Effect.try({
						try: () => parseShelffile(content),
						catch: (e) => {
							if (e instanceof ShelffileParseError) return e;
							return new ShelffileParseError({ message: `Failed to parse ${filePath}` });
						},
					});
				}),

				write: Effect.fn("ShelffileService.write")(function* (dir: string, shelffile: Shelffile) {
					const filePath = join(dir, SHELFFILE_NAME);
					const content = serializeShelffile(shelffile);
					yield* Effect.tryPromise({
						try: () => Bun.write(filePath, content),
						catch: () => new ShelffileParseError({ message: `Failed to write ${filePath}` }),
					});
				}),

				exists: Effect.fn("ShelffileService.exists")(function* (dir: string) {
					const filePath = join(dir, SHELFFILE_NAME);
					return yield* Effect.tryPromise({
						try: () => Bun.file(filePath).exists(),
						catch: () => Effect.succeed(false),
					});
				}),
			};
		}),
	},
) {
	static layer = Layer.effect(this, this.make);
}
