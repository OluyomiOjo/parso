import { useCallback, useState } from 'react';

import { checkConnection } from './connection';

// Pull to refresh that only spins when the person pulled. Feeding a query's isRefetching to RefreshControl made
// iOS treat every background refetch (coming back to a page) as a pull, leaving the page pushed down under a
// spinner (owner report, build 17). Pulling also checks the connection: offline, the spinner stops at once (a
// list can't load until the connection is back, and then it reloads by itself).
export function usePullToRefresh(refresh: () => Promise<unknown> | void) {
  const [refreshing, setRefreshing] = useState(false);
  const onRefresh = useCallback(() => {
    setRefreshing(true);
    void checkConnection()
      .then((online) => (online ? refresh() : undefined))
      .catch(() => undefined)
      .finally(() => setRefreshing(false));
  }, [refresh]);
  return { refreshing, onRefresh };
}
