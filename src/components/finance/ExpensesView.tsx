"use client";

import { Info, Megaphone, Pencil, Plus, Receipt, Search, Trash2, Wallet } from "lucide-react";
import { askConfirm } from "@/components/Dialogs";
import { useCallback, useEffect, useMemo, useState } from "react";
import { DatePicker, DateRangePicker } from "@/components/DatePicker";
import { Dialog, DialogActions, FieldLabel, Panel } from "@/components/kit";
import { Select } from "@/components/Select";
import { MoneyInput } from "@/components/ui";
import { api, ApiError, isoDate, rupiah } from "@/lib/api";

type Row = {
  id: number | string; source: "manual" | "synced" | "ads"; spent_on: string; category: string; category_label: string;
  affects_profit: boolean; description: string; amount: number; payment_method: string | null; vendor: string | null;
  note: string | null; marketplace_shop_id: number | null; shop_name: string | null;
};
type Opt = { value: string; label: string; affects_profit?: boolean };
type Data = {
  data: Row[]; categories: Opt[]; payment_methods: Opt[];
  summary: { total: number; count: number; affects_profit: number; cash_only: number; by_category: { category: string; label: string; amount: number }[] };
};
type Form = { id?: number; spent_on: string; category: string; description: string; amount: number | null; payment_method: string; vendor: string; note: string; marketplace_shop_id: number | null };

const TONE: Record<string, string> = {
  operational: "bg-rose-50 text-rose-700", ads: "bg-violet-50 text-violet-700",
  inventory: "bg-amber-50 text-amber-700", asset: "bg-sky-50 text-sky-700",
};

