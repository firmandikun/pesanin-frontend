"use client";

import { AlertTriangle, CreditCard, MessageCircle, Package, Store, TrendingUp, UserPlus, Users } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { ShopeeMark } from "@/components/ChannelBadge";
import { Panel } from "@/components/kit";
import { api, rupiah } from "@/lib/api";

type Overview = {
  users: { total: number; paying: number; new_7d: number; new_30d: number; suspended: number; expiring_7d: number };
  mrr: number;
  by_plan: { plan: string; name: string; users: number; mrr: number }[];
  billing: { revenue_30d: number; unpaid: number; unpaid_total: number };
  usage: { orders_30d: number; gmv_30d: number; shopee_orders_30d: number; shops: number; shops_error: number; whatsapp: number };
  daily: { date: string; signups: number; revenue: number }[];
  recent_users: { id: number; name: string; email: string; store_name: string; plan: string; created_at: string }[];
  recent_payments: { id: number; number: string; plan: string; billing: string; total: number; paid_at: string; user: { name: string; store_name: string } | null }[];
};

const PLAN_TONE: Record<string, string> = { gratis: "bg-slate-300", starter: "bg-sky-500", bisnis: "bg-brand-500", pro: "bg-violet-500" };
const fmt = (d: string) => new Date(d).toLocaleDateString("id-ID", { day: "numeric", month: "short" });

