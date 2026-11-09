/**
 * Where a buyer came from, captured on the first public page they open (landing page or checkout)
 * and kept for 30 days, so it survives landing page → checkout and later return visits.
 *
 * Order of evidence:
 * 1. UTM tags on the link (utm_source=facebook …): most precise, also carries the campaign.
 * 2. Click IDs the ad platforms add automatically: fbclid (Facebook/Instagram), ttclid (TikTok),
 *    gclid/gbraid/wbraid (Google). Present even when the seller forgot UTM tags.
 * 3. In-app browsers: Facebook/Instagram/TikTok open links in their own browser with a telltale user agent.
 * 4. Referrer domain (l.facebook.com, instagram.com, tiktok.com, google.*, wa.me …).
 * Nothing found = direct/organic. A later visit only overwrites the stored source when it has evidence.
 */
type Attribution = Record<string, string>;
const KEY = "pesanin_attr";
const TTL = 30 * 864e5;

function detect(): Attribution | null {
  const sp = new URLSearchParams(location.search);
  const utm = Object.fromEntries(["utm_source", "utm_medium", "utm_campaign", "utm_term", "utm_content"].filter((k) => sp.get(k)).map((k) => [k, sp.get(k)!]));
  if (utm.utm_source) return utm;

  const ua = navigator.userAgent;
  const ref = (() => { try { return document.referrer ? new URL(document.referrer).hostname : ""; } catch { return ""; } })();
  const via = (source: string, medium: string): Attribution => ({ ...utm, utm_source: source, utm_medium: utm.utm_medium || medium });

  if (sp.get("fbclid")) return via(/instagram/i.test(ua) || /instagram\.com$/.test(ref) ? "instagram" : "facebook", "fbclid");
  if (sp.get("ttclid")) return via("tiktok", "ttclid");
  if (sp.get("gclid") || sp.get("gbraid") || sp.get("wbraid")) return via("google", "gclid");
  if (/Instagram/i.test(ua)) return via("instagram", "in-app");
  if (/FBAN|FBAV|FB_IAB|FBIOS/i.test(ua)) return via("facebook", "in-app");
  if (/musical_ly|BytedanceWebview|TikTok/i.test(ua)) return via("tiktok", "in-app");
  if (/(^|\.)instagram\.com$/.test(ref)) return via("instagram", "referral");
  if (/(^|\.)(facebook\.com|fb\.com|fb\.me|messenger\.com)$/.test(ref)) return via("facebook", "referral");
  if (/(^|\.)tiktok\.com$/.test(ref)) return via("tiktok", "referral");
  if (/(^|\.)(google\.[a-z.]+|youtube\.com)$/.test(ref)) return via("google", "referral");
  if (/(^|\.)(wa\.me|whatsapp\.com)$/.test(ref)) return via("whatsapp", "referral");
  return null;
}

/** Call on every public page view; remembers the latest source that has evidence. */
export function captureAttribution(): void {
  if (typeof window === "undefined") return;
  const found = detect();
  if (!found) return;
  try { localStorage.setItem(KEY, JSON.stringify({ ...found, at: Date.now() })); } catch { /* private mode */ }
}

/** utm_* fields to send with the order. */
export function getAttribution(): Attribution {
  captureAttribution();
  try {
    const saved = JSON.parse(localStorage.getItem(KEY) || "null");
    if (saved && Date.now() - saved.at < TTL) { delete saved.at; return saved; }
  } catch { /* ignore */ }
  return {};
}
