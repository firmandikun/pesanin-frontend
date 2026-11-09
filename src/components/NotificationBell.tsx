"use client";
import { Bell, BellRing, Check, MessageCircle, ShoppingBag, X } from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { api } from "@/lib/api";

type Item = { id: number; type: string; title: string; body: string | null; url: string | null; read_at: string | null; created_at: string };
type Feed = { items: Item[]; unread: number; push: { key: string | null; enabled: boolean } };

const POLL_MS = 8000;
const ago = (t: string) => {
  const s = Math.max(0, (Date.now() - new Date(t).getTime()) / 1000);
  return s < 60 ? "baru saja" : s < 3600 ? `${Math.floor(s / 60)} mnt lalu` : s < 86400 ? `${Math.floor(s / 3600)} jam lalu` : new Date(t).toLocaleDateString("id-ID", { day: "numeric", month: "short" });
};
const b64ToBytes = (b64: string) => {
  const raw = atob((b64 + "=".repeat((4 - (b64.length % 4)) % 4)).replace(/-/g, "+").replace(/_/g, "/"));
  return Uint8Array.from(raw, (c) => c.charCodeAt(0));
};

/** Tell open lists (Pesanan Web / Shopee) to reload. */
export const ORDERS_EVENT = "pesanin:orders";
export const CHAT_EVENT = "pesanin:chat";
const TypeIcon = ({ type }: { type: string }) => (type === "chat" ? <MessageCircle size={16} /> : <ShoppingBag size={16} />);

/**
 * Header bell: polls the feed every few seconds, shows a toast for each new order and refreshes
 * order lists. "Notifikasi browser" subscribes this browser to Web Push (VAPID), so new orders
 * still pop up when the Pesanin tab is closed.
 */
