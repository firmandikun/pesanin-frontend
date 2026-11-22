"use client";
import { Bot, CheckCircle2, Loader2, MessageSquare, Pencil, Plus, ShieldCheck, Star, Tag, Trash2, Zap } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { askConfirm } from "@/components/Dialogs";
import { ShopeeMark } from "@/components/ChannelBadge";
import { Dialog, DialogActions, EmptyState, FieldLabel, PageHead, Panel, PrimaryBtn, SearchBox, Toggle } from "@/components/kit";
import { Select } from "@/components/Select";
import { api, ApiError } from "@/lib/api";
import { ChatLabel, LABEL_COLORS, labelDot, QuickReply } from "@/lib/inbox";

/** Quick replies ("/shortcut" in the chat composer), the label list, and Shopee chat automation. */
export default function QuickReplies() {
  const [tab, setTab] = useState<"replies" | "labels" | "shopee">("replies");
  return (
    <div className="space-y-5">
      <PageHead title="Balasan Cepat & Otomatisasi" tutorial={false} crumbs={[["Chat", "/chat"], ["Balasan Cepat & Otomatisasi"]]} />
      <div className="flex flex-wrap gap-2">
        {([
          ["replies", "Balasan cepat", Zap],
          ["labels", "Label", Tag],
          ["shopee", "Otomatisasi Shopee", Bot],
        ] as const).map(([id, label, Icon]) => (
          <button
            key={id}
            onClick={() => setTab(id)}
            className={`flex h-9 items-center gap-2 rounded-lg px-4 text-sm font-semibold transition ${
              tab === id ? "bg-navy text-white" : "bg-white text-slate-600 hover:bg-slate-100"
            }`}
          >
            <Icon size={15} />
            {label}
          </button>
        ))}
      </div>
      {tab === "replies" ? <Replies /> : tab === "labels" ? <Labels /> : <ShopeeAutomation />}
    </div>
  );
}

function Replies() {
  const [rows, setRows] = useState<QuickReply[] | null>(null);
  const [q, setQ] = useState("");
  const [edit, setEdit] = useState<Partial<QuickReply> | null>(null);
  const [err, setErr] = useState("");
  const [saving, setSaving] = useState(false);
  const load = useCallback(() => api<{ data: QuickReply[] }>("/quick-replies").then((r) => setRows(r.data)), []);
  useEffect(() => { load(); }, [load]);
  const shown = useMemo(() => (rows ?? []).filter((r) => !q || `${r.shortcut} ${r.category ?? ""} ${r.body}`.toLowerCase().includes(q.toLowerCase())), [rows, q]);

  const save = async () => {
    if (!edit) return;
    setSaving(true); setErr("");
    try {
      const body = { shortcut: edit.shortcut, category: edit.category || null, body: edit.body };
      await api(edit.id ? `/quick-replies/${edit.id}` : "/quick-replies", { method: edit.id ? "PUT" : "POST", json: body });
      setEdit(null); load();
    } catch (e) { setErr(e instanceof ApiError ? Object.values(e.errors)[0]?.[0] ?? e.message : "Gagal menyimpan"); } finally { setSaving(false); }
  };
  const remove = async (r: QuickReply) => { if (await askConfirm(`Hapus balasan cepat /${r.shortcut}?`)) { await api(`/quick-replies/${r.id}`, { method: "DELETE" }); load(); } };

  return (
    <Panel>
      <div className="flex flex-wrap items-center gap-2 p-4">
        <SearchBox value={q} onChange={setQ} placeholder="Cari pintasan atau isi" />
        <p className="text-xs text-slate-500">Di kolom chat, ketik <b className="text-brand-600">/pintasan</b> lalu Enter. Tulis <b>{"{nama}"}</b> untuk nama pembeli; khusus chat Shopee juga <b>{"{order_sn}"}</b>, <b>{"{resi}"}</b>, <b>{"{kurir}"}</b>, <b>{"{status}"}</b> dari pesanan terakhirnya.</p>
        <div className="ml-auto"><PrimaryBtn onClick={() => { setErr(""); setEdit({ shortcut: "", category: "", body: "" }); }}>Tambah Balasan</PrimaryBtn></div>
      </div>
      {!rows ? <p className="p-8 text-center text-sm text-slate-400">Memuat…</p> : !shown.length ? <EmptyState text={rows.length ? "Tidak ada yang cocok" : "Belum ada balasan cepat"} sub="Simpan jawaban yang sering dipakai, misalnya nomor rekening, cara order, atau info ongkir." /> : (
        <div className="overflow-x-auto"><table className="w-full text-sm">
          <thead><tr className="border-y border-slate-100 text-left text-[13px] text-slate-500"><th className="px-4 py-3 font-medium">Pintasan</th><th className="px-4 py-3 font-medium">Kategori</th><th className="px-4 py-3 font-medium">Isi balasan</th><th /></tr></thead>
          <tbody>{shown.map((r) => (
            <tr key={r.id} className="border-b border-slate-50 align-top">
              <td className="whitespace-nowrap px-4 py-3 font-semibold text-brand-600">/{r.shortcut}</td>
              <td className="whitespace-nowrap px-4 py-3 text-slate-500">{r.category || "–"}</td>
              <td className="max-w-xl px-4 py-3 text-slate-700"><p className="line-clamp-2 whitespace-pre-wrap">{r.body}</p></td>
              <td className="whitespace-nowrap px-4 py-3 text-right">
                <button onClick={() => { setErr(""); setEdit(r); }} className="rounded p-1.5 text-slate-400 hover:text-navy" aria-label="Ubah"><Pencil size={15} /></button>
                <button onClick={() => remove(r)} className="rounded p-1.5 text-slate-400 hover:text-rose-600" aria-label="Hapus"><Trash2 size={15} /></button>
              </td>
            </tr>
          ))}</tbody>
        </table></div>
      )}
      {edit && (
        <Dialog title={edit.id ? "Ubah Balasan Cepat" : "Tambah Balasan Cepat"} icon={Zap} onClose={() => setEdit(null)}>
          <form onSubmit={(e) => { e.preventDefault(); save(); }} className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div><FieldLabel>Pintasan</FieldLabel>
                <div className="relative"><span className="absolute left-3 top-1/2 -translate-y-1/2 font-semibold text-slate-400">/</span>
                  <input className="input pl-6" required maxLength={40} placeholder="rekening" value={edit.shortcut ?? ""} onChange={(e) => setEdit({ ...edit, shortcut: e.target.value.replace(/[^a-z0-9_-]/gi, "").toLowerCase() })} /></div></div>
              <div><FieldLabel>Kategori (opsional)</FieldLabel><input className="input" maxLength={60} placeholder="Pembayaran" value={edit.category ?? ""} onChange={(e) => setEdit({ ...edit, category: e.target.value })} /></div>
            </div>
            <div><FieldLabel>Isi balasan</FieldLabel><textarea className="input min-h-32 py-2" required maxLength={2000} placeholder={"Halo kak {nama}, pembayaran bisa ke BCA 123456 a.n. Toko Kita ya 🙏"} value={edit.body ?? ""} onChange={(e) => setEdit({ ...edit, body: e.target.value })} /></div>
            {err && <p className="rounded-lg bg-rose-50 p-2 text-sm text-rose-700">{err}</p>}
            <DialogActions onCancel={() => setEdit(null)} saving={saving} />
          </form>
        </Dialog>
      )}
    </Panel>
  );
}

