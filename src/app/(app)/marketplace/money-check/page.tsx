"use client";
import { ChevronDown, ExternalLink, Info, Loader2, PackageSearch, Percent, RotateCcw, Truck, Undo2, Wallet } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { PageHead, Panel } from "@/components/kit";
import { Select } from "@/components/Select";
import { api, rupiah } from "@/lib/api";

type Item = { order_id: number | null; order_sn: string | null; shop: string | null; date: string | null; amount: number; detail: string };
type Kind = { key: string; title: string; help: string; count: number; amount: number; items: Item[] };
type Data = { kinds: Kind[]; count: number; total: number; days: number };
type Shop = { id: number; shop_name: string; platform?: string; status: string; is_demo: boolean };

const ICON: Record<string, typeof Wallet> = { income_pending: Wallet, shipping_charged: Truck, return_shipping: Undo2, high_fee: Percent, lost: PackageSearch, return_open: RotateCcw };
const date = (s: string | null) => (s ? new Date(s).toLocaleDateString("id-ID", { day: "2-digit", month: "short", year: "numeric" }) : "-");

/**
 * Cek Dana: money a Shopee seller may be missing (shipping charged to the seller, return shipping, unusual fees,
 * parcels that never arrived, returns waiting, income not final), each with the orders to check and claim.
 */
export default function MoneyCheckPage() {
  const [d, setD] = useState<Data | null>(null);
  const [shops, setShops] = useState<Shop[]>([]);
  const [shop, setShop] = useState("");
  const [open, setOpen] = useState<string | null>(null);

  useEffect(() => {
    api<{ shops: Shop[] }>("/marketplace/shops").then((r) => setShops(r.shops.filter((x) => (x.platform ?? "shopee") === "shopee" && x.status !== "disconnected" && !x.is_demo))).catch(() => {});
  }, []);
  useEffect(() => {
    setD(null);
    api<Data>(`/marketplace/money-check${shop ? `?shop_id=${shop}` : ""}`).then((r) => { setD(r); setOpen((o) => o ?? r.kinds.find((k) => k.count && k.key !== "income_pending")?.key ?? null); })
      .catch(() => setD({ kinds: [], count: 0, total: 0, days: 90 }));
  }, [shop]);

  return (
    <div className="space-y-5">
      <PageHead title="Cek Dana" tutorial={false} crumbs={[["Marketplace"], ["Cek Dana"]]}>
        {shops.length > 1 && (
          <Select className="input w-48" value={shop} onChange={(e) => setShop(e.target.value)}>
            <option value="">Semua toko ({shops.length})</option>{shops.map((x) => <option key={x.id} value={x.id}>{x.shop_name}</option>)}
          </Select>
        )}
      </PageHead>

      {!d ? <Panel className="py-14 text-center text-slate-400"><Loader2 size={18} className="mx-auto animate-spin" /></Panel> : (
        <>
          <div className="grid gap-4 sm:grid-cols-[1.2fr_1fr]">
            <div className="surface p-5">
              <p className="text-xs font-medium text-slate-500">Dana yang perlu dicek / diklaim ({d.days} hari terakhir)</p>
              <p className={`mt-1 text-3xl font-bold ${d.total ? "text-rose-600" : "text-navy"}`}>{rupiah(d.total)}</p>
              <p className="mt-1 text-xs text-slate-400">{d.count ? `${d.count} temuan di ${d.kinds.filter((k) => k.count).length} kategori` : "Tidak ada temuan. 👍"}</p>
            </div>
            <p className="flex items-start gap-2 rounded-xl bg-sky-50 p-4 text-xs text-sky-800"><Info size={14} className="mt-0.5 shrink-0" />
              Pesanin membaca rincian penghasilan tiap pesanan dari Shopee. Klaim tetap diajukan di Seller Centre (Pusat Bantuan → Hubungi Shopee) dengan nomor pesanan di bawah. Pesanin mengabari tiap pagi kalau ada temuan baru.
            </p>
          </div>

          <div className="space-y-3">
            {d.kinds.map((k) => {
              const Icon = ICON[k.key] ?? Wallet;
              const isOpen = open === k.key;
              return (
                <Panel key={k.key} className="overflow-hidden">
                  <button onClick={() => setOpen(isOpen ? null : k.key)} disabled={!k.count} className="flex w-full items-center gap-3 p-4 text-left disabled:cursor-default">
                    <span className={`grid h-10 w-10 shrink-0 place-items-center rounded-xl ${k.count ? "bg-rose-50 text-rose-600" : "bg-slate-100 text-slate-400"}`}><Icon size={18} /></span>
                    <span className="min-w-0 flex-1">
                      <span className="block font-semibold text-navy">{k.title}</span>
                      <span className="block text-xs text-slate-500">{k.count ? `${k.count} pesanan` : "Tidak ada"}</span>
                    </span>
                    {k.count > 0 && <span className="text-right font-bold text-navy">{rupiah(k.amount)}</span>}
                    {k.count > 0 && <ChevronDown size={18} className={`shrink-0 text-slate-400 transition ${isOpen ? "rotate-180" : ""}`} />}
                  </button>
                  {isOpen && k.count > 0 && (
                    <div className="border-t border-slate-100">
                      <p className="bg-amber-50/60 px-4 py-2.5 text-xs text-amber-800">{k.help}</p>
                      <div className="divide-y divide-slate-100">
                        {k.items.map((i, n) => (
                          <div key={n} className="flex flex-wrap items-center gap-x-4 gap-y-1 px-4 py-3 text-sm">
                            <div className="min-w-0 flex-1">
                              <p className="font-mono font-semibold text-navy">{i.order_sn ?? "-"}</p>
                              <p className="text-xs text-slate-500">{[date(i.date), shops.length > 1 ? i.shop : null, i.detail].filter(Boolean).join(" · ")}</p>
                            </div>
                            <span className="font-semibold text-navy">{rupiah(i.amount)}</span>
                            {i.order_id && <Link href={`/marketplace/orders/${i.order_id}`} className="flex items-center gap-1 text-xs font-semibold text-brand-600">Detail<ExternalLink size={12} /></Link>}
                          </div>
                        ))}
                        {k.count > k.items.length && <p className="px-4 py-2.5 text-xs text-slate-400">+{k.count - k.items.length} pesanan lain</p>}
                      </div>
                    </div>
                  )}
                </Panel>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}
