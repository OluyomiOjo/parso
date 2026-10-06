// Notes are stored as plain text in saves.raw_text, one line per line on screen, so they stay simple to search
// and share and readable anywhere:
//   "- [ ] milk"  an open checklist item
//   "- [x] milk"  a ticked one
//   "• milk"      a bullet
// The first line is the note's title. Kept free of React so it can be tested on its own (tests/noteFormat.test.ts).

export type LineType = 'text' | 'check' | 'bullet';
export type NoteLine = { key: string; type: LineType; checked: boolean; text: string };

export const NOTE_MAX = 20_000; // characters, the database's limit (migration 0018)
const TITLE_MAX = 100;
const SNIPPET_MAX = 80;

let nextKey = 0;
const newKey = () => `l${nextKey++}`;
export const makeLine = (type: LineType = 'text', text = '', checked = false): NoteLine => ({
  key: newKey(),
  type,
  checked: type === 'check' && checked,
  text,
});

const CHECK = /^\s*[-*] \[( |x|X)\] ?/;
const BULLET = /^\s*[•\-*] /;

export function parseLine(raw: string): NoteLine {
  const check = CHECK.exec(raw);
  if (check) return makeLine('check', raw.slice(check[0].length), check[1] !== ' ');
  const bullet = BULLET.exec(raw);
  if (bullet) return makeLine('bullet', raw.slice(bullet[0].length));
  return makeLine('text', raw);
}

export function parseNote(text: string): NoteLine[] {
  const lines = text.replace(/\r\n?/g, '\n').split('\n').map(parseLine);
  return lines.length ? lines : [makeLine()];
}

const prefix = (line: NoteLine) =>
  line.type === 'check' ? (line.checked ? '- [x] ' : '- [ ] ') : line.type === 'bullet' ? '• ' : '';

export function serializeNote(lines: NoteLine[]): string {
  return lines
    .map((line) => prefix(line) + line.text)
    .join('\n')
    .replace(/\s+$/, '');
}

const cut = (s: string, n: number) => (s.length > n ? `${s.slice(0, n - 1).trimEnd()}…` : s);

// The first line with words in it, without its tick box or bullet.
export function noteTitle(text: string): string | null {
  const first = parseNote(text).find((line) => line.text.trim());
  return first ? cut(first.text.trim(), TITLE_MAX) : null;
}

// The next line with words in it after the title, for list rows.
export function noteSnippet(text: string): string | null {
  const filled = parseNote(text).filter((line) => line.text.trim());
  return filled[1] ? cut(filled[1].text.trim(), SNIPPET_MAX) : null;
}

// Notes saved before the editor existed have an AI-written title that isn't in their text. The editor shows
// that title as the first line, so the note looks the same until it's edited.
export function editorText(title: string | null, rawText: string | null): string {
  const body = rawText ?? '';
  if (!title || noteTitle(body) === title) return body;
  return body ? `${title}\n${body}` : title;
}

// What goes into the share sheet: tick boxes and bullets as characters every app shows.
export function shareText(text: string): string {
  return parseNote(text)
    .map((line) =>
      line.type === 'check'
        ? `${line.checked ? '☑' : '☐'} ${line.text}`
        : line.type === 'bullet'
          ? `• ${line.text}`
          : line.text,
    )
    .join('\n')
    .trim();
}

// Editing rules. Each returns the new lines and which line (and where in it) the cursor goes.
export type Edit = { lines: NoteLine[]; focus: number; cursor: number };

// The toolbar's checklist or bullet button: on, off, or switch from one to the other.
export function toggleType(lines: NoteLine[], index: number, type: 'check' | 'bullet'): NoteLine[] {
  return lines.map((line, i) =>
    i === index ? { ...line, type: line.type === type ? 'text' : type, checked: false } : line,
  );
}

export function toggleChecked(lines: NoteLine[], index: number): NoteLine[] {
  return lines.map((line, i) => (i === index && line.type === 'check' ? { ...line, checked: !line.checked } : line));
}

// Return. In a list item: the next item starts with the text after the cursor (never ticked). On an empty
// item: the list ends and the line becomes plain text, like Apple Notes.
export function pressReturn(lines: NoteLine[], index: number, cursor: number): Edit {
  const line = lines[index];
  if (line.type !== 'text' && line.text === '') {
    return {
      lines: lines.map((l, i) => (i === index ? { ...l, type: 'text', checked: false } : l)),
      focus: index,
      cursor: 0,
    };
  }
  const head = { ...line, text: line.text.slice(0, cursor) };
  const tail = makeLine(line.type, line.text.slice(cursor));
  return { lines: [...lines.slice(0, index), head, tail, ...lines.slice(index + 1)], focus: index + 1, cursor: 0 };
}

// Backspace at the very start of a line. A list item loses its tick box or bullet first; a plain line joins
// the line above. The first line has nothing above it.
export function backspaceAtStart(lines: NoteLine[], index: number): Edit | null {
  const line = lines[index];
  if (line.type !== 'text') {
    return {
      lines: lines.map((l, i) => (i === index ? { ...l, type: 'text', checked: false } : l)),
      focus: index,
      cursor: 0,
    };
  }
  if (index === 0) return null;
  const above = lines[index - 1];
  const joined = { ...above, text: above.text + line.text };
  return {
    lines: [...lines.slice(0, index - 1), joined, ...lines.slice(index + 1)],
    focus: index - 1,
    cursor: above.text.length,
  };
}

// Typed text that contains new lines (a paste, or dictation) becomes separate lines. The first piece keeps
// the line's own type; the rest are read like stored text. Typing "- " or "* " at the start of a plain line
// makes it a bullet, and "[] " makes it a checklist item, as in Apple Notes.
export function changeText(lines: NoteLine[], index: number, text: string): Edit {
  const line = lines[index];
  const [first, ...rest] = text.replace(/\r\n?/g, '\n').split('\n');
  let current: NoteLine = { ...line, text: first };
  if (line.type === 'text') {
    if (/^[-*] /.test(first)) current = { ...line, type: 'bullet', text: first.slice(2) };
    else if (/^\[ ?\] /.test(first))
      current = { ...line, type: 'check', checked: false, text: first.replace(/^\[ ?\] /, '') };
  }
  const added = rest.map(parseLine);
  const focus = index + added.length;
  const next = [...lines.slice(0, index), current, ...added, ...lines.slice(index + 1)];
  return { lines: next, focus, cursor: next[focus].text.length };
}

export const isEmptyNote = (lines: NoteLine[]) => lines.every((line) => line.text.trim() === '');
