import type { ComponentProps } from 'react';

import { Highlight } from './Highlight';
import { Text } from './Text';

type Props = Omit<ComponentProps<typeof Text>, 'children'> & { text: string; terms: string[] };

// Whole words only, split on spaces and punctuation (kept simple so it runs the same on every
// JavaScript engine). Hyphens and apostrophes stay inside words, as in the search function.
const WORDS = /([^\s.,;:!?()[\]{}"“”/]+)/;

// Text with each matched word on the brand-yellow marker. Terms come from the search function exactly
// as they appear in the text; matching ignores case so a word is never missed.
export function HighlightedText({ text, terms, ...rest }: Props) {
  if (!terms.length) return <Text {...rest}>{text}</Text>;
  const wanted = new Set(terms.map((t) => t.toLowerCase()));
  return (
    <Text {...rest}>
      {text
        .split(WORDS)
        .map((part, i) => (wanted.has(part.toLowerCase()) ? <Highlight key={i}>{part}</Highlight> : part))}
    </Text>
  );
}
