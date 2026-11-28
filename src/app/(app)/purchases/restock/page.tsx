"use client";
import { CheckCircle2, FilePlus2, Info, Loader2, PackageX } from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { showAlert } from "@/components/Dialogs";
import { PageHead, Panel } from "@/components/kit";
import { api, ApiError, rupiah } from "@/lib/api";

type Item = {
  type: "stock_master" | "product"; id: number; name: string; sku: string | null; stock: number; channel: string; hpp: number;
  sold_30d: number; per_day: number; days_left: number | null; run_out_at: string | null; restock_qty: number; status: "habis" | "kritis" | "segera";
  on_order: number; qty: number; unit_cost: number; last_bought: boolean;
};
type Group = { supplier: { id: number; name: string; phone: string | null; payment_terms_days: number } | null; items: Item[]; total: number };
type Data = { groups: Group[]; settings: { lead_days: number; cover_days: number } };

const STATUS: Record<Item["status"], [string, string]> = {
  habis: ["Habis", "bg-rose-100 text-rose-700"], kritis: ["Kritis", "bg-rose-50 text-rose-700"], segera: ["Segera", "bg-amber-50 text-amber-700"],
};
const key = (i: Item) => `${i.type}:${i.id}`;

/**
 * Saran Restock: what runs out soon (Stok Master + web products), how many to buy, grouped by the supplier it was
 * last bought from at the last price. One click turns a group into a draft PO (still editable in Pembelian).
 */