function Labels() {
  const [rows, setRows] = useState<ChatLabel[] | null>(null);
  const [name, setName] = useState("");
  const [color, setColor] = useState<string>("blue");
  const [err, setErr] = useState("");
  const load = useCallback(() => api<{ data: ChatLabel[] }>("/chat-labels").then((r) => setRows(r.data)), []);
  useEffect(() => { load(); }, [load]);
  const add = async () => {
    if (!name.trim()) return;
    setErr("");
    try { await api("/chat-labels", { method: "POST", json: { name: name.trim(), color } }); setName(""); load(); }
    catch (e) { setErr(e instanceof ApiError ? Object.values(e.errors)[0]?.[0] ?? e.message : "Gagal menyimpan"); }
  };
  const recolor = async (l: ChatLabel, c: string) => { setRows((r) => r && r.map((x) => (x.id === l.id ? { ...x, color: c } : x))); await api(`/chat-labels/${l.id}`, { method: "PUT", json: { color: c } }); };
  const remove = async (l: ChatLabel) => { if (await askConfirm(`Hapus label "${l.name}"? Label ini juga dilepas dari semua chat dan pelanggan.`)) { await api(`/chat-labels/${l.id}`, { method: "DELETE" }); load(); } };

  const Swatches = ({ value, onPick }: { value: string; onPick: (c: string) => void }) => (
    <div className="flex gap-1">{LABEL_COLORS.map((c) => <button key={c} type="button" onClick={() => onPick(c)} aria-label={c} className={`h-5 w-5 rounded-full ${labelDot(c)} ${value === c ? "ring-2 ring-navy ring-offset-1" : ""}`} />)}</div>
  );

  return (
    <Panel>
      <form onSubmit={(e) => { e.preventDefault(); add(); }} className="flex flex-wrap items-center gap-3 p-4">
        <input className="input h-10 w-64" maxLength={40} placeholder="Nama label baru, mis. VIP" value={name} onChange={(e) => setName(e.target.value)} />
        <Swatches value={color} onPick={setColor} />
        <button disabled={!name.trim()} className="flex h-10 items-center gap-1.5 rounded-lg bg-brand-600 px-4 text-sm font-semibold text-white disabled:opacity-50"><Plus size={15} />Tambah</button>
        {err && <span className="text-sm text-rose-600">{err}</span>}
      </form>
      {!rows ? <p className="p-8 text-center text-sm text-slate-400">Memuat…</p> : !rows.length ? <EmptyState text="Belum ada label" sub="Label membantu mengelompokkan chat dan pelanggan, mis. Calon pembeli, Komplain, Reseller." /> : (
        <ul className="divide-y divide-slate-50 border-t border-slate-100">
          {rows.map((l) => (
            <li key={l.id} className="flex flex-wrap items-center gap-3 px-4 py-3">
              <span className={`h-3 w-3 rounded-full ${labelDot(l.color)}`} /><b className="min-w-40 text-sm text-slate-700">{l.name}</b>
              <Swatches value={l.color} onPick={(c) => recolor(l, c)} />
              <button onClick={() => remove(l)} className="ml-auto rounded p-1.5 text-slate-400 hover:text-rose-600" aria-label="Hapus label"><Trash2 size={15} /></button>
            </li>
          ))}
        </ul>
      )}
    </Panel>
  );
}

