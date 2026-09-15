// Calendar-day helpers anchored to America/New_York -- the club's home
// timezone for now (2026-09-15). Mirrors mobile/lib/dates.ts; duplicated
// rather than shared, same tradeoff as _shared/logic/types.ts vs
// mobile/lib/types.ts, since Deno and Hermes don't share a module graph.
const TIMEZONE = "America/New_York";

/** "YYYY-MM-DD" for `now`, as a calendar date in `timeZone`. */
export function todayInTimeZone(timeZone: string = TIMEZONE, now: Date = new Date()): string {
  // en-CA formats as YYYY-MM-DD directly.
  return new Intl.DateTimeFormat("en-CA", { timeZone, year: "numeric", month: "2-digit", day: "2-digit" }).format(now);
}

/** "YYYY-MM-DD" for the calendar day before `now`, in `timeZone`. */
export function yesterdayInTimeZone(timeZone: string = TIMEZONE, now: Date = new Date()): string {
  return todayInTimeZone(timeZone, new Date(now.getTime() - 24 * 60 * 60 * 1000));
}