/** Pengeluaran list + form. With shopId it is scoped to one Shopee shop, otherwise it covers the whole business. */
export function ExpensesView({ shopId, shops = [] }: { shopId?: number; shops?: { id: number; shop_name: string }[] }) {
  const [range, setRange] = useState({ from: isoDate(new Date(Date.now() - 29 * 864e5)), to: isoDate(new Date()) });
  const [category, setCategory] = useState("");
  const [search, setSearch] = useState("");
  const [data, setData] = useState<Data | null>(null);
  const [form, setForm] = useState<Form | null>(null);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  const query = useMemo(() => new URLSearchParams({ ...range, ...(shopId ? { shop_id: String(shopId) } : {}), ...(category ? { category } : {}), ...(search ? { search } : {}) }).toString(), [range, shopId, category, search]);
  const load = useCallback(() => api<Data>(`/expenses?${query}`).then(setData), [query]);
  useEffect(() => { const t = setTimeout(load, 200); return () => clearTimeout(t); }, [load]);

  const blank = (): Form => ({ spent_on: isoDate(new Date()), category: "operational", description: "", amount: null, payment_method: "transfer", vendor: "", note: "", marketplace_shop_id: shopId ?? null });
  const edit = (r: Row) => setForm({ id: r.id as number, spent_on: r.spent_on, category: r.category, description: r.description, amount: r.amount, payment_method: r.payment_method ?? "", vendor: r.vendor ?? "", note: r.note ?? "", marketplace_shop_id: r.marketplace_shop_id });

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form) return;
    setSaving(true); setError("");
    const { id, ...body } = form;
    try {
      await api(id ? `/expenses/${id}` : "/expenses", { method: id ? "PUT" : "POST", json: { ...body, payment_method: body.payment_method || null, vendor: body.vendor || null, note: body.note || null } });
      setForm(null); load();
    } catch (err) { setError(err instanceof ApiError ? err.message : "Gagal menyimpan"); }
    finally { setSaving(false); }
  };
  const remove = async (r: Row) => {
    if (!(await askConfirm(`Hapus pengeluaran "${r.description}"?`))) return;
    await api(`/expenses/${r.id}`, { method: "DELETE" }); load();
  };

  const s = data?.summary;
  const pm = Object.fromEntries((data?.payment_methods ?? []).map((p) => [p.value, p.label]));
  const filters: Opt[] = [{ value: "", label: "Semua kategori" }, ...(data?.categories ?? []), { value: "ads", label: "Biaya Iklan" }];

  return <div className="space-y-5">
    <div className="grid gap-4 md:grid-cols-3">
      {[[Wallet, "Total pengeluaran", s?.total, `${s?.count ?? 0} entri`, "bg-slate-100 text-navy"],
        [Receipt, "Mengurangi laba", s?.affects_profit, "Biaya operasional dan iklan", "bg-rose-50 text-rose-600"],
        [Info, "Hanya arus kas", s?.cash_only, "Pembelian stok, aset & pembiayaan", "bg-sky-50 text-sky-600"]].map(([Icon, l, v, sub, tone]) => {
        const I = Icon as typeof Wallet;
        return <Panel key={l as string} className="flex gap-3 p-4"><span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${tone}`}><I size={19} /></span><div><p className="text-xs text-slate-500">{l as string}</p><p className="text-xl font-bold text-navy">{rupiah((v as number) ?? 0)}</p><p className="text-xs text-slate-500">{sub as string}</p></div></Panel>;
      })}
    </div>

    <Panel className="overflow-hidden">
      <div className="flex flex-wrap items-center gap-2 border-b border-slate-100 p-4">
        <div className="relative min-w-[220px] flex-1"><Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" /><input className="input h-10 pl-9" placeholder="Cari deskripsi atau vendor" value={search} onChange={(e) => setSearch(e.target.value)} /></div>
        <Select className="input h-10 w-52" value={category} onChange={(e) => setCategory(e.target.value)}>{filters.map((f) => <option key={f.value} value={f.value}>{f.label}</option>)}</Select>
        <DateRangePicker value={range} onChange={setRange} />
        <button onClick={() => setForm(blank())} className="flex h-10 items-center gap-2 rounded-lg bg-brand-600 px-4 text-sm font-semibold text-white"><Plus size={16} />Tambah pengeluaran</button>
      </div>
      <p className="flex items-start gap-2 border-b border-slate-100 bg-violet-50/60 px-4 py-2.5 text-xs text-violet-800"><Megaphone size={14} className="mt-0.5 shrink-0" />Biaya Shopee Ads tersinkron otomatis per hari dan sudah ditambah PPN. Iklan live, banner, atau iklan di luar Shopee dicatat lewat menu Biaya Iklan.</p>
      <div className="overflow-x-auto"><table className="w-full min-w-[860px] text-sm">
        <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500"><tr>{["Deskripsi", "Tanggal", "Kategori", "Jumlah", "Pembayaran", "Catatan", ""].map((h) => <th key={h} className="px-4 py-3 font-semibold">{h}</th>)}</tr></thead>
        <tbody className="divide-y divide-slate-100">{(data?.data ?? []).map((r) => <tr key={r.id} className="align-top">
          <td className="px-4 py-3"><b className="block text-navy">{r.description}</b><span className="text-xs text-slate-500">{[r.vendor && `Vendor: ${r.vendor}`, !shopId && (r.shop_name ?? "Semua toko / umum")].filter(Boolean).join(" · ")}</span></td>
          <td className="whitespace-nowrap px-4 py-3 text-xs text-slate-600">{new Date(r.spent_on).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" })}</td>
          <td className="px-4 py-3"><span className={`whitespace-nowrap rounded-md px-2 py-1 text-xs font-semibold ${TONE[r.category] ?? "bg-slate-100 text-slate-600"}`}>{r.category_label}</span>{!r.affects_profit && <span className="mt-1 block text-[11px] text-slate-400">Tidak mengurangi laba</span>}</td>
          <td className="whitespace-nowrap px-4 py-3 font-bold text-rose-600">− {rupiah(r.amount)}</td>
          <td className="px-4 py-3 text-xs text-slate-600">{r.payment_method ? pm[r.payment_method] ?? r.payment_method : "-"}</td>
          <td className="max-w-[220px] px-4 py-3 text-xs text-slate-500">{r.note || "-"}</td>
          <td className="whitespace-nowrap px-4 py-3 text-right">{r.source === "manual"
            ? <><button onClick={() => edit(r)} className="rounded-lg p-2 text-slate-500 hover:bg-slate-100" aria-label="Ubah"><Pencil size={15} /></button><button onClick={() => remove(r)} className="rounded-lg p-2 text-rose-500 hover:bg-rose-50" aria-label="Hapus"><Trash2 size={15} /></button></>
            : <span className="text-[11px] text-slate-400">{r.source === "synced" ? "Otomatis" : "Dari Biaya Iklan"}</span>}</td>
        </tr>)}</tbody>
      </table>
        {data && data.data.length === 0 && <p className="py-14 text-center text-sm text-slate-500">Belum ada pengeluaran pada periode ini.</p>}
        {!data && <p className="py-14 text-center text-sm text-slate-400">Memuat pengeluaran…</p>}
      </div>
    </Panel>

    {form && <Dialog title={form.id ? "Ubah pengeluaran" : "Tambah pengeluaran"} icon={Receipt} onClose={() => setForm(null)}>
      <form onSubmit={save} className="space-y-4">
        {error && <p className="rounded-lg bg-rose-50 p-2.5 text-sm text-rose-700">{error}</p>}
        <div><FieldLabel>Kategori</FieldLabel>
          <div className="grid gap-2 sm:grid-cols-3">{(data?.categories ?? []).map((c) => <button type="button" key={c.value} onClick={() => setForm({ ...form, category: c.value })}
            className={`rounded-lg border p-2.5 text-left text-xs ${form.category === c.value ? "border-brand-500 bg-brand-50" : "border-slate-200"}`}><b className="block text-sm text-navy">{c.label}</b><span className="text-slate-500">{c.affects_profit ? "Mengurangi laba" : "Hanya arus kas"}</span></button>)}</div>
        </div>
        <div><FieldLabel>Deskripsi</FieldLabel><input required maxLength={150} className="input" placeholder="mis. Gaji admin, sewa gudang, plastik packing" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /></div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div><FieldLabel>Jumlah</FieldLabel><MoneyInput value={form.amount} onChange={(v) => setForm({ ...form, amount: v })} /></div>
          <div><FieldLabel>Tanggal</FieldLabel><DatePicker value={form.spent_on} maxDate={new Date()} onChange={(v) => setForm({ ...form, spent_on: v })} /></div>
          <div><FieldLabel>Metode pembayaran</FieldLabel><Select className="input" value={form.payment_method} onChange={(e) => setForm({ ...form, payment_method: e.target.value })}><option value="">-</option>{(data?.payment_methods ?? []).map((p) => <option key={p.value} value={p.value}>{p.label}</option>)}</Select></div>
          <div><FieldLabel>Vendor (opsional)</FieldLabel><input maxLength={80} className="input" value={form.vendor} onChange={(e) => setForm({ ...form, vendor: e.target.value })} /></div>
        </div>
        {!shopId && shops.length > 0 && <div><FieldLabel>Untuk toko</FieldLabel><Select className="input" value={form.marketplace_shop_id ? String(form.marketplace_shop_id) : ""} onChange={(e) => setForm({ ...form, marketplace_shop_id: e.target.value ? Number(e.target.value) : null })}><option value="">Umum (semua channel)</option>{shops.map((sh) => <option key={sh.id} value={sh.id}>{sh.shop_name}</option>)}</Select></div>}
        <div><FieldLabel>Catatan (opsional)</FieldLabel><input maxLength={255} className="input" value={form.note} onChange={(e) => setForm({ ...form, note: e.target.value })} /></div>
        <DialogActions onCancel={() => setForm(null)} saving={saving} />
      </form>
    </Dialog>}
  </div>;
}
