// The one place that turns text into embeddings for search. To swap providers (Voyage AI was the
// original default), change this file only; the database column is vector(1024).
import OpenAI from 'npm:openai@^6';

// Owner-approved in step 7: reuses the OpenAI key, $0.02 per million tokens.
const MODEL = 'text-embedding-3-small';
export const DIMENSIONS = 1024;
const MAX_CHARS = 8000; // well under the model's input limit

export async function embed(texts: string[]): Promise<number[][]> {
  const client = new OpenAI(); // reads OPENAI_API_KEY
  const response = await client.embeddings.create({
    model: MODEL,
    input: texts.map((t) => t.slice(0, MAX_CHARS)),
    dimensions: DIMENSIONS,
  });
  return response.data.sort((a, b) => a.index - b.index).map((d) => d.embedding);
}

// pgvector's text form: "[0.1,0.2,...]".
export const toVector = (values: number[]) => `[${values.join(',')}]`;
