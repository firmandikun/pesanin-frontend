"use client";
import { ArrowLeft, CheckCheck, CheckCircle2, Eye, Info, Loader2, MessageCircle, PanelRight, Pin, RefreshCcw, RotateCcw, Search, Send, Unplug, UserRound, Zap } from "lucide-react";
import Link from "next/link";
import { askConfirm } from "@/components/Dialogs";
import { useSearchParams } from "next/navigation";
import { Suspense, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ShopeeMark } from "@/components/ChannelBadge";
import { PageHead } from "@/components/kit";
import { CHAT_EVENT } from "@/components/NotificationBell";
import { Select } from "@/components/Select";
import { api, ApiError } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { ChatLabel, keyQuery, labelTone, QuickReply, TeamLite, ThreadKey } from "@/lib/inbox";
import { LabelPicker } from "@/components/inbox/LabelPicker";
import { ThreadSidebar } from "@/components/inbox/ThreadSidebar";

type Channel = "shopee" | "facebook" | "instagram" | "whatsapp";
type Conv = { channel: Channel; source_id: number | string; source_name: string; id: string; to_id: number | string; name: string; avatar: string | null; unread: number; pinned: boolean; last_text: string; last_from_me: boolean; at: string | null;
  status?: "open" | "done"; assigned_to?: number | null; assignee?: string | null; labels?: string[]; customer_id?: number | null };
type Msg = { id: string; from_me: boolean; type: string; text: string; image: string | null; link?: string | null; at: string | null };
type ChannelInfo = { id: Channel; label: string; available: boolean; sources: { id: number | string; name: string }[] };
type ListRes = { available: boolean; reason: string | null; conversations: Conv[]; unread: number; channels: ChannelInfo[]; meta?: { connected: boolean; configured: boolean; errors: string[] }; whatsapp?: { connected: boolean }; team?: TeamLite[]; labels?: ChatLabel[] };
// Inbox views (like a helpdesk): active chats, unread, unassigned, per CS, done.
type View = "open" | "mine" | "unread" | "unassigned" | "done" | "all" | `cs:${number}`;
const VIEW_LABEL: Record<string, string> = { open: "Aktif", mine: "Ditugaskan ke saya", unread: "Belum dibaca", unassigned: "Belum ditugaskan", done: "Selesai", all: "Semua status" };

const CHANNEL: Record<Channel, { label: string; tone: string; dot: string }> = {
  shopee: { label: "Shopee", tone: "bg-orange-50 text-[#ee4d2d]", dot: "bg-[#ee4d2d]" },
  facebook: { label: "Facebook", tone: "bg-blue-50 text-[#1877f2]", dot: "bg-[#1877f2]" },
  instagram: { label: "Instagram", tone: "bg-pink-50 text-[#d6249f]", dot: "bg-gradient-to-br from-[#fd5949] via-[#d6249f] to-[#285AEB]" },
  whatsapp: { label: "WhatsApp", tone: "bg-emerald-50 text-[#128c7e]", dot: "bg-[#25d366]" },
};

/** Small source mark shown on avatars and filters. */
function SourceMark({ channel, size = 16 }: { channel: Channel; size?: number }) {
  if (channel === "shopee") return <ShopeeMark size={size} />;
  return <span className={`inline-flex shrink-0 items-center justify-center rounded-full font-black text-white ${CHANNEL[channel].dot}`} style={{ width: size, height: size, fontSize: size * 0.55 }}>{CHANNEL[channel].label[0]}</span>;
}

