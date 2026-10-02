import { supabase } from "./supabase";

// Some sites refuse our server (Medium answers it with 403) but serve phones normally. For website links
// the phone reads the page's own preview picture and writes it to the save; the database then asks the
// server to store it as the thumbnail (migration 0013). Platforms the server already reads (Instagram,
// TikTok, X…) are left alone, so a login page's logo never becomes a thumbnail.
const WEBSITE_SOURCES = new Set(["other", "safari"]);
const TIMEOUT_MS = 6000;
const MAX_HTML_CHARS = 1_500_000;
const MAX_URL = 2048; // the database's limit

function metaContent(html: string, key: string): string | undefined {
  for (const match of html.matchAll(/<meta\b[^>]*>/gi)) {
    const tag = match[0];
    const name = /(?:property|name)\s*=\s*["']([^"']+)["']/i
      .exec(tag)?.[1]
      ?.toLowerCase();
    if (name !== key) continue;
    const content = /content\s*=\s*"([^"]*)"|content\s*=\s*'([^']*)'/i.exec(
      tag,
    );
    return content?.[1] ?? content?.[2];
  }
  return undefined;
}

export async function findPreviewImage(
  pageUrl: string,
): Promise<string | null> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const res = await fetch(pageUrl, {
      headers: { Accept: "text/html" },
      signal: controller.signal,
    });
    if (!res.ok || !(res.headers.get("content-type") ?? "").includes("html"))
      return null;
    const html = (await res.text()).slice(0, MAX_HTML_CHARS);
    const raw =
      metaContent(html, "og:image") ?? metaContent(html, "twitter:image");
    if (!raw) return null;
    const image = new URL(
      raw.replace(/&amp;/g, "&"),
      res.url || pageUrl,
    ).toString();
    return /^https:\/\//i.test(image) && image.length <= MAX_URL ? image : null;
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

// Runs in the background after a save exists; a page without a picture just leaves the save as it is.
export async function addPreviewImage(save: {
  id: string;
  kind: string;
  source: string;
  url: string | null;
}) {
  if (save.kind !== "link" || !save.url || !WEBSITE_SOURCES.has(save.source))
    return;
  const image = await findPreviewImage(save.url);
  if (!image) return;
  await supabase
    .from("saves")
    .update({ preview_image_url: image })
    .eq("id", save.id)
    .is("preview_image_url", null);
}
