// Reminder times, in the phone's own time zone. Pure functions, so they can be tested on their own
// (tests/reminderTime.test.ts).

export type ReminderChoice = 'tonight' | 'weekend' | 'nextWeek';

export const TONIGHT_HOUR = 20; // 8:00 PM
const TONIGHT_CUTOFF_MINUTES = 30; // from 7:30 PM, "Tonight" means one hour from now
const WEEKEND_HOUR = 10; // Saturday or Sunday, 10:00 AM
const NEXT_WEEK_HOUR = 9; // Monday, 9:00 AM
const HOUR = 60 * 60 * 1000;

const at = (day: Date, hour: number) => {
  const d = new Date(day);
  d.setHours(hour, 0, 0, 0);
  return d;
};

const addDays = (day: Date, n: number) => {
  const d = new Date(day);
  d.setDate(d.getDate() + n);
  return d;
};

export function reminderTime(choice: ReminderChoice, now: Date = new Date()): Date {
  if (choice === 'tonight') {
    const eight = at(now, TONIGHT_HOUR);
    const cutoff = new Date(eight.getTime() - TONIGHT_CUTOFF_MINUTES * 60 * 1000);
    if (now < cutoff) return eight;
    const inAnHour = new Date(now.getTime() + HOUR);
    inAnHour.setSeconds(0, 0);
    return inAnHour;
  }
  if (choice === 'weekend') {
    // The next Saturday or Sunday 10:00 AM that hasn't passed yet.
    for (let i = 0; i <= 7; i++) {
      const day = addDays(now, i);
      const weekday = day.getDay(); // 0 Sunday, 6 Saturday
      if ((weekday === 6 || weekday === 0) && at(day, WEEKEND_HOUR) > now) return at(day, WEEKEND_HOUR);
    }
  }
  // Next week: the coming Monday at 9:00 AM (a week on, if today is Monday).
  const daysToMonday = (8 - now.getDay()) % 7 || 7;
  return at(addDays(now, daysToMonday), NEXT_WEEK_HOUR);
}

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

// Hand-written (like relativeTime in format.ts): Hermes's Intl date support varies by build.
export function clockTime(d: Date): string {
  const h = d.getHours();
  const m = d.getMinutes();
  return `${h % 12 || 12}:${String(m).padStart(2, '0')} ${h < 12 ? 'AM' : 'PM'}`;
}

const sameDay = (a: Date, b: Date) =>
  a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();

// "Tonight at 8:00 PM", "Tomorrow at 9:00 AM", "Sat at 10:00 AM", "Oct 20 at 9:00 AM", or "Due now".
export function formatReminder(when: Date, now: Date = new Date()): string {
  if (when <= now) return 'Due now';
  const time = clockTime(when);
  if (sameDay(when, now)) return `${when.getHours() >= 17 ? 'Tonight' : 'Today'} at ${time}`;
  if (sameDay(when, addDays(now, 1))) return `Tomorrow at ${time}`;
  if (when.getTime() - now.getTime() < 6 * 24 * HOUR) return `${WEEKDAYS[when.getDay()]} at ${time}`;
  return `${MONTHS[when.getMonth()]} ${when.getDate()} at ${time}`;
}

// The detail panel's short form, as in design 6: "Sat, 10:00 AM".
export function shortReminder(when: Date): string {
  return `${WEEKDAYS[when.getDay()]}, ${clockTime(when)}`;
}

// Which choice produced this time, so the control can show it selected (null if set some other way).
export function choiceFor(when: Date | null, now: Date = new Date()): ReminderChoice | null {
  if (!when) return null;
  return (
    (['tonight', 'weekend', 'nextWeek'] as const).find(
      (c) => Math.abs(reminderTime(c, now).getTime() - when.getTime()) < 60 * 1000,
    ) ?? null
  );
}
