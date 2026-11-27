import { getToken } from "@/lib/api";

/**
 * Client for the realtime stream of the Go notification-service (services/cmd/notification), reached through the gateway.
 * Off unless NEXT_PUBLIC_REALTIME_URL is set (e.g. https://pesaninn.my.id/rt, locally http://localhost:8100/rt),
 * so the app behaves exactly as before without it.
 *
 * API:
 *   GET  {REALTIME_URL}/v1/me       → { user_id, streams, poll_seconds }   (Authorization: Bearer <token>)
 *   GET  {REALTIME_URL}/v1/stream   → Server-Sent Events: ready, notification { item, unread }, and any published type
 *   POST {REALTIME_URL}/v1/publish  → server to server only (X-Internal-Secret), never from the browser
 */
export const REALTIME_URL = (process.env.NEXT_PUBLIC_REALTIME_URL ?? "").replace(/\/$/, "");
export const realtimeEnabled = () => REALTIME_URL !== "" && typeof window !== "undefined";

export type RealtimeEvent = { type: string; data: any };
export type RealtimeStatus = "connecting" | "live" | "offline" | "off";

async function rt<T>(path: string): Promise<T> {
  const res = await fetch(`${REALTIME_URL}${path}`, { headers: { Accept: "application/json", Authorization: `Bearer ${getToken()}` } });
  if (!res.ok) throw new Error(`realtime ${path}: ${res.status}`);
  return res.json();
}

export const realtimeMe = () => rt<{ user_id: number; streams: number; poll_seconds: number; member_id?: number }>("/v1/me");

/**
 * Keeps one stream open (fetch-based SSE, so the token goes in a header, not the URL) and reconnects
 * with backoff. Stops for good on 401 (logged out). Returns a function that closes it.
 */
// True while a stream is open, so other pollers (e.g. the chat drawer) can slow down: new items arrive over the stream.
let liveNow = false;
export const realtimeLive = () => liveNow;

export function subscribeRealtime(opts: { onEvent: (e: RealtimeEvent) => void; onStatus?: (s: RealtimeStatus) => void }): () => void {
  const user = opts.onStatus;
  opts = { ...opts, onStatus: (s) => { liveNow = s === "live"; user?.(s); } };
  if (!realtimeEnabled() || !getToken()) {
    opts.onStatus?.("off");
    return () => {};
  }
  let stopped = false;
  let ctrl: AbortController | null = null;
  let timer: ReturnType<typeof setTimeout> | null = null;
  let delay = 2000;

  const retry = () => {
    if (stopped) return;
    opts.onStatus?.("offline");
    timer = setTimeout(connect, delay);
    delay = Math.min(delay * 2, 60_000);
  };

  async function connect() {
    const token = getToken();
    if (stopped || !token) return opts.onStatus?.("off");
    opts.onStatus?.("connecting");
    ctrl = new AbortController();
    try {
      const res = await fetch(`${REALTIME_URL}/v1/stream`, { headers: { Accept: "text/event-stream", Authorization: `Bearer ${token}` }, signal: ctrl.signal, cache: "no-store" });
      if (res.status === 401) return opts.onStatus?.("off");
      if (!res.ok || !res.body) return retry();
      const reader = res.body.pipeThrough(new TextDecoderStream()).getReader();
      let buf = "";
      for (;;) {
        const { value, done } = await reader.read();
        if (done) break;
        buf += value;
        let i: number;
        while ((i = buf.indexOf("\n\n")) >= 0) {
          const block = buf.slice(0, i);
          buf = buf.slice(i + 2);
          let type = "message";
          const data: string[] = [];
          for (const line of block.split("\n")) {
            if (line.startsWith("event:")) type = line.slice(6).trim();
            else if (line.startsWith("data:")) data.push(line.slice(5).trimStart());
          }
          if (!data.length) continue; // ": ping"
          let parsed: any = data.join("\n");
          try { parsed = JSON.parse(parsed); } catch { /* plain text */ }
          if (type === "ready") { delay = 2000; opts.onStatus?.("live"); }
          opts.onEvent({ type, data: parsed });
        }
      }
      retry();
    } catch {
      retry();
    }
  }

  connect();
  return () => {
    stopped = true;
    liveNow = false;
    if (timer) clearTimeout(timer);
    ctrl?.abort();
  };
}
