"use client";
import { AlertTriangle, Check, Loader2, MessageSquareReply, RefreshCcw, Send, Settings2, Star, X } from "lucide-react";
import { useSearchParams } from "next/navigation";
import { Suspense, useCallback, useEffect, useState } from "react";
import { askConfirm, showAlert } from "@/components/Dialogs";
import { Pager, PageHead, Panel, SearchBox, Toggle } from "@/components/kit";
import { Select } from "@/components/Select";
import { api, ApiError, Paginated } from "@/lib/api";

type Review = {
  id: number; marketplace_shop_id: number; comment_id: number; item_id: number; order_sn: string | null; buyer: string | null; rating: number; comment: string | null;
  media: { images?: string[]; videos?: string[] } | null; hidden: boolean; reply: string | null; replied_at: string | null; reply_error: string | null; reviewed_at: string | null;
  shop: { id: number; shop_name: string } | null; product: { item_id: number; name: string; image: string | null } | null;
};
type Shop = { id: number; shop_name: string; platform?: string; status: string; is_demo: boolean };
type Settings = { auto_reply: boolean; auto_min_rating: number; alert_max_rating: number; templates: { good: string; mid: string; low: string } };
type Data = { reviews: Paginated<Review>; stats: { total: number; average: number; unreplied: number; low_unreplied: number; by_rating: Record<string, number> }; settings: Settings };

const err = (e: unknown, f: string) => (e instanceof ApiError ? e.message : f);
const stars = (n: number) => <span className="whitespace-nowrap text-amber-400">{"★".repeat(n)}<span className="text-slate-200">{"★".repeat(5 - n)}</span></span>;
const tplFor = (s: Settings, rating: number) => s.templates[rating >= 4 ? "good" : rating === 3 ? "mid" : "low"];
const fill = (t: string, r: Review) => t.replaceAll("{nama}", r.buyer || "kak").replaceAll("{produk}", r.product?.name || "produk kami");

export default function ReviewsPage() {
  return <Suspense fallback={null}><Reviews /></Suspense>;
}

