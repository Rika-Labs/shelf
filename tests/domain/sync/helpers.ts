import * as Effect from "effect/Effect";
import * as Layer from "effect/Layer";
import type { RepoEntry } from "../../../src/domain/config/config-schema";
import { SyncService } from "../../../src/domain/sync/sync-service";

export type SyncOverrides = {
	readonly syncRepo?: (repo: RepoEntry) => Effect.Effect<void>;
	readonly syncIfStale?: (repo: RepoEntry) => Effect.Effect<void>;
	readonly syncAll?: () => Effect.Effect<void>;
};

const defaultSyncImpl = {
	syncRepo: (): Effect.Effect<void> => Effect.void,
	syncIfStale: (): Effect.Effect<void> => Effect.void,
	syncAll: (): Effect.Effect<void> => Effect.void,
};

export const createMockSyncLayer = (overrides: SyncOverrides = {}): Layer.Layer<SyncService> => {
	const impl = { ...defaultSyncImpl, ...overrides };
	return Layer.succeed(SyncService, SyncService.of(impl));
};