export default function AdminOverview() {
  const [d, setD] = useState<Overview | null>(null);
  useEffect(() => { api<Overview>("/admin/overview").then(setD); }, []);
  if (!d) return <p className="py-24 text-center text-slate-400">Memuat ringkasan…</p>;

  const maxSign = Math.max(1, ...d.daily.map((x) => x.signups));
  const maxRev = Math.max(1, ...d.daily.map((x) => x.revenue));
  const stats: [React.ElementType, string, string, string, string][] = [
    [TrendingUp, "MRR", rupiah(d.mrr), `${d.users.paying} pelanggan berbayar`, "bg-emerald-50 text-emerald-600"],
    [Users, "Total seller", d.users.total.toLocaleString("id-ID"), `+${d.users.new_7d} minggu ini · +${d.users.new_30d} 30 hari`, "bg-sky-50 text-sky-600"],
    [CreditCard, "Pendapatan 30 hari", rupiah(d.billing.revenue_30d), `${d.billing.unpaid} tagihan menunggu (${rupiah(d.billing.unpaid_total)})`, "bg-brand-50 text-brand-600"],
    [Package, "Pesanan diproses 30 hari", d.usage.orders_30d.toLocaleString("id-ID"), `GMV ${rupiah(d.usage.gmv_30d)} · Shopee ${d.usage.shopee_orders_30d.toLocaleString("id-ID")}`, "bg-violet-50 text-violet-600"],
  ];

  return (
    <div className="space-y-6">
      <div><h1 className="text-2xl font-extrabold text-navy">Ringkasan platform</h1><p className="text-sm text-slate-500">Kondisi bisnis Pesanin hari ini.</p></div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {stats.map(([Icon, l, v, sub, tone]) => <Panel key={l} className="flex gap-3 p-5"><span className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${tone}`}><Icon size={20} /></span><div className="min-w-0"><p className="text-xs text-slate-500">{l}</p><p className="text-xl font-extrabold text-navy">{v}</p><p className="truncate text-xs text-slate-500">{sub}</p></div></Panel>)}
      </div>

      {(d.usage.shops_error > 0 || d.users.expiring_7d > 0 || d.billing.unpaid > 0) && (
        <div className="grid gap-3 md:grid-cols-3">
          {d.usage.shops_error > 0 && <Link href="/admin/shops?status=error" className="flex items-center gap-2 rounded-xl bg-rose-50 p-3 text-sm font-medium text-rose-700"><AlertTriangle size={16} />{d.usage.shops_error} toko Shopee gagal sinkron</Link>}
          {d.users.expiring_7d > 0 && <Link href="/admin/users?status=expiring" className="flex items-center gap-2 rounded-xl bg-amber-50 p-3 text-sm font-medium text-amber-800"><AlertTriangle size={16} />{d.users.expiring_7d} paket berakhir dalam 7 hari</Link>}
          {d.billing.unpaid > 0 && <Link href="/admin/invoices?status=unpaid" className="flex items-center gap-2 rounded-xl bg-sky-50 p-3 text-sm font-medium text-sky-800"><CreditCard size={16} />{d.billing.unpaid} tagihan menunggu pembayaran</Link>}
        </div>
      )}

      <div className="grid gap-5 xl:grid-cols-[1fr_380px]">
        <Panel className="p-5">
          <h2 className="font-bold text-navy">Pendaftaran & pendapatan 30 hari</h2>
          <div className="mt-5 flex h-48 items-end gap-1">
            {d.daily.map((x) => (
              <div key={x.date} className="flex h-full min-w-0 flex-1 flex-col justify-end gap-0.5" title={`${x.date} · ${x.signups} daftar · ${rupiah(x.revenue)}`}>
                <div className="rounded-t bg-brand-300" style={{ height: `${(x.revenue / maxRev) * 70}%` }} />
                <div className="rounded-t bg-sky-500" style={{ height: `${Math.max(x.signups ? 4 : 0, (x.signups / maxSign) * 30)}%` }} />
              </div>
            ))}
          </div>
          <div className="mt-3 flex justify-between text-[11px] text-slate-400"><span>{fmt(d.daily[0].date)}</span><span className="flex gap-4"><span><i className="mr-1 inline-block h-2 w-2 bg-brand-300" />Pendapatan</span><span><i className="mr-1 inline-block h-2 w-2 bg-sky-500" />Pendaftar</span></span><span>{fmt(d.daily[d.daily.length - 1].date)}</span></div>
        </Panel>
        <Panel className="p-5">
          <h2 className="font-bold text-navy">Pengguna per paket</h2>
          <div className="mt-4 flex h-3 overflow-hidden rounded-full bg-slate-100">{d.by_plan.map((p) => <div key={p.plan} className={PLAN_TONE[p.plan]} style={{ width: `${(p.users / Math.max(1, d.users.total)) * 100}%` }} />)}</div>
          <div className="mt-4 space-y-3 text-sm">
            {d.by_plan.map((p) => <div key={p.plan} className="flex items-center justify-between"><span className="flex items-center gap-2"><i className={`h-2.5 w-2.5 rounded-full ${PLAN_TONE[p.plan]}`} />{p.name}</span><span className="text-slate-500"><b className="text-navy">{p.users}</b> · {rupiah(p.mrr)}/bln</span></div>)}
          </div>
          <div className="mt-5 grid grid-cols-2 gap-2 border-t border-slate-100 pt-4 text-xs">
            <span className="flex items-center gap-2 rounded-lg bg-slate-50 p-2.5"><ShopeeMark size={18} /><span><b className="block text-sm text-navy">{d.usage.shops}</b>toko terhubung</span></span>
            <span className="flex items-center gap-2 rounded-lg bg-slate-50 p-2.5"><MessageCircle size={18} className="text-emerald-600" /><span><b className="block text-sm text-navy">{d.usage.whatsapp}</b>WhatsApp aktif</span></span>
          </div>
        </Panel>
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        <Panel className="overflow-hidden">
          <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4"><h2 className="flex items-center gap-2 font-bold text-navy"><UserPlus size={17} />Pendaftar terbaru</h2><Link href="/admin/users" className="text-sm font-semibold text-brand-600">Semua</Link></div>
          <div className="divide-y divide-slate-100">{d.recent_users.map((u) => <Link key={u.id} href={`/admin/users?open=${u.id}`} className="flex items-center justify-between px-5 py-3 text-sm hover:bg-slate-50"><span className="min-w-0"><b className="block truncate text-navy">{u.store_name || u.name}</b><span className="text-xs text-slate-500">{u.email}</span></span><span className="text-right text-xs text-slate-500"><span className="block font-semibold capitalize text-navy">{u.plan}</span>{fmt(u.created_at)}</span></Link>)}</div>
        </Panel>
        <Panel className="overflow-hidden">
          <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4"><h2 className="flex items-center gap-2 font-bold text-navy"><Store size={17} />Pembayaran terbaru</h2><Link href="/admin/invoices?status=paid" className="text-sm font-semibold text-brand-600">Semua</Link></div>
          <div className="divide-y divide-slate-100">{d.recent_payments.length ? d.recent_payments.map((p) => <div key={p.id} className="flex items-center justify-between px-5 py-3 text-sm"><span className="min-w-0"><b className="block truncate text-navy">{p.user?.store_name || p.user?.name}</b><span className="text-xs text-slate-500">{p.number} · <span className="capitalize">{p.plan}</span> {p.billing === "yearly" ? "tahunan" : "bulanan"}</span></span><span className="text-right"><b className="block text-emerald-600">{rupiah(p.total)}</b><span className="text-xs text-slate-500">{fmt(p.paid_at)}</span></span></div>) : <p className="px-5 py-10 text-center text-sm text-slate-400">Belum ada pembayaran.</p>}</div>
        </Panel>
      </div>
    </div>
  );
}
