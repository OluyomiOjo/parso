import { router } from 'expo-router';
import { useShareIntentContext } from 'expo-share-intent';
import { useEffect, useRef } from 'react';
import { Alert } from 'react-native';

import { useSession } from '@/lib/auth';
import { openUpgrade } from '@/lib/pro';
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
    const intent = shareIntent; // kept for after an upgrade
    const save = () =>
      saveShare(intent, userId).then((result) => {
        if ('saveId' in result) {
          if (!result.existing) track('save_created', { kind: result.kind, source: result.source, via: 'share' });
          router.push({
            pathname: '/save/[id]',
            params: { id: result.saveId, shared: '1', ...(result.existing ? { existing: '1' } : {}) },
          });
        } else if (result.limit) openUpgrade(() => void save());
        else Alert.alert(result.error);
      });
    save().finally(() => {
      resetShareIntent();
      busy.current = false;
    });
  }, [hasShareIntent, shareIntent, userId, resetShareIntent]);

  return null;
}
