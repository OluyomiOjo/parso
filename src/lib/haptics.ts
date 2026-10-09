import * as Haptics from 'expo-haptics';

// Light taps (owner decision, step 11): a gentle tap for small moments (a collection dropped after dragging,
// list and grid switched) and a success tap when something is saved or marked done. Never worth an error.
export const tap = () => void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => undefined);

export const success = () =>
  void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => undefined);
