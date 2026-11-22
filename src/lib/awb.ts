"use client";
import { PDFDocument, rgb, StandardFonts } from "pdf-lib";
import { redrawItemTable, type SkuRow, type TextItem } from "@/lib/awbTable";
import { getCachedPrintSettings, type PrintSettings } from "@/lib/printSettings";
import { API_URL, getToken } from "@/lib/api";
import { getDirectPrefs, LABEL_MM, printPdfDirect } from "@/lib/thermal";

type AwbItem = { item_sku?: string | null; model_sku?: string | null; sku?: string | null; qty?: number; name?: string | null; variant?: string | null };
type AwbOrder = {
  id: number; marketplace_shop_id?: number | null; courier?: string | null; items?: AwbItem[] | null;
  /** Numbers printed on the label (order / reservation), used to match a PDF page to its order. */
  external_order_sn?: string | null; booking_sn?: string | null; order_sn?: string | null; tracking_number?: string | null;
};

/**
 * Download one Shopee air waybill PDF (orders, or "Pengiriman Kilat" reservations, of one shop and one courier).
 * `skipped`: numbers the server left out because the parcel is already on its way (moved to "Dikirim").
 */
async function fetchAwb(ids: number[], kind: "order" | "booking" = "order"): Promise<{ bytes: Uint8Array; skipped: string[] }> {
  const res = await fetch(`${API_URL}/labels/shopee/${kind === "booking" ? "booking-pdf" : "pdf"}`, {
    method: "POST",
    headers: { Authorization: `Bearer ${getToken()}`, "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify(kind === "booking" ? { booking_ids: ids } : { order_ids: ids }),
  });
  if (!res.ok) throw new Error((await res.json().catch(() => ({}))).message ?? "Resi Shopee belum bisa diambil");
  const skipped = (res.headers.get("X-Awb-Skipped") ?? "").split(",").map((s) => s.trim()).filter(Boolean);
  return { bytes: new Uint8Array(await res.arrayBuffer()), skipped };
}

/** What a print left out: parcels already shipped (skipped) and groups that failed (errors). */
export type AwbResult = { skipped: string[]; errors: string[]; printed?: number };

/**
 * Remove product names from Shopee's AWB: the item table is redrawn as "# | SKU | Variasi | Qty"
 * (see awbTable.ts). If a page's layout isn't recognised, the name column is covered instead.
 */
async function hideProductNames(bytes: Uint8Array, group: AwbOrder[] = [], printSettings?: PrintSettings): Promise<{ doc: PDFDocument; cropBottoms: number[] }> {
  const pdfjs = await import("pdfjs-dist");
  pdfjs.GlobalWorkerOptions.workerSrc = "/pdf.worker.min.mjs";
  const doc = await pdfjs.getDocument({ data: bytes.slice() }).promise;
  const out = await PDFDocument.load(bytes);
  const fonts = { regular: await out.embedFont(StandardFonts.Helvetica), bold: await out.embedFont(StandardFonts.HelveticaBold) };
  const cropBottoms: number[] = [];
  const skuRows = (o: AwbOrder): SkuRow[] => (o.items ?? []).map((it) => ({
    parent: (it.item_sku ?? it.sku ?? "") || "-", variant: (it.model_sku ?? "") || "-",
    name: it.name ?? undefined, varName: it.variant ?? undefined,
    qty: it.qty ?? 1,
  }));
  // Shopee doesn't always return pages in the order requested, so find each page's order by the number printed on it.
  const keyed = group.flatMap((o) => [o.external_order_sn, o.booking_sn, o.order_sn, o.tracking_number].filter((sn): sn is string => !!sn).map((sn) => [sn.toUpperCase(), o] as const));

  for (let i = 0; i < doc.numPages; i++) {
    const items = (await (await doc.getPage(i + 1)).getTextContent()).items.filter((it): it is TextItem & typeof it => "str" in it) as unknown as TextItem[];
    const ys = items.filter((it) => it.str.trim()).map((it) => it.transform[5]);
    const minY = ys.length ? Math.min(...ys) : 0;
    cropBottoms.push(Math.max(0, minY - 12));
    const text = items.map((it) => it.str).join("").replace(/\s+/g, "").toUpperCase();
    const match = keyed.find(([sn]) => text.includes(sn))?.[1] ?? (group.length === doc.numPages ? group[i] : undefined);
    if (redrawItemTable(out.getPage(i), items, fonts, match ? skuRows(match) : undefined, printSettings)) continue;
    const header = items.find((it) => /^Nama\s*Produk/i.test(it.str.trim()) || /^Product\s*Name/i.test(it.str.trim()));
    if (!header) continue;
    if (printSettings?.product_text_mode === "name_only") continue; // Never cover names when name_only mode is chosen
    const hy = header.transform[5];
    const sku = items.find((it) => it.str.trim() === "SKU" && Math.abs(it.transform[5] - hy) < 12);
    if (!sku) continue; // Never erase product names when there is no SKU on the label
    const x0 = header.transform[4] - 1;
    const x1 = sku.transform[4] - 2;
    const page = out.getPage(i);
    for (const it of items) {
      const [, , , d, x, y] = it.transform;
      if (!it.str.trim() || x < x0 || x >= x1 || y > hy + 1) continue;
      const h = it.height || Math.abs(d) || 8;
      page.drawRectangle({ x: x - 0.5, y: y - h * 0.3, width: Math.min(it.width, x1 - x) + 1, height: h * 1.4, color: rgb(1, 1, 1) });
    }
  }
  return { doc: out, cropBottoms };
}

/**
 * Print Shopee AWBs straight away: one request per shop+courier (Shopee can't mix couriers in one
 * document), product names hidden, all merged into a single PDF opened in a new tab.
 * Call it directly from a click so the new tab isn't blocked as a pop-up.
 */
export async function openShopeeAwb(orders: AwbOrder[], kind: "order" | "booking" = "order", settings?: PrintSettings): Promise<AwbResult> {
  return openShopeeAwbMerged(kind === "booking" ? { bookings: orders, settings } : { orders, settings });
}

/**
 * Print orders and "Pengiriman Kilat" reservations together in a single merged PDF / tab. Labels that can't be
 * printed any more (already shipped) are left out and reported; a failing shop/courier group doesn't stop the
 * others. Throws only when nothing at all could be printed.
 */
export async function openShopeeAwbMerged({ orders = [], bookings = [], settings }: { orders?: AwbOrder[]; bookings?: AwbOrder[]; settings?: PrintSettings }): Promise<AwbResult> {
  const result: AwbResult = { skipped: [], errors: [] };
  if (!orders.length && !bookings.length) return result;
  const printSettings = settings ?? getCachedPrintSettings();
  // "Cetak langsung" (Pengaturan → Cetak Resi & Label): straight to the Bluetooth label printer, no PDF tab.
  const direct = getDirectPrefs().enabled && !!LABEL_MM[printSettings.paper_size];
  const win = direct ? null : window.open("", "_blank");
  if (win) {
    win.document.write(`<!doctype html><html><head><meta charset="utf-8"><title>Menyiapkan Resi Shopee…</title><style>
      *{box-sizing:border-box}html,body{margin:0;height:100%;font-family:system-ui,-apple-system,sans-serif;background:#f8fafc;color:#0f172a;display:flex;align-items:center;justify-content:center}
      .card{background:#fff;border:1px solid #e2e8f0;border-radius:16px;padding:32px 36px;text-align:center;box-shadow:0 8px 30px rgba(15,23,42,.06);max-width:340px;width:90%}
      .spin{width:38px;height:38px;margin:0 auto 14px;border:3px solid rgba(238,77,45,.2);border-top-color:#ee4d2d;border-radius:9999px;animation:s .8s linear infinite}
      @keyframes s{to{transform:rotate(360deg)}}
      h1{margin:0 0 6px;font-size:15px;font-weight:700}p{margin:0;font-size:12px;color:#64748b}
    </style></head><body><div class="card"><div class="spin"></div><h1>Menyiapkan Resi Shopee…</h1><p>Menggabungkan &amp; memformat label pengiriman Anda.</p></div></body></html>`);
  }
  try {
    const merged = await PDFDocument.create();
    // Shopee can't mix couriers in one document, so group each kind by shop + courier.
    for (const [kind, list] of [["order", orders], ["booking", bookings]] as const) {
      const groups = Object.values(list.reduce<Record<string, AwbOrder[]>>((acc, o) => {
        (acc[`${o.marketplace_shop_id}|${o.courier}`] ??= []).push(o);
        return acc;
      }, {}));
      for (const group of groups) {
        try {
          const { bytes, skipped } = await fetchAwb(group.map((o) => o.id), kind);
          result.skipped.push(...skipped);
          const { doc: src, cropBottoms } = await hideProductNames(bytes, group, printSettings);
          if (printSettings.paper_size === "78x100") {
            const targetW = 221.10; // 78 mm
            const targetH = 283.46; // 100 mm
            const srcPages = src.getPages();
            for (let idx = 0; idx < srcPages.length; idx++) {
              const srcPage = srcPages[idx];
              const origW = srcPage.getWidth();
              const origH = srcPage.getHeight();
              const bot = Math.min(cropBottoms[idx] ?? 0, origH * 0.35);
              const embedded = await merged.embedPage(srcPage, { left: 0, right: origW, bottom: bot, top: origH });
              const page = merged.addPage([targetW, targetH]);
              const cw = embedded.width;
              const ch = embedded.height;
              const scale = Math.min((targetW - 6) / cw, (targetH - 6) / ch);
              const w = cw * scale;
              const h = ch * scale;
              page.drawPage(embedded, {
                x: (targetW - w) / 2,
                y: (targetH - h) / 2,
                width: w,
                height: h,
              });
            }
          } else if (printSettings.paper_size === "100x100") {
            const targetW = 283.46;
            const targetH = 283.46;
            const srcPages = src.getPages();
            for (let idx = 0; idx < srcPages.length; idx++) {
              const srcPage = srcPages[idx];
              const origW = srcPage.getWidth();
              const origH = srcPage.getHeight();
              const bot = Math.min(cropBottoms[idx] ?? 0, origH * 0.35);
              const embedded = await merged.embedPage(srcPage, { left: 0, right: origW, bottom: bot, top: origH });
              const page = merged.addPage([targetW, targetH]);
              const cw = embedded.width;
              const ch = embedded.height;
              const scale = Math.min((targetW - 6) / cw, (targetH - 6) / ch);
              const w = cw * scale;
              const h = ch * scale;
              page.drawPage(embedded, {
                x: (targetW - w) / 2,
                y: (targetH - h) / 2,
                width: w,
                height: h,
              });
            }
          } else if (printSettings.paper_size === "a4") {
            const targetW = 595.28;
            const targetH = 841.89;
            for (const srcPage of src.getPages()) {
              const embedded = await merged.embedPage(srcPage);
              const page = merged.addPage([targetW, targetH]);
              const origW = srcPage.getWidth();
              const origH = srcPage.getHeight();
              page.drawPage(embedded, {
                x: 42,
                y: targetH - origH - 42,
                width: origW,
                height: origH,
              });
            }
          } else {
            // Default 100x150 mm
            const pages = await merged.copyPages(src, src.getPageIndices());
            pages.forEach((p) => merged.addPage(p));
          }
        } catch (e) {
          result.errors.push((e as Error).message);
        }
      }
    }
    if (!merged.getPageCount()) throw new Error(result.errors.join(" ") || "Tidak ada resi yang bisa dicetak.");
    const pdf = await merged.save();
    if (direct) {
      result.printed = await printPdfDirect(pdf, printSettings.paper_size);
      return result;
    }
    const blob = new Blob([pdf.slice().buffer as ArrayBuffer], { type: "application/pdf" });
    const url = URL.createObjectURL(blob);
    const stamp = new Date().toISOString().slice(0, 16).replace(/[-:T]/g, "");
    const filename = `resi-shopee-${stamp}.pdf`;
    if (win) {
      // Wrap the blob PDF in an HTML page with a direct <a download> button: Chrome's built-in PDF viewer
      // fails with "Check internet connection" when downloading a navigated blob: URL directly.
      win.document.open();
      win.document.write(`<!doctype html><html><head><meta charset="utf-8"><title>${filename}</title><style>
        *{box-sizing:border-box}html,body{margin:0;height:100%;font-family:system-ui,-apple-system,sans-serif;background:#1e293b;display:flex;flex-direction:column}
        .bar{display:flex;align-items:center;justify-content:space-between;gap:12px;padding:10px 18px;background:#0f172a;color:#f8fafc;border-bottom:1px solid #334155}
        .brand{display:flex;align-items:center;gap:10px;min-width:0}
        .badge{background:rgba(238,77,45,.18);color:#ff7a5c;font-size:11px;font-weight:700;padding:3px 8px;border-radius:9999px;white-space:nowrap}
        .title{font-size:13px;font-weight:600;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
        .actions{display:flex;gap:8px;flex-shrink:0}
        .btn{display:inline-flex;align-items:center;gap:6px;padding:8px 15px;border-radius:8px;font-size:13px;font-weight:600;text-decoration:none;cursor:pointer;border:0;transition:background .15s}
        .dl{background:#ee4d2d;color:#fff}.dl:hover{background:#d73211}
        .pr{background:#334155;color:#f8fafc}.pr:hover{background:#475569}
        iframe{flex:1;width:100%;border:0;background:#334155}
      </style></head><body>
        <div class="bar">
          <div class="brand">
            <span class="badge">${merged.getPageCount()} halaman</span>
            <div class="title">Resi Shopee · ${filename}</div>
          </div>
          <div class="actions">
            <button class="btn pr" onclick="document.getElementById('pdf').contentWindow.print()">Cetak Sekarang</button>
            <a class="btn dl" href="${url}" download="${filename}">Unduh PDF</a>
          </div>
        </div>
        <iframe id="pdf" src="${url}"></iframe>
      </body></html>`);
      win.document.close();
    } else {
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
    }
    return result;
  } catch (e) {
    win?.close();
    throw e;
  }
}
