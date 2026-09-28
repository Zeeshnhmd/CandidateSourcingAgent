interface DateRange {
  startDate: string;
  endDate: string | null;
}

function toMonthIndex(value: string): number | null {
  const match = value.match(/^(\d{4})-(\d{2})/);
  if (!match) return null;
  return Number(match[1]) * 12 + Number(match[2]) - 1;
}

/** Total years covered by the ranges, counting overlapping periods once. Open ranges run until `now`. */
export function yearsCovered(ranges: readonly DateRange[], now: Date): number {
  const nowIndex = now.getUTCFullYear() * 12 + now.getUTCMonth();
  const intervals = ranges
    .map((range) => {
      const start = toMonthIndex(range.startDate);
      const end = range.endDate ? toMonthIndex(range.endDate) : nowIndex;
      return start === null || end === null ? null : ([start, Math.min(end, nowIndex) + 1] as const);
    })
    .filter((interval): interval is readonly [number, number] => interval !== null && interval[1] > interval[0])
    .sort((a, b) => a[0] - b[0]);

  let months = 0;
  let cursor = -Infinity;
  for (const [start, end] of intervals) {
    const from = Math.max(start, cursor);
    if (end > from) months += end - from;
    cursor = Math.max(cursor, end);
  }
  return Math.round((months / 12) * 10) / 10;
}
