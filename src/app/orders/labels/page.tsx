"use client";
import JsBarcode from "jsbarcode";
import { FileDown, Printer } from "lucide-react";
import { useSearchParams } from "next/navigation";
import { Suspense, useEffect, useRef, useState } from "react";
import { ShopeeMark } from "@/components/ChannelBadge";
import { Logo } from "@/components/Logo";
import { API_URL, ApiError, api, getToken, Order, rupiah } from "@/lib/api";

type Data = { sender: { name: string; phone: string | null; address: string | null }; orders: (Order & { product?: { name: string; sku?: string | null; weight?: number } | null })[] };

function Barcode({ value }: { value: string }) {
  const ref = useRef<SVGSVGElement>(null);
  useEffect(() => { if (ref.current) JsBarcode(ref.current, value, { format: "CODE128", height: 44, width: 1.6, fontSize: 12, margin: 0 }); }, [value]);
  return <svg ref={ref} />;
}

/** 100 × 150 mm thermal label for website, landing page and manual orders. */
function Label({ o, sender }: { o: Data["orders"][number]; sender: Data["sender"] }) {
  const cod = o.payment_method === "cod";
  return (
    <section className="label-sheet mx-auto flex h-[150mm] w-[100mm] flex-col border border-slate-900 bg-white text-[11px] leading-snug text-black">
      <header className="flex items-center justify-between border-b border-slate-900 px-3 py-2">
        <Logo small />
        <div className="text-right"><b className="block text-sm">{o.courier ?? "Kurir"} {o.courier_service ?? ""}</b>{cod && <span className="rounded bg-black px-1.5 py-0.5 text-[10px] font-bold text-white">COD</span>}</div>
      </header>
      <div className="flex justify-center border-b border-slate-900 px-3 py-2"><Barcode value={o.tracking_number || o.code} /></div>
      <div className="grid grid-cols-2 border-b border-slate-900">
        <div className="border-r border-slate-900 p-2"><p className="text-[9px] font-bold uppercase">Penerima</p><b className="block text-[12px]">{o.customer_name}</b><p>{o.phone}</p><p className="mt-0.5">{o.address}</p><p>{[o.district, o.city, o.province].filter(Boolean).join(", ")}</p></div>
        <div className="p-2"><p className="text-[9px] font-bold uppercase">Pengirim</p><b className="block">{sender.name}</b><p>{sender.phone}</p><p className="mt-0.5">{sender.address}</p></div>
      </div>
      <div className="flex-1 border-b border-slate-900 p-2">
        {/* Content is printed as SKU only, so the product name never shows on the parcel. */}
        <p className="text-[9px] font-bold uppercase">Isi paket (SKU)</p>
        {o.items?.length
          ? o.items.map((i, k) => <p key={k} className="font-mono">{i.sku || `ITEM-${i.item_id}`} × {i.qty}</p>)
          : <p className="font-mono">{o.product?.sku || `ORD-${o.id}`}{o.variant ? ` / ${o.variant}` : ""} × {o.quantity}</p>}
        {o.notes && <p className="mt-1 italic">Catatan: {o.notes}</p>}
      </div>
      <footer className="grid grid-cols-3 text-center">
        <div className="border-r border-slate-900 p-1.5"><p className="text-[9px] uppercase">Berat</p><b>{((o.weight || 0) / 1000).toFixed(2)} kg</b></div>
        <div className="border-r border-slate-900 p-1.5"><p className="text-[9px] uppercase">{cod ? "Tagih COD" : "Ongkir"}</p><b>{rupiah(cod ? o.total : o.shipping_cost)}</b></div>
        <div className="p-1.5"><p className="text-[9px] uppercase">No. order</p><b className="font-mono text-[10px]">{o.code}</b></div>
      </footer>
    </section>
  );
}

