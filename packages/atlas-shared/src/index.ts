import type {
  AtlasLogger,
  AtlasModuleFlags,
  KnownAtlasModuleId,
  ModuleFlagSource,
  ModuleFlagValue,
} from '@atlas/types';

export const DEFAULT_MODULE_FLAG_VALUES: Record<KnownAtlasModuleId, boolean> = {
  'atlas-songer': true,
  'atlas-creator': false,
};

export const MODULE_FLAG_ENV_KEYS: Record<KnownAtlasModuleId, string> = {
  'atlas-songer': 'ENABLE_ATLAS_SONGER',
  'atlas-creator': 'ENABLE_ATLAS_CREATOR',
};

const truthyLiterals = new Set(['1', 'true', 'yes', 'on', 'enable', 'enabled']);
const falsyLiterals = new Set(['0', 'false', 'no', 'off', 'disable', 'disabled']);

export const normalizeFlagValue = (value: ModuleFlagValue): boolean | undefined => {
  if (typeof value === 'boolean') {
    return value;
  }

  if (typeof value === 'number') {
    return value !== 0;
  }

  if (typeof value === 'string') {
    const normalized = value.trim().toLowerCase();

    if (normalized.length === 0) {
      return undefined;
    }

    if (truthyLiterals.has(normalized)) {
      return true;
    }

    if (falsyLiterals.has(normalized)) {
      return false;
    }
  }

  return undefined;
};

export const createModuleFlagConfig = (
  source: ModuleFlagSource = {},
): AtlasModuleFlags => {
  const flags: AtlasModuleFlags = { ...DEFAULT_MODULE_FLAG_VALUES };

  for (const [key, rawValue] of Object.entries(source)) {
    const normalized = normalizeFlagValue(rawValue);

    if (typeof normalized === 'boolean') {
      flags[key] = normalized;
    }
  }

  return flags;
};

export const createModuleFlagSourceFromEnv = (
  env: Record<string, ModuleFlagValue>,
): ModuleFlagSource => {
  const entries = Object.entries(MODULE_FLAG_ENV_KEYS).map(([moduleId, envKey]) => [
    moduleId,
    env[envKey] ?? undefined,
  ]);

  return Object.fromEntries(entries);
};

export const isModuleFlagEnabled = (
  moduleId: string,
  flags: AtlasModuleFlags,
  fallback?: boolean,
): boolean => {
  const value = flags[moduleId];

  if (typeof value === 'boolean') {
    return value;
  }

  if (typeof fallback === 'boolean') {
    return fallback;
  }

  const defaultValue = DEFAULT_MODULE_FLAG_VALUES[moduleId as KnownAtlasModuleId];
  return typeof defaultValue === 'boolean' ? defaultValue : false;
};

export const createConsoleLogger = (scope = 'atlas'): AtlasLogger => {
  const prefix = `[${scope}]`;

  return {
    scope,
    info: (message: string, ...meta: unknown[]) => console.log(prefix, message, ...meta),
    warn: (message: string, ...meta: unknown[]) => console.warn(prefix, message, ...meta),
    error: (message: string, ...meta: unknown[]) => console.error(prefix, message, ...meta),
    debug: (message: string, ...meta: unknown[]) => console.debug(prefix, message, ...meta),
  };
};