// Preview data only: shows the layout before real chats arrive. Never sent anywhere.
const ago = (m: number) => new Date(Date.now() - m * 60000).toISOString();
const SAMPLE: { conv: Conv; msgs: Msg[] }[] = [
  { conv: { channel: "shopee", source_id: 0, source_name: "Toko contoh", id: "s1", to_id: 1, name: "rina.k", avatar: null, unread: 2, pinned: false, last_text: "Kak, serum vitamin C ready yang 30ml?", last_from_me: false, at: ago(3), labels: ["Calon pembeli"] },
    msgs: [{ id: "1", from_me: false, type: "text", text: "Halo kak", image: null, at: ago(5) }, { id: "2", from_me: false, type: "text", text: "Kak, serum vitamin C ready yang 30ml?", image: null, at: ago(3) }] },
  { conv: { channel: "instagram", source_id: "ig", source_name: "@tokocontoh", id: "s4", to_id: 4, name: "dewi.beauty", avatar: null, unread: 1, pinned: false, last_text: "Kak bisa COD ke Bekasi?", last_from_me: false, at: ago(12) },
    msgs: [{ id: "1", from_me: false, type: "text", text: "Kak bisa COD ke Bekasi?", image: null, at: ago(12) }] },
  { conv: { channel: "shopee", source_id: 0, source_name: "Toko contoh", id: "s2", to_id: 2, name: "budi_s", avatar: null, unread: 0, pinned: true, last_text: "Siap kak, resi sudah terbit ya 🙏", last_from_me: true, at: ago(48), status: "done", assignee: "Sari" },
    msgs: [{ id: "1", from_me: false, type: "text", text: "Pesanan saya kapan dikirim kak?", image: null, at: ago(60) }, { id: "2", from_me: true, type: "text", text: "Siap kak, resi sudah terbit ya 🙏", image: null, at: ago(48) }] },
  { conv: { channel: "facebook", source_id: "fb", source_name: "Toko Contoh (Page)", id: "s5", to_id: 5, name: "Andi Pratama", avatar: null, unread: 0, pinned: false, last_text: "Oke kak, saya transfer sekarang", last_from_me: false, at: ago(95) },
    msgs: [{ id: "1", from_me: true, type: "text", text: "Totalnya Rp149.000 ya kak", image: null, at: ago(100) }, { id: "2", from_me: false, type: "text", text: "Oke kak, saya transfer sekarang", image: null, at: ago(95) }] },
  { conv: { channel: "shopee", source_id: 0, source_name: "Toko contoh", id: "s3", to_id: 3, name: "sari.w", avatar: null, unread: 0, pinned: false, last_text: "[Produk]", last_from_me: false, at: ago(60 * 26) },
    msgs: [{ id: "1", from_me: false, type: "item", text: "[Produk]", image: null, at: ago(60 * 26) }] },
];
const SAMPLE_CHANNELS: ChannelInfo[] = [
  { id: "shopee", label: "Shopee", available: true, sources: [{ id: 0, name: "Toko contoh" }] },
  { id: "facebook", label: "Facebook", available: true, sources: [{ id: "fb", name: "Toko Contoh (Page)" }] },
  { id: "instagram", label: "Instagram", available: true, sources: [{ id: "ig", name: "@tokocontoh" }] },
  { id: "whatsapp", label: "WhatsApp", available: false, sources: [] },
];

const when = (iso: string | null) => {
  if (!iso) return "";
  const d = new Date(iso);
  return Date.now() - d.getTime() < 864e5 ? d.toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" }) : d.toLocaleDateString("id-ID", { day: "numeric", month: "short" });
};
const initial = (n: string) => n.replace(/[^a-z0-9]/gi, "").slice(0, 1).toUpperCase() || "?";
const sameConv = (a: Conv | null, b: Conv) => !!a && a.channel === b.channel && String(a.source_id) === String(b.source_id) && a.id === b.id;
const threadKey = (c: Conv): ThreadKey => ({ channel: c.channel, source: String(c.source_id), conversation: c.id, name: c.name });
const SAMPLE_LABELS: ChatLabel[] = [{ id: 1, name: "Calon pembeli", color: "blue" }, { id: 2, name: "Komplain", color: "red" }];
const SAMPLE_TEAM: TeamLite[] = [{ id: 1, name: "Sari", role: "cs" }, { id: 2, name: "Budi", role: "cs" }];

export default function ChatPage() {
  return <Suspense fallback={null}><Chat /></Suspense>;
}

