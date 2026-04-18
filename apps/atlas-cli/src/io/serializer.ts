import path from 'node:path';

export type SnapshotOutputFormat = 'json' | 'yaml';

const isPlainScalar = (value: string): boolean => /^[A-Za-z0-9_./:-]+$/.test(value);

const formatScalar = (value: unknown): string => {
  if (typeof value === 'string') {
    return isPlainScalar(value) ? value : JSON.stringify(value);
  }

  if (typeof value === 'number' || typeof value === 'boolean') {
    return String(value);
  }

  if (value === null) {
    return 'null';
  }

  return JSON.stringify(value);
};

const toYamlLines = (value: unknown, indentLevel: number): string[] => {
  const indent = '  '.repeat(indentLevel);

  if (Array.isArray(value)) {
    if (value.length === 0) {
      return [`${indent}[]`];
    }

    return value.flatMap((item) => {
      if (item !== null && typeof item === 'object') {
        const nestedLines = toYamlLines(item, indentLevel + 1);
        const [firstNestedLine, ...restNestedLines] = nestedLines;

        const firstLine = `${indent}- ${firstNestedLine.trimStart()}`;
        return [firstLine, ...restNestedLines];
      }

      return [`${indent}- ${formatScalar(item)}`];
    });
  }

  if (value !== null && typeof value === 'object') {
    const entries = Object.entries(value as Record<string, unknown>);
    if (entries.length === 0) {
      return [`${indent}{}`];
    }

    return entries.flatMap(([key, nestedValue]) => {
      if (Array.isArray(nestedValue)) {
        if (nestedValue.length === 0) {
          return [`${indent}${key}: []`];
        }

        const nestedLines = toYamlLines(nestedValue, indentLevel + 1);
        return [`${indent}${key}:`, ...nestedLines];
      }

      if (nestedValue !== null && typeof nestedValue === 'object') {
        const nestedLines = toYamlLines(nestedValue, indentLevel + 1);
        return [`${indent}${key}:`, ...nestedLines];
      }

      return [`${indent}${key}: ${formatScalar(nestedValue)}`];
    });
  }

  return [`${indent}${formatScalar(value)}`];
};

export const serializeSnapshot = (
  payload: unknown,
  format: SnapshotOutputFormat,
): string => {
  if (format === 'json') {
    return `${JSON.stringify(payload, null, 2)}\n`;
  }

  return `${toYamlLines(payload, 0).join('\n')}\n`;
};

export const resolveSnapshotOutputFormat = (
  requestedFormat: string | undefined,
  outputPath?: string,
): SnapshotOutputFormat => {
  if (requestedFormat) {
    const normalized = requestedFormat.trim().toLowerCase();
    if (normalized === 'json' || normalized === 'yaml') {
      return normalized;
    }

    throw new Error(`Formato no soportado: ${requestedFormat}. Usa json o yaml.`);
  }

  if (outputPath) {
    const extension = path.extname(outputPath).toLowerCase();
    if (extension === '.yaml' || extension === '.yml') {
      return 'yaml';
    }
  }

  return 'json';
};
