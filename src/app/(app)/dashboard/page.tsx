"use client";
import {
  AlertTriangle, ArrowDownRight, ArrowUpRight, Banknote, Bell, CheckCircle2, ChevronRight, Clock, Megaphone, MessageCircle,
  Package, Printer, ShoppingBag, ShoppingCart, SquareTerminal, Truck, UserPlus, Wallet,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { ChannelBadge } from "@/components/ChannelBadge";
import { ORDERS_EVENT } from "@/components/NotificationBell";
import { api, fmtDate, rupiah } from "@/lib/api";

type Sum = { revenue: number; net_profit: number; margin: number; orders: number; items: number; ads: number; roas: number | null; fees: number; cogs: number; aov: number };
type Data = {
  days: number;
  actions: { pending: number; confirm_transfer: number; shopee_to_ship: number; shopee_to_print: number; abandoned_today: number };
  summary: Sum; previous: Sum; missing_cost_orders: number;
  daily: { date: string; revenue: number; net: number; ads: number }[];
  by_channel: { key: string; label: string; orders: number; revenue: number; net_profit: number }[];
  top_products: { name: string; qty: number; revenue: number; margin: number | null }[];
  onboarding: Record<string, boolean>;
  recent_orders: any[];
};

const C_REVENUE = "#4263c9";
const C_NET = "#e05510";
const RANGES: [number, string][] = [[1, "Hari ini"], [7, "7 hari"], [30, "30 hari"], [90, "90 hari"]];
const short = (n: number) => {
  const a = Math.abs(n), s = n < 0 ? "-" : "";
  return a >= 1e9 ? `${s}${(a / 1e9).toFixed(1).replace(".", ",")} M` : a >= 1e6 ? `${s}${(a / 1e6).toFixed(1).replace(".", ",")} jt` : a >= 1e3 ? `${s}${Math.round(a / 1e3)} rb` : `${s}${a}`;
};

const STEPS: { key: string; title: string; href: string; icon: LucideIcon }[] = [
  { key: "product", title: "Tambahkan produk", href: "/products/new", icon: Package },
  { key: "order", title: "Dapatkan pesanan pertama", href: "/orders", icon: Truck },
  { key: "tracking", title: "Kirim & lacak resi", href: "/orders", icon: SquareTerminal },
  { key: "followup", title: "Atur follow up WhatsApp", href: "/settings/followup", icon: MessageCircle },
  { key: "address", title: "Lengkapi alamat pickup", href: "/settings/addresses", icon: Bell },
  { key: "whatsapp", title: "Isi WhatsApp & rekening", href: "/settings/account", icon: UserPlus },
];

export default function Dashboard() {
  const [days, setDays] = useState(7);
  const [d, setD] = useState<Data | null>(null);
  const [hideSetup, setHideSetup] = useState(true);

  const load = useCallback(() => { api<Data>(`/dashboard?days=${days}`).then(setD); }, [days]);
  useEffect(() => { load(); }, [load]);
  useEffect(() => { window.addEventListener(ORDERS_EVENT, load); return () => window.removeEventListener(ORDERS_EVENT, load); }, [load]);
  useEffect(() => { try { setHideSetup(localStorage.getItem("formku_skip_tutorial") === "1"); } catch { setHideSetup(false); } }, []);

  const s = d?.summary, p = d?.previous;
  const doneSteps = d ? STEPS.filter((x) => d.onboarding[x.key]).length : STEPS.length;
  const actions: { n: number; label: string; href: string; icon: LucideIcon; tone: string }[] = d ? [
    { n: d.actions.shopee_to_ship, label: "Pesanan Shopee perlu dikirim", href: "/marketplace/orders", icon: Truck, tone: "bg-orange-50 text-[#ee4d2d]" },
    { n: d.actions.shopee_to_print, label: "Resi Shopee siap dicetak", href: "/marketplace/orders", icon: Printer, tone: "bg-sky-50 text-sky-600" },
    { n: d.actions.pending, label: "Pesanan web tertunda", href: "/orders?status=pending", icon: Clock, tone: "bg-amber-50 text-amber-600" },
    { n: d.actions.confirm_transfer, label: "Transfer perlu dikonfirmasi", href: "/orders?payment_method=bank_transfer&payment_status=unpaid", icon: Banknote, tone: "bg-emerald-50 text-emerald-600" },
    { n: d.actions.abandoned_today, label: "Checkout ditinggalkan hari ini", href: "/orders?view=abandoned", icon: ShoppingCart, tone: "bg-rose-50 text-rose-600" },
  ] : [];

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-[30px] font-bold text-slate-800">Dashboard</h1>
          <p className="text-sm text-slate-500">Ringkasan semua channel: Checkout Web, input manual, dan Shopee.</p>
        </div>
        <div className="flex rounded-xl bg-white p-1">
          {RANGES.map(([n, l]) => (
            <button key={n} onClick={() => setDays(n)} className={`h-9 rounded-lg px-3.5 text-sm font-semibold transition ${days === n ? "bg-navy text-white" : "text-slate-600 hover:bg-slate-100"}`}>{l}</button>
          ))}
        </div>
      </div>

      {/* Perlu tindakan */}
      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
        {(d ? actions : Array.from({ length: 5 })).map((a: any, i) => a ? (
          <Link key={a.label} href={a.href} className={`group flex items-center gap-3 rounded-xl bg-white p-3.5 transition hover:bg-slate-50 ${a.n === 0 ? "opacity-60" : ""}`}>
            <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${a.tone}`}><a.icon size={19} /></span>
            <span className="min-w-0 flex-1"><b className="block text-xl leading-tight text-navy">{a.n}</b><span className="block text-xs leading-snug text-slate-500">{a.label}</span></span>
            <ChevronRight size={16} className="shrink-0 text-slate-300 transition group-hover:text-slate-500" />
          </Link>
        ) : <div key={i} className="h-[68px] animate-pulse rounded-xl bg-white" />)}
      </section>

      {/* Angka utama */}
      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
        <Kpi icon={Wallet} label="Omset" value={s && rupiah(s.revenue)} now={s?.revenue} prev={p?.revenue} hint={s && `${s.items} item terjual`} />
        <Kpi icon={Banknote} label="Laba bersih" value={s && rupiah(s.net_profit)} now={s?.net_profit} prev={p?.net_profit} hint={s && `Margin ${String(s.margin).replace(".", ",")}%`} strong />
        <Kpi icon={ShoppingBag} label="Pesanan" value={s && String(s.orders)} now={s?.orders} prev={p?.orders} hint={s && `Rata-rata ${rupiah(s.aov)}`} />
        <Kpi icon={Megaphone} label="Biaya iklan" value={s && rupiah(s.ads)} now={s?.ads} prev={p?.ads} invert hint={s && (s.roas ? `ROAS ${String(s.roas).replace(".", ",")}x` : "Belum ada biaya iklan")} />
        <Kpi icon={Package} label="HPP + potongan" value={s && rupiah(s.cogs + s.fees)} now={s ? s.cogs + s.fees : undefined} prev={p ? p.cogs + p.fees : undefined} invert hint={s && `HPP ${short(s.cogs)} · admin ${short(s.fees)}`} />
      </section>

      {d && d.missing_cost_orders > 0 && (
        <Link href="/marketplace/products?cost=empty" className="flex items-center gap-2 rounded-xl bg-amber-50 px-4 py-3 text-sm text-amber-800">
          <AlertTriangle size={16} className="shrink-0" />{d.missing_cost_orders} pesanan berisi produk tanpa HPP, jadi laba bersih terlihat lebih tinggi dari aslinya.<b className="ml-auto whitespace-nowrap">Isi HPP</b><ChevronRight size={15} />
        </Link>
      )}

      <div className="grid gap-5 xl:grid-cols-[1fr_380px]">
        <section className="rounded-xl bg-white p-5">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <div><h2 className="font-bold text-navy">Omset & laba bersih</h2><p className="text-xs text-slate-500">Laba bersih = omset − potongan admin − HPP − biaya iklan</p></div>
            <div className="flex gap-4 text-xs text-slate-600">
              <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-sm" style={{ background: C_REVENUE }} />Omset</span>
              <span className="flex items-center gap-1.5"><span className="h-0.5 w-4 rounded" style={{ background: C_NET }} />Laba bersih</span>
            </div>
          </div>
          {d ? <TrendChart rows={d.daily} /> : <div className="h-64 animate-pulse rounded-lg bg-slate-50" />}
        </section>

        <section className="rounded-xl bg-white p-5">
          <div className="mb-3 flex items-center justify-between"><h2 className="font-bold text-navy">Sumber pesanan</h2><Link href="/reports/profit" className="text-xs font-semibold text-brand-600">Detail laba</Link></div>
          {d && !d.by_channel.length && <p className="py-10 text-center text-sm text-slate-400">Belum ada pesanan di periode ini.</p>}
          <ul className="space-y-3.5">
            {d?.by_channel.slice(0, 6).map((c) => {
              const max = Math.max(...d.by_channel.map((x) => x.revenue), 1);
              return (
                <li key={c.key}>
                  <div className="flex items-baseline justify-between gap-2 text-sm">
                    <span className="truncate text-slate-700" title={c.label}>{c.label.replace(/Shopee · OpenSANDBOX\w+/, "Shopee · Toko sandbox")}</span>
                    <b className="whitespace-nowrap text-navy">{short(c.revenue)}</b>
                  </div>
                  <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-slate-100"><div className="h-full rounded-full" style={{ width: `${(c.revenue / max) * 100}%`, background: C_REVENUE }} /></div>
                  <p className="mt-1 flex justify-between text-xs text-slate-500">
                    <span>{c.orders} pesanan</span>
                    <span className={c.net_profit < 0 ? "flex items-center gap-1 font-semibold text-rose-600" : ""}>{c.net_profit < 0 && <AlertTriangle size={12} />}{c.net_profit < 0 ? "Rugi " : "Laba "}{short(Math.abs(c.net_profit))}</span>
                  </p>
                </li>
              );
            })}
          </ul>
        </section>
      </div>

      <div className="grid gap-5 xl:grid-cols-2">
        <section className="rounded-xl bg-white p-5">
          <div className="mb-3 flex items-center justify-between"><h2 className="font-bold text-navy">Produk terlaris</h2><Link href="/reports/research" className="text-xs font-semibold text-brand-600">Riset produk</Link></div>
          {d && !d.top_products.length && <p className="py-10 text-center text-sm text-slate-400">Belum ada penjualan.</p>}
          <table className="w-full text-sm">
            {!!d?.top_products.length && <thead className="text-left text-xs text-slate-400"><tr><th className="pb-2 font-medium">Produk</th><th className="pb-2 text-right font-medium">Terjual</th><th className="pb-2 text-right font-medium">Omset</th><th className="pb-2 text-right font-medium">Margin</th></tr></thead>}
            <tbody className="divide-y divide-slate-100">
              {d?.top_products.map((t, i) => (
                <tr key={t.name + i}>
                  <td className="py-2.5 pr-2"><span className="flex items-center gap-2"><span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-slate-100 text-xs font-bold text-slate-500">{i + 1}</span><span className="line-clamp-1 text-slate-700">{t.name}</span></span></td>
                  <td className="py-2.5 text-right text-slate-600">{t.qty}</td>
                  <td className="py-2.5 text-right font-semibold text-navy">{short(t.revenue)}</td>
                  <td className={`py-2.5 text-right ${t.margin === null ? "text-slate-300" : t.margin < 15 ? "font-semibold text-rose-600" : "text-slate-600"}`}>{t.margin === null ? "-" : `${t.margin}%`}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>

        <section className="rounded-xl bg-white p-5">
          <div className="mb-3 flex items-center justify-between"><h2 className="font-bold text-navy">Pesanan terbaru</h2><Link href="/orders" className="text-xs font-semibold text-brand-600">Semua pesanan</Link></div>
          {d && !d.recent_orders.length && <p className="py-10 text-center text-sm text-slate-400">Belum ada pesanan.</p>}
          <ul className="divide-y divide-slate-100">
            {d?.recent_orders.map((o) => (
              <li key={o.id}>
                <Link href={o.channel === "shopee" ? "/marketplace/orders" : "/orders"} className="flex items-center gap-3 py-2.5 hover:bg-slate-50">
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-slate-700">{o.channel === "shopee" ? (o.items?.[0]?.name ?? o.external_order_sn) : (o.customer_name || o.code)}</p>
                    <div className="mt-0.5 flex items-center gap-2 text-xs text-slate-400"><ChannelBadge channel={o.channel} shop={o.marketplace_shop?.shop_name} utm={o.utm_source} /><span>{fmtDate(o.created_at)}</span></div>
                  </div>
                  <b className="whitespace-nowrap text-sm text-navy">{rupiah(o.total)}</b>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      </div>

      {!hideSetup && doneSteps < STEPS.length && (
        <section className="rounded-xl bg-white p-5">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <div><h2 className="font-bold text-navy">Lengkapi pengaturan toko</h2><p className="text-xs text-slate-500">{doneSteps} dari {STEPS.length} langkah selesai</p></div>
            <button onClick={() => { setHideSetup(true); try { localStorage.setItem("formku_skip_tutorial", "1"); } catch {} }} className="text-xs font-semibold text-slate-500 hover:text-navy">Sembunyikan</button>
          </div>
          <div className="mb-4 h-2 overflow-hidden rounded-full bg-slate-100"><div className="h-full rounded-full bg-brand-500" style={{ width: `${(doneSteps / STEPS.length) * 100}%` }} /></div>
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {STEPS.map((x) => {
              const ok = d?.onboarding[x.key];
              return (
                <Link key={x.key} href={x.href} className={`flex items-center gap-3 rounded-lg p-3 text-sm ${ok ? "text-slate-400" : "bg-slate-50 text-slate-700 hover:bg-slate-100"}`}>
                  {ok ? <CheckCircle2 size={18} className="text-emerald-600" /> : <x.icon size={18} className="text-brand-600" />}
                  <span className={ok ? "line-through" : "font-medium"}>{x.title}</span>
                </Link>
              );
            })}
          </div>
        </section>
      )}
    </div>
  );
}

/** KPI tile with change vs the previous period of the same length. `invert`: a rise is bad (costs). */
function Kpi({ icon: Icon, label, value, now, prev, hint, invert, strong }: { icon: LucideIcon; label: string; value?: string | false; now?: number; prev?: number; hint?: string | false; invert?: boolean; strong?: boolean }) {
  const has = now !== undefined && prev !== undefined;
  const pct = has && prev !== 0 ? ((now! - prev!) / Math.abs(prev!)) * 100 : null;
  const up = has && now! > prev!;
  const good = has && now !== prev && (invert ? !up : up);
  const Arrow = up ? ArrowUpRight : ArrowDownRight;
  return (
    <div className={`rounded-xl p-4 ${strong ? "bg-navy text-white" : "bg-white"}`}>
      <p className={`flex items-center gap-2 text-sm ${strong ? "text-white/70" : "text-slate-500"}`}><Icon size={16} />{label}</p>
      {value ? <p className={`mt-2 truncate text-[22px] font-bold leading-tight ${strong ? "" : "text-navy"}`}>{value}</p> : <div className="mt-2 h-7 w-32 animate-pulse rounded bg-slate-100" />}
      <div className="mt-1.5 flex flex-wrap items-center justify-between gap-x-2 gap-y-1 text-xs">
        <span className={strong ? "text-white/60" : "text-slate-400"}>{hint}</span>
        {has && now !== prev && (
          <span className={`flex items-center gap-0.5 font-semibold ${good ? (strong ? "text-emerald-300" : "text-emerald-600") : (strong ? "text-rose-300" : "text-rose-600")}`} title="Dibanding periode sebelumnya">
            <Arrow size={13} />{pct === null ? "baru" : `${Math.abs(pct) >= 1000 ? ">999" : Math.round(Math.abs(pct))}%`}
          </span>
        )}
      </div>
    </div>
  );
}

/** Daily revenue bars + net profit line on one rupiah axis, with a hover tooltip per day. */
function TrendChart({ rows }: { rows: Data["daily"] }) {
  const [hover, setHover] = useState<number | null>(null);
  const W = 720, H = 260, P = { l: 52, r: 12, t: 12, b: 26 };
  const max = Math.max(1, ...rows.map((r) => Math.max(r.revenue, r.net)));
  const min = Math.min(0, ...rows.map((r) => r.net));
  const y = (v: number) => P.t + ((max - v) / (max - min)) * (H - P.t - P.b);
  const bw = (W - P.l - P.r) / Math.max(1, rows.length);
  const x = (i: number) => P.l + i * bw + bw / 2;
  const barW = Math.max(2, Math.min(28, bw - 4));
  const ticks = [0, 0.25, 0.5, 0.75, 1].map((f) => min + (max - min) * f);
  const line = rows.map((r, i) => `${i ? "L" : "M"}${x(i)},${y(r.net)}`).join(" ");
  const labelEvery = Math.ceil(rows.length / 8);
  const h = hover !== null ? rows[hover] : null;
  const dayLabel = (s: string) => new Date(s + "T00:00").toLocaleDateString("id-ID", { day: "numeric", month: "short" });

  if (rows.every((r) => !r.revenue && !r.net)) return <p className="flex h-64 items-center justify-center text-sm text-slate-400">Belum ada penjualan di periode ini.</p>;
  return (
    <div className="relative">
      <svg viewBox={`0 0 ${W} ${H}`} className="h-64 w-full" role="img" aria-label="Grafik omset dan laba bersih harian" onMouseLeave={() => setHover(null)}>
        {ticks.map((t) => (
          <g key={t}>
            <line x1={P.l} x2={W - P.r} y1={y(t)} y2={y(t)} stroke={Math.abs(t) < 1 ? "#cbd5e1" : "#eef2f6"} strokeWidth="1" />
            <text x={P.l - 8} y={y(t) + 4} textAnchor="end" fontSize="11" fill="#94a3b8">{short(Math.round(t))}</text>
          </g>
        ))}
        {rows.map((r, i) => (
          <g key={r.date}>
            {hover === i && <rect x={x(i) - bw / 2} y={P.t} width={bw} height={H - P.t - P.b} fill="#f1f5f9" />}
            {r.revenue > 0 && <path d={`M${x(i) - barW / 2},${y(0)} V${y(r.revenue) + 4} q0,-4 4,-4 h${barW - 8} q4,0 4,4 V${y(0)} Z`} fill={C_REVENUE} opacity={hover === null || hover === i ? 1 : 0.55} />}
            {(i % labelEvery === 0 || rows.length <= 8) && <text x={x(i)} y={H - 6} textAnchor="middle" fontSize="11" fill="#94a3b8">{rows.length === 1 ? "Hari ini" : dayLabel(r.date)}</text>}
          </g>
        ))}
        {rows.length > 1 && <path d={line} fill="none" stroke={C_NET} strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />}
        {rows.map((r, i) => (rows.length <= 31 || hover === i) && <circle key={r.date} cx={x(i)} cy={y(r.net)} r={hover === i ? 5 : 3.5} fill={C_NET} stroke="white" strokeWidth="2" />)}
        {rows.map((r, i) => <rect key={r.date} x={x(i) - bw / 2} y={0} width={bw} height={H} fill="transparent" onMouseEnter={() => setHover(i)} />)}
      </svg>
      {h && (
        <div className="pointer-events-none absolute top-2 z-10 w-48 rounded-lg bg-navy px-3 py-2 text-xs text-white shadow-lg" style={{ left: `clamp(0px, calc(${(x(hover!) / W) * 100}% - 96px), calc(100% - 192px))` }}>
          <p className="mb-1 font-semibold">{new Date(h.date + "T00:00").toLocaleDateString("id-ID", { weekday: "long", day: "numeric", month: "long" })}</p>
          <p className="flex justify-between"><span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-sm" style={{ background: C_REVENUE }} />Omset</span>{rupiah(h.revenue)}</p>
          <p className="flex justify-between"><span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full" style={{ background: C_NET }} />Laba bersih</span>{rupiah(h.net)}</p>
          {h.ads > 0 && <p className="flex justify-between text-white/60"><span>Biaya iklan</span>{rupiah(h.ads)}</p>}
        </div>
      )}
    </div>
  );
}
