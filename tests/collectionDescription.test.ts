// Run with: npx -y deno@2.9.6 test --no-lock tests/
import { assertEquals } from 'jsr:@std/assert@1';

import { describeDue } from '../supabase/functions/_shared/pipeline.ts';

Deno.test('a collection is described at 3 saves, then again at 6, 12, 25, 50, 100 and 200', () => {
  assertEquals(describeDue(2, null), false);
  assertEquals(describeDue(3, null), true);
  assertEquals(describeDue(5, 3), false);
  assertEquals(describeDue(6, 3), true);
  assertEquals(describeDue(13, 6), true); // missed 12 while saves arrived together: still caught up
  assertEquals(describeDue(13, 13), false);
  assertEquals(describeDue(201, 200), false);
});
