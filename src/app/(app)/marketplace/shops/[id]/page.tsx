"use client";

import {
  AlertTriangle, ArrowRight, BarChart3, Boxes, CheckCircle2, ChevronRight, CircleDollarSign,
  LayoutDashboard, Loader2, Megaphone, Package, ReceiptText, RefreshCcw, ShoppingBag,
  Store, TrendingUp, WalletCards,
} from "lucide-react";
import Link from "next/link";
import { use, useCallback, useEffect, useMemo, useState } from "react";
import { ShopeeMark } from "@/components/ChannelBadge";
import { PageHead, Panel } from "@/components/kit";
import { api, isoDate, Order, Paginated, rupiah } from "@/lib/api";

type Shop = {
  id: number; shop_id: number; shop_name: string; region: string; status: string;
  listings_count: number; orders_count: number; last_error: string | null;
  products_synced_at: string | null; orders_synced_at: string | null;
};
type ListingData = { stats: { total: number; with_cost: number; out_of_stock: number; stock: number } };
type Profit = { summary: { orders: number; items: number; gmv: number; revenue: number; fees: number; cogs: number; ads: number; net_profit: number; margin: number; pending_fee_orders: number; missing_cost_orders: number } };

const statusLabel: Record<string, [string, string]> = {
  READY_TO_SHIP: ["Perlu dikirim", "bg-blue-50 text-blue-700"],
  PROCESSED: ["Siap diserahkan", "bg-amber-50 text-amber-700"],
  SHIPPED: ["Dalam pengiriman", "bg-indigo-50 text-indigo-700"],
  TO_CONFIRM_RECEIVE: ["Menunggu konfirmasi", "bg-violet-50 text-violet-700"],
  COMPLETED: ["Selesai", "bg-emerald-50 text-emerald-700"],
  CANCELLED: ["Dibatalkan", "bg-slate-100 text-slate-600"],
};

const ago = (value: string | null) => {
  if (!value) return "Belum pernah";
  const minutes = Math.max(0, Math.round((Date.now() - new Date(value).getTime()) / 60000));
  if (minutes < 1) return "Baru saja";
  if (minutes < 60) return `${minutes} menit lalu`;
  if (minutes < 1440) return `${Math.round(minutes / 60)} jam lalu`;
  return `${Math.round(minutes / 1440)} hari lalu`;
};

function StoreNav({ shop }: { shop: Shop }) {
  const items = [
    [LayoutDashboard, "Dashboard toko", `/marketplace/shops/${shop.id}`],
    [ReceiptText, "Transaksi", `/marketplace/shops/${shop.id}/transactions`],
    [ShoppingBag, "Pesanan", `/marketplace/orders?shop_id=${shop.id}`],
    [Boxes, "Inventori", `/marketplace/products?shop_id=${shop.id}`],
    [Megaphone, "Iklan", `/marketplace/ads?shop=${shop.id}`],
    [TrendingUp, "Laporan keuangan", `/marketplace/shops/${shop.id}/finance`],
  ] as const;
  return (
    <Panel className="overflow-x-auto p-2">
      <nav className="flex min-w-max gap-1">
        {items.map(([Icon, label, href], i) => (
          <Link key={label} href={href} className={`flex h-10 items-center gap-2 rounded-lg px-3.5 text-sm font-semibold ${i === 0 ? "bg-navy text-white" : "text-slate-600 hover:bg-slate-50 hover:text-navy"}`}>
            <Icon size={16} />{label}
          </Link>
        ))}
      </nav>
    </Panel>
  );
}

