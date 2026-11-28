"use client";
import { Clock, Info, Lightbulb, Loader2 } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { PageHead, Panel } from "@/components/kit";
import { Select } from "@/components/Select";
import { api, rupiah } from "@/lib/api";

type Cell = { orders: number; revenue: number };
type Data = {
  grid: Cell[][]; by_hour: number[]; by_day: number[]; days: string[]; tips: string[];
  summary: { orders: number; revenue: number; days: number; max_cell: number };
};
type Shop = { id: number; shop_name: string; platform?: string; status: string; is_demo: boolean };

const hh = (h: number) => `${String(h % 24).padStart(2, "0")}.00`;
/** Brand orange at an opacity that grows with the number of orders (0 = empty). */
const shade = (n: number, max: number) => (n ? `rgba(254, 85, 27, ${0.12 + 0.88 * (n / Math.max(1, max))})` : undefined);

/**
 * Peta Jam Ramai: when buyers order (day of the week × hour, WIB). Shows the busiest hours and days with tips for
 * timing flash sales, ad budgets and broadcasts.
 */
export default function OrderHoursPage() {
  const [d, setD] = useState<Data | null>(null);
  const [shops, setShops] = useState<Shop[]>([]);
  const [shop, setShop] = useState("");
  const [days, setDays] = useState("30");
  const [channel, setChannel] = useState<"shopee" | "all">("shopee");
  const [metric, setMetric] = useState<"orders" | "revenue">("orders");
  const [hover, setHover] = useState<{ d: number; h: number } | null>(null);

  useEffect(() => {
    api<{ shops: Shop[] }>("/marketplace/shops").then((r) => setShops(r.shops.filter((x) => (x.platform ?? "shopee") === "shopee" && x.status !== "disconnected" && !x.is_demo))).catch(() => {});
  }, []);
  const load = useCallback(() => {
    setD(null);
    const qs = new URLSearchParams({ days, channel, ...(shop ? { shop_id: shop } : {}) });
    api<Data>(`/marketplace/listings/order-hours?${qs}`).then(setD).catch(() => setD(null));
  }, [days, channel, shop]);
  useEffect(() => { load(); }, [load]);

  const max = useMemo(() => (d ? Math.max(1, ...d.grid.flat().map((c) => c[metric])) : 1), [d, metric]);
  const maxHour = d ? Math.max(1, ...d.by_hour) : 1;
  const cell = hover && d ? d.grid[hover.d][hover.h] : null;

  return (
    <div className="space-y-5">
      <PageHead title="Jam Ramai Pesanan" tutorial={false} crumbs={[["Marketplace"], ["Jam Ramai"]]} />

      <Panel className="flex flex-wrap items-center gap-2 p-4">
        <Select className="input w-36" value={days} onChange={(e) => setDays(e.target.value)}>
          {[7, 30, 60, 90].map((v) => <option key={v} value={v}>{v} hari terakhir</option>)}
        </Select>
        <Select className="input w-44" value={channel} onChange={(e) => { setChannel(e.target.value as typeof channel); setShop(""); }}>
          <option value="shopee">Pesanan Shopee</option><option value="all">Semua pesanan</option>
        </Select>
        {channel === "shopee" && shops.length > 1 && (
          <Select className="input w-48" value={shop} onChange={(e) => setShop(e.target.value)}>
            <option value="">Semua toko ({shops.length})</option>{shops.map((x) => <option key={x.id} value={x.id}>{x.shop_name}</option>)}
          </Select>
        )}
        <div className="ml-auto flex rounded-lg bg-slate-100 p-0.5 text-xs font-semibold">
          {(["orders", "revenue"] as const).map((m) => (
            <button key={m} onClick={() => setMetric(m)} className={`h-8 rounded-md px-3 ${metric === m ? "bg-white text-navy shadow-sm" : "text-slate-500"}`}>{m === "orders" ? "Jumlah pesanan" : "Omzet"}</button>
          ))}
        </div>
      </Panel>

      {!d && <p className="py-14 text-center text-slate-400"><Loader2 size={18} className="mx-auto animate-spin" /></p>}

      {d && (
        <>
          {d.tips.length > 0 && (
            <Panel className="p-4">
              <p className="mb-2 flex items-center gap-1.5 text-sm font-bold text-navy"><Lightbulb size={16} className="text-amber-500" />Saran waktu promo</p>
              <ul className="space-y-1.5 text-sm text-slate-700">{d.tips.map((t) => <li key={t} className="flex gap-2"><span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-brand-600" />{t}</li>)}</ul>
            </Panel>
          )}

          <Panel className="p-4">
            <div className="mb-3 flex flex-wrap items-baseline justify-between gap-2">
              <p className="text-sm text-slate-600"><b className="text-navy">{d.summary.orders.toLocaleString("id-ID")}</b> pesanan · {rupiah(d.summary.revenue)} dalam {d.summary.days} hari</p>
              <p className="flex h-5 items-center gap-1.5 text-xs text-slate-500">
                {cell && hover ? <><Clock size={12} />{d.days[hover.d]} {hh(hover.h)}–{hh(hover.h + 1)}: <b className="text-navy">{cell.orders} pesanan</b> · {rupiah(cell.revenue)}</> : "Arahkan kursor ke kotak untuk detail"}
              </p>
            </div>
            {!d.summary.orders ? (
              <p className="py-10 text-center text-sm text-slate-500">Belum ada pesanan di periode ini.</p>
            ) : (
              <div className="overflow-x-auto">
                <div className="grid min-w-[760px] gap-[3px]" style={{ gridTemplateColumns: "64px repeat(24, minmax(0, 1fr)) 56px" }} onMouseLeave={() => setHover(null)}>
                  <span />
                  {Array.from({ length: 24 }, (_, h) => <span key={h} className="text-center text-[10px] text-slate-400">{h % 3 === 0 ? hh(h).slice(0, 2) : ""}</span>)}
                  <span className="text-right text-[10px] text-slate-400">Total</span>
                  {d.grid.map((row, di) => (
                    <div key={di} className="contents">
                      <span className="flex items-center text-xs font-medium text-slate-600">{d.days[di]}</span>
                      {row.map((c, h) => (
                        <span key={h} onMouseEnter={() => setHover({ d: di, h })}
                          className={`aspect-square rounded-[4px] ${c.orders ? "" : "bg-slate-50"} ${hover?.d === di && hover.h === h ? "ring-2 ring-navy" : ""}`}
                          style={{ background: shade(c[metric], max) }} title={`${d.days[di]} ${hh(h)}: ${c.orders} pesanan`} />
                      ))}
                      <span className="flex items-center justify-end text-xs font-semibold text-navy">{d.by_day[di]}</span>
                    </div>
                  ))}
                  <span className="pt-2 text-xs text-slate-500">Per jam</span>
                  {d.by_hour.map((n, h) => (
                    <span key={h} className="flex h-14 items-end pt-2" title={`${hh(h)}: ${n} pesanan`}>
                      <span className="w-full rounded-t-[3px] bg-brand-600/70" style={{ height: `${(n / maxHour) * 100}%` }} />
                    </span>
                  ))}
                  <span />
                </div>
                <div className="mt-3 flex items-center justify-end gap-1.5 text-[11px] text-slate-500">
                  Sepi {[0.12, 0.35, 0.6, 0.8, 1].map((a) => <span key={a} className="h-3 w-3 rounded-[3px]" style={{ background: `rgba(254, 85, 27, ${a})` }} />)} Ramai
                </div>
              </div>
            )}
          </Panel>

          <p className="flex items-start gap-2 rounded-xl bg-sky-50 p-3 text-xs text-sky-800"><Info size={14} className="mt-0.5 shrink-0" />
            Jam memakai WIB dan waktu pesanan dibuat di Shopee (sama dengan Seller Centre). Pesanan batal tidak dihitung. Saran muncul setelah ada minimal 20 pesanan di periode yang dipilih.
          </p>
        </>
      )}
    </div>
  );
}