/** Chat: one inbox for buyer chats from every connected channel (Shopee now, Meta next). */
function Chat() {
  const sp = useSearchParams();
  const [channel, setChannel] = useState<"" | Channel>((sp.get("channel") as Channel) || "");
  const [source, setSource] = useState(sp.get("source") ?? "");
  const me = useAuth().user?.member ?? null;
  // A CS member lands on their own chats; the owner sees every active chat.
  const [view, setView] = useState<View>(me?.role === "cs" ? "mine" : "open");
  const [labelFilter, setLabelFilter] = useState("");
  const [showProfile, setShowProfile] = useState(false);
  useEffect(() => { if (window.innerWidth >= 1536) setShowProfile(true); }, []);
  const [replies, setReplies] = useState<QuickReply[]>([]);
  const [pick, setPick] = useState(0);
  const [list, setList] = useState<ListRes | null>(null);
  const [preview, setPreview] = useState(false);
  const [q, setQ] = useState("");
  const [active, setActive] = useState<Conv | null>(null);
  const [msgs, setMsgs] = useState<Msg[] | null>(null);
  const [draft, setDraft] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const bottom = useRef<HTMLDivElement>(null);

  const load = useCallback((refresh = false) => {
    api<ListRes>(`/chat${refresh ? "?refresh=1" : ""}`).then(setList).catch(() => setList({ available: false, reason: "Gagal memuat chat", conversations: [], unread: 0, channels: [] }));
  }, []);
  useEffect(() => { load(); api<{ data: QuickReply[] }>("/quick-replies").then((r) => setReplies(r.data)).catch(() => {}); }, [load]);
  // A "Chat baru" notification refreshes the inbox; its link (?channel=&source=&c=) opens that conversation.
  useEffect(() => { const f = () => load(); window.addEventListener(CHAT_EVENT, f); return () => window.removeEventListener(CHAT_EVENT, f); }, [load]);
  const wanted = sp.get("c");
  useEffect(() => {
    if (!wanted || preview || !list) return;
    const c = list.conversations.find((x) => x.id === wanted && (!sp.get("source") || String(x.source_id) === sp.get("source")));
    if (c && !sameConv(active, c)) open(c);
  }, [wanted, list]); // eslint-disable-line react-hooks/exhaustive-deps

  const channels = preview ? SAMPLE_CHANNELS : list?.channels ?? [];
  const all = preview ? SAMPLE.map((s) => s.conv) : list?.conversations ?? [];
  const team = preview ? SAMPLE_TEAM : list?.team ?? [];
  const labels = preview ? SAMPLE_LABELS : list?.labels ?? [];
  const inView = (c: Conv, v: View) => {
    const done = c.status === "done";
    if (v === "all") return true;
    if (v === "done") return done;
    if (done) return false;
    if (v === "unread") return c.unread > 0;
    if (v === "unassigned") return !c.assigned_to && !c.assignee;
    if (v === "mine") return !!me && c.assigned_to === me.id;
    if (v.startsWith("cs:")) return c.assigned_to === Number(v.slice(3));
    return true;
  };
  const countBy = (ch: Channel) => all.filter((c) => c.channel === ch).length;
  const sources = channel ? channels.find((c) => c.id === channel)?.sources ?? [] : [];
  const convs = useMemo(() => all.filter((c) =>
    (!channel || c.channel === channel)
    && (!source || String(c.source_id) === source)
    && inView(c, view)
    && (!labelFilter || (c.labels ?? []).includes(labelFilter))
    && (!q || c.name.toLowerCase().includes(q.toLowerCase()) || c.last_text.toLowerCase().includes(q.toLowerCase()))), [all, channel, source, view, labelFilter, q]); // eslint-disable-line react-hooks/exhaustive-deps
  const selectedChannel = channels.find((c) => c.id === channel);

  const open = (c: Conv) => {
    setActive(c); setErr(""); setDraft("");
    if (preview) { setMsgs(SAMPLE.find((s) => s.conv.id === c.id)?.msgs ?? []); return; }
    setMsgs(null);
    api<{ messages: Msg[] }>(`/chat/${c.channel}/${c.source_id}/${c.id}`).then((r) => setMsgs(r.messages)).catch((e) => { setMsgs([]); setErr(e instanceof ApiError ? e.message : "Gagal memuat pesan"); });
  };
  useEffect(() => { bottom.current?.scrollIntoView({ block: "end" }); }, [msgs]);

  // Assignee / labels / done are saved per conversation and patched into the list right away.
  const patch = (c: Conv, p: Partial<Conv>) => {
    const next = { ...c, ...p };
    setActive((a) => (a && sameConv(a, c) ? { ...a, ...p } : a));
    setList((l) => l && { ...l, conversations: l.conversations.map((x) => (sameConv(x, c) ? { ...x, ...p } : x)) });
    if (preview) { const s = SAMPLE.find((x) => x.conv.id === c.id); if (s) Object.assign(s.conv, p); }
    return next;
  };
  const updateThread = async (c: Conv, body: { assigned_to?: number | null; status?: "open" | "done"; labels?: string[] }) => {
    const prev = { assigned_to: c.assigned_to, assignee: c.assignee, status: c.status, labels: c.labels };
    patch(c, { ...body, ...(body.assigned_to !== undefined ? { assignee: team.find((t) => t.id === body.assigned_to)?.name ?? null } : {}) });
    if (preview) return;
    try {
      await api("/chat/thread", { method: "PUT", json: { ...threadKey(c), ...body } });
      if (body.labels?.some((n) => !labels.some((l) => l.name === n))) api<{ data: ChatLabel[] }>("/chat-labels").then((r) => setList((l) => l && { ...l, labels: r.data }));
    } catch (e) { patch(c, prev); setErr(e instanceof ApiError ? e.message : "Gagal menyimpan"); }
  };

  // "/" in the composer opens quick replies: "/rek" filters by shortcut, Enter or Tab inserts.
  const slash = /^\/(\S*)$/.exec(draft);
  const matches = slash ? replies.filter((r) => r.shortcut.toLowerCase().startsWith(slash[1].toLowerCase()) || r.body.toLowerCase().includes(slash[1].toLowerCase())).slice(0, 6) : [];
  const insertReply = (r: QuickReply) => { setDraft(r.body.replace(/\{nama\}/gi, active?.name ?? "")); setPick(0); };

  // Meta only allows free replies within 24h of the buyer's last message (Shopee has no such rule).
  const lastBuyerAt = (msgs ?? []).filter((m) => !m.from_me && m.at).map((m) => new Date(m.at!).getTime()).sort((a, b) => b - a)[0];
  const windowClosed = !preview && !!active && active.channel !== "shopee" && !!msgs && (!lastBuyerAt || Date.now() - lastBuyerAt > 24 * 3600 * 1000);

  const send = async () => {
    const text = draft.trim();
    if (!text || !active) return;
    if (preview) { setMsgs((m) => [...(m ?? []), { id: String(Date.now()), from_me: true, type: "text", text, image: null, at: new Date().toISOString() }]); setDraft(""); return; }
    setBusy(true); setErr("");
    try {
      const r = await api<{ message: Msg }>(`/chat/${active.channel}/${active.source_id}`, { method: "POST", json: { to_id: active.to_id, text } });
      setMsgs((m) => [...(m ?? []), r.message]); setDraft("");
    } catch (e) { setErr(e instanceof ApiError ? e.message : "Gagal mengirim"); } finally { setBusy(false); }
  };
  const pickChannel = (ch: "" | Channel) => { setChannel(ch); setSource(""); };
  const viewCount = (v: View) => all.filter((c) => inView(c, v)).length;
  const [notice, setNotice] = useState<{ ok: boolean; text: string } | null>(
    sp.get("meta") === "connected" ? { ok: true, text: "Facebook & Instagram terhubung. Chat dari Halaman dan akun Instagram-mu sekarang masuk ke sini." } : sp.get("error") ? { ok: false, text: sp.get("error")! } : null,
  );
  const meta = list?.meta;
  const canConnect = (ch: Channel) => !preview && (ch === "whatsapp" ? !list?.whatsapp?.connected : !!meta?.configured && !meta.connected && (ch === "facebook" || ch === "instagram"));
  const connectChannel = (ch: Channel) => (ch === "whatsapp" ? (window.location.href = "/settings/integrations#whatsapp") : connectMeta());
  const connectMeta = async () => {
    try { const { url } = await api<{ url: string }>("/meta-chat/connect", { method: "POST" }); window.location.href = url; }
    catch (e) { setNotice({ ok: false, text: e instanceof ApiError ? e.message : "Gagal memulai login Facebook" }); }
  };
  const disconnectMeta = async () => {
    if (!(await askConfirm("Putuskan Facebook & Instagram dari chat? Akses Pesanin ke Halaman-mu di Facebook juga dicabut."))) return;
    await api("/meta-chat", { method: "DELETE" }); setActive(null); load();
  };

  return (
    <div className="space-y-4">
      <PageHead title="Chat" tutorial={false} crumbs={[["Chat"]]}>
        <button onClick={() => { setPreview(!preview); setActive(null); setMsgs(null); pickChannel(""); }} className={`flex h-10 items-center gap-2 rounded-lg px-4 text-sm font-semibold ${preview ? "bg-navy text-white" : "bg-white text-navy"}`}>
          <Eye size={16} />{preview ? "Tutup contoh" : "Lihat contoh"}
        </button>
        {!preview && meta?.configured && !meta.connected && (
          <button onClick={connectMeta} className="flex h-10 items-center gap-2 rounded-lg bg-[#1877f2] px-4 text-sm font-semibold text-white"><span className="text-base font-black">f</span>Hubungkan Facebook & Instagram</button>
        )}
        {!preview && meta?.connected && <button onClick={disconnectMeta} title="Putuskan Facebook & Instagram" className="flex h-10 items-center gap-2 rounded-lg bg-white px-3 text-sm font-semibold text-slate-500 hover:text-rose-600"><Unplug size={16} />Facebook</button>}
        {!preview && <button onClick={() => load(true)} className="flex h-10 items-center gap-2 rounded-lg bg-white px-4 text-sm font-semibold text-navy"><RefreshCcw size={16} />Muat ulang</button>}
      </PageHead>

      {/* Source filter: every channel, coming-soon ones shown disabled. */}
      <div className="flex flex-wrap items-center gap-2">
        <button onClick={() => pickChannel("")} className={`flex h-9 items-center gap-2 rounded-lg px-3 text-sm font-semibold ${channel === "" ? "bg-navy text-white" : "bg-white text-slate-600 hover:bg-slate-100"}`}>
          Semua <span className={`rounded-full px-1.5 text-xs ${channel === "" ? "bg-white/20" : "bg-slate-100 text-slate-500"}`}>{all.length}</span>
        </button>
        {(channels.length ? channels : (Object.keys(CHANNEL) as Channel[]).map((id) => ({ id, label: CHANNEL[id].label, available: false, sources: [] }))).map((c) => (
          <button key={c.id} onClick={() => (c.available ? pickChannel(c.id) : canConnect(c.id) && connectChannel(c.id))} disabled={!c.available && !canConnect(c.id)} title={c.available ? undefined : canConnect(c.id) ? (c.id === "whatsapp" ? "Hubungkan WhatsApp Business" : "Hubungkan Facebook & Instagram") : "Segera hadir"}
            className={`flex h-9 items-center gap-2 rounded-lg px-3 text-sm font-semibold ${channel === c.id ? "bg-navy text-white" : c.available ? "bg-white text-slate-600 hover:bg-slate-100" : "cursor-not-allowed bg-white/60 text-slate-400"}`}>
            <SourceMark channel={c.id} size={16} />{c.label}
            {c.available ? <span className={`rounded-full px-1.5 text-xs ${channel === c.id ? "bg-white/20" : "bg-slate-100 text-slate-500"}`}>{countBy(c.id)}</span> : <span className="text-[10px] font-medium">{canConnect(c.id) ? "hubungkan" : "segera"}</span>}
          </button>
        ))}
        {sources.length > 1 && (
          <Select className="input h-9 w-56 text-sm" value={source} onChange={(e) => setSource(e.target.value)}>
            <option value="">Semua {channel === "shopee" ? "toko" : "akun"} ({sources.length})</option>
            {sources.map((s) => <option key={String(s.id)} value={String(s.id)}>{s.name}</option>)}
          </Select>
        )}
        <div className="ml-auto flex flex-wrap items-center gap-2">
          <Select className="input h-9 w-52 text-sm" value={view} onChange={(e) => setView(e.target.value as View)} aria-label="Tampilan">
            {((me ? ["mine", "open", "unread", "unassigned", "done", "all"] : ["open", "unread", "unassigned", "done", "all"]) as View[]).map((v) => <option key={v} value={v}>{VIEW_LABEL[v]} ({viewCount(v)})</option>)}
            {team.length > 0 && <optgroup label="Ditugaskan ke">{team.map((t) => <option key={t.id} value={`cs:${t.id}`}>{t.name} ({viewCount(`cs:${t.id}`)})</option>)}</optgroup>}
          </Select>
          {labels.length > 0 && (
            <Select className="input h-9 w-44 text-sm" value={labelFilter} onChange={(e) => setLabelFilter(e.target.value)} aria-label="Label">
              <option value="">Semua label</option>
              {labels.map((l) => <option key={l.id} value={l.name}>{l.name}</option>)}
            </Select>
          )}
          <Link href="/chat/quick-replies" title="Balasan cepat & label" className="flex h-9 items-center gap-1.5 rounded-lg bg-white px-3 text-sm font-semibold text-slate-600 hover:bg-slate-100"><Zap size={15} />Balasan cepat</Link>
        </div>
      </div>

      {notice && <p className={`flex items-start gap-2 rounded-xl p-3 text-sm ${notice.ok ? "bg-emerald-50 text-emerald-700" : "bg-rose-50 text-rose-700"}`}>{notice.ok ? <CheckCircle2 size={16} className="mt-0.5 shrink-0" /> : <Info size={16} className="mt-0.5 shrink-0" />}{notice.text}</p>}
      {!preview && meta?.errors && meta.errors.length > 0 && <p className="flex items-start gap-2 rounded-xl bg-amber-50 p-3 text-sm text-amber-800"><Info size={16} className="mt-0.5 shrink-0" /><span>{meta.errors.join(" · ")}</span></p>}
      {preview ? (
        <p className="flex items-start gap-2 rounded-xl bg-sky-50 p-3 text-sm text-sky-800"><Info size={16} className="mt-0.5 shrink-0" />Mode contoh: percakapan di bawah hanya ilustrasi tampilan (termasuk Facebook & Instagram) dan tidak terkirim ke mana pun.</p>
      ) : list && !list.available && channel === "shopee" ? (
        <p className="flex items-start gap-2 rounded-xl bg-amber-50 p-3 text-sm text-amber-800"><Info size={16} className="mt-0.5 shrink-0" />
          <span>Chat Shopee belum aktif. API chat Shopee perlu izin khusus dari Shopee untuk app live.{list.reason && <span className="mt-0.5 block text-xs text-amber-700">{list.reason}</span>}</span></p>
      ) : null}

      <div className={`relative grid h-[calc(100vh-300px)] min-h-[520px] overflow-hidden rounded-2xl bg-white md:grid-cols-[300px_minmax(0,1fr)] ${active && showProfile && !preview ? "2xl:grid-cols-[320px_minmax(0,1fr)_300px]" : ""}`}>
        <div className={`flex min-h-0 flex-col border-slate-100 md:border-r ${active ? "hidden md:flex" : "flex"}`}>
          <div className="border-b border-slate-100 p-3">
            <div className="relative"><Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input className="input h-9 pl-8 text-sm" placeholder="Cari nama atau pesan" value={q} onChange={(e) => setQ(e.target.value)} /></div>
          </div>
          <div className="min-h-0 flex-1 overflow-y-auto">
            {!list && !preview ? <p className="flex items-center justify-center gap-2 py-10 text-sm text-slate-400"><Loader2 size={15} className="animate-spin" />Memuat…</p>
              : convs.length === 0 ? <p className="px-6 py-12 text-center text-sm text-slate-400">{view === "mine" && !q && !labelFilter && !channel ? "Belum ada chat yang ditugaskan ke kamu. Lihat tampilan Belum ditugaskan untuk mengambil chat." : q || view !== "open" || labelFilter || channel ? "Tidak ada chat yang cocok dengan filter." : "Belum ada chat aktif dari pembeli."}</p>
              : convs.map((c) => (
                <button key={`${c.channel}-${c.source_id}-${c.id}`} onClick={() => open(c)} className={`flex w-full gap-3 border-b border-slate-50 px-3 py-3 text-left hover:bg-slate-50 ${sameConv(active, c) ? "bg-orange-50/60" : ""}`}>
                  <span className="relative shrink-0">
                    {c.avatar ? <img src={c.avatar} alt="" className="h-10 w-10 rounded-full object-cover" /> : <span className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-100 text-sm font-bold text-slate-600">{initial(c.name)}</span>}
                    <span className="absolute -bottom-0.5 -right-0.5 rounded-full bg-white p-px"><SourceMark channel={c.channel} size={16} /></span>
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5"><b className="truncate text-sm text-navy">{c.name}</b>{c.pinned && <Pin size={12} className="shrink-0 text-slate-400" />}<span className="ml-auto shrink-0 text-[11px] text-slate-400">{when(c.at)}</span></div>
                    <div className="mt-0.5 flex items-center gap-2"><p className={`truncate text-xs ${c.unread ? "font-semibold text-slate-700" : "text-slate-500"}`}>{c.last_from_me && "Anda: "}{c.last_text}</p>
                      {c.unread > 0 && <span className="ml-auto shrink-0 rounded-full bg-[#ee4d2d] px-1.5 text-[11px] font-bold text-white">{c.unread}</span>}</div>
                    <p className="mt-1 flex items-center gap-1.5 text-[11px]"><span className={`rounded px-1.5 py-px font-semibold ${CHANNEL[c.channel].tone}`}>{CHANNEL[c.channel].label}</span><span className="truncate text-slate-400">{c.source_name}</span>
                      {c.status === "done" && <CheckCheck size={13} className="shrink-0 text-emerald-600" aria-label="Selesai" />}
                      {c.assignee && <span title={`Ditugaskan ke ${c.assignee}`} className="ml-auto flex shrink-0 items-center gap-0.5 rounded bg-slate-100 px-1.5 py-px font-semibold text-slate-500"><UserRound size={10} />{c.assignee}</span>}</p>
                    {!!c.labels?.length && <div className="mt-1 flex flex-wrap gap-1">{c.labels.slice(0, 3).map((l) => <span key={l} className={`rounded px-1.5 py-px text-[10px] font-semibold ${labelTone(labels, l)}`}>{l}</span>)}{c.labels.length > 3 && <span className="text-[10px] text-slate-400">+{c.labels.length - 3}</span>}</div>}
                  </div>
                </button>
              ))}
          </div>
        </div>

        <div className={`min-h-0 flex-col ${active ? "flex" : "hidden md:flex"}`}>
          {!active ? (
            <div className="flex flex-1 flex-col items-center justify-center gap-2 p-8 text-center text-slate-400">
              <MessageCircle size={32} className="text-slate-300" />
              <p className="text-sm">{selectedChannel && !selectedChannel.available ? `Chat ${selectedChannel.label} segera hadir.` : "Pilih percakapan untuk membalas pembeli."}</p>
            </div>
          ) : (
            <>
              {/* Row 1: who you're talking to + Selesai / profile toggle. */}
              <div className="flex items-center gap-3 border-b border-slate-100 px-4 py-3">
                <button onClick={() => setActive(null)} className="md:hidden" aria-label="Kembali"><ArrowLeft size={18} /></button>
                <span className="relative shrink-0"><span className="flex h-9 w-9 items-center justify-center rounded-full bg-slate-100 text-sm font-bold text-slate-600">{initial(active.name)}</span>
                  <span className="absolute -bottom-0.5 -right-0.5 rounded-full bg-white p-px"><SourceMark channel={active.channel} size={14} /></span></span>
                <div className="min-w-0 flex-1"><b className="block truncate text-sm text-navy">{active.name}</b>
                  <span className="flex min-w-0 items-center gap-1.5 text-xs text-slate-400"><span className={`shrink-0 rounded px-1.5 font-semibold ${CHANNEL[active.channel].tone}`}>{CHANNEL[active.channel].label}</span><span className="truncate">{active.source_name}</span></span></div>
                {active.status === "done"
                  ? <button onClick={() => updateThread(active, { status: "open" })} className="flex h-8 shrink-0 items-center gap-1.5 rounded-lg px-2.5 text-xs font-semibold text-slate-600 ring-1 ring-slate-200 hover:bg-slate-50"><RotateCcw size={14} />Buka lagi</button>
                  : <button onClick={() => updateThread(active, { status: "done" })} className="flex h-8 shrink-0 items-center gap-1.5 rounded-lg bg-emerald-50 px-2.5 text-xs font-semibold text-emerald-700 hover:bg-emerald-100"><CheckCheck size={14} />Selesai</button>}
                {!preview && <button onClick={() => setShowProfile(!showProfile)} title={showProfile ? "Sembunyikan profil pelanggan" : "Profil pelanggan & catatan"} className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${showProfile ? "bg-slate-100 text-navy" : "text-slate-500 hover:bg-slate-100"}`}><PanelRight size={15} /></button>}
              </div>
              {/* Row 2: who handles it + labels. */}
              <div className="flex flex-wrap items-center gap-2 border-b border-slate-100 bg-slate-50/60 px-4 py-2">
                <span className="text-xs text-slate-500">Ditangani</span>
                {team.length ? (
                  <Select className="input h-8 w-40 bg-white text-xs" value={active.assigned_to ? String(active.assigned_to) : ""} aria-label="Tugaskan ke"
                    onChange={(e) => updateThread(active, { assigned_to: e.target.value ? Number(e.target.value) : null })}>
                    <option value="">Belum ditugaskan</option>
                    {team.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
                  </Select>
                ) : (
                  <Link href="/others/team-members" className="flex h-8 items-center gap-1 rounded-lg bg-white px-2.5 text-xs font-semibold text-brand-600 ring-1 ring-slate-200 hover:bg-brand-50"><UserRound size={13} />Tambah anggota tim</Link>
                )}
                {me && !active.assigned_to && <button onClick={() => updateThread(active, { assigned_to: me.id })} className="flex h-8 items-center rounded-lg bg-brand-50 px-2.5 text-xs font-semibold text-brand-700 hover:bg-brand-100">Ambil chat</button>}
                <span className="mx-1 h-5 w-px bg-slate-200" />
                {(active.labels ?? []).map((l) => <span key={l} className={`rounded px-1.5 py-0.5 text-[11px] font-semibold ${labelTone(labels, l)}`}>{l}</span>)}
                <LabelPicker compact align="left" labels={labels} value={active.labels ?? []} onChange={(next) => updateThread(active, { labels: next })} />
              </div>
              <div className="min-h-0 flex-1 space-y-2 overflow-y-auto bg-slate-50 px-4 py-4">
                {!msgs ? <p className="flex items-center justify-center gap-2 py-10 text-sm text-slate-400"><Loader2 size={15} className="animate-spin" />Memuat pesan…</p>
                  : msgs.map((m) => (
                    <div key={m.id} className={`flex ${m.from_me ? "justify-end" : "justify-start"}`}>
                      <div className={`max-w-[75%] rounded-2xl px-3.5 py-2 text-sm ${m.from_me ? "rounded-br-md bg-brand-600 text-white" : "rounded-bl-md bg-white text-slate-700"}`}>
                        {m.image ? <img src={m.image} alt="" className="max-h-56 rounded-lg" /> : <p className="whitespace-pre-wrap break-words">{m.text}</p>}
                        {m.link && <a href={m.link} target="_blank" rel="noreferrer" className={`mt-1 block truncate text-xs underline ${m.from_me ? "text-white/90" : "text-brand-600"}`}>{m.link.replace(/^https?:\/\/(www\.)?/, "")}</a>}
                        <p className={`mt-0.5 text-right text-[10px] ${m.from_me ? "text-white/70" : "text-slate-400"}`}>{when(m.at)}</p>
                      </div>
                    </div>
                  ))}
                <div ref={bottom} />
              </div>
              {err && <p className="border-t border-rose-100 bg-rose-50 px-4 py-2 text-xs text-rose-700">{err}</p>}
              {windowClosed && <p className="border-t border-amber-100 bg-amber-50 px-4 py-2 text-xs text-amber-800">Sudah lewat 24 jam sejak pesan terakhir pembeli. Meta hanya mengizinkan balasan dalam 24 jam, jadi balas lewat aplikasi {CHANNEL[active.channel].label} atau tunggu pembeli mengirim pesan lagi.</p>}
              <form onSubmit={(e) => { e.preventDefault(); send(); }} className="relative flex items-end gap-2 border-t border-slate-100 p-3">
                {slash && (
                  <div className="absolute bottom-full left-3 right-3 mb-1 max-h-64 overflow-y-auto rounded-xl bg-white p-1.5 shadow-xl ring-1 ring-slate-200">
                    {matches.length ? matches.map((r, i) => (
                      <button key={r.id} type="button" onMouseDown={(e) => { e.preventDefault(); insertReply(r); }} className={`block w-full rounded-lg px-2.5 py-1.5 text-left ${i === pick ? "bg-slate-100" : "hover:bg-slate-50"}`}>
                        <span className="text-xs font-bold text-brand-600">/{r.shortcut}</span>{r.category && <span className="ml-2 text-[10px] text-slate-400">{r.category}</span>}
                        <span className="block truncate text-xs text-slate-600">{r.body}</span>
                      </button>
                    )) : <p className="px-2.5 py-2 text-xs text-slate-500">{replies.length ? "Tidak ada balasan cepat yang cocok." : "Belum ada balasan cepat."} <Link href="/chat/quick-replies" className="font-semibold text-brand-600">Kelola balasan cepat</Link></p>}
                  </div>
                )}
                <textarea rows={1} disabled={windowClosed} className="input max-h-32 min-h-10 flex-1 resize-none py-2 text-sm disabled:bg-slate-50" placeholder={windowClosed ? "Balasan ditutup (lewat 24 jam)" : `Balas lewat ${CHANNEL[active.channel].label}… (ketik / untuk balasan cepat)`} value={draft} onChange={(e) => { setDraft(e.target.value); setPick(0); }}
                  onKeyDown={(e) => {
                    if (slash && matches.length) {
                      if (e.key === "ArrowDown" || e.key === "ArrowUp") { e.preventDefault(); setPick((p) => (p + (e.key === "ArrowDown" ? 1 : matches.length - 1)) % matches.length); return; }
                      if (e.key === "Enter" || e.key === "Tab") { e.preventDefault(); insertReply(matches[Math.min(pick, matches.length - 1)]); return; }
                    }
                    if (e.key === "Escape" && slash) { setDraft(""); return; }
                    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); }
                  }} />
                <button disabled={!draft.trim() || busy || windowClosed} className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-brand-600 text-white disabled:opacity-40" aria-label="Kirim">{busy ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}</button>
              </form>
            </>
          )}
        </div>
        {active && showProfile && !preview && (
          <div className="absolute inset-y-0 right-0 z-20 flex w-[300px] max-w-full min-h-0 flex-col shadow-2xl 2xl:static 2xl:w-auto 2xl:shadow-none">
            <ThreadSidebar key={keyQuery(threadKey(active))} thread={threadKey(active)} labels={labels} phone={active.channel === "whatsapp" ? String(active.to_id || active.id) : undefined}
              onClose={() => setShowProfile(false)} onCustomer={(id) => patch(active, { customer_id: id })} />
          </div>
        )}
      </div>
    </div>
  );
}
