"use client";
import JsBarcode from "jsbarcode";
import { FileDown, Printer, Settings } from "lucide-react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense, useEffect, useRef, useState } from "react";
import { ShopeeMark } from "@/components/ChannelBadge";
import { Logo } from "@/components/Logo";
import { API_URL, ApiError, api, getToken, Order, rupiah } from "@/lib/api";
import { openShopeeAwbMerged } from "@/lib/awb";
import {
  getCachedPrintSettings,
  setCachedPrintSettings,
  type PaperSize,
  type PrintSettings,
  type ProductTextMode,
} from "@/lib/printSettings";

type Data = { sender: { name: string; phone: string | null; address: string | null }; orders: (Order & { product?: { name: string; sku?: string | null; weight?: number } | null })[] };

function Barcode({ value, compact = false }: { value: string; compact?: boolean }) {
  const ref = useRef<SVGSVGElement>(null);
  useEffect(() => {
    if (ref.current) {
      JsBarcode(ref.current, value, { format: "CODE128", height: compact ? 30 : 44, width: compact ? 1.4 : 1.6, fontSize: compact ? 10 : 12, margin: 0 });
    }
  }, [value, compact]);
  return <svg ref={ref} />;
}

/** Thermal label for website, landing page and manual orders with configurable paper & font size. */
function Label({ o, sender, settings }: { o: Data["orders"][number]; sender: Data["sender"]; settings: PrintSettings }) {
  const cod = o.payment_method === "cod";
  const compact = settings.paper_size === "78x100" || settings.paper_size === "100x100";
  const itemCount = o.items?.length ?? 1;
  const manyItems = itemCount >= 4;
  const dimClass = settings.paper_size === "78x100"
    ? "h-[100mm] w-[78mm]"
    : settings.paper_size === "100x100"
    ? "h-[100mm] w-[100mm]"
    : settings.paper_size === "a4"
    ? "w-[210mm] min-h-[148mm] max-w-full"
    : "h-[150mm] w-[100mm]";
  const basePt = settings.sku_font_size || 8;
  const adaptivePt = manyItems ? Math.min(basePt, compact ? 6.5 : 7.5) : compact ? Math.min(basePt, 8) : basePt;
  const skuSize = `${adaptivePt}pt`;

  return (
    <section className={`label-sheet mx-auto flex ${dimClass} flex-col overflow-hidden border border-slate-900 bg-white ${compact ? "text-[9.5px] leading-tight" : "text-[11px] leading-snug"} text-black shadow-sm print:shadow-none`}>
      <header className={`flex shrink-0 items-center justify-between border-b border-slate-900 ${compact ? "px-2 py-1" : "px-3 py-2"}`}>
        <Logo small />
        <div className="text-right"><b className={`block ${compact ? "text-xs" : "text-sm"}`}>{o.courier ?? "Kurir"} {o.courier_service ?? ""}</b>{cod && <span className="rounded bg-black px-1.5 py-0.5 text-[10px] font-bold text-white">COD</span>}</div>
      </header>
      <div className={`flex shrink-0 justify-center border-b border-slate-900 ${compact ? "px-2 py-1" : "px-3 py-2"}`}><Barcode value={o.tracking_number || o.code} compact={compact} /></div>
      <div className="grid shrink-0 grid-cols-2 border-b border-slate-900">
        <div className={`border-r border-slate-900 ${compact ? "p-1.5" : "p-2"}`}><p className="text-[8.5px] font-bold uppercase">Penerima</p><b className={`block ${compact ? "text-[10.5px]" : "text-[12px]"}`}>{o.customer_name}</b><p>{o.phone}</p><p className="mt-0.5 line-clamp-2">{o.address}</p><p>{[o.district, o.city, o.province].filter(Boolean).join(", ")}</p></div>
        <div className={compact ? "p-1.5" : "p-2"}><p className="text-[8.5px] font-bold uppercase">Pengirim</p><b className="block">{sender.name}</b><p>{sender.phone}</p><p className="mt-0.5 line-clamp-2">{sender.address}</p></div>
      </div>
      <div className={`min-h-0 flex-1 overflow-hidden border-b border-slate-900 ${compact ? "p-1.5" : "p-2"}`}>
        <p className="text-[8.5px] font-bold uppercase">
          {settings.product_text_mode === "name_only" ? "Isi paket (Nama Produk)" : settings.product_text_mode === "sku_only" ? "Isi paket (SKU)" : "Isi paket (SKU / Nama)"}
        </p>
        <div className={`mt-0.5 ${manyItems && settings.paper_size !== "78x100" ? "grid grid-cols-2 gap-x-2 gap-y-0.5" : "space-y-0.5"}`} style={{ fontSize: skuSize, lineHeight: 1.2 }}>
          {o.items?.length
            ? o.items.map((i, k) => {
                const text = settings.product_text_mode === "name_only"
                  ? `${i.name}${i.variant ? ` / ${i.variant}` : ""}`
                  : settings.product_text_mode === "sku_only"
                  ? (i.sku || "-")
                  : (i.sku || `${i.name}${i.variant ? ` / ${i.variant}` : ""}`);
                return <p key={k} className="truncate font-mono font-bold">{text} × {i.qty}</p>;
              })
            : (() => {
                const text = settings.product_text_mode === "name_only"
                  ? `${o.product?.name ?? `ORD-${o.id}`}${o.variant ? ` / ${o.variant}` : ""}`
                  : settings.product_text_mode === "sku_only"
                  ? (o.product?.sku || "-")
                  : (o.product?.sku || `${o.product?.name ?? `ORD-${o.id}`}${o.variant ? ` / ${o.variant}` : ""}`);
                return <p className="font-mono font-bold">{text} × {o.quantity}</p>;
              })()}
        </div>
        {o.notes && <p className="mt-0.5 truncate text-[9px] italic">Catatan: {o.notes}</p>}
      </div>
      <footer className="grid shrink-0 grid-cols-3 text-center">
        <div className={`border-r border-slate-900 ${compact ? "p-1" : "p-1.5"}`}><p className="text-[8.5px] uppercase">Berat</p><b>{((o.weight || 0) / 1000).toFixed(2)} kg</b></div>
        <div className={`border-r border-slate-900 ${compact ? "p-1" : "p-1.5"}`}><p className="text-[8.5px] uppercase">{cod ? "Tagih COD" : "Ongkir"}</p><b>{rupiah(cod ? o.total : o.shipping_cost)}</b></div>
        <div className={compact ? "p-1" : "p-1.5"}><p className="text-[8.5px] uppercase">No. order</p><b className="font-mono text-[9.5px]">{o.code}</b></div>
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
  const [settings, setSettings] = useState<PrintSettings>(getCachedPrintSettings());

  useEffect(() => {
    api<Data>(`/labels?ids=${ids}`).then(setD).catch((e) => setErr(e instanceof ApiError ? e.message : "Gagal memuat"));
    api<Record<string, any>>("/user-settings").then((res) => {
      const ps = res?.print_settings || res?.automation?.print_settings;
      if (ps) {
        setSettings((cur) => ({ ...cur, ...ps }));
        setCachedPrintSettings(ps);
      }
    }).catch(() => {});
  }, [ids]);

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
      await openShopeeAwbMerged({ orders, settings });
    } catch (e) { setErr((e as Error).message); }
    finally { setBusy(null); }
  }

  if (!d) return <p className="p-10 text-center text-sm text-slate-500">{err || "Menyiapkan resi…"}</p>;

  const pageSizeCss = settings.paper_size === "78x100"
    ? "78mm 100mm"
    : settings.paper_size === "100x100"
    ? "100mm 100mm"
    : settings.paper_size === "a4"
    ? "A4 portrait"
    : "100mm 150mm";

  return (
    <div className="min-h-screen bg-slate-100 print:bg-white">
      <style>{`@page label { size: ${pageSizeCss}; margin: 0; }`}</style>
      <div className="no-print sticky top-0 z-10 flex flex-wrap items-center gap-3 bg-navy px-6 py-3 text-white">
        <b className="mr-auto">Cetak Resi · {d.orders.length} pesanan</b>
        <div className="flex items-center gap-2 text-xs">
          <span className="text-slate-300">Kertas:</span>
          <select
            aria-label="Ukuran Kertas"
            className="rounded bg-navy-800 border border-slate-600 px-2 py-1 text-white text-xs outline-none"
            value={settings.paper_size}
            onChange={(e) => {
              const next: PrintSettings = { ...settings, paper_size: e.target.value as PaperSize };
              setSettings(next);
              setCachedPrintSettings(next);
            }}
          >
            <option value="100x150">100×150mm (A6)</option>
            <option value="78x100">78×100mm</option>
            <option value="100x100">100×100mm</option>
            <option value="a4">A4</option>
          </select>
          <span className="ml-2 text-slate-300">Mode:</span>
          <select
            aria-label="Mode Teks Produk"
            className="rounded bg-navy-800 border border-slate-600 px-2 py-1 text-white text-xs outline-none"
            value={settings.product_text_mode}
            onChange={(e) => {
              const next: PrintSettings = { ...settings, product_text_mode: e.target.value as ProductTextMode };
              setSettings(next);
              setCachedPrintSettings(next);
            }}
          >
            <option value="sku_first">Utamakan SKU</option>
            <option value="name_only">Nama Produk</option>
            <option value="sku_only">Hanya SKU</option>
          </select>
          <span className="ml-2 text-slate-300">Font:</span>
          <select
            aria-label="Ukuran Font SKU"
            className="rounded bg-navy-800 border border-slate-600 px-2 py-1 text-white text-xs outline-none"
            value={settings.sku_font_size}
            onChange={(e) => {
              const next: PrintSettings = { ...settings, sku_font_size: Number(e.target.value) };
              setSettings(next);
              setCachedPrintSettings(next);
            }}
          >
            <option value={7}>7 pt</option>
            <option value={8}>8 pt</option>
            <option value={9}>9 pt</option>
            <option value={10}>10 pt</option>
            <option value={11}>11 pt</option>
          </select>
          <Link
            href="/settings/print"
            className="ml-2 inline-flex items-center gap-1 rounded bg-slate-700 hover:bg-slate-600 px-2 py-1 text-xs text-slate-200"
            title="Buka Pengaturan Cetak Lengkap"
          >
            <Settings size={12} /> Pengaturan
          </Link>
        </div>
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
        {own.length > 0 && <p className="text-xs text-slate-500">Label di bawah untuk pesanan website, landing page, dan manual. Ukuran: {settings.paper_size === "100x100" ? "100 × 100 mm" : settings.paper_size === "a4" ? "A4" : "100 × 150 mm"}.</p>}
      </div>
      <div className="labels space-y-6 p-6 print:space-y-0 print:p-0">
        {own.map((o) => <Label key={o.id} o={o} sender={d.sender} settings={settings} />)}
      </div>
    </div>
  );
}

export default function Page() {
  return <Suspense><Labels /></Suspense>;
}