export function NotificationBell() {
  const [items, setItems] = useState<Item[]>([]);
  const [unread, setUnread] = useState(0);
  const [open, setOpen] = useState(false);
  const [toasts, setToasts] = useState<Item[]>([]);
  const [push, setPush] = useState<{ key: string | null; enabled: boolean }>({ key: null, enabled: false });
  const [pushOn, setPushOn] = useState(false);
  const [pushMsg, setPushMsg] = useState("");
  const last = useRef(0);
  const first = useRef(true);
  const seen = useRef(new Set<number>());

  const poll = useCallback(async () => {
    try {
      const d = await api<Feed>(`/notifications${last.current ? `?after=${last.current}` : ""}`);
      setUnread(d.unread);
      setPush(d.push);
      if (!d.items.length) return;
      last.current = Math.max(last.current, ...d.items.map((i) => i.id));
      setItems((cur) => [...d.items, ...cur.filter((c) => !d.items.some((n) => n.id === c.id))].slice(0, 30));
      // Only toast what just happened (not the backlog loaded when the page opens).
      const fresh = first.current ? [] : d.items.filter((i) => Date.now() - new Date(i.created_at).getTime() < 120_000 && !seen.current.has(i.id));
      d.items.forEach((i) => seen.current.add(i.id));
      if (fresh.length) {
        setToasts((t) => [...fresh.slice(0, 3), ...t].slice(0, 3));
        fresh.forEach((i) => setTimeout(() => setToasts((t) => t.filter((x) => x.id !== i.id)), 7000));
        if (fresh.some((i) => i.type === "order")) window.dispatchEvent(new Event(ORDERS_EVENT));
        if (fresh.some((i) => i.type === "chat")) window.dispatchEvent(new Event(CHAT_EVENT));
      }
    } catch { /* offline or logged out: try again next tick */ }
    finally { first.current = false; }
  }, []);

  useEffect(() => {
    poll();
    const t = setInterval(() => { if (document.visibilityState === "visible") poll(); }, POLL_MS);
    const onFocus = () => poll();
    // A push that reached the service worker means something new: fetch it right away.
    const onSw = (e: MessageEvent) => { if (e.data?.type === "pesanin:notification") poll(); };
    window.addEventListener("focus", onFocus);
    navigator.serviceWorker?.addEventListener("message", onSw);
    navigator.serviceWorker?.getRegistration("/sw.js").then((r) => r?.pushManager.getSubscription()).then((s) => setPushOn(!!s)).catch(() => {});
    return () => { clearInterval(t); window.removeEventListener("focus", onFocus); navigator.serviceWorker?.removeEventListener("message", onSw); };
  }, [poll]);

  async function togglePush() {
    setPushMsg("");
    try {
      if (!("serviceWorker" in navigator) || !("PushManager" in window)) throw new Error("Browser ini belum mendukung notifikasi push.");
      const reg = await navigator.serviceWorker.register("/sw.js");
      const existing = await reg.pushManager.getSubscription();
      if (pushOn && existing) {
        await api("/push/unsubscribe", { method: "POST", json: { endpoint: existing.endpoint } });
        await existing.unsubscribe();
        setPushOn(false);
        return;
      }
      if (!push.key) throw new Error("Kunci push belum diatur di server (php artisan webpush:vapid).");
      if ((await Notification.requestPermission()) !== "granted") throw new Error("Izin notifikasi ditolak. Aktifkan lewat ikon gembok di address bar.");
      const sub = existing ?? await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: b64ToBytes(push.key) });
      await api("/push/subscribe", { method: "POST", json: sub.toJSON() });
      setPushOn(true);
      await api("/notifications/test", { method: "POST" });
      setPushMsg("Aktif. Notifikasi uji sudah dikirim.");
    } catch (e) { setPushMsg((e as Error).message); }
  }

  async function markRead() {
    setUnread(0);
    setItems((cur) => cur.map((i) => ({ ...i, read_at: i.read_at ?? new Date().toISOString() })));
    await api("/notifications/read", { method: "POST" }).catch(() => {});
  }

  return (
    <>
      <div className="relative">
        <button onClick={() => setOpen(!open)} className="relative flex items-center" aria-label="Notifikasi">
          <Bell size={22} />
          {unread > 0 && <span className="absolute -right-2 -top-2 flex h-4 min-w-4 items-center justify-center rounded-full bg-rose-500 px-1 text-[10px] font-bold">{unread > 99 ? "99+" : unread}</span>}
        </button>
        {open && (
          <>
            <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
            <div className="absolute right-0 z-50 mt-3 w-[340px] max-w-[calc(100vw-24px)] overflow-hidden rounded-xl bg-white text-sm text-slate-700 shadow-xl">
              <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
                <b className="text-navy">Notifikasi</b>
                {unread > 0 && <button onClick={markRead} className="flex items-center gap-1 text-xs font-semibold text-brand-600"><Check size={13} />Tandai dibaca</button>}
              </div>
              <div className="max-h-[360px] overflow-y-auto">
                {items.length ? items.map((i) => (
                  <Link key={i.id} href={i.url ?? "#"} onClick={() => setOpen(false)} className={`flex gap-3 px-4 py-3 hover:bg-slate-50 ${i.read_at ? "" : "bg-brand-50/50"}`}>
                    <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-brand-100 text-brand-600"><TypeIcon type={i.type} /></span>
                    <span className="min-w-0 flex-1">
                      <b className="block text-navy">{i.title}</b>
                      {i.body && <span className="block truncate text-xs text-slate-500">{i.body}</span>}
                      <span className="text-[11px] text-slate-400">{ago(i.created_at)}</span>
                    </span>
                  </Link>
                )) : <p className="px-4 py-10 text-center text-slate-400">Belum ada notifikasi.</p>}
              </div>
              <div className="border-t border-slate-100 bg-slate-50 px-4 py-3">
                <button onClick={togglePush} className="flex w-full items-center justify-between gap-2 text-left">
                  <span><b className="flex items-center gap-1.5 text-navy"><BellRing size={14} />Notifikasi browser</b><span className="text-xs text-slate-500">Muncul walau tab Pesanin tertutup</span></span>
                  <span className={`relative h-5 w-9 shrink-0 rounded-full transition ${pushOn ? "bg-brand-500" : "bg-slate-300"}`}><span className={`absolute top-0.5 h-4 w-4 rounded-full bg-white transition-all ${pushOn ? "left-[18px]" : "left-0.5"}`} /></span>
                </button>
                {pushMsg && <p className="mt-2 text-xs text-slate-500">{pushMsg}</p>}
              </div>
            </div>
          </>
        )}
      </div>

      <div className="fixed bottom-5 right-5 z-[60] flex w-[320px] max-w-[calc(100vw-32px)] flex-col gap-2">
        {toasts.map((t) => (
          <div key={t.id} className="flex items-start gap-3 rounded-xl bg-navy p-3.5 text-white shadow-xl">
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-brand-500"><TypeIcon type={t.type} /></span>
            <Link href={t.url ?? "#"} className="min-w-0 flex-1" onClick={() => setToasts((x) => x.filter((y) => y.id !== t.id))}>
              <b className="block text-sm">{t.title}</b>
              {t.body && <span className="block truncate text-xs text-white/70">{t.body}</span>}
            </Link>
            <button onClick={() => setToasts((x) => x.filter((y) => y.id !== t.id))} className="text-white/60 hover:text-white" aria-label="Tutup"><X size={15} /></button>
          </div>
        ))}
      </div>
    </>
  );
}
