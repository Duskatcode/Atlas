import { AtlasCreatorService } from '@atlas/creator';

import { cliEnvironment } from '../config/env.js';
import type { ParsedArgs } from '../utils/args.js';

export interface CommandContext {
  args: ParsedArgs;
  service: AtlasCreatorService;
}

export const createCommandContext = (args: ParsedArgs): CommandContext => ({
  args,
  service: new AtlasCreatorService(),
});

export const defaults = {
  specPath: cliEnvironment.CREATOR_DEFAULT_SPEC ?? 'creator.spec.json',
  snapshotPath: cliEnvironment.CREATOR_DEFAULT_SNAPSHOT ?? 'creator.snapshot.json',
  planPath: cliEnvironment.CREATOR_DEFAULT_PLAN ?? 'creator.plan.json',
};