function Labels() {
  const sp = useSearchParams();
  const ids = sp.get("ids") ?? "";
  const auto = sp.get("auto") === "1";
  const [d, setD] = useState<Data | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [err, setErr] = useState("");
  useEffect(() => { api<Data>(`/labels?ids=${ids}`).then(setD).catch((e) => setErr(e instanceof ApiError ? e.message : "Gagal memuat")); }, [ids]);
  // Opened from a "Cetak resi" button: go straight to the print dialog once barcodes are drawn.
  useEffect(() => { if (auto && d?.orders.length) { const t = setTimeout(() => window.print(), 500); return () => clearTimeout(t); } }, [auto, d]);

  // Real Shopee shops print Shopee's own air waybill; the sample shop falls back to Pesanin's label.
  const own = d?.orders.filter((o) => o.channel !== "shopee" || o.marketplace_shop?.is_demo) ?? [];
  const shopee = d?.orders.filter((o) => o.channel === "shopee" && !o.marketplace_shop?.is_demo) ?? [];
  // Shopee only batches air waybills per shop and per logistics channel (courier).
  const byShop = Object.values(shopee.reduce<Record<string, typeof shopee>>((acc, o) => { (acc[`${o.marketplace_shop_id}|${o.courier}`] ??= []).push(o); return acc; }, {}));

  async function shopeePdf(orders: typeof shopee) {
    setBusy(`${orders[0].marketplace_shop_id}|${orders[0].courier}`); setErr("");
    try {
      const res = await fetch(`${API_URL}/labels/shopee/pdf`, {
        method: "POST", headers: { Authorization: `Bearer ${getToken()}`, "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify({ order_ids: orders.map((o) => o.id) }),
      });
      if (!res.ok) throw new Error((await res.json().catch(() => ({}))).message ?? "Gagal mengambil resi Shopee");
      window.open(URL.createObjectURL(await res.blob()), "_blank");
    } catch (e) { setErr((e as Error).message); }
    finally { setBusy(null); }
  }

  if (!d) return <p className="p-10 text-center text-sm text-slate-500">{err || "Menyiapkan resi…"}</p>;

  return (
    <div className="min-h-screen bg-slate-100 print:bg-white">
      <div className="no-print sticky top-0 z-10 flex flex-wrap items-center gap-3 bg-navy px-6 py-3 text-white">
        <b className="mr-auto">Cetak Resi · {d.orders.length} pesanan</b>
        {own.length > 0 && <button onClick={() => window.print()} className="flex h-9 items-center gap-2 rounded-lg bg-brand-500 px-4 text-sm font-semibold hover:bg-brand-600"><Printer size={16} />Cetak {own.length} label</button>}
      </div>
      <div className="no-print mx-auto max-w-3xl space-y-3 px-6 pt-6">
        {err && <p className="rounded-lg bg-rose-50 p-3 text-sm text-rose-700">{err}</p>}
        {byShop.map((orders) => (
          <div key={`${orders[0].marketplace_shop_id}|${orders[0].courier}`} className="flex flex-wrap items-center gap-3 rounded-xl bg-white p-4 text-sm">
            <ShopeeMark size={28} />
            <div className="flex-1"><b className="text-navy">{orders[0].marketplace_shop?.shop_name}</b><p className="text-slate-500">{orders.length} pesanan · {orders[0].courier} · resi resmi Shopee (PDF)</p></div>
            <button onClick={() => shopeePdf(orders)} disabled={busy !== null} className="flex h-9 items-center gap-2 rounded-lg bg-[#ee4d2d] px-4 font-semibold text-white disabled:opacity-60"><FileDown size={16} />{busy === `${orders[0].marketplace_shop_id}|${orders[0].courier}` ? "Mengambil…" : "Unduh resi"}</button>
          </div>
        ))}
        {own.length > 0 && <p className="text-xs text-slate-500">Label di bawah untuk pesanan website, landing page, dan manual. Ukuran 100 × 150 mm (printer thermal).</p>}
      </div>
      <div className="labels space-y-6 p-6 print:space-y-0 print:p-0">
        {own.map((o) => <Label key={o.id} o={o} sender={d.sender} />)}
      </div>
    </div>
  );
}

export default function Page() {
  return <Suspense><Labels /></Suspense>;
}
