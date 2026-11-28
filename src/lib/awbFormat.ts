import { PDFDocument, rgb, StandardFonts } from "pdf-lib";
import { redrawItemTable, type SkuRow, type TextItem } from "./awbTable";
import type { PrintSettings } from "./printSettings";

/**
 * Shopee AWB formatting shared by the browser (Cetak Resi) and the server (scripts/awb-cli.ts, bundled into
 * backend/scripts/awb/awb.mjs for background printing and the Telegram send), so both produce the same labels:
 * product names replaced by a "# | SKU | Variasi | Qty" table, then laid out on the chosen paper size.
 */

/** One parcel on a label: the numbers printed on it (to find its page) and its item rows. */
export type AwbLabel = { sns: string[]; rows: SkuRow[] };
/** The bit of pdf.js used here (browser build or the Node legacy build). */
export type PdfJs = { getDocument: (src: Record<string, unknown>) => { promise: Promise<any> } };

/** Format one Shopee AWB document and append its pages to `merged`. */
export async function formatAwbPart(merged: PDFDocument, bytes: Uint8Array, labels: AwbLabel[], settings: Partial<PrintSettings>, pdfjs: PdfJs, docOptions: Record<string, unknown> = {}): Promise<number> {
  const { doc, cropBottoms } = await hideProductNames(bytes, labels, settings, pdfjs, docOptions);
  const before = merged.getPageCount();
  await appendAwbPages(merged, doc, cropBottoms, settings);
  return merged.getPageCount() - before;
}

/**
 * Remove product names from Shopee's AWB: the item table is redrawn as "# | SKU | Variasi | Qty"
 * (see awbTable.ts). If a page's layout isn't recognised, the name column is covered instead.
 */
async function hideProductNames(bytes: Uint8Array, group: AwbLabel[], printSettings: Partial<PrintSettings> | undefined, pdfjs: PdfJs, docOptions: Record<string, unknown>): Promise<{ doc: PDFDocument; cropBottoms: number[] }> {
  const doc = await pdfjs.getDocument({ data: bytes.slice(), ...docOptions }).promise;
  const out = await PDFDocument.load(bytes);
  const fonts = { regular: await out.embedFont(StandardFonts.Helvetica), bold: await out.embedFont(StandardFonts.HelveticaBold) };
  const cropBottoms: number[] = [];
  const skuRows = (o: AwbLabel): SkuRow[] => o.rows;
  // Shopee doesn't always return pages in the order requested, so find each page's order by the number printed on it.
  const keyed = group.flatMap((o) => o.sns.filter((sn) => !!sn).map((sn) => [sn.toUpperCase(), o] as const));

  const pagesData: { items: TextItem[]; minY: number; match?: AwbLabel }[] = [];
  for (let i = 0; i < doc.numPages; i++) {
    const items = (await (await doc.getPage(i + 1)).getTextContent()).items.filter((it: object) => "str" in it) as TextItem[];
    const ys = items.filter((it) => it.str.trim()).map((it) => it.transform[5]);
    const minY = ys.length ? Math.min(...ys) : 0;
    const text = items.map((it) => it.str).join("").replace(/\s+/g, "").toUpperCase();
    const match = keyed.find(([sn]) => text.includes(sn))?.[1] ?? (group.length === doc.numPages ? group[i] : undefined);
    pagesData.push({ items, minY, match });
  }

  const offsetByOrder = new Map<AwbLabel, number>();
  let outIdx = 0;

  for (let i = 0; i < pagesData.length; i++) {
    const { items, minY, match } = pagesData[i];
    cropBottoms.push(Math.max(0, minY - 12));
    const startIndex = match ? (offsetByOrder.get(match) ?? 0) : 0;
    const hasNextPage = !!match && pagesData.slice(i + 1).some((p) => p.match === match);
    const res = redrawItemTable(out.getPage(outIdx), items, fonts, match ? skuRows(match) : undefined, printSettings, { startIndex, hasNextPage });
    outIdx++;
    if (res.ok) {
      if (match) offsetByOrder.set(match, startIndex + res.renderedCount);
      if (res.drawOverflow) {
        const orderSn = match?.sns[0] ?? undefined;
        const added = res.drawOverflow(out, outIdx, orderSn);
        for (let k = 0; k < added; k++) cropBottoms.push(0);
        outIdx += added;
      }
      continue;
    }
    const header = items.find((it) => /^Nama\s*Produk/i.test(it.str.trim()) || /^Product\s*Name/i.test(it.str.trim()));
    if (!header) continue;
    if (printSettings?.product_text_mode === "name_only") continue; // Never cover names when name_only mode is chosen
    const hy = header.transform[5];
    const sku = items.find((it) => it.str.trim() === "SKU" && Math.abs(it.transform[5] - hy) < 12);
    if (!sku) continue; // Never erase product names when there is no SKU on the label
    const x0 = header.transform[4] - 1;
    const x1 = sku.transform[4] - 2;
    const page = out.getPage(outIdx - 1);
    for (const it of items) {
      const [, , , d, x, y] = it.transform;
      if (!it.str.trim() || x < x0 || x >= x1 || y > hy + 1) continue;
      const h = it.height || Math.abs(d) || 8;
      page.drawRectangle({ x: x - 0.5, y: y - h * 0.3, width: Math.min(it.width, x1 - x) + 1, height: h * 1.4, color: rgb(1, 1, 1) });
    }
  }
  return { doc: out, cropBottoms };
}

/** Add one formatted AWB document to the merged PDF at the chosen paper size. */
async function appendAwbPages(merged: PDFDocument, src: PDFDocument, cropBottoms: number[], printSettings: Partial<PrintSettings>): Promise<void> {
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
}
