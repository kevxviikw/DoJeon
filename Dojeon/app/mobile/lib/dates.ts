// Calendar-day math anchored to a fixed timezone rather than raw
// Date.now()/86_400_000 subtraction -- the latter is UTC-based and drifts
// against what "today" means to an actual user (DST, and the several
// hours where the user's local calendar date and UTC's don't agree yet),
// which is what made the Today tab's "Day N" counter read as stuck.
//
// Club is Pennsylvania-based for now (2026-09-15) -- hardcoded, not user
// timezone detection. Revisit if the club goes multi-timezone.
export const APP_TIMEZONE = "America/New_York";

function ymdInTimeZone(date: Date, timeZone: string): { y: number; m: number; d: number } {
  const parts = new Intl.DateTimeFormat("en-US", { timeZone, year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(
    date
  );
  const get = (type: string) => Number(parts.find((p) => p.type === type)?.value);
  return { y: get("year"), m: get("month"), d: get("day") };
}

/** Whole calendar days between two instants, both evaluated as calendar dates in `timeZone` -- immune to DST and cross-UTC-boundary drift. */
export function calendarDaysBetween(a: Date, b: Date, timeZone: string = APP_TIMEZONE): number {
  const A = ymdInTimeZone(a, timeZone);
  const B = ymdInTimeZone(b, timeZone);
  return Math.round((Date.UTC(B.y, B.m - 1, B.d) - Date.UTC(A.y, A.m - 1, A.d)) / 86_400_000);
}

/** 1-indexed mission day -- the calendar day the mission was created is Day 1. */
export function missionDayNumber(createdAt: string, now: Date = new Date(), timeZone: string = APP_TIMEZONE): number {
  return Math.max(1, calendarDaysBetween(new Date(createdAt), now, timeZone) + 1);
}

/** Calendar days remaining until a bare "YYYY-MM-DD" deadline, from today's date in `timeZone`. */
export function daysRemainingUntil(deadlineDateStr: string, now: Date = new Date(), timeZone: string = APP_TIMEZONE): number {
  const today = ymdInTimeZone(now, timeZone);
  const todayUTC = Date.UTC(today.y, today.m - 1, today.d);
  const [dy, dm, dd] = deadlineDateStr.split("-").map(Number);
  const deadlineUTC = Date.UTC(dy, dm - 1, dd);
  return Math.max(0, Math.round((deadlineUTC - todayUTC) / 86_400_000));
}
