import { assertEquals } from 'jsr:@std/assert@1';

import { findMatches, parseQuery, stem } from './searchText.ts';

Deno.test('reads the platform and drops filler words', () => {
  const p = parseQuery('pasta I saved from instagram');
  assertEquals(p.source, 'instagram');
  assertEquals(p.kind, null);
  assertEquals(p.terms, ['pasta']);
});

Deno.test('short platform names need a preposition', () => {
  assertEquals(parseQuery('x ray results').source, null);
  assertEquals(parseQuery('that thread on x').source, 'x');
  assertEquals(parseQuery('ig reels about dogs').source, null);
});

Deno.test('reads the kind', () => {
  const p = parseQuery('screenshot of the visa bulletin');
  assertEquals(p.kind, 'screenshot');
  assertEquals(p.terms, ['visa', 'bulletin']);
  assertEquals(parseQuery('family photos').kind, 'image');
});

Deno.test('stems plurals and endings', () => {
  assertEquals(stem('visas'), 'visa');
  assertEquals(stem('recipes'), 'recipe');
  assertEquals(stem('stories'), 'story');
  assertEquals(stem('glass'), 'glass');
});

Deno.test('finds matched words as written in each field', () => {
  const m = findMatches(
    { title: 'H-1B vs. O-1A visas for working in the US', snippet: 'Visa options compared' },
    parseQuery('visa').terms,
  );
  assertEquals(m, [
    { field: 'title', term: 'visas' },
    { field: 'snippet', term: 'Visa' },
  ]);
});

Deno.test('no match for unrelated words', () => {
  assertEquals(findMatches({ title: 'Modern glass house with a wide deck' }, ['pasta']), []);
});
