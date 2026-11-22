"use client";
import { ArrowLeft, ChevronsRight, ExternalLink, ImagePlus, Loader2, MessageCircle, Search, Send, X } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ShopeeMark } from "@/components/ChannelBadge";
import { CHAT_EVENT, NotificationBell } from "@/components/NotificationBell";
import { api, ApiError, rupiah } from "@/lib/api";

type Channel = "shopee" | "facebook" | "instagram" | "whatsapp";
type Conv = {
  channel: Channel;
  source_id: number | string;
  source_name: string;
  id: string;
  to_id: number | string;
  name: string;
  avatar: string | null;
  unread: number;
  last_text: string;
  last_from_me: boolean;
  at: string | null;
};
type MsgOrder = { sn: string; id: number | null; status: string | null; total: number | null; name: string | null; image: string | null; count: number | null };
type Msg = {
  id: string;
  from_me: boolean;
  type: string;
  text: string;
  image?: string | null;
  images?: string[] | null;
  video?: string | null;
  link?: string | null;
  at: string | null;
  system?: boolean;
  order?: MsgOrder | null;
};
type InboxRes = { conversations: Conv[]; unread: number };

const shortTime = (iso: string | null) => {
  if (!iso) return "";
  const d = new Date(iso);
  const now = new Date();
  const sameDay = d.toDateString() === now.toDateString();
  if (sameDay) return d.toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" });
  return d.toLocaleDateString("id-ID", { day: "2-digit", month: "short" });
};

/**
 * Floating Shopee Seller Centre–style Chat Drawer + Popup Window on the right side of every dashboard page.
 * Lets sellers view and reply to buyer chats (Shopee, Meta, WA) without leaving their current page.
 */
