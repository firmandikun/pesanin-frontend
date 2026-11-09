"use client";
import { Loader2, PackageCheck, Printer, Store, Truck } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { api, ApiError, Order } from "@/lib/api";

const SHOPEE_READY = ["READY_TO_SHIP"];

/** Whether an order still needs its shipment arranged. */
export function needsShipping(o: Order) {
  if (o.channel === "shopee") return SHOPEE_READY.includes(o.external_status ?? "");
  return !!o.courier && o.shipping_status === "not_shipped" && !["cancelled", "refunded"].includes(o.status) && (o.payment_method === "cod" || o.payment_status === "paid");
}

/**
 * Arrange shipping for one order: Shopee orders go to Shopee (pickup by courier or drop-off at a counter),
 * web/manual orders get their courier booking and tracking number. Once a tracking number exists, offer the label.
 */
export function ShipActions({ order, onDone, compact }: { order: Order; onDone: (msg: string) => void; compact?: boolean }) {
  const [busy, setBusy] = useState("");
  const run = async (key: string, fn: () => Promise<string>) => {
    setBusy(key);
    try { onDone(await fn()); } catch (e) { onDone(e instanceof ApiError ? e.message : "Gagal mengatur pengiriman"); } finally { setBusy(""); }
  };
  const shopee = (method: "pickup" | "dropoff") => run(method, async () => {
    const r = await api("/labels/shopee/ship", { method: "POST", json: { order_ids: [order.id], method } });
    return r.shipped.length ? `${order.code}: pengiriman diatur (${method === "pickup" ? "dijemput kurir" : "antar ke counter"}). Nomor resi segera terbit.` : `${order.code}: ${r.failed[0]?.error ?? "gagal"}`;
  });
  const web = () => run("web", async () => {
    const r = await api("/orders/biteship-ship", { method: "POST", json: { order_ids: [order.id] } });
    return r.shipped.length ? `${order.code}: kurir dipesan lewat Biteship, resi ${r.shipped[0].waybill || "segera terbit"}.` : `${order.code}: ${r.failed[0]?.error ?? "tidak bisa dikirim"}`;
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
    return <button disabled={!!busy} onClick={web} className={`inline-flex items-center gap-1.5 rounded-lg bg-navy font-semibold text-white hover:bg-navy-700 disabled:opacity-60 ${btn}`}>{spin("web") ?? <PackageCheck size={14} />}{compact ? "Kirim" : "Serahkan ke kurir"}</button>;
  }
  if (order.tracking_number || (order.channel === "shopee" && ["PROCESSED", "RETRY_SHIP"].includes(order.external_status ?? ""))) {
    return <Link href={`/orders/labels?ids=${order.id}`} target="_blank" className={`inline-flex items-center gap-1.5 rounded-lg border border-slate-200 font-semibold text-navy hover:bg-slate-50 ${btn}`}><Printer size={14} />Cetak resi</Link>;
  }
  return null;
}
