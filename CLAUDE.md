# Parso: project guide for Claude Code

Read this file fully before every task. It is the source of truth for scope, stack, design and build order. If a request conflicts with this file, stop and ask.

## What Parso is

Parso is a mobile app for saving things from other apps and finding them later by asking.
Users tap Share on any post, reel, link or screenshot (Instagram, TikTok, X, Safari, WhatsApp), pick Parso, and the save is sorted into a collection, tagged and summarized automatically. Later they search in plain language ("that pasta from Instagram") and Parso shows the match with the matching words highlighted.

Tagline: Stop DMing yourself links.

## v1 scope

In scope:
1. Sign in with Apple and Google (Supabase Auth).
2. Save from the system share sheet (iOS Share Extension, Android share target): links, images, text.
3. Save by pasting a link inside the app.
4. AI processing of every save: title, one-line snippet, short summary, tags, collection choice.
5. Smart collections, created and filled by AI; users can move saves and rename collections.
6. Natural-language search with highlighted match terms.
7. Reminders on a save (Tonight, Weekend, Next week, Never) via local push notifications.
8. Save detail screen with note, tags, reminder and "Open in [source]".
9. Intro screens (3), welcome and sign in, empty state.

Out of scope for v1 (do not build, do not scaffold):
Automatic background screenshot import, web app, browser extension, sharing or collaboration, comments, social features, dark mode, payments, crypto or tokens of any kind.

## Stack

- Expo (latest stable SDK), TypeScript, expo-router for navigation.
- EAS preview builds (internal distribution, JavaScript bundled in) from day one. The owner is not technical and has no computer running a dev server, so every build must run on its own. Claude runs all EAS commands from the cloud session (EXPO_TOKEN and the App Store Connect API key are environment variables). Expo Go cannot run the share extension.
- Share extension: expo-share-intent 8.x (supports SDK 57). On iOS, sharing opens the Parso app, which shows the save sheet; the owner chose this over a custom in-extension view (no maintained package supports SDK 57). App Group `group.ai.parso.app`. expo-image-manipulator shrinks shared photos before upload.
- Supabase: Auth, Postgres, Storage (thumbnails, images), pgvector, Edge Functions.
- AI: OpenAI GPT-6 Luna (`gpt-6-luna`) from Supabase Edge Functions only, never from the app, through the `npm:openai` package. The owner chose it over Claude Haiku 4.5 after a side-by-side test on real saves in step 4 (similar quality, about 9 times cheaper). All AI calls go through `describeSave()` in `supabase/functions/_shared/ai.ts`, so the provider can be swapped there.
- Embeddings for search: OpenAI `text-embedding-3-small` at 1024 dimensions, called from Edge Functions only (owner-approved in step 7 over Voyage AI: reuses the OpenAI key, $0.02 per million tokens). Keep it behind `embed()` in `supabase/functions/_shared/embeddings.ts` so it can be swapped.
- Notifications: expo-notifications (local scheduled notifications for reminders).
- Fonts: Inter loaded with expo-font and bundled in the app.
- Launch screen and system appearance: expo-splash-screen, expo-system-ui.
- Auth: @supabase/supabase-js with @react-native-async-storage/async-storage for the session, expo-apple-authentication and @react-native-google-signin/google-signin for native sign-in, expo-crypto for the Apple nonce.
- State and data: TanStack Query for server data. No Redux.
- Secrets live in environment variables and Supabase secrets. Never commit keys. Never put the AI or embeddings key in the app bundle.

Ask before adding any dependency not listed here.

## Data model (Supabase)

- `collections`: id, user_id, name, description, is_smart (bool), created_at.
- `saves`: id, user_id, collection_id, kind (link | image | screenshot | text), source (instagram | tiktok | x | threads | youtube | facebook | pinterest | linkedin | reddit | spotify | safari | whatsapp | other), url, title, snippet, summary, tags (text[]), note, thumbnail_path, raw_text, reminder_at (timestamptz, nullable), created_at, processed_at, embedding (vector).
- Row Level Security on every table: users read and write only their own rows.
- Full-text index on title, snippet, summary, tags, note, raw_text.

## Save pipeline

1. App inserts a save row immediately with whatever it has (URL, shared text, image). The user sees "Saved to ..." within one second; never block on AI.
2. Edge Function `process-save` runs on insert:
   a. Fetch metadata: Open Graph tags; TikTok and other public oEmbed endpoints where available. Instagram often returns little without an approved Meta app: fall back to URL plus any shared caption text. Never scrape behind logins.
   b. For images and screenshots: send the image to the AI for a description and any visible text.
   c. Ask the AI for strict JSON: title, snippet (max 80 chars), summary (max 2 sentences, enforced in code), tags (max 5, lowercase), collection (existing name or a new short name). Only facts from the fetched text or image; never guess a topic when the details are thin.
   d. Create the embedding, write everything back, set processed_at.
3. The app updates the row live (Supabase realtime or refetch).

## Search

- Hybrid: vector similarity on embedding plus Postgres full-text rank, merged in one Edge Function `search`.
- Parse simple filters from the query when obvious (source: "from instagram", kind: "screenshot").
- Return, for each result, the terms that matched and which field they matched in. The UI highlights those terms. This is how users see why a result matched; do not add a separate "matched because" line.

