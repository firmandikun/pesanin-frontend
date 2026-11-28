"use client";
import { CheckCircle2, ClipboardList, Loader2, PackageCheck, Plus, Search, Trash2, Wallet, X } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { askConfirm, showAlert } from "@/components/Dialogs";
import { Dialog, FieldLabel } from "@/components/kit";
import { Select } from "@/components/Select";
import { api, ApiError, rupiah } from "@/lib/api";
import { Supplier, SupplierDialog } from "./SupplierDialog";

export type PoItem = { id?: number; stock_master_id: number | null; product_id: number | null; name: string; sku: string | null; qty: number; unit_cost: number; landed_unit_cost?: number };
export type PoPayment = { id: number; paid_on: string; amount: number; method: string; note: string | null };
export type Purchase = {
  id: number; number: string; status: "draft" | "ordered" | "received" | "cancelled"; status_label: string; ordered_on: string; due_on: string | null; received_at: string | null;
  subtotal: number; discount: number; shipping_cost: number; total: number; paid: number; balance: number; payment_status: "unpaid" | "partial" | "paid"; overdue: boolean;
  notes: string | null; supplier: { id: number; name: string; phone: string | null } | null; supplier_id: number | null; items?: PoItem[]; payments?: PoPayment[];
};
type CatalogItem = { type: "stock_master" | "product"; id: number; name: string; sku: string | null; stock: number | null; hpp: number; channel: string };
type Line = { type: "stock_master" | "product"; id: number; name: string; sku: string | null; stock: number | null; hpp: number; qty: string; unit_cost: string };

const METHODS: [string, string][] = [["transfer", "Transfer Bank"], ["cash", "Tunai"], ["ewallet", "E-Wallet"], ["debit_card", "Kartu Debit"], ["credit_card", "Kartu Kredit"], ["other", "Lainnya"]];
const today = () => new Date(Date.now() - new Date().getTimezoneOffset() * 60000).toISOString().slice(0, 10);
const addDays = (d: string, n: number) => { const x = new Date(d); x.setDate(x.getDate() + n); return x.toISOString().slice(0, 10); };
const errText = (e: unknown) => (e instanceof ApiError ? Object.values(e.errors)[0]?.[0] ?? e.message : "Gagal menyimpan.");

