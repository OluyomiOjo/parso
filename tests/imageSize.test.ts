import { assertEquals } from 'jsr:@std/assert@1';

import { imageSize } from '../supabase/functions/_shared/image.ts';

// Tiny real files (made with Pillow, stored in fixtures/images.json), one per format the pipeline accepts.
const decode = (b64: string) => Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));

Deno.test('reads PNG, JPEG, GIF and WebP sizes', async () => {
  const files = JSON.parse(await Deno.readTextFile(new URL('./fixtures/images.json', import.meta.url))) as Record<
    string,
    { b64: string; width: number; height: number }
  >;
  for (const [name, f] of Object.entries(files)) {
    assertEquals(imageSize(decode(f.b64)), { width: f.width, height: f.height }, name);
  }
});

Deno.test('returns null for something that is not an image', () => {
  assertEquals(imageSize(new TextEncoder().encode('<html>not an image</html>')), null);
});
