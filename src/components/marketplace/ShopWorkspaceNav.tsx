"use client";

import { BarChart3, LayoutDashboard, Megaphone, Package, ShoppingBag } from "lucide-react";
import Link from "next/link";
import { Panel } from "@/components/kit";

export type ShopWorkspaceSection = "overview" | "orders" | "products" | "finance" | "ads";

export function ShopWorkspaceNav({ shopId, active }: { shopId: number; active: ShopWorkspaceSection }) {
  const items = [
    [LayoutDashboard, "Ringkasan", `/marketplace/shops/${shopId}`, "overview"],
    [ShoppingBag, "Pesanan & Pengiriman", `/marketplace/orders?shop_id=${shopId}`, "orders"],
    [Package, "Produk", `/marketplace/products?shop_id=${shopId}`, "products"],
    [BarChart3, "Keuangan", `/marketplace/shops/${shopId}/transactions`, "finance"],
    [Megaphone, "Iklan", `/marketplace/ads?shop=${shopId}`, "ads"],
  ] as const;

  return <Panel className="overflow-x-auto p-2"><nav className="flex min-w-max gap-1" aria-label="Workspace toko">
    {items.map(([Icon, label, href, section]) => <Link key={section} href={href}
      className={`flex h-10 items-center gap-2 rounded-lg px-3.5 text-sm font-semibold ${active === section ? "bg-navy text-white" : "text-slate-600 hover:bg-slate-50 hover:text-navy"}`}>
      <Icon size={16} />{label}
    </Link>)}
  </nav></Panel>;
}
