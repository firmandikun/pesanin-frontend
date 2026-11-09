"use client";
import { Megaphone, Plus, Trash2 } from "lucide-react";
import { useEffect, useState } from "react";
import { DatePicker } from "@/components/DatePicker";
import { Dialog, DialogActions, FieldLabel, Pager, PageHead, Panel, useResource } from "@/components/kit";
import { Select } from "@/components/Select";
import { api, ApiError, isoDate, rupiah } from "@/lib/api";
import { askConfirm } from "@/components/Dialogs";

type Spend = { id: number; platform: string; spent_on: string; amount: number; campaign: string | null; note: string | null; synced: boolean; marketplace_shop_id: number | null; product_id: number | null };

const PLATFORM: Record<string, [string, string]> = {
  meta: ["Meta Ads (FB/IG)", "bg-blue-100 text-blue-700"], tiktok: ["TikTok Ads", "bg-slate-900 text-white"], google: ["Google Ads", "bg-emerald-100 text-emerald-700"],
  shopee_ads: ["Shopee Ads", "bg-[#fff1ee] text-[#c63c20]"], other: ["Lainnya", "bg-slate-100 text-slate-600"],
};

export default function Ads() {
  const [platform, setPlatform] = useState("");
  const res = useResource<Spend>("ad-spends", platform ? { platform } : {});
  const [open, setOpen] = useState(false);
  const [shops, setShops] = useState<{ id: number; shop_name: string }[]>([]);
  const [products, setProducts] = useState<{ id: number; name: string }[]>([]);
  const empty = { platform: "meta", spent_on: isoDate(new Date()), amount: "", campaign: "", marketplace_shop_id: "", product_id: "", note: "" };
  const [f, setF] = useState(empty);
  const [err, setErr] = useState<Record<string, string[]>>({});
  const [saving, setSaving] = useState(false);
  useEffect(() => {
    res.setPerPage(20);
    api("/marketplace/shops").then((x) => setShops(x.shops)).catch(() => {});
    api("/products?per_page=100").then((x) => setProducts(x.products.data));
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  async function save(e: React.FormEvent) {
    e.preventDefault(); setSaving(true); setErr({});
    try {
      await res.create({ ...f, amount: Number(f.amount), marketplace_shop_id: f.marketplace_shop_id || null, product_id: f.product_id || null, campaign: f.campaign || null, note: f.note || null });
      setOpen(false); setF(empty);
    } catch (e2) { if (e2 instanceof ApiError) setErr(e2.errors); } finally { setSaving(false); }
  }

  return (
    <div className="space-y-5">
      <PageHead title="Biaya Iklan" tutorial={false} crumbs={[["Laporan"], ["Biaya Iklan"]]}>
        <button onClick={() => setOpen(true)} className="flex h-10 items-center gap-2 rounded-lg bg-brand-600 px-4 text-sm font-semibold text-white hover:bg-brand-700"><Plus size={16} />Catat biaya iklan</button>
      </PageHead>
      <p className="rounded-xl bg-white p-3 text-sm text-slate-600">Biaya Shopee Ads diambil otomatis saat toko disinkronkan (jika app Shopee punya izin Ads). Biaya Meta, TikTok, dan Google dicatat di sini per hari dan dipakai untuk menghitung laba bersih & ROAS.</p>

      <Panel>
        <div className="flex flex-wrap gap-2 p-4">
          {[["", "Semua"], ...Object.entries(PLATFORM).map(([k, [l]]) => [k, l])].map(([k, l]) => (
            <button key={k} onClick={() => setPlatform(k)} className={`h-9 rounded-lg px-3.5 text-sm font-medium ${platform === k ? "bg-navy text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"}`}>{l}</button>
          ))}
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[720px] text-sm">
            <thead className="text-left text-xs uppercase tracking-wide text-slate-500"><tr>{["Tanggal", "Platform", "Kampanye", "Toko / Produk", "Biaya", ""].map((h) => <th key={h} className="px-4 py-3 font-semibold">{h}</th>)}</tr></thead>
            <tbody className="divide-y divide-slate-100">
              {res.rows.map((a) => (
                <tr key={a.id}>
                  <td className="px-4 py-3 text-slate-600">{new Date(a.spent_on).toLocaleDateString("id-ID", { day: "2-digit", month: "short", year: "numeric" })}</td>
                  <td className="px-4 py-3"><span className={`rounded px-2 py-0.5 text-xs font-semibold ${PLATFORM[a.platform]?.[1]}`}>{PLATFORM[a.platform]?.[0] ?? a.platform}</span>{a.synced && <span className="ml-1.5 text-[11px] text-slate-400">otomatis</span>}</td>
                  <td className="px-4 py-3 text-navy">{a.campaign ?? "-"}{a.note && <span className="block text-xs text-slate-400">{a.note}</span>}</td>
                  <td className="px-4 py-3 text-slate-600">{shops.find((s) => s.id === a.marketplace_shop_id)?.shop_name ?? products.find((p) => p.id === a.product_id)?.name ?? "-"}</td>
                  <td className="px-4 py-3 font-semibold text-navy">{rupiah(a.amount)}</td>
                  <td className="px-4 py-3 text-right">{!a.synced && <button onClick={async () => (await askConfirm("Hapus catatan biaya ini?")) && res.remove(a.id)} className="text-slate-400 hover:text-rose-600" aria-label="Hapus"><Trash2 size={16} /></button>}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {res.data && res.rows.length === 0 && <p className="py-14 text-center text-sm text-slate-500">Belum ada catatan biaya iklan.</p>}
        </div>
        <Pager page={res.page} last={res.data?.last_page ?? 1} onPage={res.setPage} total={res.data?.total} perPage={res.perPage} onPerPage={res.setPerPage} />
      </Panel>

      {open && (
        <Dialog title="Catat biaya iklan" icon={Megaphone} onClose={() => setOpen(false)}>
          <form onSubmit={save} className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div><FieldLabel>Platform</FieldLabel><Select className="input" value={f.platform} onChange={(e) => setF({ ...f, platform: e.target.value })}>{Object.entries(PLATFORM).map(([k, [l]]) => <option key={k} value={k}>{l}</option>)}</Select></div>
              <div><FieldLabel>Tanggal</FieldLabel><DatePicker value={f.spent_on} maxDate={new Date()} onChange={(v) => setF({ ...f, spent_on: v })} /></div>
            </div>
            <div><FieldLabel>Biaya (Rp)</FieldLabel><input required type="number" min={1} className="input" value={f.amount} onChange={(e) => setF({ ...f, amount: e.target.value })} placeholder="150000" />{err.amount && <p className="mt-1 text-xs text-rose-600">{err.amount[0]}</p>}</div>
            <div><FieldLabel>Nama kampanye (opsional)</FieldLabel><input className="input" value={f.campaign} onChange={(e) => setF({ ...f, campaign: e.target.value })} placeholder="Contoh: Toner – Conversion – Nov" /></div>
            {f.platform === "shopee_ads" && shops.length > 0 && <div><FieldLabel>Toko Shopee</FieldLabel><Select className="input" value={f.marketplace_shop_id} onChange={(e) => setF({ ...f, marketplace_shop_id: e.target.value })}><option value="">Pilih toko</option>{shops.map((s) => <option key={s.id} value={s.id}>{s.shop_name}</option>)}</Select></div>}
            <div><FieldLabel>Produk yang diiklankan (opsional)</FieldLabel><Select className="input" value={f.product_id} onChange={(e) => setF({ ...f, product_id: e.target.value })}><option value="">Semua produk</option>{products.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}</Select></div>
            {err.spent_on && <p className="text-xs text-rose-600">{err.spent_on[0]}</p>}
            <DialogActions onCancel={() => setOpen(false)} saving={saving} />
          </form>
        </Dialog>
      )}
    </div>
  );
}
