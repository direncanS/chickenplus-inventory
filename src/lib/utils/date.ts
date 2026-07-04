/**
 * Get ISO 8601 week number and year for a given date in Europe/Vienna timezone.
 * Handles year boundary edge cases (e.g., Dec 29, 2025 → iso_year=2026, iso_week=1).
 */
export function getISOWeekAndYear(date: Date = new Date()): {
  isoYear: number;
  isoWeek: number;
} {
  // Convert to Europe/Vienna local date
  const viennaDate = new Date(
    date.toLocaleString('en-US', { timeZone: 'Europe/Vienna' })
  );

  // ISO week calculation
  const jan4 = new Date(viennaDate.getFullYear(), 0, 4);
  const startOfWeek = getISOWeekStart(viennaDate);
  const startOfYear = getISOWeekStart(jan4);

  const weekDiff = Math.round(
    (startOfWeek.getTime() - startOfYear.getTime()) / (7 * 24 * 60 * 60 * 1000)
  );
  let isoWeek = weekDiff + 1;
  let isoYear = viennaDate.getFullYear();

  if (isoWeek < 1) {
    // Date belongs to last week of previous year
    isoYear -= 1;
    isoWeek = getISOWeeksInYear(isoYear);
  } else if (isoWeek > getISOWeeksInYear(isoYear)) {
    // Date belongs to first week of next year
    isoWeek = 1;
    isoYear += 1;
  }

  return { isoYear, isoWeek };
}

/**
 * Get the Monday of the ISO week containing the given date.
 */
function getISOWeekStart(date: Date): Date {
  const d = new Date(date.getTime());
  const day = d.getDay();
  // ISO: Monday=1, Sunday=7. JS: Sunday=0, Monday=1...Saturday=6
  const diff = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + diff);
  d.setHours(0, 0, 0, 0);
  return d;
}

/**
 * Get the number of ISO weeks in a year.
 */
function getISOWeeksInYear(year: number): number {
  const jan1 = new Date(year, 0, 1);
  const dec31 = new Date(year, 11, 31);
  // A year has 53 ISO weeks if Jan 1 is Thursday, or Dec 31 is Thursday
  return jan1.getDay() === 4 || dec31.getDay() === 4 ? 53 : 52;
}

/**
 * Format a date in Europe/Vienna timezone for display.
 */
export function formatDateVienna(
  date: Date | string,
  options?: Intl.DateTimeFormatOptions
): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toLocaleDateString('de-AT', {
    timeZone: 'Europe/Vienna',
    ...options,
  });
}

/**
 * Get today's date in Europe/Vienna timezone as 'YYYY-MM-DD'.
 */
export function getTodayVienna(): string {
  const now = new Date();
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Europe/Vienna',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(now);

  const year = parts.find((p) => p.type === 'year')!.value;
  const month = parts.find((p) => p.type === 'month')!.value;
  const day = parts.find((p) => p.type === 'day')!.value;
  return `${year}-${month}-${day}`;
}

/**
 * Get the first and last day of the current month in Europe/Vienna timezone.
 */
export function getCurrentMonthRange(): { minDate: string; maxDate: string } {
  const today = getTodayVienna();
  const [year, month] = today.split('-').map(Number);

  const minDate = `${year}-${String(month).padStart(2, '0')}-01`;

  // Last day of current month
  const lastDay = new Date(year, month, 0).getDate();
  const maxDate = `${year}-${String(month).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;

  return { minDate, maxDate };
}

/**
 * Check if a date string (YYYY-MM-DD) is in the current month (Vienna timezone).
 */
export function isInCurrentMonth(dateStr: string): boolean {
  const today = getTodayVienna();
  const [todayYear, todayMonth] = today.split('-').map(Number);
  const [dateYear, dateMonth] = dateStr.split('-').map(Number);
  return todayYear === dateYear && todayMonth === dateMonth;
}

/**
 * Format a date string (YYYY-MM-DD) as 'DD.MM.YYYY'.
 */
export function formatDateGerman(dateStr: string): string {
  const [year, month, day] = dateStr.split('-');
  return `${day}.${month}.${year}`;
}

/**
 * Format a datetime in Europe/Vienna timezone for display.
 */
export function formatDateTimeVienna(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toLocaleString('de-AT', {
    timeZone: 'Europe/Vienna',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}
