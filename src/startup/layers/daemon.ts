import * as Layer from "effect/Layer";
import { ConfigService } from "../../domain/config/config-service";
import { GitService } from "../../domain/git/git-service";
import { SyncService } from "../../domain/sync/sync-service";

const ConfigLive = ConfigService.layer;
const GitLive = GitService.layer;
const SyncLive = SyncService.layer.pipe(Layer.provide(ConfigLive), Layer.provide(GitLive));

export const DaemonAppLayer = Layer.mergeAll(ConfigLive, GitLive, SyncLive);
