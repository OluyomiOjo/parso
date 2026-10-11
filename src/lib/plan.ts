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

// The Pro page's first line: at the limit, what the person has built in Parso (owner request after build 18);
// before it, how much of the free allowance is used.
export function proLine(plan: Plan | undefined, numbers: MyNumbers | undefined): string {
  if (plan && !plan.pro && plan.used >= FREE_SAVES) {
    if (!numbers) return `You've used your ${FREE_SAVES} free saves. Everything you saved stays yours.`;
    const things = `${numbers.saves} ${numbers.saves === 1 ? 'thing' : 'things'}`;
    const into = `${numbers.collections} ${numbers.collections === 1 ? 'collection' : 'collections'}`;
    const opened =
      numbers.opened > 0 ? `, and went back to them ${numbers.opened} ${numbers.opened === 1 ? 'time' : 'times'}` : '';
    return `You've saved ${things} into ${into}${opened}. Everything you saved stays yours.`;
  }
  if (plan && !plan.pro)
    return `You've used ${Math.min(plan.used, FREE_SAVES)} of your ${FREE_SAVES} free saves. Pro has no limit.`;
  return `Parso is free for your first ${FREE_SAVES} saves. Pro has no limit.`;
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