## Screens

Designs live in the Parso App Screens canvas (Clean page). Exported PNGs of each screen go in `/design`. Match them closely.

0.1 to 0.3 Intro: illustration in a circle, title, one sentence, progress dots, Next. Skip on first two.
1. Welcome and sign in: logo, headline "Save it now. Find it by asking.", demo search card, Apple and Google buttons.
2. Save sheet (share extension UI): item preview, brand icon plus "Saved to [Collection]" with the collection highlighted, collection pills, tags line, Remind me segmented control, optional note, Done.
3. Home ("My Parsos"): search field, reminder card, Collections row, Recent list.
3b. Home empty state: "Save your first thing" with share-sheet instructions and "Or paste a link".
4. Search: focused search field, kind filter pills, result count, best match with large image, other results as list rows.
5. Collection: back and rename buttons (the design's share button waits until sharing is in scope), name, description line (written by the AI once per collection), segmented filter by kind, list rows.
6. Save detail: full-width image, source line, title, summary, details panel (Collection, Tags, Reminder, Note), fixed "Open in [source]" button.

Tab bar: My Parsos, Search, Collections, You.

## Design system (Clean)

Color:
- background `#F2F3F5`
- surface `#FFFFFF`
- ink (text, primary buttons) `#000000`
- secondary text `#5B5E66`
- divider `#E1E3E7`
- control border `#CDD0D6`
- highlighter (brand yellow) `#FFCC2A`
- logo wordmark grey `#373535` (logo file only)

Type (Inter):
- Screen title: 30, weight 800, letter-spacing -1.2
- Sheet confirmation ("Saved to ..."): 28, 800, -1
- Detail title: 28, 800, -0.9
- Intro title: 30, 800, -1
- Section heading: 17, 700, -0.3
- Row title: 16, 600, -0.2
- Body: 16, 400, line-height 1.5
- Secondary line: 14, 400
- Meta: 13, 500, secondary color
- Tab label: 11, 500 (700 when active)
- Numbers use tabular figures.

Shape and spacing:
- Screen side padding 16 (24 on intro and welcome).
- Gap between sections 16 to 20.
- List panels: one white panel, radius 18, rows separated by 1px dividers. Do not wrap each row in its own card.
- Buttons: height 52, radius 14, black fill, white text 16/600.
- Pills: height 36, radius 18; selected is black fill, unselected white with control border.
- Thumbnails: 56 in rows, radius 10. Best-match image full width, 176 tall.
- Minimum touch target 44.

Highlighter rules (the one bold element):
- Use `#FFCC2A` behind text only for: search match terms, the chosen collection in "Saved to ...", and the reminder card icon tile.
- Never as a large fill, never as text color, never on more than one element type per screen beyond these.

Brand assets in `/assets/brand`: `parso_logo_new.png` (yellow icon plus wordmark), `icon.png` (yellow bookmark), `icon-black.png`. Use the black icon at sizes under 24pt or on white where yellow is hard to see. The bookmark shape in the tab bar and illustrations follows the logo (flat top, notched bottom that rises to the right).

Do not use: ALL-CAPS labels, text joined with middle dots, emoji in UI, gradients, colored single words in headlines, drop shadows on list panels, more than one accent color.

Owner-approved exception: source icons (Instagram, TikTok, X, LinkedIn and so on) before the source in meta lines are drawn in each platform's own solid brand colour, about 14pt, from `brandColors` in `theme.ts`. Solid only, never the gradient versions. Websites, photos, screenshots and notes use grey glyphs.

## Copy rules

- The library is called "My Parsos". Actions stay plain: Save, Saved to [Collection], Search, Remind me, Open in [Source].
- Sentence case everywhere. Buttons say exactly what happens.
- Errors say what happened and what to do next. No apologies, no vague messages.
- Empty states tell the user the next action.

## Build order

Build one slice at a time. Each slice ends with the app running on a device, a short summary of what changed, and a git commit. Do not start the next slice until the current one works.

1. Project setup: Expo app, TypeScript, expo-router, Inter, design tokens in one `theme.ts`, tab bar with four empty screens. EAS preview build running on an iPhone.
2. Supabase: project, tables, RLS, Apple and Google sign in, welcome screen.
3. Paste a link: save row created, Home list shows it (unprocessed title is the URL).
4. `process-save` Edge Function: metadata, Claude JSON, collection assignment. Home updates when processing finishes.
5. Share extension on iOS, then Android: share from Instagram, TikTok, Safari and Photos, see the save sheet, Done returns to the source app.
6. Collections screen and move-to-collection.
7. Embeddings plus `search` Edge Function, Search screen with highlighted terms.
8. Save detail screen, notes, tags editing, Open in source.
9. Reminders with local notifications.
10. Intro screens, empty state, polish pass against the designs, TestFlight build.

## How to work

- Use plan mode for every slice: propose files and approach first, wait for approval.
- Keep components small; all colors, sizes and spacing come from `theme.ts`. No hard-coded values in screens.
- Write the SQL migrations as files in `supabase/migrations`.
- When something depends on an outside platform behaving a certain way (Instagram metadata, share extension limits, App Store rules), say so and test it with a real link before building on it.
- Never mark something done without running it.
