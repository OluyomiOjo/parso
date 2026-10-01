-- The owner chose OpenAI GPT-6 Luna after the side-by-side test (step 4); the setting is kept as a record.
update private.settings set value = 'openai' where key = 'ai_provider';