/** Create or edit a purchase order: supplier, dates, lines (Stok Master SKUs or web products), shipping & discount. */
export function PurchaseForm({ value, onClose, onSaved }: { value?: Purchase; onClose: () => void; onSaved: (p: Purchase) => void }) {
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [supplierId, setSupplierId] = useState(value?.supplier_id ? String(value.supplier_id) : "");
  const [newSupplier, setNewSupplier] = useState(false);
  const [orderedOn, setOrderedOn] = useState(value?.ordered_on ?? today());
  const [dueOn, setDueOn] = useState(value?.due_on ?? "");
  const [shipping, setShipping] = useState(String(value?.shipping_cost ?? 0));
  const [discount, setDiscount] = useState(String(value?.discount ?? 0));
  const [notes, setNotes] = useState(value?.notes ?? "");
  const [lines, setLines] = useState<Line[]>(() => (value?.items ?? []).map((i) => ({ type: i.stock_master_id ? "stock_master" : "product", id: (i.stock_master_id ?? i.product_id)!, name: i.name, sku: i.sku, stock: null, hpp: 0, qty: String(i.qty), unit_cost: String(i.unit_cost) })));
  const [q, setQ] = useState("");
  const [found, setFound] = useState<CatalogItem[]>([]);
  const [err, setErr] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => { api<{ data: Supplier[] }>("/suppliers").then((r) => setSuppliers(r.data)).catch(() => {}); }, []);
  useEffect(() => {
    const t = setTimeout(() => api<{ items: CatalogItem[] }>(`/purchases/catalog?q=${encodeURIComponent(q)}`).then((r) => setFound(r.items)).catch(() => setFound([])), 250);
    return () => clearTimeout(t);
  }, [q]);
  // Supplier with payment terms: suggest the due date.
  useEffect(() => {
    const s = suppliers.find((x) => String(x.id) === supplierId);
    if (s && s.payment_terms_days && !value) setDueOn(addDays(orderedOn, s.payment_terms_days));
  }, [supplierId, orderedOn, suppliers, value]);

  const add = (c: CatalogItem) => {
    if (lines.some((l) => l.type === c.type && l.id === c.id)) return;
    setLines([...lines, { type: c.type, id: c.id, name: c.name, sku: c.sku, stock: c.stock, hpp: c.hpp, qty: "1", unit_cost: c.hpp ? String(c.hpp) : "" }]);
  };
  const sub = useMemo(() => lines.reduce((t, l) => t + (Number(l.qty) || 0) * (Number(l.unit_cost) || 0), 0), [lines]);
  const total = Math.max(0, sub - (Number(discount) || 0) + (Number(shipping) || 0));

  const save = async (status: "draft" | "ordered") => {
    setErr("");
    if (!lines.length) return setErr("Tambahkan minimal satu produk.");
    setSaving(true);
    const body = { supplier_id: supplierId ? Number(supplierId) : null, status, ordered_on: orderedOn, due_on: dueOn || null, shipping_cost: Number(shipping) || 0, discount: Number(discount) || 0, notes: notes || null,
      items: lines.map((l) => ({ type: l.type, id: l.id, qty: Number(l.qty) || 0, unit_cost: Number(l.unit_cost) || 0 })) };
    try { onSaved(await api<Purchase>(value ? `/purchases/${value.id}` : "/purchases", { method: value ? "PUT" : "POST", json: body })); }
    catch (e) { setErr(errText(e)); }
    finally { setSaving(false); }
  };

  return (
    <Dialog title={value ? `Ubah ${value.number}` : "Buat Purchase Order"} icon={ClipboardList} onClose={onClose} width="max-w-4xl">
      <div className="space-y-4">
        <div className="grid gap-3 sm:grid-cols-3">
          <div><FieldLabel>Supplier</FieldLabel>
            <div className="flex gap-2"><Select className="input" value={supplierId} onChange={(e) => setSupplierId(e.target.value)}><option value="">Tanpa supplier</option>{suppliers.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}</Select>
              <button type="button" onClick={() => setNewSupplier(true)} className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-slate-200 text-slate-500 hover:text-navy" aria-label="Supplier baru"><Plus size={16} /></button></div></div>
          <div><FieldLabel>Tanggal pesan</FieldLabel><input type="date" className="input" value={orderedOn} onChange={(e) => setOrderedOn(e.target.value)} /></div>
          <div><FieldLabel>Jatuh tempo bayar</FieldLabel><input type="date" className="input" value={dueOn} min={orderedOn} onChange={(e) => setDueOn(e.target.value)} /></div>
        </div>

        <div className="rounded-xl border border-slate-200">
          <div className="border-b border-slate-100 p-3">
            <div className="relative">
              <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input className="input pl-9" placeholder="Cari produk / SKU untuk ditambahkan (Stok Master Shopee atau produk web)" value={q} onChange={(e) => setQ(e.target.value)} />
            </div>
            {found.length > 0 && (
              <div className="mt-2 max-h-40 overflow-y-auto rounded-lg border border-slate-100">
                {found.map((c) => {
                  const added = lines.some((l) => l.type === c.type && l.id === c.id);
                  return (
                    <button key={`${c.type}-${c.id}`} type="button" disabled={added} onClick={() => add(c)} className="flex w-full items-center justify-between gap-3 px-3 py-2 text-left text-sm hover:bg-slate-50 disabled:opacity-40">
                      <span className="min-w-0"><b className="block truncate font-medium text-navy">{c.name}</b><span className="text-xs text-slate-400">{[c.sku, c.channel].filter(Boolean).join(" · ")}</span></span>
                      <span className="shrink-0 text-right text-xs text-slate-500">stok {c.stock ?? "-"}<span className="block">HPP {c.hpp ? rupiah(c.hpp) : "-"}</span></span>
                    </button>
                  );
                })}
              </div>
            )}
            {q && !found.length && <p className="mt-2 text-xs text-slate-500">Tidak ditemukan. Produk Shopee perlu dibuatkan Stok Master dulu (Marketplace → Stok Master).</p>}
          </div>
          <div className="overflow-x-auto">
          <table className="w-full min-w-[560px] text-sm">
            <thead className="text-left text-xs uppercase tracking-wide text-slate-500"><tr><th className="px-3 py-2 font-semibold">Produk</th><th className="px-2 font-semibold">Qty</th><th className="px-2 font-semibold">Harga beli / unit</th><th className="px-2 font-semibold">Subtotal</th><th /></tr></thead>
            <tbody className="divide-y divide-slate-100">
              {lines.map((l, i) => (
                <tr key={`${l.type}-${l.id}`}>
                  <td className="px-3 py-2"><b className="block max-w-[280px] truncate font-medium text-navy">{l.name}</b><span className="text-xs text-slate-400">{l.sku ?? ""}{l.hpp ? ` · HPP sekarang ${rupiah(l.hpp)}` : ""}</span></td>
                  <td className="px-2"><input type="number" min={1} className="input h-9 w-20" value={l.qty} onChange={(e) => setLines(lines.map((x, k) => (k === i ? { ...x, qty: e.target.value } : x)))} /></td>
                  <td className="px-2"><input type="number" min={0} className="input h-9 w-32" value={l.unit_cost} placeholder="0" onChange={(e) => setLines(lines.map((x, k) => (k === i ? { ...x, unit_cost: e.target.value } : x)))} /></td>
                  <td className="px-2 text-slate-700">{rupiah((Number(l.qty) || 0) * (Number(l.unit_cost) || 0))}</td>
                  <td className="px-2 text-right"><button type="button" onClick={() => setLines(lines.filter((_, k) => k !== i))} className="text-slate-400 hover:text-rose-600" aria-label="Hapus baris"><X size={15} /></button></td>
                </tr>
              ))}
            </tbody>
          </table>
          </div>
          {!lines.length && <p className="p-4 text-center text-sm text-slate-400">Belum ada produk. Cari di atas lalu klik untuk menambahkan.</p>}
        </div>

        <div className="grid gap-3 sm:grid-cols-[1fr_280px]">
          <div><FieldLabel>Catatan</FieldLabel><textarea className="input min-h-20 py-2" value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="No. nota supplier, dll." /></div>
          <div className="space-y-2 rounded-xl bg-slate-50 p-3 text-sm">
            <div className="flex justify-between"><span className="text-slate-500">Subtotal</span><b>{rupiah(sub)}</b></div>
            <label className="flex items-center justify-between gap-2"><span className="text-slate-500">Ongkir dari supplier</span><input type="number" min={0} className="input h-8 w-32 bg-white text-right" value={shipping} onChange={(e) => setShipping(e.target.value)} /></label>
            <label className="flex items-center justify-between gap-2"><span className="text-slate-500">Diskon</span><input type="number" min={0} className="input h-8 w-32 bg-white text-right" value={discount} onChange={(e) => setDiscount(e.target.value)} /></label>
            <div className="flex justify-between border-t border-slate-200 pt-2 text-base"><span className="font-semibold text-navy">Total</span><b className="text-navy">{rupiah(total)}</b></div>
            <p className="text-[11px] text-slate-400">Ongkir & diskon dibagi ke tiap produk sesuai nilainya, jadi HPP mencerminkan biaya sebenarnya.</p>
          </div>
        </div>
        {err && <p className="rounded-lg bg-rose-50 p-2 text-sm text-rose-700">{err}</p>}
        <div className="flex justify-end gap-2 border-t border-slate-100 pt-4">
          <button type="button" onClick={onClose} className="h-10 rounded-lg border border-slate-200 px-5 text-sm font-semibold text-slate-600">Batal</button>
          {(!value || value.status === "draft") && <button type="button" disabled={saving} onClick={() => save("draft")} className="h-10 rounded-lg border border-slate-200 px-5 text-sm font-semibold text-navy disabled:opacity-50">Simpan draf</button>}
          <button type="button" disabled={saving} onClick={() => save("ordered")} className="flex h-10 items-center gap-1.5 rounded-lg bg-brand-600 px-5 text-sm font-semibold text-white disabled:opacity-50">{saving && <Loader2 size={14} className="animate-spin" />}Simpan PO</button>
        </div>
      </div>
      {newSupplier && <SupplierDialog value={{ payment_terms_days: 0 }} onClose={() => setNewSupplier(false)} onSaved={(s) => { setNewSupplier(false); setSuppliers([...suppliers, s]); setSupplierId(String(s.id)); }} />}
    </Dialog>
  );
}

