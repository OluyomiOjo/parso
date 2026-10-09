import AsyncStorage from '@react-native-async-storage/async-storage';
import { useSyncExternalStore } from 'react';

import { track } from './track';

// List or grid on Parsos and Collections, one choice for both, remembered on the phone (owner asked in
// step 10). Starts on list.
export type ViewMode = 'list' | 'grid';

const KEY = 'parso.view';
let mode: ViewMode = 'list';
const listeners = new Set<() => void>();
const notify = () => listeners.forEach((listener) => listener());

AsyncStorage.getItem(KEY)
  .then((stored) => {
    if (stored === 'grid' && mode !== 'grid') {
      mode = 'grid';
      notify();
    }
  })
  .catch(() => undefined);

function setMode(next: ViewMode) {
  if (next === mode) return;
  mode = next;
  notify();
  track('view_switched', { via: next });
  AsyncStorage.setItem(KEY, next).catch(() => undefined);
}

const subscribe = (listener: () => void) => {
  listeners.add(listener);
  return () => listeners.delete(listener);
};

export function useViewMode() {
  return { mode: useSyncExternalStore(subscribe, () => mode), setMode };
}
