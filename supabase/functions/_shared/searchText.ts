// Pure helpers for the search function: read simple filters out of a question, and find which words of
// each result matched, so the app can highlight them.
import { PLATFORM_NAMES } from './sources.ts';

export type Filters = { source: string | null; kind: string | null };
export type Parsed = Filters & { text: string; terms: string[] };
export type Match = { field: string; term: string };

const SOURCE_ALIASES: Record<string, string> = {
  instagram: 'instagram', insta: 'instagram', ig: 'instagram',
  tiktok: 'tiktok', 'tik tok': 'tiktok',
  x: 'x', twitter: 'x',
  threads: 'threads',
  youtube: 'youtube', yt: 'youtube',
  facebook: 'facebook', fb: 'facebook',
  pinterest: 'pinterest',
  linkedin: 'linkedin',
  reddit: 'reddit',
  spotify: 'spotify',
  whatsapp: 'whatsapp',
  safari: 'safari',
};

const KIND_WORDS: Record<string, string> = {
  screenshot: 'screenshot', screenshots: 'screenshot', screengrab: 'screenshot',
  photo: 'image', photos: 'image', picture: 'image', pictures: 'image', pic: 'image', pics: 'image',
  image: 'image', images: 'image',
  note: 'text', notes: 'text',
};

// Words that carry no meaning for matching ("that pasta I saved from instagram" → "pasta").
const STOPWORDS = new Set(
  ('a an the i me my mine we our you your it its this that these those is was were be been am are ' +
    'from on in of for to with and or at by about as into over under some any all one ones thing things ' +
    'stuff saved save saving find show get got where what which who when how there here post posts ' +
    'reel reels video videos link links').split(' '),
);

const escape = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

export function parseQuery(query: string): Parsed {
  let text = ` ${query.toLowerCase().replace(/\s+/g, ' ').trim()} `;
  let source: string | null = null;
  let kind: string | null = null;

  // "from instagram", "on tiktok", "via x". Names of four letters or more also count on their own;
  // short ones like "x" or "ig" only after a preposition, so ordinary words stay words.
  const aliases = Object.keys(SOURCE_ALIASES).sort((a, b) => b.length - a.length);
  for (const alias of aliases) {
    const withPreposition = new RegExp(`\\s(?:from|on|in|via|off)\\s${escape(alias)}(?=\\s)`);
    const bare = new RegExp(`\\s${escape(alias)}(?=\\s)`);
    const match = withPreposition.exec(text) ?? (alias.length >= 4 ? bare.exec(text) : null);
    if (match) {
      source = SOURCE_ALIASES[alias];
      text = text.slice(0, match.index) + ' ' + text.slice(match.index + match[0].length);
      break;
    }
  }

  for (const [word, k] of Object.entries(KIND_WORDS)) {
    const re = new RegExp(`\\s${word}(?=\\s)`);
    if (re.test(text)) {
      kind = k;
      text = text.replace(re, ' ');
      break;
    }
  }

  text = text.replace(/\s+/g, ' ').trim();
  const terms = [
    ...new Set(
      text
        .split(' ')
        .map((w) => w.replace(/^[^\p{L}\p{N}]+|[^\p{L}\p{N}]+$/gu, ''))
        .filter((w) => w.length > 1 && !STOPWORDS.has(w)),
    ),
  ];
  return { text, terms, source, kind };
}

// A rough English stem, enough to match "visas" with "visa" or "recipes" with "recipe".
export function stem(word: string): string {
  let w = word.toLowerCase().replace(/['’]s$/, '');
  if (w.length > 4 && w.endsWith('ies')) w = `${w.slice(0, -3)}y`;
  else if (w.length > 4 && /(ches|shes|xes|sses)$/.test(w)) w = w.slice(0, -2);
  else if (w.length > 3 && w.endsWith('s') && !w.endsWith('ss')) w = w.slice(0, -1);
  if (w.length > 5 && w.endsWith('ing')) w = w.slice(0, -3);
  else if (w.length > 4 && w.endsWith('ed')) w = w.slice(0, -2);
  return w;
}

const WORD = /[\p{L}\p{N}][\p{L}\p{N}'’-]*/gu;

function wordMatches(fieldWord: string, termStem: string): boolean {
  const s = stem(fieldWord);
  return s === termStem || (termStem.length >= 4 && s.startsWith(termStem));
}

// The exact words in each field that match a search term, as written in the field.
export function findMatches(fields: Record<string, string | null | undefined>, terms: string[]): Match[] {
  const stems = terms.map(stem);
  const matches: Match[] = [];
  for (const [field, value] of Object.entries(fields)) {
    if (!value) continue;
    const seen = new Set<string>();
    for (const word of value.match(WORD) ?? []) {
      if (seen.has(word)) continue;
      if (stems.some((t) => wordMatches(word, t))) {
        seen.add(word);
        matches.push({ field, term: word });
      }
    }
  }
  return matches;
}

export const sourceLabel = (source: string) => PLATFORM_NAMES[source] ?? 'Website';
