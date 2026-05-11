export function formatLocalDateKey(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

export function startOfLocalDay(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

export function parseDateValue(value: unknown) {
  if (typeof value !== "string") return null;

  const trimmed = value.trim();
  if (!trimmed) return null;

  const localDateMatch = /^(\d{4})-(\d{2})-(\d{2})$/.exec(trimmed);
  if (localDateMatch) {
    const [, year, month, day] = localDateMatch;
    return new Date(Number(year), Number(month) - 1, Number(day));
  }

  const parsed = new Date(trimmed);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

export function getUpcomingSaturdayDateKey(reference = new Date()) {
  const base = startOfLocalDay(reference);
  const delta = (6 - base.getDay() + 7) % 7;
  const daysToAdd = delta === 0 ? 7 : delta;
  const target = new Date(base);
  target.setDate(target.getDate() + daysToAdd);
  return formatLocalDateKey(target);
}
