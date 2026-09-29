export function normalizeProviders(value: unknown, available: readonly string[]): string[] {
  if (!Array.isArray(value)) { return [...available]; }
  return [...new Set(value.filter((id): id is string => typeof id === 'string' && available.includes(id)))];
}

export function providerOrder(enabled: readonly string[], available: readonly string[]): string[] {
  return [...normalizeProviders(enabled, available), ...available.filter(id => !enabled.includes(id))];
}

export function moveProvider(ids: readonly string[], id: string, direction: -1 | 1): string[] {
  const result = [...ids];
  const index = result.indexOf(id);
  const destination = index + direction;
  if (index >= 0 && destination >= 0 && destination < result.length) {
    [result[index], result[destination]] = [result[destination], result[index]];
  }
  return result;
}