/** Marketplace → Ulasan: Shopee buyer reviews, answered here (typed, or in bulk with a template per star rating). */
function Reviews() {
  const sp = useSearchParams();
  const [d, setD] = useState<Data | null>(null);
  const [rating, setRating] = useState(sp.get("rating") ?? "");
  const [replied, setReplied] = useState(sp.get("replied") ?? "no");
  const [search, setSearch] = useState("");
  const [shop, setShop] = useState(sp.get("shop") ?? "");
  const [shops, setShops] = useState<Shop[]>([]);
  const [page, setPage] = useState(1);
  const [picked, setPicked] = useState<number[]>([]);
  const [busy, setBusy] = useState("");
  const [notice, setNotice] = useState("");
  const [cfgOpen, setCfgOpen] = useState(false);

  useEffect(() => {
    api<{ shops: Shop[] }>("/marketplace/shops").then((r) => setShops(r.shops.filter((x) => (x.platform ?? "shopee") === "shopee" && x.status === "active" && !x.is_demo))).catch(() => {});
  }, []);
  const load = useCallback(() => {
    api<Data>(`/marketplace/reviews?${new URLSearchParams({ rating, replied, search, shop, page: String(page), per_page: "20" })}`).then((r) => { setD(r); setPicked([]); }).catch(() => setD(null));
  }, [rating, replied, search, shop, page]);
  useEffect(() => { const t = setTimeout(load, 200); return () => clearTimeout(t); }, [load]);

  const sync = async () => {
    setBusy("sync");
    try {
      const r = await api<{ new: number; errors: string[] }>("/marketplace/reviews/sync", { method: "POST", json: shop ? { shop: Number(shop) } : {} });
      setNotice(r.errors.length ? `Sebagian toko gagal: ${r.errors.join("; ")}` : `${r.new} ulasan baru diambil dari Shopee.`); load();
    } catch (e) { showAlert(err(e, "Gagal mengambil ulasan"), "Gagal"); } finally { setBusy(""); }
  };
  const bulk = async () => {
    if (!(await askConfirm(`Balas ${picked.length} ulasan dengan template sesuai bintangnya? Balasan ulasan di Shopee tidak bisa diubah setelah dikirim.`, { title: "Balas massal", confirmLabel: "Kirim balasan" }))) return;
    setBusy("bulk");
    try {
      const r = await api<{ sent: number; failed: Record<string, string> }>("/marketplace/reviews/reply", { method: "POST", json: { ids: picked } });
      setNotice(`${r.sent} ulasan dibalas${Object.keys(r.failed).length ? `, ${Object.keys(r.failed).length} gagal` : ""}.`); load();
    } catch (e) { showAlert(err(e, "Gagal membalas"), "Gagal"); } finally { setBusy(""); }
  };

  const s = d?.stats;
  const rows = d?.reviews.data ?? [];
  const open = rows.filter((r) => !r.replied_at);

  return (
    <div className="space-y-5">
      <PageHead title="Ulasan Pembeli" tutorial={false} crumbs={[["Marketplace"], ["Ulasan"]]}>
        <button onClick={() => setCfgOpen(!cfgOpen)} className={`flex h-10 items-center gap-2 rounded-lg border bg-white px-4 text-sm font-semibold ${cfgOpen ? "border-[#ee4d2d] text-[#ee4d2d]" : "border-slate-200 text-navy"}`}><Settings2 size={16} />Template & otomatis</button>
        <button onClick={sync} disabled={busy === "sync"} className="flex h-10 items-center gap-2 rounded-lg bg-[#ee4d2d] px-4 text-sm font-semibold text-white hover:bg-[#d73f22] disabled:opacity-60">
          {busy === "sync" ? <Loader2 size={16} className="animate-spin" /> : <RefreshCcw size={16} />}Ambil ulasan
        </button>
      </PageHead>

      {notice && <p className="flex items-start justify-between gap-3 rounded-xl bg-emerald-50 p-3 text-sm text-emerald-700"><span className="flex items-center gap-2"><Check size={16} />{notice}</span><button onClick={() => setNotice("")} aria-label="Tutup"><X size={15} /></button></p>}
      {cfgOpen && d && <ReviewSettings value={d.settings} onSaved={(v) => { setD({ ...d, settings: v }); setCfgOpen(false); setNotice("Pengaturan ulasan tersimpan."); }} />}

      {s && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="surface p-4"><p className="text-xs font-medium text-slate-500">Rata-rata bintang</p><p className="mt-1 flex items-center gap-2 text-xl font-bold text-navy">{s.average || "-"}<Star size={18} className="fill-amber-400 text-amber-400" /></p><p className="text-[11px] text-slate-400">{s.total} ulasan tersimpan</p></div>
          <div className="surface p-4"><p className="text-xs font-medium text-slate-500">Belum dibalas</p><p className={`mt-1 text-xl font-bold ${s.unreplied ? "text-amber-600" : "text-navy"}`}>{s.unreplied}</p></div>
          <button onClick={() => { setRating("low"); setReplied("no"); setPage(1); }} className="surface p-4 text-left hover:ring-2 hover:ring-rose-100"><p className="text-xs font-medium text-slate-500">Bintang ≤3 belum dibalas</p><p className={`mt-1 text-xl font-bold ${s.low_unreplied ? "text-rose-600" : "text-navy"}`}>{s.low_unreplied}</p><p className="text-[11px] text-slate-400">Prioritaskan, balas dengan solusi</p></button>
          <div className="surface p-4 text-xs text-slate-500">
            {[5, 4, 3, 2, 1].map((n) => {
              const c = s.by_rating[n] ?? 0;
              return <div key={n} className="flex items-center gap-2"><span className="w-3">{n}</span><Star size={11} className="fill-amber-400 text-amber-400" /><span className="h-1.5 flex-1 overflow-hidden rounded-full bg-slate-100"><span className="block h-full bg-amber-400" style={{ width: `${s.total ? (c / s.total) * 100 : 0}%` }} /></span><span className="w-8 text-right">{c}</span></div>;
            })}
          </div>
        </div>
      )}

      <p className="flex items-start gap-2 rounded-xl bg-sky-50 p-3 text-xs text-sky-800"><AlertTriangle size={14} className="mt-0.5 shrink-0" />Balasan ulasan hanya bisa dikirim sekali dan tampil publik. Jangan menulis nomor HP, alamat, atau ajakan transaksi di luar Shopee: Shopee memberi poin penalti untuk balasan kasar atau yang membocorkan data pembeli.</p>

      <Panel>
        <div className="flex flex-wrap items-center gap-2 p-4">
          <SearchBox value={search} onChange={(v) => { setSearch(v); setPage(1); }} placeholder="Cari isi ulasan, pembeli, no. pesanan" />
          {shops.length > 1 && (
            <Select className="input w-48" value={shop} onChange={(e) => { setShop(e.target.value); setPage(1); }}>
              <option value="">Semua toko ({shops.length})</option>{shops.map((x) => <option key={x.id} value={x.id}>{x.shop_name}</option>)}
            </Select>
          )}
          <Select className="input w-40" value={rating} onChange={(e) => { setRating(e.target.value); setPage(1); }}>
            <option value="">Semua bintang</option><option value="low">Bintang ≤3</option>{[5, 4, 3, 2, 1].map((n) => <option key={n} value={n}>Bintang {n}</option>)}
          </Select>
          <Select className="input w-40" value={replied} onChange={(e) => { setReplied(e.target.value); setPage(1); }}>
            <option value="no">Belum dibalas</option><option value="yes">Sudah dibalas</option><option value="">Semua</option>
          </Select>
          {open.length > 0 && (
            <label className="ml-auto flex items-center gap-2 text-sm text-slate-600">
              <input type="checkbox" checked={picked.length === open.length} onChange={(e) => setPicked(e.target.checked ? open.map((r) => r.id) : [])} />Pilih semua di halaman ini
            </label>
          )}
          {picked.length > 0 && (
            <button onClick={bulk} disabled={busy === "bulk"} className="flex h-10 items-center gap-2 rounded-lg bg-navy px-4 text-sm font-semibold text-white disabled:opacity-60">
              {busy === "bulk" ? <Loader2 size={15} className="animate-spin" /> : <MessageSquareReply size={15} />}Balas {picked.length} dengan template
            </button>
          )}
        </div>
        <div className="divide-y divide-slate-100">
          {!d && <p className="py-14 text-center text-slate-400"><Loader2 size={18} className="mx-auto animate-spin" /></p>}
          {rows.map((r) => <ReviewRow key={r.id} r={r} settings={d!.settings} picked={picked.includes(r.id)} onPick={(v) => setPicked(v ? [...picked, r.id] : picked.filter((x) => x !== r.id))} onReplied={load} />)}
          {d && !rows.length && <p className="py-14 text-center text-sm text-slate-500">{d.stats.total ? "Tidak ada ulasan yang cocok dengan filter." : "Belum ada ulasan. Klik \"Ambil ulasan\" untuk mengambil dari Shopee."}</p>}
        </div>
        {d && d.reviews.last_page > 1 && <Pager page={d.reviews.current_page} last={d.reviews.last_page} onPage={setPage} total={d.reviews.total} />}
      </Panel>
    </div>
  );
}

