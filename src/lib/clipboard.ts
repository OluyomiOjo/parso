import * as Clipboard from 'expo-clipboard';
import { useCallback, useEffect, useState } from 'react';
import { AppState } from 'react-native';

// Whether a link is on the clipboard, checked when Parso opens or comes back to the front. hasUrlAsync asks
// iOS only whether a link is there, without reading it, so no "Allow paste" alert appears. The link itself is
// read only through Apple's paste button, which doesn't alert either. Once pasted or dismissed, the bar
// stays away until the next time Parso comes back to the front.
export function useClipboardLink() {
  const [hasLink, setHasLink] = useState(false);

  const check = useCallback(() => {
    if (!Clipboard.isPasteButtonAvailable) return; // iOS 16 and later
    Clipboard.hasUrlAsync()
      .then(setHasLink)
      .catch(() => setHasLink(false));
  }, []);

  useEffect(() => {
    check();
    const sub = AppState.addEventListener('change', (state) => state === 'active' && check());
    return () => sub.remove();
  }, [check]);

  return { hasLink, dismiss: () => setHasLink(false) };
}
