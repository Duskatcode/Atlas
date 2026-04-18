import { readJsonFile } from '../io/files.js';
import { readStringFlag } from '../utils/args.js';
import { printJson } from '../utils/output.js';
import type { CommandContext } from './context.js';
import { defaults } from './context.js';

export const runValidateCommand = async ({ args, service }: CommandContext): Promise<void> => {
  const specPath = readStringFlag(args, 'spec', defaults.specPath) ?? defaults.specPath;
  const payload = await readJsonFile(specPath);
  const validation = service.validateSpec(payload);

  printJson(validation);

  if (!validation.valid) {
    process.exitCode = 1;
  }
};
