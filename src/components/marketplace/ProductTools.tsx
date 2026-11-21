"use client";
import { ChevronDown, Eye, Heart, Loader2, Rocket, ShoppingBag, X } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { showAlert } from "@/components/Dialogs";
import { Panel, Toggle } from "@/components/kit";
import { Modal } from "@/components/ui";
import { api, ApiError, rupiah } from "@/lib/api";

export type ItemStat = { views: number; likes: number; sales: number; rating: number | null; comments: number; views_7d: number | null; sales_7d: number | null; days: number; date: string };
type BoostShop = {
  id: number; shop_name: string; enabled: boolean; items: number[]; last_at: string | null; last_error: string | null; boosted: number[];
  products?: { item_id: number; name: string; image: string | null; status: string | null }[];
};
export type PriceRow = { id: number; name: string; model_name: string | null; price: number };

const num = (n: number) => n.toLocaleString("id-ID");
const fail = (e: unknown, msg: string) => showAlert(e instanceof ApiError ? e.message : msg, "Gagal");

/** One line under the product name: views, likes, sold (+ the last 7 days once two snapshots exist). */
export function StatLine({ s }: { s?: ItemStat }) {
  if (!s) return <p className="mt-1 text-[11px] text-slate-400">Statistik belum ada, klik Perbarui Statistik.</p>;
  return (
    <p className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-[11px] text-slate-500" title={`Data Shopee per ${s.date}`}>
      <span className="flex items-center gap-1"><Eye size={11} />{num(s.views)} dilihat{s.views_7d !== null && <b className="text-sky-600">+{num(s.views_7d)}</b>}</span>
      <span className="flex items-center gap-1"><Heart size={11} />{num(s.likes)}</span>
      <span className="flex items-center gap-1"><ShoppingBag size={11} />{num(s.sales)} terjual{s.sales_7d !== null && <b className="text-emerald-600">+{num(s.sales_7d)}</b>}</span>
      {s.views_7d !== null && <span className="text-slate-400">({s.days} hari terakhir)</span>}
      {s.views_7d !== null && s.views_7d >= 100 && s.sales_7d === 0 && <span className="rounded bg-amber-50 px-1.5 text-amber-700">banyak dilihat, belum laku</span>}
    </p>
  );
}

