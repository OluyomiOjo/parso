// "Your week in Parso" (owner decisions in step 11): the rules, kept free of app code so they're tested in tests/.
// A week ends on Sunday at 6 PM, phone time. From then until the end of Wednesday the update is "ready": the
// screen shows that finished week and My Parsos shows a card until it's opened. Any other time, the screen shows
// the week so far.

const DAY = 24 * 60 * 60 * 1000;
const WEEK_HOUR = 18; // Sunday 6 PM
const READY_FOR = 78 * 60 * 60 * 1000; // Sunday 6 PM to the end of Wednesday
export const ASK_DAYS = 30; // saves asked about are from the last 30 days; "From your past" is older
export const ASK_MAX = 5;

// The most recent Sunday 6 PM at or before now.
export function lastWeekEnd(now: Date): Date {
  const end = new Date(now);
  end.setHours(WEEK_HOUR, 0, 0, 0);
  end.setDate(end.getDate() - end.getDay()); // back to Sunday
  if (end > now) end.setDate(end.getDate() - 7);
  return end;
}

// The next Sunday 6 PM after now: when the notification goes off.
export function nextWeekEnd(now: Date): Date {
  const end = lastWeekEnd(now);
  end.setDate(end.getDate() + 7);
  return end;
}

export type WeekRange = { start: Date; end: Date; ready: boolean };

export function weekRange(now: Date): WeekRange {
  const boundary = lastWeekEnd(now);
  if (now.getTime() - boundary.getTime() < READY_FOR) {
    const start = new Date(boundary);
    start.setDate(start.getDate() - 7);
    return { start, end: boundary, ready: true };
  }
  return { start: boundary, end: now, ready: false };
}

// The card on My Parsos: only while the week is ready and it hasn't been opened since the week ended.
export function showWeekCard(now: Date, lastOpened: Date | null): boolean {
  const range = weekRange(now);
  return range.ready && (!lastOpened || lastOpened < range.end);
}

export const askSince = (now: Date) => new Date(now.getTime() - ASK_DAYS * DAY);

type Askable = { created_at: string; done_at: string | null; next_step: string | null };

// Recent saves that aren't done and have a question, newest first, up to five.
export function savesToAsk<T extends Askable>(saves: T[], now: Date): T[] {
  const since = askSince(now);
  return saves
    .filter((s) => !s.done_at && s.next_step && new Date(s.created_at) >= since)
    .sort((a, b) => b.created_at.localeCompare(a.created_at))
    .slice(0, ASK_MAX);
}

// Which older save "From your past" shows: the same one all week, a different one the next.
export function pastIndex(weekEnd: Date, count: number): number {
  if (count <= 0) return -1;
  const weekNumber = Math.floor(weekEnd.getTime() / (7 * DAY));
  return (weekNumber * 7919) % count; // a prime step, so neighbouring weeks land far apart
}

// The busiest value in a list ("Recipes", "instagram"), or null when there's nothing to count.
export function mostCommon(values: (string | null)[]): string | null {
  const counts = new Map<string, number>();
  for (const v of values) if (v) counts.set(v, (counts.get(v) ?? 0) + 1);
  let best: string | null = null;
  let bestCount = 0;
  for (const [value, n] of counts) {
    if (n > bestCount) [best, bestCount] = [value, n];
  }
  return best;
}

const saves = (n: number) => `${n} ${n === 1 ? 'save' : 'saves'}`;

// The Sunday notification's body, written from the person's own numbers.
export function weekNotificationBody(saved: number, waiting: number): string {
  const waitingLine = waiting === 0 ? '' : ` ${waiting === 1 ? '1 is' : `${waiting} are`} waiting on you.`;
  if (saved === 0)
    return waiting ? `Nothing new this week.${waitingLine}` : 'Nothing new this week. See what you saved before.';
  return `${saves(saved)} this week.${waitingLine}`;
}

// "Most saved: Recipes, from Instagram", or whichever half is known.
export function mostSavedLine(collection: string | null, app: string | null): string | null {
  if (collection && app) return `${collection}, from ${app}`;
  return collection ?? (app ? `From ${app}` : null);
}

const day = (d: Date, months: string[]) => `${months[d.getMonth()]} ${d.getDate()}`;

// "Oct 5 to Oct 12" for a finished week; "This week so far, since Oct 12" otherwise.
export function rangeLabel(range: WeekRange, months: string[]): string {
  return range.ready
    ? `${day(range.start, months)} to ${day(range.end, months)}`
    : `This week so far, since ${day(range.start, months)}`;
}

// "Done on Oct 12".
export const doneLabel = (doneAt: string, months: string[]) => {
  const d = new Date(doneAt);
  return `Done on ${months[d.getMonth()]} ${d.getDate()}`;
};