export default function ShopDashboard({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const shopId = Number(id);
  const [shop, setShop] = useState<Shop | null>(null);
  const [listing, setListing] = useState<ListingData["stats"] | null>(null);
  const [orders, setOrders] = useState<Order[]>([]);
  const [profit, setProfit] = useState<Profit["summary"] | null>(null);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [notice, setNotice] = useState("");

  const range = useMemo(() => ({ from: isoDate(new Date(Date.now() - 29 * 864e5)), to: isoDate(new Date()) }), []);
  const load = useCallback(async () => {
    setLoading(true);
    try {
      const shops = await api<{ shops: Shop[] }>("/marketplace/shops");
      const current = shops.shops.find((s) => s.id === shopId) ?? null;
      setShop(current);
      if (!current) return;
      const [l, o, p] = await Promise.all([
        api<ListingData>(`/marketplace/listings?shop_id=${shopId}&page=1&per_page=5`),
        api<{ orders: Paginated<Order> }>(`/orders?channel=shopee&marketplace_shop_id=${shopId}&page=1&per_page=5`),
        api<Profit>(`/reports/profit?channel=shopee&shop_id=${shopId}&from=${range.from}&to=${range.to}`),
      ]);
      setListing(l.stats); setOrders(o.orders.data); setProfit(p.summary);
    } finally { setLoading(false); }
  }, [range, shopId]);
  useEffect(() => { load(); }, [load]);

  const sync = async () => {
    setSyncing(true); setNotice("");
    try { await api(`/marketplace/shops/${shopId}/sync`, { method: "POST" }); setNotice("Produk, pesanan, dan iklan berhasil disinkronkan."); await load(); }
    catch { setNotice("Sinkronisasi belum berhasil. Silakan coba kembali."); }
    finally { setSyncing(false); }
  };

  if (loading && !shop) return <div className="py-24 text-center text-sm text-slate-400">Menyiapkan dashboard toko…</div>;
  if (!shop) return <Panel className="p-10 text-center"><Store className="mx-auto text-slate-300" size={36} /><h1 className="mt-3 font-bold text-navy">Toko tidak ditemukan</h1><Link href="/marketplace/shops" className="mt-3 inline-block text-sm font-semibold text-brand-600">Kembali ke daftar toko</Link></Panel>;

  const funnel = profit ? [
    ["Omzet", profit.gmv, "bg-emerald-500"], ["HPP", -profit.cogs, "bg-rose-400"],
    ["Potongan marketplace", -profit.fees, "bg-orange-400"], ["Biaya iklan", -profit.ads, "bg-violet-400"],
    ["Laba bersih", profit.net_profit, "bg-green-500"],
  ] as const : [];
  const featureCards = [
    [ReceiptText, "Transaksi", "Tinjau pendapatan, potongan, HPP, dan laba", `/marketplace/shops/${shop.id}/transactions`, "bg-sky-50 text-sky-600"],
    [Boxes, "Inventori", "Pantau stok, SKU, variasi, dan HPP produk", `/marketplace/products?shop_id=${shop.id}`, "bg-indigo-50 text-indigo-600"],
    [CircleDollarSign, "Pengeluaran", "UI pencatatan biaya operasional toko", `/reports/ads?shop_id=${shop.id}`, "bg-rose-50 text-rose-600"],
    [WalletCards, "Laporan keuangan", "Laba rugi, arus kas, dan profitabilitas produk", `/marketplace/shops/${shop.id}/finance`, "bg-emerald-50 text-emerald-600"],
    [Megaphone, "Iklan Shopee", "Belanja iklan, performa, ROAS, dan kampanye", `/marketplace/ads?shop=${shop.id}`, "bg-orange-50 text-orange-600"],
    [BarChart3, "Analitik", "Produk terlaris, margin, dan tren penjualan", `/reports/profit?channel=shopee&shop_id=${shop.id}`, "bg-violet-50 text-violet-600"],
  ] as const;

  return (
    <div className="space-y-5">
      <PageHead title={shop.shop_name} tutorial={false} crumbs={[["Marketplace", "/marketplace/shops"], ["Toko Shopee", "/marketplace/shops"], ["Dashboard toko"]]}>
        <button onClick={sync} disabled={syncing} className="flex h-10 items-center gap-2 rounded-lg bg-navy px-4 text-sm font-semibold text-white disabled:opacity-50">
          {syncing ? <Loader2 size={16} className="animate-spin" /> : <RefreshCcw size={16} />}Sinkronisasi data
        </button>
      </PageHead>

      <Panel className="flex flex-wrap items-center gap-4 p-4">
        <ShopeeMark size={44} />
        <div className="min-w-0 flex-1"><p className="font-bold text-navy">{shop.shop_name}</p><p className="text-sm text-slate-500">Shop ID {shop.shop_id} · {shop.region}</p></div>
        <span className={`rounded-full px-3 py-1 text-xs font-semibold ${shop.status === "active" ? "bg-emerald-50 text-emerald-700" : "bg-rose-50 text-rose-700"}`}>{shop.status === "active" ? "Terhubung" : "Perlu dihubungkan ulang"}</span>
        <span className="text-xs text-slate-500">Sinkron terakhir: <b className="text-slate-700">{ago(shop.orders_synced_at)}</b></span>
      </Panel>
      <StoreNav shop={shop} />

      {notice && <div className="flex items-center gap-2 rounded-xl bg-emerald-50 p-3 text-sm text-emerald-700"><CheckCircle2 size={16} />{notice}</div>}
      {shop.last_error && <div className="flex items-start gap-2 rounded-xl bg-rose-50 p-3 text-sm text-rose-700"><AlertTriangle size={16} className="mt-0.5" />{shop.last_error}</div>}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {[
          [ShoppingBag, "Omzet 30 hari", rupiah(profit?.gmv ?? 0), `${profit?.orders ?? 0} pesanan`, "bg-blue-50 text-blue-600"],
          [TrendingUp, "Laba bersih", rupiah(profit?.net_profit ?? 0), `Margin ${profit?.margin ?? 0}%`, "bg-emerald-50 text-emerald-600"],
          [Package, "Produk aktif", String(listing?.total ?? shop.listings_count), `${listing?.stock ?? 0} total stok`, "bg-violet-50 text-violet-600"],
          [Megaphone, "Biaya iklan", rupiah(profit?.ads ?? 0), "30 hari terakhir", "bg-orange-50 text-orange-600"],
        ].map(([Icon, label, value, sub, tone]) => {
          const I = Icon as typeof Store;
          return <Panel key={label as string} className="flex items-start gap-3 p-4"><span className={`flex h-10 w-10 items-center justify-center rounded-xl ${tone}`}><I size={19} /></span><div><p className="text-xs font-medium text-slate-500">{label as string}</p><p className="text-xl font-bold text-navy">{value as string}</p><p className="text-xs text-slate-500">{sub as string}</p></div></Panel>;
        })}
      </div>

      {profit && <Panel className="p-5"><div className="mb-4 flex items-center justify-between"><div><h2 className="font-bold text-navy">Profit funnel</h2><p className="text-xs text-slate-500">Alur omzet menjadi laba bersih selama 30 hari</p></div><Link href={`/reports/profit?channel=shopee&shop_id=${shop.id}`} className="text-sm font-semibold text-brand-600">Lihat laporan <ChevronRight className="inline" size={15} /></Link></div>
        <div className="grid gap-2 lg:grid-cols-5">{funnel.map(([label, value, tone], i) => <div key={label} className={`relative overflow-hidden rounded-xl p-4 text-white ${tone}`}><p className="text-[11px] font-semibold uppercase tracking-wide text-white/80">{label}</p><p className="mt-1 text-lg font-bold">{value < 0 ? "− " : ""}{rupiah(Math.abs(value))}</p>{i < funnel.length - 1 && <ArrowRight size={18} className="absolute right-3 top-1/2 hidden -translate-y-1/2 opacity-60 lg:block" />}</div>)}</div>
      </Panel>}

      <div className="grid gap-5 xl:grid-cols-[1.35fr_.65fr]">
        <Panel className="overflow-hidden"><div className="flex items-center justify-between border-b border-slate-100 px-5 py-4"><div><h2 className="font-bold text-navy">Transaksi terbaru</h2><p className="text-xs text-slate-500">Pesanan terkini dari toko ini</p></div><Link href={`/marketplace/orders?shop_id=${shop.id}`} className="text-sm font-semibold text-brand-600">Lihat semua</Link></div>
          <div className="divide-y divide-slate-100">{orders.length ? orders.map((o) => { const [label, tone] = statusLabel[o.external_status ?? ""] ?? [o.external_status ?? "-", "bg-slate-100 text-slate-600"]; return <div key={o.id} className="grid grid-cols-[1fr_auto] gap-3 px-5 py-3.5"><div className="min-w-0"><p className="truncate font-mono text-xs font-semibold text-navy">{o.external_order_sn}</p><p className="truncate text-xs text-slate-500">{o.items?.[0]?.name ?? o.customer_name} · {o.quantity} item</p></div><div className="text-right"><p className="text-sm font-bold text-navy">{rupiah(o.total)}</p><span className={`rounded-md px-2 py-0.5 text-[11px] font-semibold ${tone}`}>{label}</span></div></div>; }) : <p className="py-12 text-center text-sm text-slate-500">Belum ada transaksi pada toko ini.</p>}</div>
        </Panel>
        <Panel className="p-5"><h2 className="font-bold text-navy">Perlu perhatian</h2><div className="mt-4 space-y-3">
          {listing && listing.with_cost < listing.total && <Link href={`/marketplace/products?shop_id=${shop.id}&cost=empty`} className="flex items-center gap-3 rounded-xl bg-amber-50 p-3"><AlertTriangle size={18} className="text-amber-600" /><span className="flex-1 text-sm"><b className="block text-amber-800">{listing.total - listing.with_cost} listing belum punya HPP</b><span className="text-xs text-amber-700">Lengkapi agar laba akurat</span></span><ChevronRight size={16} className="text-amber-600" /></Link>}
          {listing && listing.out_of_stock > 0 && <Link href={`/marketplace/products?shop_id=${shop.id}`} className="flex items-center gap-3 rounded-xl bg-rose-50 p-3"><Package size={18} className="text-rose-600" /><span className="flex-1 text-sm"><b className="block text-rose-800">{listing.out_of_stock} produk stok habis</b><span className="text-xs text-rose-700">Perbarui stok untuk mulai menjual</span></span><ChevronRight size={16} className="text-rose-600" /></Link>}
          {(!listing || (listing.with_cost === listing.total && listing.out_of_stock === 0)) && <div className="rounded-xl bg-emerald-50 p-5 text-center"><CheckCircle2 className="mx-auto text-emerald-500" size={28} /><p className="mt-2 text-sm font-semibold text-emerald-800">Semua terlihat baik</p><p className="text-xs text-emerald-600">Tidak ada hal mendesak saat ini.</p></div>}
        </div></Panel>
      </div>

      <div><h2 className="mb-3 text-lg font-bold text-navy">Kelola toko</h2><div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">{featureCards.map(([Icon, title, sub, href, tone]) => <Link key={title} href={href} className="group flex items-center gap-3 rounded-xl bg-white p-4 transition hover:-translate-y-0.5 hover:shadow-md"><span className={`flex h-11 w-11 items-center justify-center rounded-xl ${tone}`}><Icon size={20} /></span><span className="min-w-0 flex-1"><b className="block text-navy">{title}</b><span className="block text-xs text-slate-500">{sub}</span></span><ChevronRight size={17} className="text-slate-300 group-hover:text-brand-600" /></Link>)}</div></div>
    </div>
  );
}
