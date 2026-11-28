"use client";
import { Layers, Loader2, Plus, Tag, Trash2 } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { askConfirm, showAlert } from "@/components/Dialogs";
import { Dialog } from "@/components/kit";
import { api, ApiError, rupiah } from "@/lib/api";

type Variations = {
  tiers: { name: string; options: { name: string; image_id: string | null; image: string | null }[] }[];
  models: { model_id: number; tier_index: number[]; name: string; sku: string | null; price: number; stock: number; has_promotion: boolean }[];
};
type Promo = { type: string; price: number | null; stage: string | null; starts_at: number | null; ends_at: number | null; model_id: number | null };

const errMsg = (e: unknown, d: string) => (e instanceof ApiError ? Object.values(e.errors ?? {}).flat()[0] ?? e.message : d);
const date = (t: number | null) => (t ? new Date(t * 1000).toLocaleString("id-ID", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" }) : "-");

/** Variasi produk Shopee: see variants, add an option (e.g. a new colour) with price & stock, delete a variant. */
export function VariationsDialog({ shopId, itemId, name, onClose, onChanged }: { shopId: number; itemId: number; name: string; onClose: () => void; onChanged: () => void }) {
  const [v, setV] = useState<Variations | null>(null);
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState("");
  const [add, setAdd] = useState({ tier: 0, name: "", price: "", stock: "", sku_prefix: "" });
  const load = useCallback(() => api<Variations>(`/marketplace/listings/variations/${shopId}/${itemId}`).then(setV).catch((e) => setErr(errMsg(e, "Gagal mengambil variasi dari Shopee"))), [shopId, itemId]);
  useEffect(() => { load(); }, [load]);

  const addOption = async () => {
    setBusy("add");
    try {
      const r = await api<{ created: number; variations: Variations }>(`/marketplace/listings/variations/${shopId}/${itemId}/option`, {
        method: "POST", json: { tier: add.tier, name: add.name.trim(), price: Number(add.price), stock: Number(add.stock || 0), sku_prefix: add.sku_prefix.trim() || null },
      });
      setV(r.variations); setAdd({ ...add, name: "" }); onChanged();
      showAlert(`${r.created} variasi baru ditambahkan di Shopee.`, "Variasi ditambahkan");
    } catch (e) { showAlert(errMsg(e, "Gagal menambah variasi"), "Gagal"); } finally { setBusy(""); }
  };
  const remove = async (m: Variations["models"][number]) => {
    if (!(await askConfirm(`Hapus variasi "${m.name}" dari produk ini di Shopee? Tidak bisa dibatalkan.`, { title: "Hapus Variasi", confirmLabel: "Hapus", danger: true }))) return;
    setBusy(`del-${m.model_id}`);
    try {
      await api(`/marketplace/listings/variations/${shopId}/${itemId}/models/${m.model_id}`, { method: "DELETE" });
      setV((cur) => cur && { ...cur, models: cur.models.filter((x) => x.model_id !== m.model_id) }); onChanged();
    } catch (e) { showAlert(errMsg(e, "Gagal menghapus variasi"), "Gagal"); } finally { setBusy(""); }
  };

  return (
    <Dialog title="Variasi Produk" icon={Layers} onClose={onClose} width="max-w-2xl">
      <p className="mb-3 truncate text-sm font-medium text-navy" title={name}>{name}</p>
      {err ? <p className="rounded-lg bg-rose-50 p-3 text-sm text-rose-700">{err}</p> : !v ? (
        <p className="flex items-center gap-2 py-6 text-sm text-slate-500"><Loader2 size={15} className="animate-spin" />Mengambil variasi dari Shopee…</p>
      ) : !v.tiers.length ? (
        <p className="rounded-lg bg-slate-50 p-3 text-sm text-slate-600">Produk ini tanpa variasi. Tambahkan variasi pertama lewat Seller Centre, setelah itu pilihan berikutnya bisa ditambah dari sini.</p>
      ) : (
        <div className="space-y-4 text-sm">
          <div className="flex flex-wrap gap-2">{v.tiers.map((t) => <span key={t.name} className="rounded-lg bg-slate-50 px-3 py-1.5 text-xs"><b className="text-navy">{t.name}:</b> {t.options.map((o) => o.name).join(", ")}</span>)}</div>
          <div className="max-h-72 overflow-y-auto rounded-xl border border-slate-100">
            <table className="w-full text-xs">
              <thead className="sticky top-0 bg-slate-50 text-left text-slate-500"><tr><th className="px-3 py-2">Variasi</th><th>SKU</th><th className="text-right">Harga</th><th className="text-right">Stok</th><th className="px-3 text-right" /></tr></thead>
              <tbody className="divide-y divide-slate-100">{v.models.map((m) => (
                <tr key={m.model_id}>
                  <td className="px-3 py-2 font-medium text-navy">{m.name}{m.has_promotion && <span className="ml-1.5 rounded bg-amber-100 px-1 py-0.5 text-[10px] font-semibold text-amber-700">Promo</span>}</td>
                  <td className="font-mono text-slate-500">{m.sku ?? "-"}</td><td className="text-right">{rupiah(m.price)}</td><td className="text-right">{m.stock}</td>
                  <td className="px-3 text-right"><button onClick={() => remove(m)} disabled={!!busy || v.models.length <= 1} title={v.models.length <= 1 ? "Variasi terakhir tidak bisa dihapus" : "Hapus variasi"} className="text-slate-400 hover:text-rose-600 disabled:opacity-30">{busy === `del-${m.model_id}` ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />}</button></td>
                </tr>
              ))}</tbody>
            </table>
          </div>
          <div className="space-y-2 rounded-xl border border-slate-200 p-3">
            <p className="flex items-center gap-1.5 text-xs font-semibold text-navy"><Plus size={14} />Tambah pilihan variasi</p>
            <div className="grid gap-2 sm:grid-cols-[140px_1fr]">
              <select className="input h-9 text-xs" value={add.tier} onChange={(e) => setAdd({ ...add, tier: Number(e.target.value) })}>{v.tiers.map((t, i) => <option key={t.name} value={i}>{t.name}</option>)}</select>
              <input className="input h-9 text-xs" placeholder={`Nama pilihan baru, mis. ${v.tiers[add.tier]?.name === "Ukuran" ? "XL" : "Navy"}`} maxLength={30} value={add.name} onChange={(e) => setAdd({ ...add, name: e.target.value })} />
            </div>
            <div className="grid gap-2 sm:grid-cols-3">
              <input className="input h-9 text-xs" inputMode="numeric" placeholder="Harga" value={add.price} onChange={(e) => setAdd({ ...add, price: e.target.value.replace(/\D/g, "") })} />
              <input className="input h-9 text-xs" inputMode="numeric" placeholder="Stok" value={add.stock} onChange={(e) => setAdd({ ...add, stock: e.target.value.replace(/\D/g, "") })} />
              <input className="input h-9 text-xs" placeholder="Awalan SKU (opsional)" value={add.sku_prefix} onChange={(e) => setAdd({ ...add, sku_prefix: e.target.value })} />
            </div>
            {v.tiers.length > 1 && <p className="text-[11px] text-slate-500">Dibuat {v.tiers[1 - add.tier]?.options.length ?? 0} variasi baru (satu untuk setiap {v.tiers[1 - add.tier]?.name}), semuanya dengan harga & stok di atas. Ubah per variasi setelahnya bila perlu.</p>}
            <div className="flex justify-end"><button onClick={addOption} disabled={!!busy || !add.name.trim() || Number(add.price) < 100} className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-[#ee4d2d] px-4 text-xs font-semibold text-white disabled:opacity-50">{busy === "add" && <Loader2 size={14} className="animate-spin" />}Tambah ke Shopee</button></div>
          </div>
        </div>
      )}
    </Dialog>
  );
}

/** Promosi yang sedang/akan diikuti produk (kampanye Shopee, flash sale, diskon), langsung dari Shopee. */
export function ItemPromotionsDialog({ shopId, itemId, name, onClose }: { shopId: number; itemId: number; name: string; onClose: () => void }) {
  const [p, setP] = useState<Promo[] | null>(null);
  const [err, setErr] = useState("");
  useEffect(() => {
    api<{ items: Record<string, Promo[]> }>(`/marketplace/listings/item-promotions/${shopId}?item_ids=${itemId}`).then((r) => setP(r.items[String(itemId)] ?? []))
      .catch((e) => setErr(errMsg(e, "Gagal mengambil promo dari Shopee")));
  }, [shopId, itemId]);
  return (
    <Dialog title="Promo Produk" icon={Tag} onClose={onClose} width="max-w-lg">
      <p className="mb-3 truncate text-sm font-medium text-navy" title={name}>{name}</p>
      {err ? <p className="rounded-lg bg-rose-50 p-3 text-sm text-rose-700">{err}</p> : !p ? (
        <p className="flex items-center gap-2 py-6 text-sm text-slate-500"><Loader2 size={15} className="animate-spin" />Mengecek promo di Shopee…</p>
      ) : !p.length ? <p className="rounded-lg bg-slate-50 p-3 text-sm text-slate-600">Produk ini tidak sedang/akan ikut promo apa pun.</p> : (
        <div className="space-y-2">{p.map((x, i) => (
          <div key={i} className="flex items-start justify-between gap-3 rounded-xl border border-slate-100 p-3 text-xs">
            <div><b className="text-navy">{x.type || "Promo"}</b> <span className={`ml-1 rounded px-1.5 py-0.5 font-semibold ${x.stage === "ongoing" ? "bg-emerald-100 text-emerald-700" : "bg-sky-100 text-sky-700"}`}>{x.stage === "ongoing" ? "Berjalan" : "Akan datang"}</span>
              <p className="mt-1 text-slate-500">{date(x.starts_at)} – {date(x.ends_at)}{x.model_id ? ` · variasi ${x.model_id}` : ""}</p></div>
            {x.price != null && <b className="whitespace-nowrap text-[#ee4d2d]">{rupiah(x.price)}</b>}
          </div>
        ))}<p className="text-[11px] text-slate-500">Ubah harga saat promo berjalan bisa ditolak Shopee atau membatalkan harga promo.</p></div>
      )}
    </Dialog>
  );
}
