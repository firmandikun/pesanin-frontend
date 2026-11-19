"use client";
import { Loader2, PackageCheck, Printer, Store, Truck } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { askText } from "@/components/Dialogs";
import { api, ApiError, Order } from "@/lib/api";

/** Whether an order still needs its shipment arranged. */
export function needsShipping(o: Order) {
  // Advance Fulfilment / Shopee-fulfilled orders are shipped by Shopee; the seller can't arrange them manually.
  if (o.channel === "shopee") {
    return (o.external_status === "READY_TO_SHIP" || (o.external_status === "IN_CANCEL" && !o.tracking_number)) && !o.shopee_auto_ship;
  }
  // Dropship orders are shipped by the Pesanin warehouse, not by the seller.
  return !!o.courier && !o.is_dropship && o.shipping_status === "not_shipped" && !["cancelled", "refunded"].includes(o.status) && (o.payment_method === "cod" || o.payment_status === "paid");
}

/**
 * Arrange shipping for one order: Shopee orders go to Shopee (pickup by courier or drop-off at a counter),
 * web/manual orders get the waybill typed in after handing the parcel over. Once a tracking number exists, offer the label.
 */
export function ShipActions({ order, onDone, compact }: { order: Order; onDone: (msg: string) => void; compact?: boolean }) {
  const [busy, setBusy] = useState("");
  const run = async (key: string, fn: () => Promise<string>) => {
    setBusy(key);
    try { const m = await fn(); if (m) onDone(m); } catch (e) { onDone(e instanceof ApiError ? e.message : "Gagal mengatur pengiriman"); } finally { setBusy(""); }
  };
  const shopee = (method: "pickup" | "dropoff") => run(method, async () => {
    const r = await api("/labels/shopee/ship", { method: "POST", json: { order_ids: [order.id], method } });
    return r.shipped.length ? `${order.code}: pengiriman diatur (${method === "pickup" ? "dijemput kurir" : "antar ke counter"}). Nomor resi segera terbit.` : `${order.code}: ${r.failed[0]?.error ?? "gagal"}`;
  });
  const web = () => run("web", async () => {
    const resi = (await askText(`Nomor resi ${order.code}`, "", `Kurir: ${order.courier ?? "-"}. Isi setelah paket diserahkan ke kurir.`))?.trim();
    if (!resi) return "";
    await api(`/orders/${order.id}`, { method: "PUT", json: { tracking_number: resi, shipping_status: "in_transit" } });
    return `${order.code}: resi ${resi} disimpan, status pengiriman dilacak otomatis.`;
  });

  const btn = compact ? "h-8 px-2.5 text-xs" : "h-9 px-3.5 text-sm";
  const spin = (k: string) => (busy === k ? <Loader2 size={14} className="animate-spin" /> : null);

  if (needsShipping(order)) {
    if (order.channel === "shopee") {
      return (
        <span className="inline-flex flex-wrap gap-1.5">
          <button disabled={!!busy} onClick={() => shopee("pickup")} className={`inline-flex items-center gap-1.5 rounded-lg bg-[#ee4d2d] font-semibold text-white hover:bg-[#d73f22] disabled:opacity-60 ${btn}`}>{spin("pickup") ?? <Truck size={14} />}{compact ? "Pickup" : "Dijemput kurir"}</button>
          <button disabled={!!busy} onClick={() => shopee("dropoff")} className={`inline-flex items-center gap-1.5 rounded-lg border border-[#ee4d2d] font-semibold text-[#c63c20] hover:bg-[#fff1ee] disabled:opacity-60 ${btn}`}>{spin("dropoff") ?? <Store size={14} />}{compact ? "Drop-off" : "Antar ke counter"}</button>
        </span>
      );
    }
    return <button disabled={!!busy} onClick={web} className={`inline-flex items-center gap-1.5 rounded-lg bg-navy font-semibold text-white hover:bg-navy-700 disabled:opacity-60 ${btn}`}>{spin("web") ?? <PackageCheck size={14} />}{compact ? "Resi" : "Input resi"}</button>;
  }
  if (order.tracking_number || (order.channel === "shopee" && ["PROCESSED", "RETRY_SHIP", "IN_CANCEL"].includes(order.external_status ?? ""))) {
    return <Link href={`/orders/labels?ids=${order.id}`} target="_blank" className={`inline-flex items-center gap-1.5 rounded-lg border border-slate-200 font-semibold text-navy hover:bg-slate-50 ${btn}`}><Printer size={14} />Cetak resi</Link>;
  }
  return null;
}