/** One PO: lines, totals, payments, and the actions (receive goods, record payment, edit, cancel). */
export function PurchaseDetail({ id, onClose, onChanged, onEdit, canManage = true }: { id: number; onClose: () => void; onChanged: () => void; onEdit: (p: Purchase) => void; canManage?: boolean }) {
  const [p, setP] = useState<Purchase | null>(null);
  const [busy, setBusy] = useState("");
  const [pay, setPay] = useState<{ amount: string; paid_on: string; method: string; note: string } | null>(null);
  const [err, setErr] = useState("");

  useEffect(() => { api<Purchase>(`/purchases/${id}`).then(setP).catch((e) => setErr(errText(e))); }, [id]);
  const run = async (key: string, fn: () => Promise<void>) => {
    setBusy(key); setErr("");
    try { await fn(); onChanged(); } catch (e) { setErr(errText(e)); } finally { setBusy(""); }
  };

  const receive = () => run("receive", async () => {
    if (!(await askConfirm("Tandai barang sudah diterima? Stok bertambah dan HPP diperbarui (rata-rata). Untuk Stok Master, stok baru dikirim ke semua toko Shopee.", { confirmLabel: "Barang diterima" }))) return;
    const r = await api<{ changes: { name: string; qty: number; stock_after: number | null; hpp_before: number; hpp_after: number }[]; purchase: Purchase }>(`/purchases/${id}/receive`, { method: "POST" });
    setP(r.purchase);
    showAlert(r.changes.map((c) => `• ${c.name}: +${c.qty}${c.stock_after !== null ? ` (stok ${c.stock_after})` : ""}, HPP ${rupiah(c.hpp_before)} → ${rupiah(c.hpp_after)}`).join("\n"), "Barang diterima");
  });
  const cancel = () => run("cancel", async () => {
    if (!(await askConfirm(`Batalkan ${p?.number}?`, { danger: true, confirmLabel: "Batalkan PO" }))) return;
    setP(await api<Purchase>(`/purchases/${id}/cancel`, { method: "POST" }));
  });
  const savePay = () => run("pay", async () => {
    setP(await api<Purchase>(`/purchases/${id}/payments`, { method: "POST", json: { ...pay, amount: Number(pay?.amount) || 0, note: pay?.note || null } }));
    setPay(null);
  });
  const delPay = (pp: PoPayment) => run("delpay", async () => {
    if (!(await askConfirm(`Hapus pembayaran ${rupiah(pp.amount)}? Catatan di Pengeluaran ikut terhapus.`, { danger: true, confirmLabel: "Hapus" }))) return;
    setP(await api<Purchase>(`/purchases/${id}/payments/${pp.id}`, { method: "DELETE" }));
  });
  const btn = "flex h-9 items-center gap-1.5 rounded-lg px-3 text-sm font-semibold disabled:opacity-50";

  return (
    <Dialog title={p ? `${p.number} · ${p.status_label}` : "Memuat…"} icon={ClipboardList} onClose={onClose} width="max-w-3xl">
      {!p ? <p className="py-8 text-center text-sm text-slate-400">{err || "Memuat…"}</p> : (
        <div className="space-y-4 text-sm">
          <div className="grid gap-2 rounded-xl bg-slate-50 p-3 sm:grid-cols-3">
            <div><span className="block text-xs text-slate-500">Supplier</span><b className="text-navy">{p.supplier?.name ?? "-"}</b></div>
            <div><span className="block text-xs text-slate-500">Tanggal pesan · jatuh tempo</span><b className="text-navy">{p.ordered_on}{p.due_on ? ` · ${p.due_on}` : ""}</b>{p.overdue && <span className="ml-1 text-xs font-semibold text-rose-600">lewat tempo</span>}</div>
            <div><span className="block text-xs text-slate-500">Barang</span><b className="text-navy">{p.received_at ? `Diterima ${new Date(p.received_at).toLocaleDateString("id-ID")}` : p.status === "cancelled" ? "Dibatalkan" : "Belum diterima"}</b></div>
          </div>
          <table className="w-full">
            <thead className="text-left text-xs uppercase tracking-wide text-slate-500"><tr className="border-b border-slate-100"><th className="py-2 font-semibold">Produk</th><th className="font-semibold">Qty</th><th className="font-semibold">Harga beli</th>{p.status === "received" && <th className="font-semibold">HPP masuk</th>}<th className="text-right font-semibold">Subtotal</th></tr></thead>
            <tbody className="divide-y divide-slate-100">{p.items?.map((i) => (
              <tr key={i.id}><td className="py-2"><b className="block font-medium text-navy">{i.name}</b><span className="text-xs text-slate-400">{i.sku}</span></td><td>{i.qty}</td><td>{rupiah(i.unit_cost)}</td>
                {p.status === "received" && <td title="Termasuk bagian ongkir/diskon">{rupiah(i.landed_unit_cost ?? 0)}</td>}<td className="text-right">{rupiah(i.qty * i.unit_cost)}</td></tr>
            ))}</tbody>
          </table>
          <div className="ml-auto w-full max-w-xs space-y-1">
            <div className="flex justify-between"><span className="text-slate-500">Subtotal</span><span>{rupiah(p.subtotal)}</span></div>
            {p.shipping_cost > 0 && <div className="flex justify-between"><span className="text-slate-500">Ongkir</span><span>{rupiah(p.shipping_cost)}</span></div>}
            {p.discount > 0 && <div className="flex justify-between"><span className="text-slate-500">Diskon</span><span>−{rupiah(p.discount)}</span></div>}
            <div className="flex justify-between border-t border-slate-100 pt-1 font-semibold text-navy"><span>Total</span><span>{rupiah(p.total)}</span></div>
            <div className="flex justify-between"><span className="text-slate-500">Dibayar</span><span>{rupiah(p.paid)}</span></div>
            <div className={`flex justify-between font-semibold ${p.balance ? "text-rose-600" : "text-emerald-600"}`}><span>Sisa utang</span><span>{p.balance ? rupiah(p.balance) : "Lunas"}</span></div>
          </div>

          {(p.payments?.length ?? 0) > 0 && (
            <div><b className="mb-1 block text-navy">Pembayaran</b>
              {p.payments!.map((pp) => (
                <div key={pp.id} className="flex items-center justify-between border-b border-slate-100 py-1.5">
                  <span>{pp.paid_on} · {METHODS.find(([k]) => k === pp.method)?.[1] ?? pp.method}{pp.note ? ` · ${pp.note}` : ""}</span>
                  <span className="flex items-center gap-3"><b>{rupiah(pp.amount)}</b>{canManage && <button onClick={() => delPay(pp)} className="text-slate-400 hover:text-rose-600" aria-label="Hapus pembayaran"><Trash2 size={14} /></button>}</span>
                </div>
              ))}
              <p className="mt-1 text-xs text-slate-400">Setiap pembayaran juga tercatat di Laporan → Pengeluaran (HPP & Pembelian Stok).</p>
            </div>
          )}

          {pay && (
            <div className="grid gap-2 rounded-xl border border-slate-200 p-3 sm:grid-cols-4">
              <label className="sm:col-span-1"><span className="text-xs text-slate-500">Jumlah</span><input type="number" min={1} max={p.balance} className="input h-9" value={pay.amount} onChange={(e) => setPay({ ...pay, amount: e.target.value })} /></label>
              <label><span className="text-xs text-slate-500">Tanggal</span><input type="date" max={today()} className="input h-9" value={pay.paid_on} onChange={(e) => setPay({ ...pay, paid_on: e.target.value })} /></label>
              <label><span className="text-xs text-slate-500">Metode</span><Select className="input h-9" value={pay.method} onChange={(e) => setPay({ ...pay, method: e.target.value })}>{METHODS.map(([k, l]) => <option key={k} value={k}>{l}</option>)}</Select></label>
              <label><span className="text-xs text-slate-500">Catatan</span><input className="input h-9" value={pay.note} onChange={(e) => setPay({ ...pay, note: e.target.value })} /></label>
              <div className="flex justify-end gap-2 sm:col-span-4">
                <button onClick={() => setPay(null)} className={`${btn} border border-slate-200 text-slate-600`}>Batal</button>
                <button onClick={savePay} disabled={!!busy} className={`${btn} bg-brand-600 text-white`}>{busy === "pay" && <Loader2 size={14} className="animate-spin" />}Simpan pembayaran</button>
              </div>
            </div>
          )}

          {err && <p className="rounded-lg bg-rose-50 p-2 text-rose-700">{err}</p>}
          <div className="flex flex-wrap justify-end gap-2 border-t border-slate-100 pt-4">
            {canManage && ["draft", "ordered"].includes(p.status) && p.paid === 0 && <button onClick={cancel} disabled={!!busy} className={`${btn} text-slate-500 hover:text-rose-600`}>Batalkan PO</button>}
            {canManage && ["draft", "ordered"].includes(p.status) && <button onClick={() => onEdit(p)} className={`${btn} border border-slate-200 text-navy`}>Ubah</button>}
            {canManage && p.balance > 0 && !pay && <button onClick={() => setPay({ amount: String(p.balance), paid_on: today(), method: "transfer", note: "" })} className={`${btn} border border-slate-200 text-navy`}><Wallet size={15} />Catat pembayaran</button>}
            {["draft", "ordered"].includes(p.status) && <button onClick={receive} disabled={!!busy} className={`${btn} bg-emerald-600 text-white`}>{busy === "receive" ? <Loader2 size={14} className="animate-spin" /> : <PackageCheck size={15} />}Barang diterima</button>}
            {p.status === "received" && p.balance === 0 && <span className="flex items-center gap-1.5 text-sm font-semibold text-emerald-600"><CheckCircle2 size={16} />Selesai: barang diterima & lunas</span>}
          </div>
        </div>
      )}
    </Dialog>
  );
}