export function FloatingChatDrawer() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const [tab, setTab] = useState<"today" | "all">("all");
  const [q, setQ] = useState("");
  const [inbox, setInbox] = useState<InboxRes | null>(null);
  const [active, setActive] = useState<Conv | null>(null);
  const [msgs, setMsgs] = useState<Msg[] | null>(null);
  const [draft, setDraft] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [inboxErr, setInboxErr] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const loadInbox = useCallback(() => {
    setInboxErr("");
    api<InboxRes>("/chat")
      .then(setInbox)
      .catch((e) => {
        setInboxErr(e instanceof ApiError ? e.message : "Gagal memuat daftar chat.");
        setInbox((cur) => cur ?? { conversations: [], unread: 0 });
      });
  }, []);

  useEffect(() => {
    if (pathname?.startsWith("/chat")) return;
    loadInbox();
    const onChat = () => loadInbox();
    window.addEventListener(CHAT_EVENT, onChat);
    const t = setInterval(() => {
      if (!document.hidden) loadInbox();
    }, 10000);
    return () => {
      window.removeEventListener(CHAT_EVENT, onChat);
      clearInterval(t);
    };
  }, [pathname, loadInbox]);

  const loadMsgs = useCallback((c: Conv) => {
    setErr("");
    api<{ messages: Msg[] }>(`/chat/${c.channel}/${c.source_id}/${c.id}`)
      .then((r) => {
        setMsgs(r.messages);
        setInbox((cur) => cur ? {
          ...cur,
          unread: Math.max(0, cur.unread - c.unread),
          conversations: cur.conversations.map((x) => (x.id === c.id && x.source_id === c.source_id ? { ...x, unread: 0 } : x)),
        } : cur);
      })
      .catch((e) => { setMsgs([]); setErr(e instanceof ApiError ? e.message : "Gagal memuat pesan"); });
  }, []);

  useEffect(() => {
    if (!active) return;
    setMsgs(null);
    loadMsgs(active);
    const onChat = () => loadMsgs(active);
    window.addEventListener(CHAT_EVENT, onChat);
    return () => window.removeEventListener(CHAT_EVENT, onChat);
  }, [active, loadMsgs]);

  useEffect(() => {
    if (msgs?.length) bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [msgs?.length]);

  const filtered = useMemo(() => {
    const list = inbox?.conversations ?? [];
    const todayStr = new Date().toDateString();
    const needle = q.trim().toLowerCase();
    return list.filter((c) => {
      if (tab === "today" && (!c.at || new Date(c.at).toDateString() !== todayStr)) return false;
      if (needle && !c.name.toLowerCase().includes(needle) && !c.last_text.toLowerCase().includes(needle) && !c.source_name.toLowerCase().includes(needle)) return false;
      return true;
    });
  }, [inbox, tab, q]);

  const send = async () => {
    if (!active || !draft.trim() || busy) return;
    const text = draft.trim();
    setBusy(true); setErr("");
    try {
      const r = await api<{ message: Msg }>(`/chat/${active.channel}/${active.source_id}`, { method: "POST", json: { to_id: active.to_id, text } });
      setDraft("");
      setMsgs((m) => [...(m ?? []), r.message]);
      setInbox((cur) => cur ? {
        ...cur,
        conversations: cur.conversations.map((x) => (x.id === active.id && x.source_id === active.source_id ? { ...x, last_text: text, last_from_me: true, at: r.message.at } : x)),
      } : cur);
    } catch (e) {
      setErr(e instanceof ApiError ? e.message : "Gagal mengirim pesan");
    } finally {
      setBusy(false);
    }
  };

  const sendImage = async (file?: File | null) => {
    if (!file || !active || active.channel !== "shopee" || busy) return;
    setBusy(true); setErr("");
    try {
      const fd = new FormData();
      fd.append("to_id", String(active.to_id));
      fd.append("image", file);
      const r = await api<{ message: Msg }>(`/chat/shopee/${active.source_id}/image`, { method: "POST", body: fd });
      setMsgs((m) => [...(m ?? []), r.message]);
    } catch (e) {
      setErr(e instanceof ApiError ? e.message : "Gagal mengirim gambar");
    } finally {
      setBusy(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  // Hide on full /chat page to avoid duplicating the inbox.
  if (pathname?.startsWith("/chat")) return null;

  const unread = inbox?.unread ?? 0;

  return (
    <div className="print:hidden">
      {/* Docked Chat Popup Window (sits cleanly to the left of the right-hand Chat Drawer) */}
      {open && active && (
        <div className="fixed bottom-0 right-0 z-40 flex h-[540px] max-h-[calc(100vh-4.5rem)] w-full flex-col overflow-hidden rounded-t-2xl border border-slate-200 bg-white shadow-2xl sm:right-[368px] sm:w-[380px]">
          <div className="flex items-center gap-2.5 border-b border-slate-100 bg-white px-3.5 py-2.5">
            <button type="button" onClick={() => setActive(null)} className="rounded p-1 text-slate-500 hover:bg-slate-100 sm:hidden" aria-label="Kembali"><ArrowLeft size={16} /></button>
            <div className="relative flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-slate-100 text-xs font-bold text-slate-600">
              {active.avatar ? <img src={active.avatar} alt="" className="h-full w-full rounded-full object-cover" /> : active.name.slice(0, 1).toUpperCase()}
              {active.channel === "shopee" && <span className="absolute -bottom-0.5 -right-0.5 rounded-full bg-white p-px"><ShopeeMark size={12} /></span>}
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-bold text-slate-800">{active.name}</p>
              <p className="truncate text-[11px] text-slate-400">{active.source_name}</p>
            </div>
            <Link href="/chat" title="Buka Webchat penuh" className="rounded p-1.5 text-slate-400 hover:bg-slate-100 hover:text-[#ee4d2d]"><ExternalLink size={15} /></Link>
            <button type="button" onClick={() => setActive(null)} className="rounded p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700" aria-label="Tutup chat"><X size={16} /></button>
          </div>

          <div className="no-scrollbar min-h-0 flex-1 space-y-2 overflow-y-auto bg-slate-50 p-3">
            {!msgs ? (
              <p className="flex items-center justify-center gap-2 py-12 text-xs text-slate-400"><Loader2 size={14} className="animate-spin" />Memuat pesan…</p>
            ) : !msgs.length ? (
              <p className="py-12 text-center text-xs text-slate-400">Belum ada pesan yang bisa ditampilkan.</p>
            ) : (
              msgs.filter((m) => m.text || m.image || m.video || m.order).map((m) => m.system ? (
                <div key={m.id} className="flex flex-col items-center gap-1">
                  {m.order && <MiniOrderCard o={m.order} />}
                  {m.text && <p className="max-w-[90%] rounded-lg bg-white/85 px-2.5 py-1 text-center text-[11px] text-slate-500 ring-1 ring-slate-200/70">{m.text}</p>}
                </div>
              ) : (
                <div key={m.id} className={`flex ${m.from_me ? "justify-end" : "justify-start"}`}>
                  <div className={`max-w-[82%] rounded-2xl px-3 py-2 text-xs leading-relaxed ${m.from_me ? "rounded-br-sm bg-[#ee4d2d] text-white" : "rounded-bl-sm bg-white text-slate-700 ring-1 ring-slate-200/70"}`}>
                    {m.order && <MiniOrderCard o={m.order} fromMe={m.from_me} />}
                    {m.video ? (
                      <div className="mb-1 space-y-1">
                        <video src={m.video} poster={m.image ?? undefined} controls preload="metadata" playsInline className="max-h-56 w-56 rounded-lg bg-black" />
                        <a href={m.video} target="_blank" rel="noreferrer" className={`block text-[10px] underline ${m.from_me ? "text-white/80" : "text-slate-500"}`}>Buka video</a>
                      </div>
                    ) : m.image ? (
                      <a href={m.image} target="_blank" rel="noreferrer"><img src={m.image} alt="" className="mb-1 max-h-44 rounded-lg object-cover" /></a>
                    ) : m.type === "video" ? (
                      <p className="italic opacity-80">[Video] Buka di aplikasi Shopee untuk melihat</p>
                    ) : null}
                    {!(m.order && m.text === "[Pesanan]") && !(m.image && /^\[(Gambar|Stiker|Pesan)\]$/.test(m.text)) && !(m.video && m.text === "[Video]") && !(m.type === "video" && !m.video && m.text === "[Video]") && m.text && (
                      <p className="whitespace-pre-wrap break-words">{m.text}</p>
                    )}
                    <p className={`mt-0.5 text-right text-[10px] ${m.from_me ? "text-white/75" : "text-slate-400"}`}>{shortTime(m.at)}</p>
                  </div>
                </div>
              ))
            )}
            <div ref={bottomRef} />
          </div>

          {err && <p className="border-t border-rose-100 bg-rose-50 px-3 py-1.5 text-[11px] text-rose-700">{err}</p>}
          <form onSubmit={(e) => { e.preventDefault(); send(); }} className="flex items-center gap-1.5 border-t border-slate-100 bg-white p-2.5">
            {active.channel === "shopee" && (
              <>
                <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/gif,image/webp" className="hidden" onChange={(e) => sendImage(e.target.files?.[0])} />
                <button type="button" onClick={() => fileRef.current?.click()} disabled={busy} className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-slate-200 text-slate-500 hover:bg-slate-50 hover:text-[#ee4d2d] disabled:opacity-40" title="Kirim gambar"><ImagePlus size={16} /></button>
              </>
            )}
            <input value={draft} onChange={(e) => setDraft(e.target.value)} placeholder="Balas chat pembeli..." className="h-9 min-w-0 flex-1 rounded-lg border border-slate-200 px-3 text-xs outline-none focus:border-[#ee4d2d]" />
            <button type="submit" disabled={busy || !draft.trim()} className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[#ee4d2d] text-white hover:bg-[#d73211] disabled:opacity-40" aria-label="Kirim">
              {busy ? <Loader2 size={15} className="animate-spin" /> : <Send size={15} />}
            </button>
          </form>
        </div>
      )}

      {/* Full-height Right-side Conversation List Drawer (Shopee Seller Centre style) */}
      {open && (
        <div className={`${active ? "hidden sm:flex" : "flex"} fixed bottom-0 right-0 top-14 z-40 w-full flex-col border-l border-slate-200 bg-white shadow-xl sm:right-12 sm:w-[320px]`}>
          <div className="flex items-center justify-between gap-2 border-b border-slate-100 px-3.5 py-2.5">
            <div className="flex items-center gap-2">
              <span className="text-base font-bold text-[#ee4d2d]">Chat</span>
              {unread > 0 && <span className="rounded-full bg-[#ee4d2d] px-1.5 py-0.5 text-[10px] font-bold leading-none text-white">{unread}</span>}
            </div>
            <div className="flex items-center gap-2">
              <Link href="/chat" className="inline-flex items-center gap-1 text-xs font-semibold text-sky-600 hover:underline"><ExternalLink size={12} />Webchat</Link>
              <button type="button" onClick={() => setOpen(false)} className="rounded p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700" title="Tutup panel chat"><ChevronsRight size={16} /></button>
            </div>
          </div>

          <div className="border-b border-slate-100 p-2.5">
            <div className="relative">
              <Search size={14} className="absolute left-2.5 top-2.5 text-slate-400" />
              <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Cari nama atau pesan" className="h-8 w-full rounded-lg border border-slate-200 bg-slate-50 pl-8 pr-3 text-xs outline-none focus:border-[#ee4d2d] focus:bg-white" />
            </div>
            <div className="mt-2 grid grid-cols-2 border-b border-slate-100 text-center text-xs font-semibold">
              <button type="button" onClick={() => setTab("today")} className={`pb-1.5 ${tab === "today" ? "border-b-2 border-[#ee4d2d] text-[#ee4d2d]" : "text-slate-500"}`}>Chat Hari Ini</button>
              <button type="button" onClick={() => setTab("all")} className={`pb-1.5 ${tab === "all" ? "border-b-2 border-[#ee4d2d] text-[#ee4d2d]" : "text-slate-500"}`}>Semua Chat</button>
            </div>
          </div>

          <div className="no-scrollbar min-h-0 flex-1 divide-y divide-slate-100 overflow-y-auto">
            {!inbox ? (
              <p className="flex items-center justify-center gap-2 py-12 text-xs text-slate-400"><Loader2 size={14} className="animate-spin" />Memuat chat…</p>
            ) : inboxErr ? (
              <div className="space-y-2 p-6 text-center">
                <p className="text-xs text-rose-600">{inboxErr}</p>
                <button type="button" onClick={loadInbox} className="rounded-lg bg-[#ee4d2d] px-3 py-1.5 text-xs font-semibold text-white">Coba lagi</button>
              </div>
            ) : !filtered.length ? (
              <p className="py-12 text-center text-xs text-slate-400">Tidak ada chat.</p>
            ) : (
              filtered.map((c) => {
                const isSelected = active?.id === c.id && active?.source_id === c.source_id;
                return (
                  <button key={`${c.channel}:${c.source_id}:${c.id}`} type="button" onClick={() => setActive(c)}
                    className={`flex w-full items-center gap-2.5 px-3 py-2.5 text-left transition hover:bg-orange-50/50 ${isSelected ? "bg-orange-50/80" : ""}`}>
                    <div className="relative flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-slate-100 text-xs font-bold text-slate-600">
                      {c.avatar ? <img src={c.avatar} alt="" className="h-full w-full rounded-full object-cover" /> : c.name.slice(0, 1).toUpperCase()}
                      {c.channel === "shopee" && <span className="absolute -bottom-0.5 -right-0.5 rounded-full bg-white p-px"><ShopeeMark size={12} /></span>}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-2">
                        <span className="truncate text-xs font-semibold text-slate-800">{c.name}</span>
                        <span className="shrink-0 text-[10px] text-slate-400">{shortTime(c.at)}</span>
                      </div>
                      <div className="mt-0.5 flex items-center justify-between gap-2">
                        <span className="truncate text-[11px] text-slate-500">{c.last_from_me ? `Anda: ${c.last_text}` : c.last_text}</span>
                        {c.unread > 0 && <span className="h-2 w-2 shrink-0 rounded-full bg-[#ee4d2d]" />}
                      </div>
                      <span className="block truncate text-[10px] text-slate-400">{c.source_name}</span>
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </div>
      )}

      {/* Slim Right-Edge Utility Rail (Desktop) + Mobile Floating Button */}
      <aside className="fixed bottom-0 right-0 top-14 z-30 hidden w-12 flex-col items-center gap-3 bg-white pt-4 sm:flex">
        <button type="button" onClick={() => { const next = !open; setOpen(next); if (next) { setNotifOpen(false); loadInbox(); } }} title="Chat Pembeli"
          className={`relative flex h-10 w-10 items-center justify-center rounded-xl transition ${open ? "bg-orange-50 text-[#ee4d2d]" : "text-slate-500 hover:bg-slate-100 hover:text-[#ee4d2d]"}`}>
          <MessageCircle size={21} />
          {unread > 0 && <span className="absolute -right-0.5 -top-0.5 min-w-[18px] rounded-full bg-[#ee4d2d] px-1 py-0.5 text-center text-[10px] font-bold leading-none text-white">{unread > 99 ? "99+" : unread}</span>}
        </button>
        <NotificationBell side="left" openOverride={notifOpen} onToggleOverride={(v) => { setNotifOpen(v); if (v) setOpen(false); }} />
      </aside>
      {!open && (
        <button type="button" onClick={() => { setOpen(true); loadInbox(); }}
          className="fixed bottom-5 right-5 z-40 flex h-12 items-center gap-2 rounded-full bg-[#ee4d2d] px-4 text-sm font-semibold text-white shadow-lg sm:hidden">
          <MessageCircle size={20} />
          <span>Chat</span>
          {unread > 0 && <span className="rounded-full bg-white px-1.5 py-0.5 text-[11px] font-bold leading-none text-[#ee4d2d]">{unread > 99 ? "99+" : unread}</span>}
        </button>
      )}
    </div>
  );
}

function MiniOrderCard({ o, fromMe = false }: { o: MsgOrder; fromMe?: boolean }) {
  return (
    <Link href={`/marketplace/orders?search=${encodeURIComponent(o.sn)}`}
      className={`mb-1.5 flex items-center gap-2 rounded-xl p-2 text-left ring-1 ${fromMe ? "bg-white/15 text-white ring-white/25" : "bg-slate-50 text-slate-700 ring-slate-200 hover:bg-slate-100"}`}>
      {o.image && <img src={o.image} alt="" className="h-10 w-10 shrink-0 rounded-lg object-cover" />}
      <div className="min-w-0 flex-1">
        <p className="truncate text-[11px] font-semibold">{o.name || `Pesanan ${o.sn}`}</p>
        <p className={`text-[10px] ${fromMe ? "text-white/80" : "text-slate-500"}`}>
          {o.sn}{o.total !== null ? ` · ${rupiah(o.total)}` : ""}
        </p>
      </div>
    </Link>
  );
}
