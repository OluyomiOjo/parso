// The Parso Pro rules the app shows (the database enforces the same limit, migration 0022). Kept free of React so
// they can be tested on their own (tests/plan.test.ts).

export const FREE_SAVES = 50;
const WARN_FROM = 40; // the save sheet starts saying how many free saves are left (owner request after build 18)

export type Plan = { pro: boolean; used: number; proUntil: string | null; adminPro: boolean };

// True when a new save needs Pro first.
export const needsUpgrade = (plan: Plan | undefined) => Boolean(plan && !plan.pro && plan.used >= FREE_SAVES);

// "5 free saves left", shown on the save sheet near the limit; null otherwise.
export function freeSavesLeft(plan: Plan | undefined): string | null {
  if (!plan || plan.pro || plan.used < WARN_FROM) return null;
  const left = Math.max(0, FREE_SAVES - plan.used);
  if (left === 0) return 'That was your last free save.';
  return `${left} free ${left === 1 ? 'save' : 'saves'} left`;
}

// Yearly against twelve monthly payments, in whole percent rounded down ("Save 33%"), from the store's own prices
// so it's right in every currency. Null when either price is missing or there's no saving.
export function percentSaved(monthly: number | undefined, yearly: number | undefined): number | null {
  if (!monthly || !yearly || monthly <= 0) return null;
  const percent = Math.floor((1 - yearly / (monthly * 12)) * 100);
  return percent > 0 ? percent : null;
}

export type MyNumbers = { saves: number; collections: number; opened: number };

const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;

// "50 saves in 11 collections", with "You went back to them 55 times." when they have (Pro page, save 30).
function built(numbers: MyNumbers): { built: string; back: string | null } {
  return {
    built: `${plural(numbers.saves, 'save', 'saves')} in ${plural(numbers.collections, 'collection', 'collections')}`,
    back: numbers.opened > 0 ? `you've gone back to them ${plural(numbers.opened, 'time', 'times')}` : null,
  };
}

const sentence = (text: string) => text.charAt(0).toUpperCase() + text.slice(1);

// The Pro page in three moments (owner decisions after builds 20 and 21): a save was just stopped by the limit
// (say what happened and what to do, so they can finish saving); at the limit, opened from the You tab (what
// they've built); before the limit (what Pro gives).
// A fourth moment, 'first': shown once, right after the person's first save, offering the free trial (owner
// decision after build 22).
export type ProMoment = 'first' | 'stopped' | 'limit' | 'before';

export const proMoment = (plan: Plan | undefined, stopped: boolean, first = false): ProMoment =>
  stopped ? 'stopped' : first ? 'first' : needsUpgrade(plan) ? 'limit' : 'before';

// trial: the free trial's length in days when the person can still start one, otherwise null.
export function proHeadline(moment: ProMoment, trial: number | null = null): string {
  if (moment === 'stopped') return `You've used your ${FREE_SAVES} free saves`;
  if (moment === 'limit') return "You've built something worth keeping";
  if (moment === 'first' && trial) return `Try Parso Pro free for ${trial} days`;
  return 'Save as much as you like with Pro';
}

// The Pro page's numbers line: at the limit, the person's own numbers (my_numbers, migration 0028); before it,
// how much of the free allowance is used.
export function proNumbers(
  moment: ProMoment,
  plan: Plan | undefined,
  numbers: MyNumbers | undefined,
  trial: number | null = null,
): string | null {
  if (moment === 'stopped')
    return trial
      ? 'Start your free trial and this saves straight away.'
      : 'Subscribe to Parso Pro and this saves straight away.';
  if (moment === 'first') return "Your first save is in. With Pro, there's no limit to what you keep.";
  if (moment === 'limit') {
    if (!numbers) return `You've used your ${FREE_SAVES} free saves.`;
    const { built: what, back } = built(numbers);
    return back ? `${sentence(what)}. ${sentence(back)}.` : `${sentence(what)}.`;
  }
  if (plan && !plan.pro) return `${Math.min(plan.used, FREE_SAVES)} of your ${FREE_SAVES} free saves used.`;
  return null;
}

const MILESTONE = 30;

// A friendly heads-up on the save sheet for the 30th save only: what they've built first, the limit last
// (owner decision after build 20). No mention of Pro.
export function milestoneLine(plan: Plan | undefined, numbers: MyNumbers | undefined): string | null {
  if (!plan || plan.pro || plan.used !== MILESTONE) return null;
  const left = `${FREE_SAVES - MILESTONE} free saves left.`;
  if (!numbers) return `That's ${MILESTONE} saves. ${left}`;
  const { built: what, back } = built({ ...numbers, saves: MILESTONE });
  return back ? `That's ${what}, and ${back}. ${left}` : `That's ${what}. ${left}`;
}

// The You tab's line about the plan.
export function planLine(plan: Plan, months: readonly string[]): string {
  if (plan.adminPro) return 'Parso Pro';
  if (plan.pro && plan.proUntil) {
    const until = new Date(plan.proUntil);
    if (until.getFullYear() > 2900) return 'Parso Pro';
    return `Parso Pro, renews ${months[until.getMonth()]} ${until.getDate()}`;
  }
  return `${Math.min(plan.used, FREE_SAVES)} of ${FREE_SAVES} free saves used`;
}

// The database refuses a save beyond the free limit with this message (migration 0022).
export const LIMIT_MESSAGE = 'save_limit_reached';
export const isLimitError = (error: unknown) =>
  Boolean(error && typeof error === 'object' && 'message' in error && String(error.message).includes(LIMIT_MESSAGE));

// The free trial on Yearly (owner decision after build 22: 14 days, set in App Store Connect). Its length in days,
// from the store's own description of the offer; null when there's no free trial.
const UNIT_DAYS: Record<string, number> = { DAY: 1, WEEK: 7, MONTH: 30, YEAR: 365 };

export function trialDays(
  intro: { price: number; periodUnit: string; periodNumberOfUnits: number } | null | undefined,
): number | null {
  if (!intro || intro.price > 0) return null;
  const unit = UNIT_DAYS[intro.periodUnit.toUpperCase()];
  return unit ? unit * intro.periodNumberOfUnits : null;
}

export const trialButton = (days: number) => `Start free for ${days} days`;
export const trialTerms = (yearlyPrice: string) => `Then ${yearlyPrice} a year. Cancel anytime.`;
export const TRIAL_REMINDER_LINE = "We'll remind you 2 days before your trial ends.";

const DAY_MS = 24 * 60 * 60 * 1000;

// The reminder goes off 2 days before the trial ends; none when that moment has passed.
export function trialReminderAt(trialEnds: Date, now: Date = new Date()): Date | null {
  const at = new Date(trialEnds.getTime() - 2 * DAY_MS);
  return at > now ? at : null;
}

export function trialReminderText(trialEnds: Date, months: readonly string[]) {
  return {
    title: 'Your Parso Pro trial ends in 2 days',
    body: `It renews on ${months[trialEnds.getMonth()]} ${trialEnds.getDate()} unless you cancel in Settings.`,
  };
}

// The Pro page once after the first save: only for free accounts that have saved something and haven't reached the
// limit (that has its own page), and only if it hasn't been shown before.
export const offerAfterFirstSave = (plan: Plan | undefined, alreadyOffered: boolean) =>
  Boolean(plan && !plan.pro && plan.used >= 1 && plan.used < FREE_SAVES && !alreadyOffered);
