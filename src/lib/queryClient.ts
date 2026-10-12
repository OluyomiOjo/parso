import AsyncStorage from '@react-native-async-storage/async-storage';
import { createAsyncStoragePersister } from '@tanstack/query-async-storage-persister';
import { QueryClient } from '@tanstack/react-query';
import type { PersistQueryClientOptions } from '@tanstack/react-query-persist-client';

// The phone keeps a copy of what Parso last loaded (saves, collections, notes, reminders, the weekly screen), so
// it opens straight to Parsos and still works with no internet. Online, the copy shows at once and is refreshed
// quietly. Signing out clears it (src/app/_layout.tsx).
const KEEP_MS = 7 * 24 * 60 * 60 * 1000; // a week; older copies are dropped
const KEPT = new Set(['saves', 'collections', 'save', 'thumbnails', 'week']);
const CACHE_VERSION = '1'; // raise when the shape of kept data changes, so an old copy is never read

export const queryClient = new QueryClient({
  defaultOptions: {
    // Kept in memory as long as on the phone, so a page visited earlier is still there offline.
    queries: { gcTime: KEEP_MS },
    // Changes fail with their usual "check your connection" message instead of waiting silently for the network.
    mutations: { networkMode: 'always' },
  },
});

const persister = createAsyncStoragePersister({ storage: AsyncStorage, key: 'parso.cache', throttleTime: 1000 });

export const persistOptions: Omit<PersistQueryClientOptions, 'queryClient'> = {
  persister,
  maxAge: KEEP_MS,
  buster: CACHE_VERSION,
  dehydrateOptions: {
    shouldDehydrateQuery: (query) => query.state.status === 'success' && KEPT.has(String(query.queryKey[0])),
  },
};

export const forgetCache = () => persister.removeClient();
