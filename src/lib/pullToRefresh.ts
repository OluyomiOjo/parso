import { useCallback, useState } from 'react';

// Pull to refresh that only spins when the person pulled. Feeding a query's isRefetching to RefreshControl made
// iOS treat every background refetch (coming back to a page) as a pull, leaving the page pushed down under a
// spinner (owner report, build 17).
export function usePullToRefresh(refresh: () => Promise<unknown> | void) {
  const [refreshing, setRefreshing] = useState(false);
  const onRefresh = useCallback(() => {
    setRefreshing(true);
    void Promise.resolve(refresh())
      .catch(() => undefined)
      .finally(() => setRefreshing(false));
  }, [refresh]);
  return { refreshing, onRefresh };
}