const DEFAULT_AWAY = "Halo Kak {nama}, terima kasih sudah menghubungi {toko} 🙏 Saat ini di luar jam operasional kami. Pesan Kakak akan kami balas besok pagi mulai pukul 08.00 ya kak.";
const DEFAULT_KEYWORDS: Keyword[] = [
  { words: "resi, no resi, nomor resi", text: "Halo Kak {nama}, pesanan {order_sn} saat ini {status}. Resi: {resi} ({kurir}). Bisa dicek di menu Pesanan Saya ya kak 🙏" },
  { words: "kapan dikirim, kapan dikirimnya, belum dikirim", text: "Halo Kak {nama}, pesanan {order_sn} saat ini {status}. Pesanan dikirim maksimal 1×24 jam hari kerja ya kak 🙏" },
];
const VARS = ["{nama}", "{toko}", "{order_sn}", "{resi}", "{kurir}", "{status}"];
const HOURS = Array.from({ length: 48 }, (_, i) => `${String(Math.floor(i / 2)).padStart(2, "0")}:${i % 2 ? "30" : "00"}`);

type Keyword = { words: string; text: string };
type ChatAuto = {
  away: { enabled: boolean; start: string; end: string; text: string };
  keywords_enabled: boolean; keywords: Keyword[];
};

function VarHint() {
  return <p className="mb-1.5 text-[11px] text-slate-400">Variabel: {VARS.map((v) => <b key={v} className="mr-1.5 text-navy">{v}</b>)}<span className="text-slate-400">· resi/kurir/status diambil dari pesanan terakhir pembeli</span></p>;
}

function Section({ n, title, desc, on, setOn, children }: { n: number; title: string; desc: string; on: boolean; setOn: (v: boolean) => void; children: React.ReactNode }) {
  return (
    <div className="space-y-3 pt-6 first:pt-2">
      <div className="flex items-start justify-between gap-4">
        <div>
          <b className="block text-sm text-navy">{n}. {title}</b>
          <p className="mt-0.5 text-xs text-slate-500">{desc}</p>
        </div>
        <Toggle checked={on} onChange={setOn} />
      </div>
      {on && children}
    </div>
  );
}

