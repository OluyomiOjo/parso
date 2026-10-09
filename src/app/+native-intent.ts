import { getShareExtensionKey } from 'expo-share-intent';

// Links from the share extension carry the shared data, not a screen. Open Parsos; the root layout
// picks the share up from expo-share-intent and opens the save sheet.
export function redirectSystemPath({ path }: { path: string; initial: boolean }) {
  try {
    return path.includes(`dataUrl=${getShareExtensionKey()}`) ? '/' : path;
  } catch {
    return '/';
  }
}
