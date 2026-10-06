// Run with: npx -y deno@2.9.6 test --no-lock tests/
import { assertEquals } from 'jsr:@std/assert@1';

import {
  backspaceAtStart,
  changeText,
  editorText,
  isEmptyNote,
  noteSnippet,
  noteTitle,
  parseNote,
  pressReturn,
  serializeNote,
  shareText,
  toggleChecked,
  toggleType,
  type NoteLine,
} from '../src/lib/noteFormat.ts';

const NOTE = 'Groceries\n- [ ] milk\n- [x] eggs\n• from the market\nplain line';
const shape = (lines: NoteLine[]) => lines.map((l) => `${l.type}${l.checked ? '+' : ''}:${l.text}`);

Deno.test('stored text reads into lines and back unchanged', () => {
  const lines = parseNote(NOTE);
  assertEquals(shape(lines), [
    'text:Groceries',
    'check:milk',
    'check+:eggs',
    'bullet:from the market',
    'text:plain line',
  ]);
  assertEquals(serializeNote(lines), NOTE);
  assertEquals(shape(parseNote('* [X] done\n- dash')), ['check+:done', 'bullet:dash']);
  assertEquals(serializeNote(parseNote('Title\n\n\n')), 'Title'); // trailing blank lines dropped
});

Deno.test('checklist and bullet buttons turn a line on, off, or switch it', () => {
  const lines = parseNote('a\nb');
  const checked = toggleType(lines, 1, 'check');
  assertEquals(shape(checked), ['text:a', 'check:b']);
  assertEquals(shape(toggleType(checked, 1, 'bullet')), ['text:a', 'bullet:b']);
  assertEquals(shape(toggleType(checked, 1, 'check')), ['text:a', 'text:b']);
  assertEquals(shape(toggleChecked(checked, 1)), ['text:a', 'check+:b']);
  assertEquals(shape(toggleChecked(lines, 1)), ['text:a', 'text:b']); // plain lines can't be ticked
});

Deno.test('Return continues a list, and ends it on an empty item', () => {
  const lines = parseNote('T\n- [x] buy milk');
  const split = pressReturn(lines, 1, 4);
  assertEquals(shape(split.lines), ['text:T', 'check+:buy ', 'check:milk']); // the new item is never ticked
  assertEquals([split.focus, split.cursor], [2, 0]);

  const empty = pressReturn(parseNote('T\n• a\n• '), 2, 0);
  assertEquals(shape(empty.lines), ['text:T', 'bullet:a', 'text:']);
  assertEquals(empty.focus, 2);

  const plain = pressReturn(parseNote('Title'), 0, 5);
  assertEquals(shape(plain.lines), ['text:Title', 'text:']);
});

Deno.test('Backspace at the start removes the marker, then joins the line above', () => {
  const lines = parseNote('T\nab\n- [ ] cd');
  const unmarked = backspaceAtStart(lines, 2)!;
  assertEquals(shape(unmarked.lines), ['text:T', 'text:ab', 'text:cd']);
  const joined = backspaceAtStart(unmarked.lines, 2)!;
  assertEquals(shape(joined.lines), ['text:T', 'text:abcd']);
  assertEquals([joined.focus, joined.cursor], [1, 2]);
  assertEquals(backspaceAtStart(parseNote('T'), 0), null);
});

Deno.test('pasted lines split, and "- " or "[] " start a list', () => {
  const pasted = changeText(parseNote('T\nx'), 1, 'one\n- [ ] two\n• three');
  assertEquals(shape(pasted.lines), ['text:T', 'text:one', 'check:two', 'bullet:three']);
  assertEquals([pasted.focus, pasted.cursor], [3, 5]);
  assertEquals(shape(changeText(parseNote('T\n'), 1, '- ').lines), ['text:T', 'bullet:']);
  assertEquals(shape(changeText(parseNote('T\n'), 1, '[] a').lines), ['text:T', 'check:a']);
  assertEquals(shape(changeText(parseNote('T\n• a'), 1, '- b').lines), ['text:T', 'bullet:- b']); // already a bullet
});

Deno.test('title, snippet and share text', () => {
  assertEquals(noteTitle(NOTE), 'Groceries');
  assertEquals(noteSnippet(NOTE), 'milk');
  assertEquals(noteTitle('\n\n- [ ] first item'), 'first item');
  assertEquals(noteTitle(''), null);
  assertEquals(noteSnippet('Only a title'), null);
  assertEquals(noteTitle('x'.repeat(150))?.length, 100);
  assertEquals(shareText(NOTE), 'Groceries\n☐ milk\n☑ eggs\n• from the market\nplain line');
});

Deno.test('older notes show their AI title as the first line', () => {
  assertEquals(editorText('Wifi password', 'abc123'), 'Wifi password\nabc123');
  assertEquals(editorText('Groceries', NOTE), NOTE); // already the first line
  assertEquals(editorText(null, 'text'), 'text');
  assertEquals(editorText('Title', null), 'Title');
  assertEquals(isEmptyNote(parseNote(' \n- [ ] ')), true);
  assertEquals(isEmptyNote(parseNote('a')), false);
});
