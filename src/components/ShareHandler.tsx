import { router } from 'expo-router';
import { useShareIntentContext } from 'expo-share-intent';
import { useEffect, useRef } from 'react';
import { Alert } from 'react-native';

import { useSession } from '@/lib/auth';
import { saveShare } from '@/lib/share';
import { track } from '@/lib/track';

// Turns whatever was shared into Parso into a save and opens the save sheet. A share that arrives
// while signed out waits here until sign-in finishes.
export function ShareHandler() {
  const { hasShareIntent, shareIntent, resetShareIntent } = useShareIntentContext();
  const { session } = useSession();
  const busy = useRef(false);
  const userId = session?.user.id;

  useEffect(() => {
    if (!hasShareIntent || !userId || busy.current) return;
    busy.current = true;
    saveShare(shareIntent, userId)
      .then((result) => {
        if ('saveId' in result) {
          track('save_created', { kind: result.kind, source: result.source, via: 'share' });
          router.push({ pathname: '/save/[id]', params: { id: result.saveId, shared: '1' } });
        } else Alert.alert(result.error);
      })
      .finally(() => {
        resetShareIntent();
        busy.current = false;
      });
  }, [hasShareIntent, shareIntent, userId, resetShareIntent]);

  return null;
}
