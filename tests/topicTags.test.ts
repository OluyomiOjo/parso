import { assertEquals } from 'jsr:@std/assert@1';

import { isFormatName, topicTags } from '../supabase/functions/_shared/ai.ts';

Deno.test('a tag that is only a format word is dropped', () => {
  assertEquals(topicTags(['finland', 'Video', 'winter travel', 'reel', 'photo']), ['finland', 'winter travel']);
});

Deno.test('phrases stay, since a format can be the topic', () => {
  assertEquals(topicTags(['ai video', 'instagram reels', 'video template']), [
    'ai video',
    'instagram reels',
    'video template',
  ]);
});

Deno.test('tags are lowercased and kept once', () => {
  assertEquals(topicTags(['Travel', 'travel ', '']), ['travel']);
});

Deno.test('collections named after a format are recognised', () => {
  assertEquals(['Photos', 'Videos ', 'Travel', 'Home ideas'].map(isFormatName), [true, true, false, false]);
});
