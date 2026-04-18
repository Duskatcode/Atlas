export interface ParsedArgs {
  command?: string;
  positionals: string[];
  flags: Record<string, string | boolean>;
}

export const parseCliArgs = (argv: string[]): ParsedArgs => {
  const positionals: string[] = [];
  const flags: Record<string, string | boolean> = {};

  let command: string | undefined;

  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];
    if (!token) {
      continue;
    }

    if (!command && !token.startsWith('-')) {
      command = token;
      continue;
    }

    if (token.startsWith('--')) {
      const [key, inlineValue] = token.slice(2).split('=', 2);

      if (!key) {
        continue;
      }

      if (typeof inlineValue === 'string') {
        flags[key] = inlineValue;
        continue;
      }

      const nextToken = argv[index + 1];
      if (nextToken && !nextToken.startsWith('-')) {
        flags[key] = nextToken;
        index += 1;
      } else {
        flags[key] = true;
      }
      continue;
    }

    if (token.startsWith('-')) {
      const key = token.slice(1);
      if (!key) {
        continue;
      }

      const nextToken = argv[index + 1];
      if (nextToken && !nextToken.startsWith('-')) {
        flags[key] = nextToken;
        index += 1;
      } else {
        flags[key] = true;
      }
      continue;
    }

    positionals.push(token);
  }

  return {
    command,
    positionals,
    flags,
  };
};

export const readStringFlag = (
  args: ParsedArgs,
  key: string,
  fallback?: string,
): string | undefined => {
  const value = args.flags[key];
  if (typeof value === 'string') {
    return value;
  }

  return fallback;
};

export const readBooleanFlag = (
  args: ParsedArgs,
  key: string,
  fallback = false,
): boolean => {
  const value = args.flags[key];

  if (typeof value === 'boolean') {
    return value;
  }

  if (typeof value === 'string') {
    const normalized = value.trim().toLowerCase();
    if (['1', 'true', 'yes', 'on'].includes(normalized)) {
      return true;
    }

    if (['0', 'false', 'no', 'off'].includes(normalized)) {
      return false;
    }
  }

  return fallback;
};