export default function RestockPage() {
  const [d, setD] = useState<Data | null>(null);
  const [qty, setQty] = useState<Record<string, string>>({});
  const [cost, setCost] = useState<Record<string, string>>({});
  const [off, setOff] = useState<Set<string>>(new Set());
  const [busy, setBusy] = useState<number | null>(null);
  const [made, setMade] = useState<{ number: string; supplier: string }[]>([]);

  const load = useCallback(() => {
    setD(null);
    api<Data>("/purchases/restock").then((r) => {
      setD(r);
      const items = r.groups.flatMap((g) => g.items);
      setQty(Object.fromEntries(items.map((i) => [key(i), String(i.qty)])));
      setCost(Object.fromEntries(items.map((i) => [key(i), String(i.unit_cost)])));
      setOff(new Set());
    }).catch(() => setD({ groups: [], settings: { lead_days: 7, cover_days: 14 } }));
  }, []);
  useEffect(() => { load(); }, [load]);

  const lines = (g: Group) => g.items.filter((i) => !off.has(key(i)) && Number(qty[key(i)]) > 0);
  const total = (g: Group) => lines(g).reduce((t, i) => t + Number(qty[key(i)]) * Number(cost[key(i)] || 0), 0);

  const draft = async (g: Group, idx: number) => {
    setBusy(idx);
    try {
      const po = await api<{ number: string }>("/purchases", { method: "POST", json: {
        supplier_id: g.supplier?.id ?? null, status: "draft", ordered_on: new Date().toLocaleDateString("sv-SE", { timeZone: "Asia/Jakarta" }),
        notes: "Dibuat dari Saran Restock",
        items: lines(g).map((i) => ({ type: i.type, id: i.id, qty: Number(qty[key(i)]), unit_cost: Number(cost[key(i)] || 0) })),
      } });
      setMade((m) => [...m, { number: po.number, supplier: g.supplier?.name ?? "tanpa supplier" }]);
      load();
    } catch (e) {
      showAlert(e instanceof ApiError ? Object.values(e.errors ?? {}).flat()[0] ?? e.message : "Gagal membuat draf PO", "Gagal");
    } finally { setBusy(null); }
  };

  return (
    <div className="space-y-5">
      <PageHead title="Saran Restock" tutorial={false} crumbs={[["Pembelian"], ["Saran Restock"]]} />

      <p className="flex items-start gap-2 rounded-xl bg-sky-50 p-3 text-xs text-sky-800"><Info size={14} className="mt-0.5 shrink-0" />
        <span>Produk yang akan habis dalam waktu tunggu supplier ({d?.settings.lead_days ?? 7} hari) + 1 minggu. Jumlah beli = cukup untuk {d ? d.settings.lead_days + d.settings.cover_days : 21} hari penjualan, dikurangi stok dan yang sudah ada di PO terbuka. Harga = harga beli terakhir (atau HPP). Atur waktu tunggu di <Link href="/marketplace/stock" className="font-semibold underline">Stok Master</Link>.</span>
      </p>
      {made.map((m) => (
        <p key={m.number} className="flex items-center gap-2 rounded-xl bg-emerald-50 p-3 text-sm text-emerald-800"><CheckCircle2 size={16} />Draf {m.number} ({m.supplier}) dibuat. <Link href="/purchases?status=draft" className="font-semibold underline">Lihat & kirim ke supplier</Link></p>
      ))}

      {!d && <p className="py-14 text-center text-slate-400"><Loader2 size={18} className="mx-auto animate-spin" /></p>}
      {d && !d.groups.length && (
        <Panel className="flex flex-col items-center gap-2 py-14 text-center text-sm text-slate-500"><PackageX size={28} className="text-slate-300" />Belum ada produk yang perlu di-restock. Saran muncul dari penjualan Stok Master dan produk web dengan stok terlacak.</Panel>
      )}

      {d?.groups.map((g, gi) => (
        <Panel key={g.supplier?.id ?? "none"}>
          <div className="flex flex-wrap items-center gap-3 border-b border-slate-100 p-4">
            <div className="mr-auto">
              <p className="font-bold text-navy">{g.supplier?.name ?? "Tanpa supplier"}</p>
              <p className="text-xs text-slate-500">{g.supplier ? [g.supplier.phone, g.supplier.payment_terms_days ? `tempo ${g.supplier.payment_terms_days} hari` : "tunai"].filter(Boolean).join(" · ") : "Belum pernah dibeli lewat PO. Supplier bisa dipilih di draf."}</p>
            </div>
            <p className="text-sm text-slate-600">Total <b className="text-navy">{rupiah(total(g))}</b></p>
            <button onClick={() => draft(g, gi)} disabled={busy !== null || !lines(g).length} className="flex h-9 items-center gap-1.5 rounded-lg bg-brand-600 px-4 text-sm font-semibold text-white hover:bg-brand-700 disabled:opacity-50">
              {busy === gi ? <Loader2 size={15} className="animate-spin" /> : <FilePlus2 size={15} />}Buat draf PO ({lines(g).length})
            </button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[820px] text-sm">
              <thead className="text-left text-xs uppercase tracking-wide text-slate-500"><tr className="border-b border-slate-100">
                <th className="w-10 py-2.5 pl-4" /><th className="px-3 py-2.5">Produk</th><th className="px-3 text-right">Stok</th><th className="px-3 text-right">Terjual/hari</th><th className="px-3">Habis</th><th className="px-3 text-right">Jumlah beli</th><th className="px-4 text-right">Harga satuan</th>
              </tr></thead>
              <tbody className="divide-y divide-slate-100">
                {g.items.map((i) => {
                  const k = key(i);
                  return (
                    <tr key={k} className={off.has(k) ? "opacity-40" : ""}>
                      <td className="py-3 pl-4"><input type="checkbox" className="h-4 w-4 accent-brand-600" checked={!off.has(k)} onChange={() => setOff((s) => { const n = new Set(s); n.has(k) ? n.delete(k) : n.add(k); return n; })} aria-label="Pilih" /></td>
                      <td className="px-3 py-3">
                        <p className="font-semibold text-navy">{i.name}</p>
                        <p className="text-xs text-slate-500">{[i.sku, i.channel].filter(Boolean).join(" · ")}{i.on_order > 0 && <span className="text-sky-700"> · {i.on_order} sudah di PO terbuka</span>}</p>
                      </td>
                      <td className="px-3 text-right">{i.stock}</td>
                      <td className="px-3 text-right">{i.per_day.toLocaleString("id-ID")}</td>
                      <td className="px-3"><span className={`rounded px-1.5 py-0.5 text-[11px] font-semibold ${STATUS[i.status][1]}`}>{STATUS[i.status][0]}</span>
                        {i.days_left !== null && i.status !== "habis" && <span className="block text-xs text-slate-500">±{i.days_left} hari lagi</span>}</td>
                      <td className="px-3 text-right"><input className="input h-9 w-24 text-right" inputMode="numeric" value={qty[k] ?? ""} onChange={(e) => setQty({ ...qty, [k]: e.target.value.replace(/\D/g, "") })} /></td>
                      <td className="px-4 text-right"><input className="input h-9 w-32 text-right" inputMode="numeric" value={cost[k] ?? ""} onChange={(e) => setCost({ ...cost, [k]: e.target.value.replace(/\D/g, "") })} />
                        <span className="block text-[11px] text-slate-400">{i.last_bought ? "harga beli terakhir" : "dari HPP"}</span></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Panel>
      ))}
    </div>
  );
}