function ShopeeAutomation() {
  const [cfg, setCfg] = useState<ChatAuto | null>(null);
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState("");
  const [err, setErr] = useState("");

  useEffect(() => {
    api<Record<string, any>>("/user-settings")
      .then((all) => {
        const s = all?.shopee_chat_automation ?? {};
        setCfg({
          away: { enabled: Boolean(s.away?.enabled), start: s.away?.start || "21:00", end: s.away?.end || "08:00", text: s.away?.text || DEFAULT_AWAY },
          keywords_enabled: Boolean(s.keywords_enabled), keywords: Array.isArray(s.keywords) && s.keywords.length ? s.keywords : DEFAULT_KEYWORDS,
        });
      })
      .catch(() => setErr("Gagal memuat pengaturan"));
  }, []);

  const set = (p: Partial<ChatAuto>) => setCfg((c) => (c ? { ...c, ...p } : c));
  const setKw = (i: number, p: Partial<Keyword>) => set({ keywords: cfg!.keywords.map((k, j) => (j === i ? { ...k, ...p } : k)) });

  const save = async () => {
    if (!cfg) return;
    setSaving(true); setNotice(""); setErr("");
    try {
      const keywords = cfg.keywords.filter((k) => k.words.trim() && k.text.trim());
      await api("/user-settings", { method: "PUT", json: { key: "shopee_chat_automation", value: { ...cfg, keywords } } });
      setCfg({ ...cfg, keywords });
      setNotice("Tersimpan. Pesan otomatis mulai berjalan dalam 1 menit.");
    } catch (e) {
      setErr(e instanceof ApiError ? Object.values(e.errors ?? {})[0]?.[0] ?? e.message : "Gagal menyimpan");
    } finally { setSaving(false); }
  };

  if (!cfg) return <Panel className="p-8 text-center text-sm text-slate-400">{err || "Memuat pengaturan…"}</Panel>;

  return (
    <Panel className="space-y-6 p-6">
      <div>
        <div className="flex items-center gap-2"><ShopeeMark size={20} /><h3 className="font-bold text-navy">Chat Otomatis Shopee</h3></div>
        <p className="mt-1 text-xs text-slate-500">Pesanin membalas chat pembeli otomatis (dicek setiap menit). Tiap chat pembeli dibalas paling banyak sekali, jadi tidak berulang.</p>
      </div>
      <p className="flex items-start gap-2 rounded-xl bg-amber-50 p-3 text-xs text-amber-800"><ShieldCheck size={15} className="mt-0.5 shrink-0" />
        Sesuai aturan Shopee, Pesanin <b className="mx-0.5">hanya membalas chat yang dikirim pembeli</b> dan tidak pernah chat duluan. Chat dari penjual lebih dulu, pesan berulang, promosi, atau meminta rating bintang 5 bisa dianggap spam dan berujung penalti atau chat diblokir.
      </p>
      {notice && <div className="flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-xs font-medium text-emerald-800"><CheckCircle2 size={15} className="shrink-0 text-emerald-600" />{notice}</div>}
      {err && <div className="rounded-xl bg-rose-50 p-3 text-xs text-rose-700">{err}</div>}

      <div className="space-y-6 divide-y divide-slate-100">
        <Section n={1} title="Balasan otomatis kata kunci" desc="Kalau chat pembeli mengandung kata kunci (mis. &quot;resi&quot;), langsung dibalas dengan jawaban yang sudah diisi data pesanannya." on={cfg.keywords_enabled} setOn={(v) => set({ keywords_enabled: v })}>
          <VarHint />
          <div className="space-y-3">
            {cfg.keywords.map((k, i) => (
              <div key={i} className="space-y-2 rounded-xl border border-slate-200 p-3">
                <div className="flex items-center gap-2">
                  <input className="input h-9 flex-1 text-xs" placeholder="Kata kunci, pisahkan dengan koma: resi, no resi" maxLength={200} value={k.words} onChange={(e) => setKw(i, { words: e.target.value })} />
                  <button onClick={() => set({ keywords: cfg.keywords.filter((_, j) => j !== i) })} className="grid h-9 w-9 place-items-center rounded-lg text-slate-400 hover:bg-rose-50 hover:text-rose-600" title="Hapus"><Trash2 size={15} /></button>
                </div>
                <textarea className="input min-h-16 py-2 text-xs" placeholder="Jawaban otomatis" maxLength={1000} value={k.text} onChange={(e) => setKw(i, { text: e.target.value })} />
              </div>
            ))}
            {cfg.keywords.length < 20 && <button onClick={() => set({ keywords: [...cfg.keywords, { words: "", text: "" }] })} className="flex items-center gap-1.5 text-sm font-semibold text-brand-600"><Plus size={15} />Tambah kata kunci</button>}
          </div>
        </Section>

        <Section n={2} title="Pesan di luar jam kerja" desc="Pembeli yang chat di luar jam kerja langsung mendapat balasan (sekali per pembeli per malam)." on={cfg.away.enabled} setOn={(v) => set({ away: { ...cfg.away, enabled: v } })}>
          <div className="flex flex-wrap items-center gap-2 text-sm text-slate-600">
            Di luar jam kerja dari
            <Select className="input w-28" value={cfg.away.start} onChange={(e) => set({ away: { ...cfg.away, start: e.target.value } })}>{HOURS.map((h) => <option key={h}>{h}</option>)}</Select>
            sampai
            <Select className="input w-28" value={cfg.away.end} onChange={(e) => set({ away: { ...cfg.away, end: e.target.value } })}>{HOURS.map((h) => <option key={h}>{h}</option>)}</Select>
            WIB
          </div>
          <div><VarHint /><textarea className="input min-h-20 py-2 text-xs" maxLength={1000} value={cfg.away.text} onChange={(e) => set({ away: { ...cfg.away, text: e.target.value } })} /></div>
        </Section>
      </div>

      <div className="flex justify-end border-t border-slate-100 pt-4">
        <PrimaryBtn onClick={save} disabled={saving}>{saving ? <><Loader2 size={15} className="animate-spin" />Menyimpan…</> : "Simpan Pengaturan"}</PrimaryBtn>
      </div>
    </Panel>
  );
}