/** Naikkan Produk otomatis: per shop on/off and its rotation list. Pesanin refills the 5 boost slots every 10 minutes. */
export function BoostPanel({ reloadKey, onChanged }: { reloadKey: number; onChanged?: (boosted: Set<string>) => void }) {
  const [shops, setShops] = useState<BoostShop[] | null>(null);
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(0);
  const load = useCallback(() => api<{ shops: BoostShop[] }>("/marketplace/listings/boost").then((r) => {
    setShops(r.shops);
    onChanged?.(new Set(r.shops.flatMap((s) => s.items.map((i) => `${s.id}:${i}`))));
  }).catch(() => setShops([])), [onChanged]);
  useEffect(() => { load(); }, [load, reloadKey]);

  const update = async (s: BoostShop, body: { enabled?: boolean; items?: number[] }) => {
    setBusy(s.id);
    try { await api(`/marketplace/listings/boost/${s.id}`, { method: "PUT", json: body }); await load(); }
    catch (e) { fail(e, "Gagal menyimpan"); } finally { setBusy(0); }
  };
  const run = async (s: BoostShop) => {
    setBusy(s.id);
    try { await api(`/marketplace/listings/boost/${s.id}/run`, { method: "POST" }); await load(); }
    catch (e) { fail(e, "Gagal menaikkan produk"); } finally { setBusy(0); }
  };
  if (!shops?.length) return null;
  const on = shops.filter((s) => s.enabled && s.items.length).length;
  const total = shops.reduce((n, s) => n + s.items.length, 0);

  return (
    <Panel className="overflow-hidden p-0">
      <button onClick={() => setOpen(!open)} className="flex w-full items-center gap-3 px-5 py-3 text-left">
        <span className={`flex h-9 w-9 items-center justify-center rounded-lg ${on ? "bg-emerald-50 text-emerald-600" : "bg-orange-50 text-[#ee4d2d]"}`}><Rocket size={18} /></span>
        <span className="flex-1">
          <b className="block text-sm text-navy">Naikkan Produk Otomatis</b>
          <span className="block text-xs text-slate-500">{on ? `Aktif di ${on} toko · ${total} produk bergiliran, 5 produk dinaikkan tiap 4 jam` : "Shopee mengizinkan 5 produk dinaikkan tiap 4 jam. Pilih produk, Pesanin menaikkannya bergiliran 24 jam."}</span>
        </span>
        <ChevronDown size={16} className={`text-slate-400 transition ${open ? "rotate-180" : ""}`} />
      </button>
      {open && (
        <div className="space-y-3 border-t border-slate-100 px-5 py-4">
          {shops.map((s) => (
            <div key={s.id} className="rounded-xl border border-slate-200 p-3">
              <div className="flex flex-wrap items-center gap-3">
                <b className="flex-1 text-sm text-navy">{s.shop_name}</b>
                {busy === s.id && <Loader2 size={15} className="animate-spin text-slate-400" />}
                <button onClick={() => run(s)} disabled={!!busy || !s.items.length} className="h-8 rounded-lg border border-slate-200 px-3 text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50">Naikkan sekarang</button>
                <Toggle checked={s.enabled} onChange={(v) => update(s, { enabled: v })} />
              </div>
              <p className="mt-1 text-xs text-slate-500">
                {s.last_at ? `Terakhir dijalankan ${new Date(s.last_at).toLocaleString("id-ID", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })} · ${s.boosted.length} sedang naik` : "Belum pernah dijalankan"}
              </p>
              {s.last_error && <p className="mt-1 rounded bg-rose-50 px-2 py-1 text-xs text-rose-700">{s.last_error}</p>}
              {!s.products?.length ? <p className="mt-2 text-xs text-slate-400">Belum ada produk. Centang produk di daftar bawah lalu klik <b>Naikkan Otomatis</b>.</p> : (
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {s.products.map((p) => (
                    <span key={p.item_id} className={`flex max-w-[260px] items-center gap-1.5 rounded-full py-0.5 pl-1 pr-2 text-xs ring-1 ${s.boosted.includes(p.item_id) ? "bg-emerald-50 text-emerald-700 ring-emerald-200" : p.status && p.status !== "NORMAL" ? "bg-slate-50 text-slate-400 ring-slate-200" : "bg-white text-slate-600 ring-slate-200"}`}
                      title={s.boosted.includes(p.item_id) ? "Sedang dinaikkan" : p.status !== "NORMAL" ? "Produk tidak live, dilewati" : p.name}>
                      {p.image ? <img src={p.image} alt="" className="h-5 w-5 rounded-full object-cover" /> : <span className="h-5 w-5 rounded-full bg-slate-100" />}
                      <span className="truncate">{p.name}</span>
                      <button onClick={() => update(s, { items: s.items.filter((i) => i !== p.item_id) })} className="text-slate-400 hover:text-rose-600" title="Hapus dari daftar"><X size={12} /></button>
                    </span>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </Panel>
  );
}

/** Add products (shop:item keys) to their shops' boost rotation. */
export async function addToBoost(keys: string[]) {
  const r = await api<{ shops: BoostShop[] }>("/marketplace/listings/boost");
  const byShop = keys.reduce<Record<string, number[]>>((a, k) => { const [s, i] = k.split(":"); (a[s] ??= []).push(Number(i)); return a; }, {});
  for (const [sid, ids] of Object.entries(byShop)) {
    const s = r.shops.find((x) => String(x.id) === sid);
    if (!s) continue;
    await api(`/marketplace/listings/boost/${sid}`, { method: "PUT", json: { items: [...new Set([...s.items, ...ids])], enabled: true } });
  }
}

/** Ubah harga massal: set / naik-turun % / naik-turun Rp for the selected variations, then fine-tune each one. */
export function PriceDialog({ rows, onClose, onSaved }: { rows: PriceRow[]; onClose: () => void; onSaved: (prices: Record<number, number>, msg: string) => void }) {
  const [mode, setMode] = useState<"set" | "pct" | "amount">("pct");
  const [val, setVal] = useState("");
  const [prices, setPrices] = useState<Record<number, string>>(() => Object.fromEntries(rows.map((r) => [r.id, String(r.price)])));
  const [busy, setBusy] = useState(false);
  const [errors, setErrors] = useState<Record<number, string>>({});
  const apply = () => {
    const v = Number(val.replace(/[^\d.-]/g, ""));
    if (!val || Number.isNaN(v)) return;
    setPrices(Object.fromEntries(rows.map((r) => [r.id, String(Math.max(100, Math.round(
      mode === "set" ? v : mode === "pct" ? r.price * (1 + v / 100) : r.price + v,
    )))])));
  };
  const changed = rows.filter((r) => Number(prices[r.id]) !== r.price && Number(prices[r.id]) >= 100);
  const save = async () => {
    setBusy(true); setErrors({});
    try {
      const res = await api<{ updated: number; failed: Record<number, string> }>("/marketplace/listings/prices", { method: "POST", json: { prices: changed.map((r) => ({ id: r.id, price: Number(prices[r.id]) })) } });
      const ok = Object.fromEntries(changed.filter((r) => !res.failed[r.id]).map((r) => [r.id, Number(prices[r.id])]));
      if (Object.keys(res.failed).length) { setErrors(res.failed); onSaved(ok, ""); }
      else onSaved(ok, `Harga ${res.updated} variasi diperbarui di Shopee.`);
    } catch (e) { fail(e, "Gagal mengubah harga"); } finally { setBusy(false); }
  };
  return (
    <Modal open onClose={onClose} title={`Ubah Harga (${rows.length} variasi)`} wide>
      <div className="space-y-3">
        <div className="flex flex-wrap items-end gap-2 rounded-xl bg-slate-50 p-3">
          <label className="text-xs"><span className="mb-1 block font-medium text-slate-600">Cara ubah</span>
            <select className="input h-9 w-44" value={mode} onChange={(e) => setMode(e.target.value as typeof mode)}>
              <option value="pct">Naik/turun persen (%)</option><option value="amount">Naik/turun nominal (Rp)</option><option value="set">Samakan harga (Rp)</option>
            </select></label>
          <label className="text-xs"><span className="mb-1 block font-medium text-slate-600">{mode === "pct" ? "Persen (mis. 10 atau -5)" : mode === "amount" ? "Nominal (mis. 2000 atau -1000)" : "Harga baru"}</span>
            <input className="input h-9 w-44" value={val} onChange={(e) => setVal(e.target.value)} inputMode="numeric" /></label>
          <button onClick={apply} className="h-9 rounded-lg border border-[#ee4d2d] px-4 text-sm font-semibold text-[#ee4d2d]">Terapkan ke semua</button>
        </div>
        <div className="max-h-[50vh] divide-y divide-slate-100 overflow-auto rounded-xl border border-slate-200">
          {rows.map((r) => {
            const p = Number(prices[r.id]);
            return (
              <div key={r.id} className="flex items-center gap-3 px-3 py-2 text-sm">
                <span className="min-w-0 flex-1"><span className="block truncate text-slate-800">{r.name}</span>{r.model_name && <span className="block truncate text-xs text-slate-500">{r.model_name}</span>}
                  {errors[r.id] && <span className="block text-xs text-rose-600">{errors[r.id]}</span>}</span>
                <span className="w-28 text-right text-xs text-slate-400 line-through decoration-slate-300">{p !== r.price ? rupiah(r.price) : ""}</span>
                <input className={`input h-9 w-36 text-right ${p !== r.price ? "border-[#ee4d2d] font-semibold" : ""}`} value={prices[r.id]} inputMode="numeric"
                  onChange={(e) => setPrices({ ...prices, [r.id]: e.target.value.replace(/\D/g, "") })} />
              </div>
            );
          })}
        </div>
        <div className="flex items-center justify-between gap-3">
          <p className="text-xs text-slate-500">{changed.length} variasi akan diubah langsung di Shopee. Produk yang sedang ikut promo/flash sale bisa ditolak Shopee.</p>
          <button onClick={save} disabled={busy || !changed.length} className="flex h-10 items-center gap-2 rounded-lg bg-[#ee4d2d] px-5 text-sm font-semibold text-white disabled:opacity-50">{busy && <Loader2 size={15} className="animate-spin" />}Simpan ke Shopee</button>
        </div>
      </div>
    </Modal>
  );
}

/** Ubah judul & deskripsi of one product, read live from Shopee. */
export function TextDialog({ shopId, itemId, onClose, onSaved }: { shopId: number; itemId: number; onClose: () => void; onSaved: (name: string) => void }) {
  const [d, setD] = useState<{ name: string; description: string; extended: boolean; has_images: boolean } | null>(null);
  const [busy, setBusy] = useState(false);
  const close = useRef(onClose);
  close.current = onClose;
  useEffect(() => {
    api<typeof d>(`/marketplace/listings/text/${shopId}/${itemId}`).then(setD).catch((e) => { fail(e, "Gagal mengambil data produk"); close.current(); });
  }, [shopId, itemId]);
  const save = async () => {
    if (!d) return;
    setBusy(true);
    try {
      await api(`/marketplace/listings/text/${shopId}/${itemId}`, { method: "PUT", json: { name: d.name, description: d.extended ? null : d.description } });
      onSaved(d.name);
    } catch (e) { fail(e, "Gagal menyimpan"); } finally { setBusy(false); }
  };
  return (
    <Modal open onClose={onClose} title="Ubah Judul & Deskripsi" wide>
      {!d ? <p className="flex items-center gap-2 py-6 text-sm text-slate-500"><Loader2 size={15} className="animate-spin" />Mengambil data dari Shopee…</p> : (
        <div className="space-y-3">
          <label className="block text-sm"><span className="mb-1 flex justify-between font-medium text-slate-700">Judul produk<span className={`text-xs ${d.name.length > 255 ? "text-rose-600" : "text-slate-400"}`}>{d.name.length}/255</span></span>
            <input className="input h-10 w-full" value={d.name} onChange={(e) => setD({ ...d, name: e.target.value })} /></label>
          <label className="block text-sm"><span className="mb-1 flex justify-between font-medium text-slate-700">Deskripsi<span className="text-xs text-slate-400">{d.description.length}/5000</span></span>
            <textarea className="input min-h-[240px] w-full py-2" value={d.description} disabled={d.extended} onChange={(e) => setD({ ...d, description: e.target.value })} /></label>
          {d.extended && <p className="rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-800">Deskripsi produk ini berformat{d.has_images ? " dan berisi gambar" : ""}, jadi hanya judul yang diubah dari sini. Ubah deskripsinya di Seller Centre.</p>}
          <div className="flex justify-end">
            <button onClick={save} disabled={busy || d.name.trim().length < 10} className="flex h-10 items-center gap-2 rounded-lg bg-[#ee4d2d] px-5 text-sm font-semibold text-white disabled:opacity-50">{busy && <Loader2 size={15} className="animate-spin" />}Simpan ke Shopee</button>
          </div>
        </div>
      )}
    </Modal>
  );
}


type SkuRow = { id: number; shop_id: number; shop_name: string | null; item_id: number; model_id: number; name: string; model_name: string | null; image: string | null; current: string | null; sku: string };

/**
 * Buat SKU: suggest SKUs (initials of the name + variation, or prefix + number), edit them, and save to Shopee.
 * Same product + variation in several shops gets the same SKU so Stok Master can merge them.
 */
export function SkuDialog({ keys, onClose, onSaved }: { keys?: string[]; onClose: () => void; onSaved: (msg: string) => void }) {
  const [mode, setMode] = useState<"abbr" | "number">("abbr");
  const [prefix, setPrefix] = useState("");
  const [rows, setRows] = useState<SkuRow[] | null>(null);
  const [busy, setBusy] = useState(false);
  const [errors, setErrors] = useState<Record<number, string>>({});
  const [done, setDone] = useState("");
  const scope = keys?.length ? "selected" : "empty";
  const preview = useCallback(() => {
    setRows(null); setErrors({});
    api<{ rows: SkuRow[] }>("/marketplace/listings/sku/preview", { method: "POST", json: { mode, prefix, scope, keys } }).then((r) => setRows(r.rows)).catch((e) => { fail(e, "Gagal membuat usulan SKU"); setRows([]); });
  }, [mode, prefix, scope, keys]);
  useEffect(() => { const t = setTimeout(preview, 300); return () => clearTimeout(t); }, [preview]);

  const set = (id: number, sku: string) => setRows((r) => r && r.map((x) => (x.id === id ? { ...x, sku: sku.toUpperCase().replace(/\s+/g, "-") } : x)));
  // Same SKU on different listings is allowed (e.g. the same item listed twice): it only means they share one stock.
  const owner = new Map<string, string>();
  const dupes = new Set<string>();
  (rows ?? []).forEach((r) => { const who = `${r.name}|${r.model_name ?? ""}`.toLowerCase(); const prev = owner.get(r.sku); if (prev && prev !== who) dupes.add(r.sku); else owner.set(r.sku, who); });
  const changed = (rows ?? []).filter((r) => r.sku && r.sku !== (r.current ?? ""));
  const save = async () => {
    setBusy(true); setErrors({});
    try {
      const r = await api<{ updated: number; failed: Record<number, string> }>("/marketplace/listings/sku/save", { method: "POST", json: { rows: changed.map((x) => ({ id: x.id, sku: x.sku })) } });
      if (Object.keys(r.failed).length) setErrors(r.failed);
      setDone(`${r.updated} SKU tersimpan di Shopee${Object.keys(r.failed).length ? `, ${Object.keys(r.failed).length} gagal (lihat merah)` : ""}.`);
      if (!Object.keys(r.failed).length) onSaved(`${r.updated} SKU tersimpan di Shopee.`);
    } catch (e) { fail(e, "Gagal menyimpan SKU"); } finally { setBusy(false); }
  };

  return (
    <Modal open onClose={onClose} title={scope === "selected" ? "Ubah SKU Produk Terpilih" : "Buat SKU Otomatis"} wide>
      <div className="space-y-3">
        <div className="flex flex-wrap items-end gap-2 rounded-xl bg-slate-50 p-3 text-xs">
          <label><span className="mb-1 block font-medium text-slate-600">Format SKU</span>
            <select className="input h-9 w-64" value={mode} onChange={(e) => setMode(e.target.value as typeof mode)}>
              <option value="abbr">Singkatan nama + variasi (CTKA-HIT-OLD)</option>
              <option value="number">Awalan + nomor urut (PSN-0001)</option>
            </select></label>
          <label><span className="mb-1 block font-medium text-slate-600">Awalan {mode === "abbr" ? "(opsional)" : ""}</span>
            <input className="input h-9 w-36 uppercase" maxLength={12} placeholder={mode === "abbr" ? "mis. MST" : "SKU"} value={prefix} onChange={(e) => setPrefix(e.target.value.replace(/[^A-Za-z0-9-]/g, ""))} /></label>
          <p className="ml-auto max-w-xs text-[11px] text-slate-500">{scope === "selected" ? `${keys?.length} produk terpilih.` : "Semua variasi yang SKU-nya masih kosong (maks. 500)."} Produk & variasi yang sama di beberapa toko mendapat SKU yang sama.</p>
        </div>
        {done && <p className={`rounded-lg p-2.5 text-sm ${Object.keys(errors).length ? "bg-amber-50 text-amber-800" : "bg-emerald-50 text-emerald-700"}`}>{done}</p>}
        <div className="max-h-[50vh] overflow-auto rounded-xl border border-slate-200">
          {rows === null ? <p className="flex items-center gap-2 p-4 text-sm text-slate-400"><Loader2 size={14} className="animate-spin" />Menyusun usulan SKU…</p>
            : !rows.length ? <p className="p-6 text-center text-sm text-slate-500">{scope === "empty" ? "Semua produk sudah punya SKU." : "Tidak ada produk."}</p> : (
              <table className="w-full text-sm">
                <thead className="sticky top-0 bg-slate-50 text-left text-xs text-slate-500"><tr><th className="px-3 py-2">Produk / Variasi</th><th className="px-3 py-2">Toko</th><th className="px-3 py-2">SKU sekarang</th><th className="px-3 py-2">SKU baru</th></tr></thead>
                <tbody>
                  {rows.map((r) => (
                    <tr key={r.id} className="border-t border-slate-100">
                      <td className="max-w-[300px] px-3 py-2"><span className="block truncate text-slate-800" title={r.name}>{r.name}</span>{r.model_name && <span className="block truncate text-xs text-slate-500">{r.model_name}</span>}
                        {errors[r.id] && <span className="block text-xs text-rose-600">{errors[r.id]}</span>}</td>
                      <td className="px-3 py-2 text-xs text-slate-500">{r.shop_name}</td>
                      <td className="px-3 py-2 font-mono text-xs text-slate-400">{r.current || "-"}</td>
                      <td className="px-3 py-2"><input className={`input h-8 w-48 font-mono text-xs ${dupes.has(r.sku) ? "border-amber-400 bg-amber-50/50" : r.sku !== (r.current ?? "") ? "border-[#ee4d2d]" : ""}`} value={r.sku} maxLength={100} onChange={(e) => set(r.id, e.target.value)} />
                        {dupes.has(r.sku) && <span className="block text-[11px] text-amber-700">sama dengan produk lain · stok digabung</span>}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
        </div>
        <div className="flex items-center justify-between gap-3">
          <p className="text-xs text-slate-500">{changed.length} SKU akan disimpan ke Shopee (SKU induk & kode variasi). SKU tidak terlihat pembeli.
            {dupes.size > 0 && <span className="block text-amber-700">{dupes.size} SKU dipakai lebih dari satu produk: di Stok Master produk-produk itu akan memakai satu stok yang sama. Ubah kalau sebenarnya barangnya berbeda.</span>}</p>
          <button onClick={save} disabled={busy || !changed.length} className="flex h-10 items-center gap-2 rounded-lg bg-[#ee4d2d] px-5 text-sm font-semibold text-white disabled:opacity-50">{busy && <Loader2 size={15} className="animate-spin" />}Simpan ke Shopee</button>
        </div>
      </div>
    </Modal>
  );
}
