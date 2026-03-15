import * as Layer from "effect/Layer";
import { ConfigService } from "../../domain/config/config-service";
import { GitService } from "../../domain/git/git-service";
import { RepoService } from "../../domain/repo/repo-service";
import { SyncService } from "../../domain/sync/sync-service";
import { ShelffileService } from "../../domain/shelffile/shelffile-service";
import { RegistryService } from "../../domain/registry/registry-service";

const ConfigLive = ConfigService.layer;
const GitLive = GitService.layer;
const SyncLive = SyncService.layer.pipe(Layer.provide(ConfigLive), Layer.provide(GitLive));
const RepoLive = RepoService.layer.pipe(
	Layer.provide(ConfigLive),
	Layer.provide(GitLive),
	Layer.provide(SyncLive),
);
const ShelffileLive = ShelffileService.layer;
const RegistryLive = RegistryService.layer.pipe(
	Layer.provide(ConfigLive),
	Layer.provide(ShelffileLive),
);
export const AppLayer = Layer.mergeAll(
	ConfigLive,
	GitLive,
	SyncLive,
	RepoLive,
	ShelffileLive,
	RegistryLive,
);
