-- The preview image the phone found on the page when it was shared from Safari (iOS reads og:image itself).
-- process-save uses it when the server can't fetch the page, as with sites that block servers (Medium).
alter table public.saves add column preview_image_url text
  check (preview_image_url is null or (preview_image_url like 'https://%' and length(preview_image_url) <= 2048));
