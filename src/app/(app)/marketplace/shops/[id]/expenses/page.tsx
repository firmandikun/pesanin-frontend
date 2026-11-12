"use client";

import Link from "next/link";
import { use, useEffect, useState } from "react";
import { ExpensesView } from "@/components/finance/ExpensesView";
import { PageHead } from "@/components/kit";
import { ShopWorkspaceNav } from "@/components/marketplace/ShopWorkspaceNav";
import { api } from "@/lib/api";

type Shop = { id: number; shop_name: string };

export default function ShopExpenses({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params); const shopId = Number(id);
  const [shop, setShop] = useState<Shop | null>(null);
  useEffect(() => { api<{ shops: Shop[] }>("/marketplace/shops").then((x) => setShop(x.shops.find((s) => s.id === shopId) ?? null)); }, [shopId]);
  if (!shop) return <div className="py-24 text-center text-sm text-slate-400">Memuat pengeluaran toko…</div>;
  return <div className="space-y-5">
    <PageHead title="Pengeluaran" tutorial={false} crumbs={[["Marketplace", "/marketplace/shops"], [shop.shop_name, `/marketplace/shops/${shop.id}`], ["Pengeluaran"]]} />
    <ShopWorkspaceNav shopId={shop.id} active="finance" />
    <div className="flex flex-wrap gap-2">
      <Link href={`/marketplace/shops/${shop.id}/transactions`} className="rounded-lg bg-white px-4 py-2 text-sm font-semibold text-slate-600">Transaksi</Link>
      <span className="rounded-lg bg-navy px-4 py-2 text-sm font-semibold text-white">Pengeluaran</span>
      <Link href={`/marketplace/shops/${shop.id}/finance`} className="rounded-lg bg-white px-4 py-2 text-sm font-semibold text-slate-600">Laba Rugi & Arus Kas</Link>
    </div>
    <ExpensesView shopId={shop.id} />
  </div>;
}
