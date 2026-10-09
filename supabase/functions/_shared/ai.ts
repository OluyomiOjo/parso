// The one place that talks to the AI provider. To swap providers, add a path here that returns the same
// DescribeResult; nothing else in the pipeline depends on which model runs.
import OpenAI from 'npm:openai@^6';

import { toBase64, type ImageData } from './image.ts';

export type Provider = 'openai';

export type SaveDescription = {
  title: string;
  snippet: string;
  summary: string;
  tags: string[];
  collection: string;
  collection_description: string; // stored only when the collection has none yet
  next_step: string; // "Cook this pasta this week?"; empty when the intent isn't clear (Your week in Parso)
};

export type DescribeInput = {
  text: string; // everything known about the save, as plain lines
  collections: string[]; // the user's existing collection names
  image: ImageData | null;
};

export type DescribeResult = {
  provider: Provider;
  model: string;
  output: SaveDescription;
  inputTokens: number;
  outputTokens: number;
  costUsd: number;
  durationMs: number;
};

// Chosen by the owner after a side-by-side test against Claude Haiku 4.5 on real saves (step 4).
const MODELS: Record<Provider, { id: string; inputPerM: number; outputPerM: number }> = {
  openai: { id: 'gpt-6-luna', inputPerM: 0.1, outputPerM: 0.5 },
};

const SCHEMA = {
  type: 'object',
  additionalProperties: false,
  required: ['title', 'snippet', 'summary', 'tags', 'collection', 'collection_description', 'next_step'],
  properties: {
    title: { type: 'string', description: 'What this is, in at most 60 characters.' },
    snippet: { type: 'string', description: 'One line that adds a useful detail, at most 80 characters.' },
    summary: { type: 'string', description: 'One or two short sentences, never more.' },
    tags: { type: 'array', items: { type: 'string' }, description: 'At most 5 lowercase tags.' },
    collection: { type: 'string', description: 'An existing collection name, or a new short one.' },
    collection_description: {
      type: 'string',
      description: 'One sentence on what belongs in the chosen collection, "Parso files ... here.", at most 90 characters.',
    },
    next_step: {
      type: 'string',
      description: 'A short question about what the person likely meant to do with it, at most 70 characters, or "".',
    },
  },
} as const;

// Shared by new saves and the one-off run for existing saves, so both ask the same kind of question.
const NEXT_STEP_RULE = `one short, friendly question about what the person most likely meant to do with this save, asked as a yes or no question in sentence case, at most 70 characters, no emoji (for example "Cook this pasta for dinner this week?", "Try this workout tomorrow morning?", "Book this beach trip for summer?", "Read this article this weekend?"). Name the thing in a few words so the question makes sense on its own. When it isn't clear what anyone would do with it (a joke, a meme, a plain photo with no clue), write "".`;

const SYSTEM_PROMPT = `You file things people save from Instagram, TikTok, X, YouTube, Pinterest, Threads, LinkedIn, Reddit, Facebook, WhatsApp and the web into their personal library, so they can find them later by searching in their own words.

For each save you get the link, whatever public details could be fetched, sometimes a preview image, and the person's existing collections. Write:
- title: what the thing actually is, in plain words (for example "Garlic butter steak tortellini" or "5 quiet beaches near Lisbon"), not the page or account name. Sentence case, no emoji, no hashtags, at most 60 characters.
- snippet: one line with the most useful detail (an ingredient, a place, a price, a date, the key idea), at most 80 characters.
- summary: one or two short sentences, never more, on what it is and why someone would come back to it.
- tags: up to 5 lowercase words or short phrases someone might search for. Include the main subject and type (for example "recipe", "pasta").
- collection: reuse an existing collection whenever it fits, even loosely. Only when none fits, invent a short, broad name of one or two words in sentence case (for example "Recipes", "Travel", "Home ideas", "Fitness", "Reading list"). Pick by what the thing is about, not where it was posted.
- collection_description: one sentence on what belongs in the chosen collection in general, not this one save, in the form "Parso files anything that looks like a recipe here." At most 90 characters.
- next_step: ${NEXT_STEP_RULE}

For screenshots and photos, read any visible text in the image and use it; it is often the most useful detail.

Only use facts that appear in the text or the image. Never invent names, places, numbers or events.

When the caption is short or missing, use these clues, and say "appears to be" when you rely on them:
- An account name that plainly describes its content (for example @surprisereunions suggests surprise homecomings, @easyweeknightrecipes suggests recipes). Ignore account names that are just a person's or brand's name.
- Hashtags, in any language: read their meaning (for example a Japanese hashtag), but don't copy them into the title.
- What the image shows, read together with those clues (uniformed soldiers greeting family under an account about reunions is most likely a homecoming).
If nothing gives a topic, describe only what is actually there (for example "Video from @WilliamsRuto on X").`;

function userText(input: DescribeInput): string {
  const collections = input.collections.length ? input.collections.join(', ') : 'none yet';
  return `${input.text}\nExisting collections: ${collections}`;
}

