/** One run of items under one group name; `name` is undefined for the items that name none. */
export interface GroupRun<T> {
  name: string | undefined;
  items: T[];
}

/**
 * Items gathered by their `group`, one run per group in the order each group
 * first appears, with the items that name no group first. Within a run the
 * items keep their own order.
 */
export function groupInOrder<T extends { group?: string | undefined }>(items: readonly T[]): GroupRun<T>[] {
  const loose: T[] = [];
  const runs = new Map<string, T[]>();
  for (const item of items) {
    if (item.group === undefined || item.group === '') {
      loose.push(item);
      continue;
    }
    const run = runs.get(item.group);
    if (run) run.push(item);
    else runs.set(item.group, [item]);
  }
  return [
    ...(loose.length > 0 ? [{ name: undefined, items: loose }] : []),
    ...[...runs].map(([name, run]) => ({ name, items: run })),
  ];
}
