export interface RecencyGroups<T> {
  today: T[];
  week: T[];
  older: T[];
}

const DAY_MS = 24 * 60 * 60 * 1000;

export function groupByRecency<T>(
  items: T[],
  getTouchedMs: (item: T) => number | null | undefined,
): RecencyGroups<T> {
  const now = Date.now();
  const today: T[] = [];
  const week: T[] = [];
  const older: T[] = [];

  for (const item of items) {
    const ms = getTouchedMs(item);
    if (!ms || Number.isNaN(ms)) {
      older.push(item);
      continue;
    }
    const age = now - ms;
    if (age < DAY_MS) today.push(item);
    else if (age < 7 * DAY_MS) week.push(item);
    else older.push(item);
  }

  return { today, week, older };
}
