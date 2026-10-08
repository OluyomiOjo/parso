// The Parso Pro rules the app shows (the database enforces the same limit, migration 0022). Kept free of React so
// they can be tested on their own (tests/plan.test.ts).

export const FREE_SAVES = 50;
const WARN_FROM = 45; // the save sheet starts saying how many free saves are left

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
