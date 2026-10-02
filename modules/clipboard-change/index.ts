import { requireOptionalNativeModule } from 'expo';

type ClipboardChangeModule = { changeCount(): number };

// Missing on Android and in builds made before this module existed; callers treat null as "can't tell".
const native = requireOptionalNativeModule<ClipboardChangeModule>('ClipboardChange');

// How many times anything has been copied on this phone (iOS), without reading the clipboard itself.
export function clipboardChangeCount(): number | null {
  try {
    return native ? native.changeCount() : null;
  } catch {
    return null;
  }
}
