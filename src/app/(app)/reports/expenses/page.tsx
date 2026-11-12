"use client";

import { useEffect, useState } from "react";
import { ExpensesView } from "@/components/finance/ExpensesView";
import { PageHead } from "@/components/kit";
import { api } from "@/lib/api";

/** Pengeluaran across the whole business: per-shop costs and general costs (gaji, sewa, packing). */
export default function Expenses() {
  const [shops, setShops] = useState<{ id: number; shop_name: string }[]>([]);
  useEffect(() => { api<{ shops: { id: number; shop_name: string }[] }>("/marketplace/shops").then((x) => setShops(x.shops)).catch(() => {}); }, []);
  return <div className="space-y-5">
    <PageHead title="Pengeluaran" tutorial={false} crumbs={[["Laporan Bisnis"], ["Pengeluaran"]]} />
    <p className="-mt-2 text-sm text-slate-500">Catat biaya operasional (gaji, sewa, packing) agar Laba Bersih akurat. Pembelian stok dan aset dicatat sebagai arus kas saja, tidak mengurangi laba karena HPP sudah dihitung per pesanan.</p>
    <ExpensesView shops={shops} />
  </div>;
}
