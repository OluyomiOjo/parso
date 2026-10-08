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
7. Reminders on a save (Tonight, Weekend, Next week, or Pick: any date and time in a sheet with shortcuts and Apple's calendar and time wheel; Turn off clears it) via local push notifications.
8. Save detail screen with note, tags, reminder and "Open in [source]".
9. Intro screens (3), welcome and sign in, empty state.
10. Delete a save, with a confirmation (owner-approved in step 8).
11. Add to Parso screen: a link, a note, or a photo from the library (owner-approved in step 10). Notes work like Apple Notes, plus reminders (owner decision in step 10): a full-screen editor, the first line is the title (the AI never renames a note), checklists and bullets, saves itself as you type, pin, and the same Remind me. An emptied note is deleted on leaving.
12. New screenshots check: when Parso opens, offer screenshots taken since last time (Screenshots album, full photo access, on/off on the You tab); nothing is saved without a tap. Owner-approved in step 10 in place of background import, which stays out of scope.
13. A copied link is offered in a mini sheet ("Save the link you copied", Apple's paste button, no paste alert) once per new copy, on any screen except sheets in progress, editing, the photo viewer, sign-in and intro (it waits until one of those closes); the clipboard's change count (local module `modules/clipboard-change`) tells a new copy from one already offered. The reminder card says "and N more" with a Reminders list (owner-approved in step 10).
14. Share a save out through the iPhone share sheet (link, note text, or the photo itself), always ending with "Saved with Parso.ai"; Download for photos and screenshots (owner-approved in step 10). Sharing inside Parso (shared collections, other people) stays out of scope.
15. Parso Pro through RevenueCat (owner decision in step 10): free for the first 50 saves in total; at the limit everything stays searchable, openable and shareable and only new saves ask to upgrade. Pro is $4.99 a month or $39.99 a year, no trial. Pro also adds videos (up to 3 minutes, from the Add screen and the share sheet); free accounts can't save videos (owner decision in step 10). Products in App Store Connect: group "Parso Pro", `ai.parso.pro.monthly` and `ai.parso.pro.yearly` (all territories); RevenueCat entitlement `pro`, offering "default". Going live waits only on the Apple account becoming the company's (D-U-N-S), then the Paid Apps agreement, bank and tax.
16. Admin dashboard at dash.parso.ai (owner decision in step 10): a private website for admins only (emails in the `admins` table), showing counts, behaviour and each save's source. Privacy line: admins never see what anyone saved (no titles, links, notes, pictures, text or search words); enforced by the `admin-stats` function, which returns counts only. Admins can give or remove Pro and delete an account.

Out of scope for v1 (do not build, do not scaffold):
Automatic background screenshot import, a public web app (the admin dashboard, item 16, is the only website), browser extension, sharing or collaboration inside Parso (sending a save out through the share sheet is in scope, item 14), comments, social features, dark mode, payments other than Parso Pro (item 15), crypto or tokens of any kind.

## Stack

- Expo (latest stable SDK), TypeScript, expo-router for navigation.
- EAS preview builds (internal distribution, JavaScript bundled in) from day one. The owner is not technical and has no computer running a dev server, so every build must run on its own. Claude runs all EAS commands from the cloud session (EXPO_TOKEN and the App Store Connect API key are environment variables). Expo Go cannot run the share extension.
- Share extension: expo-share-intent 8.x (supports SDK 57). On iOS, sharing opens the Parso app, which shows the save sheet; the owner chose this over a custom in-extension view (no maintained package supports SDK 57). App Group `group.ai.parso.app`. expo-image-manipulator shrinks shared photos before upload.
- Supabase: Auth, Postgres, Storage (thumbnails, images), pgvector, Edge Functions.
- AI: OpenAI GPT-6 Luna (`gpt-6-luna`) from Supabase Edge Functions only, never from the app, through the `npm:openai` package. The owner chose it over Claude Haiku 4.5 after a side-by-side test on real saves in step 4 (similar quality, about 9 times cheaper). All AI calls go through `describeSave()` in `supabase/functions/_shared/ai.ts`, so the provider can be swapped there.
- Embeddings for search: OpenAI `text-embedding-3-small` at 1024 dimensions, called from Edge Functions only (owner-approved in step 7 over Voyage AI: reuses the OpenAI key, $0.02 per million tokens). Keep it behind `embed()` in `supabase/functions/_shared/embeddings.ts` so it can be swapped.
- Notifications: expo-notifications (local scheduled notifications for reminders). Local only: `plugins/withLocalNotificationsOnly.js` removes the push entitlement (aps-environment) so builds never change Apple provisioning; keep it listed before expo-notifications in app.json. Reminder times (src/lib/reminderTime.ts, tested in tests/): Tonight 8:00 PM (one hour from now after 7:30 PM), Weekend the next Saturday or Sunday 10:00 AM still ahead, Next week the coming Monday 9:00 AM; picker shortcuts In 1 hour, This evening 6:00 PM (tomorrow evening once past), Tomorrow morning 9:00 AM. `saves.reminder_at` is the record; the phone's schedule is synced to it on launch and on every change.
- Photos and clipboard (owner-approved in step 10): expo-image-picker (Apple's picker, no permission needed), expo-media-library (legacy API, Screenshots album only), expo-clipboard (hasUrlAsync and ClipboardPasteButton, so iOS shows no paste alert), plus our own local Expo module `modules/clipboard-change` (UIPasteboard changeCount, iOS only; no outside package). expo-file-system copies a saved photo to the phone for Share and Download (owner-approved in step 10); Download asks only for add-only photo access.
- Date and time picker (owner-approved in step 10): @react-native-community/datetimepicker, Apple's native inline calendar and time wheel, for picked reminder times.
- Fonts: Inter loaded with expo-font and bundled in the app.
- Launch screen and system appearance: expo-splash-screen, expo-system-ui.
- Auth: @supabase/supabase-js with @react-native-async-storage/async-storage for the session, expo-apple-authentication and @react-native-google-signin/google-signin for native sign-in, expo-crypto for the Apple nonce.
- Payments (owner-approved in step 10): react-native-purchases (RevenueCat), our own upgrade sheet (no RevenueCat paywall package). The public key comes from Expo's build settings as EXPO_PUBLIC_REVENUECAT_IOS_KEY (App Store key for preview and production; RevenueCat's Test Store key only for the private `preview-debug` build, a Debug build with the JavaScript bundled in, since Test Store crashes release builds on purpose). RevenueCat logs in with the Parso account id. Server secrets REVENUECAT_SECRET_KEY and REVENUECAT_WEBHOOK_AUTH are typed by the owner into Supabase and RevenueCat, never into the chat.
- State and data: TanStack Query for server data. No Redux.
- Gestures (owner-approved in step 10): react-native-gesture-handler, react-native-reanimated and react-native-worklets (Expo's standard set), for press-and-hold dragging to rearrange collections (src/components/ReorderList.tsx). The app root is wrapped in GestureHandlerRootView.
- Usage events (owner-approved in step 10): `track()` in src/lib/track.ts writes to the `events` table: an event name plus only source, kind and via. Never titles, links, notes, text or search words; the table's checks refuse anything else.
- Admin dashboard (owner-approved in step 10): `dashboard/`, a separate Vite + React + TypeScript site (react, react-dom, @supabase/supabase-js; charts drawn as plain SVG, no chart library), hosted on Cloudflare Pages at dash.parso.ai. Admins sign in with an email link. All numbers come from the `admin-stats` Edge Function and the service-role-only `admin_*` SQL functions (migration 0016).
- Secrets live in environment variables and Supabase secrets. Never commit keys. Never put the AI or embeddings key in the app bundle.

Ask before adding any dependency not listed here.

## Data model (Supabase)

- `collections`: id, user_id, name, description, is_smart (bool), created_at, position (the person's own order; empty until they rearrange, and empty ones sort after placed ones, most recently used first, so new collections go last; saved in one step by `reorder_collections(ids)`, migration 0020).
- `saves`: id, user_id, collection_id, kind (link | image | screenshot | text), source (instagram | tiktok | x | threads | youtube | facebook | pinterest | linkedin | reddit | spotify | safari | whatsapp | other), url, title, snippet, summary, tags (text[]), note, thumbnail_path, raw_text, reminder_at (timestamptz, nullable), thumbnail_width and thumbnail_height (the stored picture's size, for the grid), author_handle (the poster's public handle for social posts, from public metadata), preview_image_url (the page's og:image as iOS read it when shared from Safari; used when a site refuses our server), created_at, processed_at, embedding (vector), pinned (bool), edited_at (notes: set by the database clock on every edit). A note's text is plain lines in raw_text (`- [ ] ` open item, `- [x] ` ticked, `• ` bullet; max 20,000 characters; src/lib/noteFormat.ts, tested in tests/); its title and snippet are its first two lines with words.
- `events`: id, user_id, name, source, kind, via, created_at (usage numbers; insert-own, unreadable from the app).
- `admins`: email (who can use dash.parso.ai; service role only).
- `profiles`: user_id, plan_override ('pro' when an admin gives Pro), pro_until, pro_product, pro_store (kept current by RevenueCat through `revenuecat-webhook` and `sync-pro`), updated_at. Pro means plan_override = 'pro' or pro_until still ahead (`private.is_pro`). A before-insert trigger refuses a free account's 51st save with `save_limit_reached`; editing is never limited; `my_plan()` tells the app Pro, until when and saves used (migration 0022).
- `revenue_events`: RevenueCat events (type, product, store, sandbox or production, price in USD, dates), keyed by RevenueCat's event id so repeats are ignored; service role only, for the dashboard's Revenue page.
- Row Level Security on every table: users read and write only their own rows.
- Full-text index on title, snippet, summary, tags, note, raw_text.

## Save pipeline

1. App inserts a save row immediately with whatever it has (URL, shared text, image). The user sees "Saved to ..." within one second; never block on AI.
2. Edge Function `process-save` runs on insert:
   a. Fetch metadata: Open Graph tags; TikTok and other public oEmbed endpoints where available. Instagram often returns little without an approved Meta app: fall back to URL plus any shared caption text. Never scrape behind logins. Some sites refuse our server (Medium): for website links the phone reads the page's og:image into `preview_image_url` (src/lib/previewImage.ts), and a trigger (migration 0013) has the server store it as the thumbnail.
   X posts are read from X's public post data (text, photos, video posters, X Articles, quoted posts, link cards); the author's profile photo is never used as the post's picture. Handles come from the same public data (Instagram embed, X, TikTok/YouTube/Reddit oEmbed, the Threads address, Pinterest oEmbed).
   b. For images and screenshots: send the image to the AI for a description and any visible text.
   c. Ask the AI for strict JSON: title, snippet (max 80 chars), summary (max 2 sentences, enforced in code), tags (max 5, lowercase), collection (existing name or a new short name). Only facts from the fetched text or image; never guess a topic when the details are thin. When the caption is short, a plainly descriptive account name and hashtags (any language) may be used as cautious hints, said as "appears to be" (owner decision in step 10).
   d. Create the embedding, write everything back, set processed_at.
   Notes written in the editor (edited_at set) skip the insert-time run: each edit calls `process-save` with `note_save` and the edit's time (migrations 0018, 0019), and only the call for the latest edit acts, about 4 seconds after typing stops. The first time it files the note (tags, summary, collection; title and snippet stay the person's); after that it refreshes search only.
3. The app updates the row live (Supabase realtime or refetch).

## Search

- Hybrid: vector similarity on embedding plus Postgres full-text rank, merged in one Edge Function `search`.
- Parse simple filters from the query when obvious (source: "from instagram", kind: "screenshot").
- Return, for each result, the terms that matched and which field they matched in. The UI highlights those terms. This is how users see why a result matched; do not add a separate "matched because" line.

## Screens

Designs live in the Parso App Screens canvas (Clean page). Exported PNGs of each screen go in `/design`. Match them closely.

0.1 to 0.3 Intro: illustration in a circle, title, one sentence, progress dots, Next. Skip on first two.
1. Welcome and sign in: logo, headline "Save it now. Find it by asking.", demo search card, Apple and Google buttons.
2. Save sheet (share extension UI): large preview card (owner-approved departure from the design's 48pt row: picture area full width, 176 tall, radius 18, with the source's brand icon pulsing on grey until the picture fades in; title up to 2 lines and source line under it; collapses to a compact row with a 72 square once no picture will come, so there is never an empty box), brand icon plus "Saved to [Collection]" with the collection highlighted, collection pills, tags line, Remind me segmented control, optional note, Done.
3. Home ("My Parsos"): reminder card, Collections row as circles (owner decision in step 10: 68 circle with the newest picture inside a thin grey ring, or a grey circle with the collections icon; the name under it in 13pt; no gradients, no counts; tap to open, press and hold to drag into a new order), Recent list with a list/grid switch beside the heading (grid: two columns, Pinterest style, each picture at its own shape; one remembered choice for My Parsos and Collections; owner decision in step 10). No search field: Search lives in the tab bar (owner decision in step 10). All and Notes pills above Recent; Notes lists notes pinned first, then newest edited, each row with title, next line and "Edited 2 hours ago".
3b. Home empty state: "Save your first thing" with share-sheet instructions and "Or paste a link".
4. Search: focused search field, kind filter pills, result count, best match with large image, other results as list rows. Before typing: recent searches (stored on the phone) and "Try" pills built from the person's own tags, apps and collections.
4b. Collections tab: two-column cards with counts, in the same order as the circles, and a Reorder button beside the title that switches to a list with drag handles until Done.
5. Collection: back, list/grid and rename buttons (the design's share button waits until sharing is in scope), name, description line (written by the AI once per collection), segmented filter by kind, list rows.
6. Save detail: full-width image (tap it to see the picture full screen, pinch to zoom), source line, title, summary, details panel (Collection, Tags, Reminder, Note), fixed buttons: links get "Open in [source]" and Share; photos and screenshots get Open (full screen), Share and Download; notes get Share. "Delete save" sits under the panel. Tapping a save anywhere opens this screen (notes open in the note editor instead); sharing into Parso still shows the save sheet.
6b. Note editor (`note/[id]`, "new" for a new note): white page, back, pin and more (Collection, Tags, Remind me, Share, Delete note), "Edited ..." line with any reminder, one line per text box with tick boxes and bullets beside them, Done while typing, and a toolbar above the keyboard (Checklist, Bullet, Remind me, Hide keyboard). Return continues a list and ends it on an empty item; Backspace at the start removes the marker, then joins the line above. Shared as text with ☐, ☑ and •, ending with "Saved with Parso.ai".

7. Parso Pro sheet (`upgrade`): opened instead of saving a free account's 51st save (share sheet, paste, Add, screenshots, a new note) and from the You tab. Title, one line, three benefits, Yearly (selected first, with its price a month) and Monthly with Apple's prices, Subscribe, Restore purchases, Apple's renewal wording, Terms of Use (Apple's standard terms) and Privacy Policy. After subscribing, the waiting save goes through. The save sheet says "5 free saves left" from save 45; the You tab shows "32 of 50 free saves used" with Upgrade, or "Parso Pro, renews Nov 8" with Manage.

Tab bar: My Parsos, Search, Collections, You. A floating black round + (Add to Parso, 56) sits above the tab bar at the bottom right on every tab and hides while the keyboard is up (owner decision in step 10).

Meta lines (list rows, grid tiles, save sheet, detail page) lead with the poster's handle for social posts when Parso knows it ("@pplreunitedsurprise, 2 days ago"), beside the brand icon; otherwise the platform, site or kind. Search results keep the platform name so "from instagram" stays highlighted (owner decision in step 10).

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
- Thumbnails: 72 in rows (owner asked for bigger pictures in step 10; the designs show 56), radius 10. Best-match image full width, 176 tall.
- Minimum touch target 44.

Highlighter rules (the one bold element):
- Use `#FFCC2A` behind text only for: search match terms, the chosen collection in "Saved to ...", and the reminder card icon tile.
- Never as a large fill, never as text color, never on more than one element type per screen beyond these.

Brand assets in `/assets/brand`: `parso_logo_new.png` (yellow icon plus wordmark), `icon.png` (yellow bookmark), `icon-black.png`. Use the black icon at sizes under 24pt or on white where yellow is hard to see. The bookmark shape in the tab bar and illustrations follows the logo (flat top, notched bottom that rises to the right).

Do not use: ALL-CAPS labels, text joined with middle dots, emoji in UI, gradients, colored single words in headlines, drop shadows on list panels, more than one accent color.

Owner-approved exception: source icons (Instagram, TikTok, X, LinkedIn and so on) before the source in meta lines are drawn in each platform's own solid brand colour, about 14pt, from `brandColors` in `theme.ts`. Solid only, never the gradient versions. Websites, photos, screenshots and notes use grey glyphs.

## Copy rules

- The library is called "My Parsos". Actions stay plain: Save, Saved to [Collection], Search, Remind me, Open in [Source]. A pasted link that is already saved opens its sheet as "Already in [Collection]" and is not saved twice.
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
11. Parso Pro on iOS (RevenueCat, the 50-save limit, Pro videos), then the admin dashboard's Revenue page.
12. Android (owner decision in step 10: after Pro is live on iOS): Google Play account, Android Google sign-in, share target on a real Android phone, Android permissions for screenshots, reminders and Download, Pro through Google Play billing. The copied-link mini sheet stays iOS only.

## How to work

- Use plan mode for every slice: propose files and approach first, wait for approval.
- Keep components small; all colors, sizes and spacing come from `theme.ts`. No hard-coded values in screens.
- Write the SQL migrations as files in `supabase/migrations`.
- When something depends on an outside platform behaving a certain way (Instagram metadata, share extension limits, App Store rules), say so and test it with a real link before building on it.
- Never mark something done without running it.