function ReviewRow({ r, settings, picked, onPick, onReplied }: { r: Review; settings: Settings; picked: boolean; onPick: (v: boolean) => void; onReplied: () => void }) {
  const [open, setOpen] = useState(false);
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const send = async () => {
    setBusy(true);
    try {
      const res = await api<{ sent: number; failed: Record<string, string> }>("/marketplace/reviews/reply", { method: "POST", json: { replies: [{ id: r.id, text }] } });
      if (res.sent) onReplied(); else showAlert(Object.values(res.failed)[0] ?? "Shopee menolak balasan", "Gagal");
    } catch (e) { showAlert(err(e, "Gagal membalas"), "Gagal"); } finally { setBusy(false); }
  };
  return (
    <div className={`flex gap-3 px-4 py-4 ${r.rating <= 3 && !r.replied_at ? "bg-rose-50/30" : ""}`}>
      <div className="pt-1">{!r.replied_at ? <input type="checkbox" checked={picked} onChange={(e) => onPick(e.target.checked)} aria-label="Pilih ulasan" /> : <span className="block w-[13px]" />}</div>
      {r.product?.image ? <img src={r.product.image} alt="" className="h-12 w-12 shrink-0 rounded-lg object-cover" /> : <span className="h-12 w-12 shrink-0 rounded-lg bg-slate-100" />}
      <div className="min-w-0 flex-1 space-y-1.5">
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-500">
          {stars(r.rating)}<b className="text-slate-700">{r.buyer ?? "Pembeli"}</b>
          <span>{r.reviewed_at ? new Date(r.reviewed_at).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" }) : ""}</span>
          <span className="truncate">{r.shop?.shop_name}</span>{r.order_sn && <span className="font-mono">{r.order_sn}</span>}
        </div>
        <p className="truncate text-xs text-slate-400" title={r.product?.name}>{r.product?.name ?? `Produk ${r.item_id}`}</p>
        <p className="text-sm text-slate-800">{r.comment || <span className="italic text-slate-400">(tanpa komentar)</span>}</p>
        {!!r.media?.images?.length && <div className="flex gap-1.5">{r.media.images.slice(0, 5).map((u) => <a key={u} href={u} target="_blank" rel="noreferrer"><img src={u} alt="" className="h-14 w-14 rounded-lg object-cover" /></a>)}</div>}
        {r.replied_at ? (
          <p className="rounded-lg bg-slate-50 px-3 py-2 text-sm text-slate-600"><b className="mr-1 text-xs text-slate-500">Balasan Anda:</b>{r.reply}</p>
        ) : open ? (
          <div className="space-y-2">
            <textarea className="input min-h-20 py-2 text-sm" maxLength={500} value={text} onChange={(e) => setText(e.target.value)} autoFocus />
            <div className="flex flex-wrap items-center gap-2">
              <button onClick={send} disabled={busy || text.trim().length < 2} className="flex h-9 items-center gap-1.5 rounded-lg bg-[#ee4d2d] px-4 text-sm font-semibold text-white disabled:opacity-50">{busy ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}Kirim balasan</button>
              <button onClick={() => setOpen(false)} className="h-9 rounded-lg border border-slate-200 px-3 text-sm text-slate-600">Batal</button>
              <span className="ml-auto text-xs text-slate-400">{text.length}/500</span>
            </div>
          </div>
        ) : (
          <div className="flex items-center gap-3">
            <button onClick={() => { setText(fill(tplFor(settings, r.rating), r)); setOpen(true); }} className="flex items-center gap-1.5 text-sm font-semibold text-[#ee4d2d]"><MessageSquareReply size={15} />Balas</button>
            {r.reply_error && <span className="text-xs text-rose-600">Gagal: {r.reply_error}</span>}
          </div>
        )}
      </div>
    </div>
  );
}

function ReviewSettings({ value, onSaved }: { value: Settings; onSaved: (v: Settings) => void }) {
  const [v, setV] = useState(value);
  const [busy, setBusy] = useState(false);
  const save = async () => {
    setBusy(true);
    try { await api("/user-settings", { method: "PUT", json: { key: "reviews", value: v } }); onSaved(v); }
    catch (e) { showAlert(err(e, "Gagal menyimpan"), "Gagal"); } finally { setBusy(false); }
  };
  const tpl = (k: keyof Settings["templates"], label: string) => (
    <label className="block text-sm"><span className="mb-1 block font-medium text-slate-700">{label}</span>
      <textarea className="input min-h-20 py-2 text-sm" maxLength={500} value={v.templates[k]} onChange={(e) => setV({ ...v, templates: { ...v.templates, [k]: e.target.value } })} /></label>
  );
  return (
    <Panel className="space-y-4 p-5">
      <p className="text-sm text-slate-500">Template dipakai saat klik Balas dan untuk balas massal. Gunakan <code className="rounded bg-slate-100 px-1">{"{nama}"}</code> untuk nama pembeli dan <code className="rounded bg-slate-100 px-1">{"{produk}"}</code> untuk nama produk.</p>
      <div className="grid gap-4 lg:grid-cols-3">{tpl("good", "Bintang 4–5")}{tpl("mid", "Bintang 3")}{tpl("low", "Bintang 1–2")}</div>
      <div className="grid gap-4 border-t border-slate-100 pt-4 sm:grid-cols-3">
        <label className="flex items-start justify-between gap-3 text-sm"><span><b className="block text-navy">Balas otomatis</b><span className="text-xs text-slate-500">Ulasan baru yang bagus dibalas otomatis dengan template (dicek tiap jam).</span></span><Toggle checked={v.auto_reply} onChange={(x) => setV({ ...v, auto_reply: x })} /></label>
        <label className="block text-sm"><span className="mb-1 block text-xs font-medium text-slate-600">Balas otomatis untuk</span>
          <Select className="input h-9" value={v.auto_min_rating} onChange={(e) => setV({ ...v, auto_min_rating: Number(e.target.value) })}><option value={5}>Bintang 5 saja</option><option value={4}>Bintang 4–5</option></Select></label>
        <label className="block text-sm"><span className="mb-1 block text-xs font-medium text-slate-600">Peringatan ulasan buruk</span>
          <Select className="input h-9" value={v.alert_max_rating} onChange={(e) => setV({ ...v, alert_max_rating: Number(e.target.value) })}><option value={3}>Bintang ≤3</option><option value={2}>Bintang ≤2</option><option value={1}>Bintang 1</option><option value={0}>Matikan</option></Select></label>
      </div>
      <div className="flex justify-end"><button onClick={save} disabled={busy} className="flex h-9 items-center gap-1.5 rounded-lg bg-brand-600 px-4 text-sm font-semibold text-white disabled:opacity-50">{busy && <Loader2 size={14} className="animate-spin" />}Simpan</button></div>
    </Panel>
  );
}
