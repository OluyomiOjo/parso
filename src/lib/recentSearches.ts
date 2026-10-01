import AsyncStorage from '@react-native-async-storage/async-storage';
import { useCallback, useEffect, useState } from 'react';

import { useSession } from './auth';

// Recent searches stay on this phone only, one list per signed-in person.
const MAX_RECENT = 6;
const keyFor = (userId: string) => `parso.recentSearches.${userId}`;

export function useRecentSearches() {
  const { session } = useSession();
  const userId = session?.user.id;
  const [recent, setRecent] = useState<string[]>([]);

  useEffect(() => {
    if (!userId) return;
    AsyncStorage.getItem(keyFor(userId))
      .then((raw) => setRecent(raw ? (JSON.parse(raw) as string[]) : []))
      .catch(() => setRecent([]));
  }, [userId]);

  const store = useCallback(
    (next: string[]) => {
      setRecent(next);
      if (userId) AsyncStorage.setItem(keyFor(userId), JSON.stringify(next)).catch(() => undefined);
    },
    [userId],
  );

  const add = useCallback(
    (query: string) => {
      const q = query.trim().replace(/\s+/g, ' ');
      if (!q) return;
      setRecent((current) => {
        const next = [q, ...current.filter((r) => r.toLowerCase() !== q.toLowerCase())].slice(0, MAX_RECENT);
        if (userId) AsyncStorage.setItem(keyFor(userId), JSON.stringify(next)).catch(() => undefined);
        return next;
      });
    },
    [userId],
  );

  const clear = useCallback(() => store([]), [store]);

  return { recent, add, clear };
}
