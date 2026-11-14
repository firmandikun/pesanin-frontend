"use client";
import { PDFDocument, rgb, StandardFonts } from "pdf-lib";
import { redrawItemTable, type SkuRow, type TextItem } from "@/lib/awbTable";
import { API_URL, getToken } from "@/lib/api";

type AwbItem = { item_sku?: string | null; model_sku?: string | null; sku?: string | null; qty?: number };
type AwbOrder = { id: number; marketplace_shop_id?: number | null; courier?: string | null; items?: AwbItem[] | null };

/** Download one Shopee air waybill PDF (orders, or "Pengiriman Kilat" reservations, of one shop and one courier). */
async function fetchAwb(ids: number[], kind: "order" | "booking" = "order"): Promise<Uint8Array> {
  const res = await fetch(`${API_URL}/labels/shopee/${kind === "booking" ? "booking-pdf" : "pdf"}`, {
    method: "POST",
    headers: { Authorization: `Bearer ${getToken()}`, "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify(kind === "booking" ? { booking_ids: ids } : { order_ids: ids }),
  });
  if (!res.ok) throw new Error((await res.json().catch(() => ({}))).message ?? "Resi Shopee belum bisa diambil");
  return new Uint8Array(await res.arrayBuffer());
}

/**
 * Remove product names from Shopee's AWB: the item table is redrawn as "# | SKU | Variasi | Qty"
 * (see awbTable.ts). If a page's layout isn't recognised, the name column is covered instead.
 */
async function hideProductNames(bytes: Uint8Array, perPageRows?: SkuRow[][]): Promise<PDFDocument> {
  const pdfjs = await import("pdfjs-dist");
  pdfjs.GlobalWorkerOptions.workerSrc = "/pdf.worker.min.mjs";
  const doc = await pdfjs.getDocument({ data: bytes.slice() }).promise;
  const out = await PDFDocument.load(bytes);
  const fonts = { regular: await out.embedFont(StandardFonts.Helvetica), bold: await out.embedFont(StandardFonts.HelveticaBold) };

  for (let i = 0; i < doc.numPages; i++) {
    const items = (await (await doc.getPage(i + 1)).getTextContent()).items.filter((it): it is TextItem & typeof it => "str" in it) as unknown as TextItem[];
    if (redrawItemTable(out.getPage(i), items, fonts, perPageRows?.[i])) continue;
    const header = items.find((it) => /^Nama\s*Produk/i.test(it.str.trim()) || /^Product\s*Name/i.test(it.str.trim()));
    if (!header) continue;
    const hy = header.transform[5];
    const sku = items.find((it) => it.str.trim() === "SKU" && Math.abs(it.transform[5] - hy) < 4);
    const x0 = header.transform[4] - 1;
    const x1 = sku ? sku.transform[4] - 2 : x0 + 180;
    const page = out.getPage(i);
    for (const it of items) {
      const [, , , d, x, y] = it.transform;
      if (!it.str.trim() || x < x0 || x >= x1 || y > hy + 1) continue;
      const h = it.height || Math.abs(d) || 8;
      page.drawRectangle({ x: x - 0.5, y: y - h * 0.3, width: Math.min(it.width, x1 - x) + 1, height: h * 1.4, color: rgb(1, 1, 1) });
    }
  }
  return out;
}

/**
 * Print Shopee AWBs straight away: one request per shop+courier (Shopee can't mix couriers in one
 * document), product names hidden, all merged into a single PDF opened in a new tab.
 * Call it directly from a click so the new tab isn't blocked as a pop-up.
 */
export async function openShopeeAwb(orders: AwbOrder[], kind: "order" | "booking" = "order"): Promise<void> {
  const win = window.open("", "_blank");
  if (win) win.document.write("<p style='font-family:sans-serif;padding:24px;color:#475569'>Menyiapkan resi Shopee…</p>");
  try {
    const groups = Object.values(orders.reduce<Record<string, AwbOrder[]>>((acc, o) => {
      (acc[`${o.marketplace_shop_id}|${o.courier}`] ??= []).push(o);
      return acc;
    }, {}));
    const merged = await PDFDocument.create();
    for (const group of groups) {
      // One page per order, in the order sent; each page's rows come from that order's items.
      const rows: SkuRow[][] = group.map((o) => (o.items ?? []).map((it) => ({
        parent: (it.item_sku ?? it.sku ?? "") || "-", variant: (it.model_sku ?? "") || "-",
      })));
      const src = await hideProductNames(await fetchAwb(group.map((o) => o.id), kind), rows);
      const pages = await merged.copyPages(src, src.getPageIndices());
      pages.forEach((p) => merged.addPage(p));
    }
    const url = URL.createObjectURL(new Blob([(await merged.save()).slice().buffer as ArrayBuffer], { type: "application/pdf" }));
    if (win) win.location.href = url;
    else window.open(url, "_blank");
  } catch (e) {
    win?.close();
    throw e;
  }
}
