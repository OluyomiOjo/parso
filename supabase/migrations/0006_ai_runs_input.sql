-- Keep what the model was shown next to what it answered (for the provider comparison and debugging).
alter table public.ai_runs add column input_text text, add column had_image boolean;
