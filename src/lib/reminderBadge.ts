// The number on the Parsos bell: reminders that went off since the Reminders page was last opened (owner request
// after build 16). Pure, so it's tested in tests/.

export const BADGE_MAX = 9;

export function dueSince(reminderTimes: string[], seenAt: Date, now: Date): number {
  return reminderTimes.filter((at) => {
    const time = new Date(at).getTime();
    return time > seenAt.getTime() && time <= now.getTime();
  }).length;
}

// "9+" above nine; no label at all when nothing new has gone off.
export const badgeLabel = (count: number): string | null =>
  count <= 0 ? null : count > BADGE_MAX ? `${BADGE_MAX}+` : String(count);