// A sentence ends at . ! or ? followed by a space and a capital letter, digit or quote. Abbreviations
// like "St." followed by a capitalised name can split early; that only makes a summary shorter.
const SENTENCE_END = /(?<=[.!?])\s+(?=[A-Z0-9"“'‘(])/u;

export function firstSentences(text: string, max: number): string {
  return text.trim().split(SENTENCE_END).slice(0, max).join(' ');
}

const DESCRIPTION_MAX = 90;

// Never shown cut off: a description that's too long is dropped, and the next save writes another.
function shortDescription(text: string): string {
  const sentence = firstSentences(text, 1);
  return sentence.length <= DESCRIPTION_MAX ? sentence : '';
}

// Capitalise the first letter only, so acronyms like "UX design" survive.
const capitalised = (s: string) => (s ? s[0].toUpperCase() + s.slice(1) : s);

// Enforce the limits the schema can't express. The summary is capped at two sentences whatever the
// model returns (owner's rule).
export function tidy(raw: SaveDescription): SaveDescription {
  const cut = (s: string, n: number) => (s.length > n ? `${s.slice(0, n - 1).trimEnd()}…` : s);
  return {
    title: cut(raw.title.trim(), 60),
    snippet: cut(raw.snippet.trim(), 80),
    summary: firstSentences(raw.summary, 2),
    tags: [...new Set(raw.tags.map((t) => t.trim().toLowerCase()).filter(Boolean))].slice(0, 5),
    collection: capitalised(cut(raw.collection.trim(), 40)) || 'Saved',
    collection_description: shortDescription(raw.collection_description),
    next_step: nextStep(raw.next_step),
  };
}

const NEXT_STEP_MAX = 70; // the database's limit (migration 0023)

// Never shown cut off: a question that's too long, or isn't a question, is dropped and that save isn't asked about.
export function nextStep(text: string | undefined): string {
  const question = (text ?? '').trim();
  return question.length <= NEXT_STEP_MAX && question.endsWith('?') ? capitalised(question) : '';
}

const cost = (p: Provider, inTok: number, outTok: number) =>
  (inTok * MODELS[p].inputPerM + outTok * MODELS[p].outputPerM) / 1_000_000;

async function viaOpenAI(input: DescribeInput): Promise<Omit<DescribeResult, 'durationMs'>> {
  const client = new OpenAI(); // reads OPENAI_API_KEY
  const content: OpenAI.Responses.ResponseInputContent[] = [];
  if (input.image) {
    content.push({
      type: 'input_image',
      image_url: `data:${input.image.mediaType};base64,${toBase64(input.image.bytes)}`,
      detail: 'auto',
    });
  }
  content.push({ type: 'input_text', text: userText(input) });

  const response = await client.responses.create({
    model: MODELS.openai.id,
    instructions: SYSTEM_PROMPT,
    input: [{ role: 'user', content }],
    max_output_tokens: 1024,
    text: { format: { type: 'json_schema', name: 'save_description', schema: SCHEMA, strict: true } },
  });
  if (response.status !== 'completed') throw new Error(`OpenAI response ${response.status}`);
  const inTok = response.usage?.input_tokens ?? 0;
  const outTok = response.usage?.output_tokens ?? 0;
  return {
    provider: 'openai',
    model: MODELS.openai.id,
    output: tidy(JSON.parse(response.output_text)),
    inputTokens: inTok,
    outputTokens: outTok,
    costUsd: cost('openai', inTok, outTok),
  };
}

// The one-off run for saves filed before questions existed: questions only, from what Parso already wrote about
// each save. Nothing is fetched again and nothing else about the saves changes.
export type NextStepInput = { id: string; text: string };

const NEXT_STEPS_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  required: ['items'],
  properties: {
    items: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['id', 'next_step'],
        properties: { id: { type: 'string' }, next_step: { type: 'string' } },
      },
    },
  },
} as const;

export async function writeNextSteps(
  saves: NextStepInput[],
): Promise<{ steps: Map<string, string>; inputTokens: number; outputTokens: number; costUsd: number }> {
  const client = new OpenAI();
  const response = await client.responses.create({
    model: MODELS.openai.id,
    instructions: `People save things from social apps and the web into their personal library. For each save below, write next_step: ${NEXT_STEP_RULE} Use only what is written about the save. Answer for every id.`,
    input: [
      {
        role: 'user',
        content: [{ type: 'input_text', text: saves.map((s) => `id: ${s.id}\n${s.text}`).join('\n\n') }],
      },
    ],
    max_output_tokens: 4096,
    text: { format: { type: 'json_schema', name: 'next_steps', schema: NEXT_STEPS_SCHEMA, strict: true } },
  });
  if (response.status !== 'completed') throw new Error(`OpenAI response ${response.status}`);
  const parsed = JSON.parse(response.output_text) as { items: { id: string; next_step: string }[] };
  const inTok = response.usage?.input_tokens ?? 0;
  const outTok = response.usage?.output_tokens ?? 0;
  return {
    steps: new Map(parsed.items.map((item) => [item.id, nextStep(item.next_step)])),
    inputTokens: inTok,
    outputTokens: outTok,
    costUsd: cost('openai', inTok, outTok),
  };
}

export async function describeSave(provider: Provider, input: DescribeInput): Promise<DescribeResult> {
  const started = Date.now();
  const result = await viaOpenAI(input);
  return { ...result, durationMs: Date.now() - started };
}
