// The one place that talks to an AI provider. describeSave() returns the same result shape for every provider,
// so the provider can be swapped by changing the ai_provider setting.
import Anthropic from 'npm:@anthropic-ai/sdk@^0';
import OpenAI from 'npm:openai@^6';

import { toBase64, type ImageData } from './image.ts';

export type Provider = 'anthropic' | 'openai';

export type SaveDescription = {
  title: string;
  snippet: string;
  summary: string;
  tags: string[];
  collection: string;
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

const MODELS: Record<Provider, { id: string; inputPerM: number; outputPerM: number }> = {
  anthropic: { id: 'claude-haiku-4-5-20251001', inputPerM: 1.0, outputPerM: 5.0 },
  openai: { id: 'gpt-6-luna', inputPerM: 0.1, outputPerM: 0.5 },
};

const SCHEMA = {
  type: 'object',
  additionalProperties: false,
  required: ['title', 'snippet', 'summary', 'tags', 'collection'],
  properties: {
    title: { type: 'string', description: 'What this is, in at most 60 characters.' },
    snippet: { type: 'string', description: 'One line that adds a useful detail, at most 80 characters.' },
    summary: { type: 'string', description: 'At most two short sentences.' },
    tags: { type: 'array', items: { type: 'string' }, description: 'At most 5 lowercase tags.' },
    collection: { type: 'string', description: 'An existing collection name, or a new short one.' },
  },
} as const;

const SYSTEM_PROMPT = `You file things people save from Instagram, TikTok, X, YouTube, Pinterest, Threads, LinkedIn, Reddit, Facebook, WhatsApp and the web into their personal library, so they can find them later by searching in their own words.

For each save you get the link, whatever public details could be fetched, sometimes a preview image, and the person's existing collections. Write:
- title: what the thing actually is, in plain words (for example "Garlic butter steak tortellini" or "5 quiet beaches near Lisbon"), not the page or account name. Sentence case, no emoji, no hashtags, at most 60 characters.
- snippet: one line with the most useful detail (an ingredient, a place, a price, the key idea), at most 80 characters.
- summary: at most two short sentences on what it is and why someone would come back to it.
- tags: up to 5 lowercase words or short phrases someone might search for. Include the main subject and type (for example "recipe", "pasta").
- collection: reuse an existing collection when it fits. Otherwise invent a short, broad name of one or two words in title case (for example "Recipes", "Travel", "Home ideas", "Fitness", "Reading list"). Prefer broad over narrow.

Use the image when the text is thin: describe what it shows. Never invent facts that aren't in the text or the image. If there is almost nothing to go on, say plainly what the link is (for example "Instagram reel from @avnstudio") and file it under a sensible broad collection.`;

function userText(input: DescribeInput): string {
  const collections = input.collections.length ? input.collections.join(', ') : 'none yet';
  return `${input.text}\nExisting collections: ${collections}`;
}

// Enforce the limits the schema can't express.
function tidy(raw: SaveDescription): SaveDescription {
  const cut = (s: string, n: number) => (s.length > n ? `${s.slice(0, n - 1).trimEnd()}…` : s);
  return {
    title: cut(raw.title.trim(), 60),
    snippet: cut(raw.snippet.trim(), 80),
    summary: raw.summary.trim(),
    tags: [...new Set(raw.tags.map((t) => t.trim().toLowerCase()).filter(Boolean))].slice(0, 5),
    collection: cut(raw.collection.trim(), 40) || 'Saved',
  };
}

const cost = (p: Provider, inTok: number, outTok: number) =>
  (inTok * MODELS[p].inputPerM + outTok * MODELS[p].outputPerM) / 1_000_000;

async function viaAnthropic(input: DescribeInput): Promise<Omit<DescribeResult, 'durationMs'>> {
  const client = new Anthropic(); // reads ANTHROPIC_API_KEY
  const content: Anthropic.ContentBlockParam[] = [];
  if (input.image) {
    content.push({
      type: 'image',
      source: { type: 'base64', media_type: input.image.mediaType, data: toBase64(input.image.bytes) },
    });
  }
  content.push({ type: 'text', text: userText(input) });

  const response = await client.messages.create({
    model: MODELS.anthropic.id,
    max_tokens: 1024,
    system: SYSTEM_PROMPT,
    messages: [{ role: 'user', content }],
    output_config: { format: { type: 'json_schema', schema: SCHEMA } },
  });
  if (response.stop_reason === 'refusal') throw new Error('Declined by the model');
  if (response.stop_reason === 'max_tokens') throw new Error('Output cut off');
  const text = response.content.find((b) => b.type === 'text');
  if (!text || text.type !== 'text') throw new Error('No text in response');
  const { input_tokens, output_tokens } = response.usage;
  return {
    provider: 'anthropic',
    model: MODELS.anthropic.id,
    output: tidy(JSON.parse(text.text)),
    inputTokens: input_tokens,
    outputTokens: output_tokens,
    costUsd: cost('anthropic', input_tokens, output_tokens),
  };
}

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

export async function describeSave(provider: Provider, input: DescribeInput): Promise<DescribeResult> {
  const started = Date.now();
  const result = provider === 'openai' ? await viaOpenAI(input) : await viaAnthropic(input);
  return { ...result, durationMs: Date.now() - started };
}
