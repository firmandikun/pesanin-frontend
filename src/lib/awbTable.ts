import { PDFFont, PDFPage, rgb } from "pdf-lib";
import { type PrintSettings, DEFAULT_PRINT_SETTINGS } from "@/lib/printSettings";

export type TextItem = { str: string; transform: number[]; width: number; height: number };
type Fonts = { regular: PDFFont; bold: PDFFont };
type Row = { no: string; sku: string; qty: string; name?: string; vname?: string };

const HEADER = /^(Nama\s*Produk|Product\s*Name)$/i;

/**
 * Replace Shopee's item table on a PDF page with "# | SKU | Qty" or "# | SKU / Nama Produk | Variasi | Qty".
 * Returns false (page left untouched) when the table layout isn't recognised.
 */
/** Per-row SKU data from Pesanin's order, used to print "SKU Induk" and "SKU Variasi" separately. */
export type SkuRow = { parent: string; variant: string; /** Product and variation names, printed when the item has no SKU. */ name?: string; varName?: string; qty?: number | string };

export function redrawItemTable(page: PDFPage, items: TextItem[], fonts: Fonts, rowData?: SkuRow[], settings?: Partial<PrintSettings>): boolean {
  const name = items.find((i) => HEADER.test(i.str.trim()));
  if (!name) return false;
  const hy = name.transform[5];
  const onHeader = (re: RegExp) => items.find((i) => re.test(i.str.trim()) && Math.abs(i.transform[5] - hy) < 12);
  const hash = onHeader(/^#$|^No\.?$/i), sku = onHeader(/^SKU$/i), variant = onHeader(/^(Variasi|Variation)$/i), qty = onHeader(/^(Qty|Jumlah|Total)$/i);
  if (!qty) return false;

  const { width: pw } = page.getSize();

  // Content frame borders (outer box of Shopee label: 5mm = 14.17pt margin)
  const detectedLeft = hash ? hash.transform[4] : name.transform[4] - 20;
  const frameLeft = detectedLeft >= 15 ? 14.17 : Math.max(10, detectedLeft - 2);
  const frameRight = pw - frameLeft;

  const x = {
    name: name.transform[4] - 1,
    sku: sku ? sku.transform[4] - 1 : null,
    variant: variant ? variant.transform[4] - 1 : null,
    qty: qty.transform[4] - 1,
  };
  const customSize = settings?.sku_font_size ? Number(settings.sku_font_size) : undefined;
  const size = (customSize && customSize >= 5 && customSize <= 16) ? customSize : (name.height || name.transform[3] || 7);
  const headerSize = Math.min(size, 8);

  // Items below the header, top to bottom, until the first line that isn't part of the table
  const below = items.filter((i) => i.str.trim() && i.transform[5] < hy - 1).sort((a, b) => b.transform[5] - a.transform[5]);
  const stop = below.find((i) =>
    /^(Pesan|Komentar|Catatan|Note)/i.test(i.str.trim()) ||
    (i.transform[4] < x.name && !/^\d+$/.test(i.str.trim()) && i.transform[5] < hy - size * 2.5)
  );
  const body = below.filter((i) => !stop || i.transform[5] > stop.transform[5] + 1);
  const numericCandidates = body.filter((i) => i.transform[4] < x.name && /^\d+$/.test(i.str.trim()));
  const numbers = rowData?.length ? numericCandidates.slice(0, rowData.length) : numericCandidates;
  if (!numbers.length && (!rowData || !rowData.length)) return false;

  // Split each run into characters positioned with Helvetica metrics scaled to the run's real width.
  const cells = numbers.map((n) => ({ y: n.transform[5], no: n.str.trim(), name: [] as [number, string][], sku: [] as [number, string][], vname: [] as [number, string][], qty: [] as [number, string][] }));
  for (const it of body) {
    const row = cells.find((c) => Math.abs(c.y - it.transform[5]) < (it.height || 8) * 0.75);
    if (!row) continue;
    const [, , , , x0, y] = it.transform;
    const widths = [...it.str].map((c) => safeWidth(fonts.regular, c, it.height || 7));
    const total = widths.reduce((a, b) => a + b, 0);
    const scale = total > 0 ? (it.width || total) / total : 1;
    let cx = x0;
    [...it.str].forEach((c, k) => {
      const mid = cx + (widths[k] * scale) / 2;
      cx += widths[k] * scale;
      const col = mid >= x.qty
        ? "qty"
        : (x.variant !== null && mid >= x.variant)
        ? "vname"
        : (x.sku !== null && mid >= x.sku)
        ? "sku"
        : mid >= x.name
        ? "name"
        : null;
      if (col) row[col].push([y, c]);
    });
  }
  const join = (chars: [number, string][]) => {
    const lines: string[] = [];
    let last: number | null = null;
    for (const [y, c] of chars) {
      if (last === null || Math.abs(y - last) > 1) lines.push("");
      lines[lines.length - 1] += c;
      last = y;
    }
    return lines.map((l) => l.trim()).filter(Boolean).reduce((acc, l) => (acc && !acc.endsWith("-") ? `${acc} ${l}` : acc + l), "");
  };
  const rows: Row[] = cells.map((c) => ({ no: c.no, sku: join(c.sku) || "-", qty: join(c.qty) || "1", name: join(c.name), vname: join(c.vname) }));

  // With Pesanin's own order items, show all items from the order.
  const own = !!rowData && rowData.length > 0;
  const has = (s?: string) => !!s && s.trim() !== "" && s.trim() !== "-";
  const textMode = settings?.product_text_mode || "sku_first";

  const info = own
    ? rowData!.map((d, i) => {
        const skuVal = has(d.variant) ? d.variant : has(d.parent) ? d.parent : "";
        let primary = "";
        let variant = (d.varName || "").trim();

        if (textMode === "name_only") {
          primary = (d.name || "").trim() || skuVal || "-";
        } else if (textMode === "sku_only") {
          primary = skuVal || "-";
          variant = "";
        } else {
          // sku_first: utamakan SKU, jika tidak ada baru nama produk
          primary = skuVal || (d.name || "").trim() || "-";
        }

        return {
          no: String(i + 1),
          sku: textMode === "name_only" ? "" : skuVal,
          name: (d.name || "").trim(),
          variant,
          qty: String(d.qty ?? (rows[i]?.qty || "1")),
          cellMain: primary,
        };
      })
    : rows.map((r, i) => {
        const skuVal = has(r.sku) ? r.sku : "";
        let primary = "";
        let variant = (r.vname || "").trim();

        if (textMode === "name_only") {
          primary = (r.name || "").trim() || skuVal || "-";
        } else if (textMode === "sku_only") {
          primary = skuVal || "-";
          variant = "";
        } else {
          primary = skuVal || (r.name || "").trim() || "-";
        }

        return {
          no: r.no || String(i + 1),
          sku: textMode === "name_only" ? "" : skuVal,
          name: (r.name || "").trim(),
          variant,
          qty: r.qty || "1",
          cellMain: primary,
        };
      });

  let allSku = false;
  let showVariant = false;
  let heads: string[] = [];

  if (textMode === "sku_only") {
    allSku = true;
    showVariant = false;
    heads = ["SKU", "Qty"];
  } else if (textMode === "name_only") {
    allSku = false;
    showVariant = (variant !== undefined) || info.some((x) => has(x.variant));
    heads = showVariant ? ["Nama Produk", "Variasi", "Qty"] : ["Nama Produk", "Qty"];
  } else {
    // sku_first: jika semua punya SKU -> 2 kolom (SKU, Qty), jika sebagian tidak ada SKU -> 3 kolom
    allSku = info.every((x) => has(x.sku));
    showVariant = !allSku && ((variant !== undefined) || info.some((x) => has(x.variant)));
    heads = allSku
      ? ["SKU", "Qty"]
      : showVariant
      ? [info.some((x) => has(x.sku)) ? "SKU / Nama Produk" : "Nama Produk", "Variasi", "Qty"]
      : [info.some((x) => has(x.sku)) ? "SKU / Nama Produk" : "Nama Produk", "Qty"];
  }

  const body2 = info.map((it) => {
    const cells = allSku
      ? [it.cellMain]
      : showVariant
      ? [it.cellMain, it.variant || "-"]
      : [it.cellMain];
    return { no: it.no, qty: it.qty, cells };
  });

  // Column layout within frameLeft and frameRight
  const hashWidth = 14;
  const qtyColWidth = 22;
  const divHash = frameLeft + hashWidth;
  const divQty = frameRight - qtyColWidth;
  const qtyX = divQty + 4;

  let colX: number[];
  let headX: number[];
  let divVar: number | null = null;

  if (allSku) {
    colX = [divHash + 3];
    headX = [colX[0], qtyX];
  } else if (showVariant) {
    const avail = divQty - divHash;
    const nameWidth = Math.round(avail * 0.65);
    divVar = divHash + nameWidth;
    colX = [divHash + 3, divVar + 3];
    headX = [colX[0], colX[1], qtyX];
  } else {
    colX = [divHash + 3];
    headX = [colX[0], qtyX];
  }

  const ink = rgb(0, 0, 0);
  const rule = rgb(0.1, 0.1, 0.1);
  const stroke = 0.6;
  const showBorders = settings?.show_table_border !== false;

  const line = (yy: number) => page.drawLine({ start: { x: frameLeft, y: yy }, end: { x: frameRight, y: yy }, thickness: stroke, color: rule });
  const vLine = (vx: number, y1: number, y2: number) => page.drawLine({ start: { x: vx, y: y1 }, end: { x: vx, y: y2 }, thickness: stroke, color: rule });

  const lh = size * 1.16;
  const widthFor = (k: number) => {
    if (k === 0) {
      return (divVar ?? divQty) - colX[0] - 5;
    }
    return divQty - colX[1] - 5;
  };

  const rowsWithLines = body2.map((r) => {
    const lines = r.cells.map((c, k) => wrap(c, fonts.bold, size, widthFor(k)));
    const n = Math.max(1, ...lines.map((l) => l.length));
    return { ...r, lines, n };
  });

  // Top boundary: in Shopee label, the horizontal divider below the barcode is at hy + 6.0.
  // Setting top = hy + 6.0 ensures we NEVER overlap or erase the barcode or No. Pesanan above!
  const topY = hy + 6.0;
  const headerBottomY = hy - 3.5;
  const minSafeY = 20;

  const totalItemHeight = rowsWithLines.reduce((acc, r) => acc + (size + 2.5 + (r.n - 1) * lh + 3.0), 0);
  const lowest = body.length ? Math.min(...body.map((i) => i.transform[5])) : hy - size * 3;
  const origBottom = stop ? stop.transform[5] + (stop.height || size) * 0.8 : lowest - size * 0.4;
  const neededBottom = Math.max(minSafeY, headerBottomY - totalItemHeight - 6);
  const targetBottom = Math.min(origBottom, neededBottom);

  // Clear inside the frame only, from topY down to targetBottom
  page.drawRectangle({
    x: frameLeft + 0.5,
    y: targetBottom,
    width: frameRight - frameLeft - 1,
    height: topY - targetBottom,
    color: rgb(1, 1, 1),
  });

  // Draw header row text
  page.drawText("#", { x: frameLeft + 3, y: hy, size: headerSize, font: fonts.bold, color: ink });
  heads.forEach((t, k) => page.drawText(t, { x: headX[k], y: hy, size: headerSize, font: fonts.bold, color: ink }));

  // Draw horizontal lines for header
  if (showBorders) {
    line(topY);
    line(headerBottomY);
  } else {
    page.drawLine({ start: { x: frameLeft, y: headerBottomY }, end: { x: frameRight, y: headerBottomY }, thickness: 0.5, color: rule });
  }

  let y = headerBottomY;

  // Draw each row
  rowsWithLines.forEach((r, i) => {
    const first = y - size - 2.5;
    if (first - (r.n - 1) * lh < minSafeY) return;
    page.drawText(r.no, { x: frameLeft + 3, y: first, size: headerSize, font: fonts.regular, color: ink });
    const qtyText = sanitize(fonts.regular, r.qty);
    page.drawText(qtyText, { x: qtyX, y: first, size: Math.max(size, 7), font: fonts.bold, color: ink });
    if ((parseInt(r.qty, 10) || 1) > 1) {
      const tw = safeWidth(fonts.bold, qtyText, size);
      page.drawEllipse({ x: qtyX + tw / 2, y: first + size * 0.33, xScale: tw / 2 + 4, yScale: size * 0.72, borderColor: ink, borderWidth: 1.1 });
    }
    r.lines.forEach((col, k) => col.forEach((ln, j) => page.drawText(ln, { x: colX[k], y: first - j * lh, size, font: fonts.bold, color: ink })));
    y = first - (r.n - 1) * lh - 3.0;
    if (showBorders) {
      line(y);
    } else if (i < rowsWithLines.length - 1) {
      page.drawLine({ start: { x: frameLeft, y }, end: { x: frameRight, y }, thickness: 0.5, color: rule });
    }
  });

  const bottomY = y;

  if (showBorders) {
    // Outer table frame lines (exact match with Shopee outer box)
    vLine(frameLeft, topY, bottomY);
    vLine(frameRight, topY, bottomY);

    // Vertical column divider lines
    vLine(divHash, topY, bottomY); // Between # and SKU/Nama Produk
    if (divVar !== null) {
      vLine(divVar, topY, bottomY); // Between Nama Produk and Variasi
    }
    vLine(divQty, topY, bottomY); // Between Variasi/SKU and Qty
  }

  // If table expanded over stop (e.g. "Pesan: (...)"), redraw it cleanly below the new table
  if (stop && bottomY < stop.transform[5] + 5 && bottomY > minSafeY + 14) {
    page.drawText(sanitize(fonts.regular, stop.str), {
      x: frameLeft + 3,
      y: bottomY - 10,
      size: Math.min(size, 7),
      font: fonts.regular,
      color: ink,
    });
  }

  return true;
}

/** Standard PDF fonts only encode WinAnsi; anything else becomes "?". */
function sanitize(font: PDFFont, s: string) {
  return [...s].map((c) => { try { font.widthOfTextAtSize(c, 1); return c; } catch { return "?"; } }).join("");
}
function safeWidth(font: PDFFont, c: string, size: number) {
  try { return font.widthOfTextAtSize(c, size); } catch { return size * 0.5; }
}
function wrap(text: string, font: PDFFont, size: number, max: number): string[] {
  const words = sanitize(font, text).split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let cur = "";
  for (const w of words) {
    const next = cur ? `${cur} ${w}` : w;
    if (safeWidth(font, next, size) <= max) {
      cur = next;
    } else {
      if (cur) lines.push(cur);
      cur = w;
    }
  }
  if (cur) lines.push(cur);
  return lines.length ? lines : ["-"];
}
