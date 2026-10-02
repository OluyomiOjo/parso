import { useCallback, useEffect, useState } from 'react';

import { adminStats } from '../api';

// Loads one admin-stats answer, with a reload for after an action.
export function useAdmin<T>(body: Record<string, unknown>) {
  const key = JSON.stringify(body);
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(() => {
    setError(null);
    adminStats<T>(JSON.parse(key))
      .then(setData)
      .catch((e: Error) => setError(e.message));
  }, [key]);

  useEffect(load, [load]);
  return { data, error, reload: load };
}
