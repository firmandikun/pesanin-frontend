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
  // (e.g. "Komentar Pembeli" or "Pesan: <no. pesanan>"): text in the # column that isn't a number.
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
      // Product and variant names are only printed when the item has no SKU.
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
    // A wrapped SKU breaks after "-": glue those lines back without a space.
    return lines.map((l) => l.trim()).filter(Boolean).reduce((acc, l) => (acc && !acc.endsWith("-") ? `${acc} ${l}` : acc + l), "");
  };
  const rows: Row[] = cells.map((c) => ({ no: c.no, sku: join(c.sku) || "-", qty: join(c.qty) || "1", name: join(c.name), vname: join(c.vname) }));

  // With Pesanin's own order items, show all items from the order.
  const own = !!rowData && rowData.length > 0;
  const has = (s?: string) => !!s && s.trim() !== "" && s.trim() !== "-";
  const info = own
    ? rowData!.map((d, i) => {
        const sku = has(d.variant) ? d.variant : has(d.parent) ? d.parent : "";
        return {
          no: String(i + 1),
          sku,
          name: (d.name || "").trim(),
          variant: (d.varName || "").trim(),
          qty: String(d.qty ?? (rows[i]?.qty || "1")),
        };
      })
    : rows.map((r, i) => {
        const sku = has(r.sku) ? r.sku : "";
        return {
          no: r.no || String(i + 1),
          sku,
          name: (r.name || "").trim(),
          variant: (r.vname || "").trim(),
          qty: r.qty || "1",
        };
      });

  const allSku = info.every((x) => x.sku);
  const showVariant = (variant !== undefined) || info.some((x) => has(x.variant));
  const heads = allSku
    ? ["SKU", "Qty"]
    : showVariant
    ? [info.some((x) => x.sku) ? "SKU / Nama Produk" : "Nama Produk", "Variasi", "Qty"]
    : [info.some((x) => x.sku) ? "SKU / Nama Produk" : "Nama Produk", "Qty"];

  const body2 = info.map((it) => {
    const cells = allSku
      ? [it.sku]
      : showVariant
      ? [it.sku || it.name || "-", it.variant || "-"]
      : [it.sku || it.name || "-"];
    return { no: it.no, qty: it.qty, cells };
  });

  const { width: pw } = page.getSize();
  const left = hash ? hash.transform[4] : Math.max(10, name.transform[4] - 22);
  const right = pw - left;
  const qtyX = right - 18;
  const hasMultipleCols = heads.length > 2;
  const colX = hasMultipleCols
    ? [left + 14, left + 14 + (qtyX - left - 14) * 0.66]
    : [left + 14];
  const headX = [...colX, qtyX];
  const ink = rgb(0, 0, 0);
  const rule = rgb(0.1, 0.1, 0.1); // Solid dark line for sharp thermal printing
  const stroke = 0.6;
  const showBorders = settings?.show_table_border !== false;

  const tableLeft = left - 3;
  const tableRight = right + 2;
  const line = (yy: number) => page.drawLine({ start: { x: tableLeft, y: yy }, end: { x: tableRight, y: yy }, thickness: stroke, color: rule });
  const vLine = (vx: number, y1: number, y2: number) => page.drawLine({ start: { x: vx, y: y1 }, end: { x: vx, y: y2 }, thickness: stroke, color: rule });

  const lh = size * 1.18;
  const widthFor = (k: number) => (k + 1 < colX.length ? colX[k + 1] : qtyX) - colX[k] - 6;

  // Pre-calculate wrapped lines for each row to accurately compute height needed
  const rowsWithLines = body2.map((r) => {
    const lines = r.cells.map((c, k) => wrap(c, fonts.bold, size, widthFor(k)));
    const n = Math.max(1, ...lines.map((l) => l.length));
    return { ...r, lines, n };
  });

  const totalItemHeight = rowsWithLines.reduce((acc, r) => acc + (size + 2.5 + (r.n - 1) * lh + 3), 0);
  const top = hy + headerSize + 3;
  const topY = hy + headerSize + 2.5;
  const headerBottomY = hy - 2.5;
  const minSafeY = 20;

  const lowest = body.length ? Math.min(...body.map((i) => i.transform[5])) : hy - size * 3;
  const origBottom = stop ? stop.transform[5] + (stop.height || size) * 0.8 : lowest - size * 0.4;
  const neededBottom = Math.max(minSafeY, headerBottomY - totalItemHeight - 8);
  const targetBottom = Math.min(origBottom, neededBottom);

  // Clear the old table (header included) and the entire vertical span needed for all rows
  page.drawRectangle({ x: 1.5, y: targetBottom, width: pw - 3, height: top - targetBottom, color: rgb(1, 1, 1) });

  let y = hy;
  page.drawText("#", { x: left, y, size: headerSize, font: fonts.bold, color: ink });
  heads.forEach((t, k) => page.drawText(t, { x: headX[k], y, size: headerSize, font: fonts.bold, color: ink }));

  if (showBorders) {
    line(topY);
    line(headerBottomY);
  } else {
    page.drawLine({ start: { x: left, y: headerBottomY }, end: { x: right, y: headerBottomY }, thickness: 0.5, color: rule });
  }

  y = headerBottomY;

  rowsWithLines.forEach((r, i) => {
    const first = y - size - 2.5;
    if (first - (r.n - 1) * lh < minSafeY) return; // never run off bottom of label
    page.drawText(r.no, { x: left, y: first, size: headerSize, font: fonts.regular, color: ink });
    const qtyText = sanitize(fonts.regular, r.qty);
    page.drawText(qtyText, { x: qtyX, y: first, size: Math.max(size, 7), font: fonts.bold, color: ink });
    if ((parseInt(r.qty, 10) || 1) > 1) {
      const tw = safeWidth(fonts.bold, qtyText, size);
      page.drawEllipse({ x: qtyX + tw / 2, y: first + size * 0.33, xScale: tw / 2 + 4, yScale: size * 0.72, borderColor: ink, borderWidth: 1.1 });
    }
    r.lines.forEach((col, k) => col.forEach((ln, j) => page.drawText(ln, { x: colX[k], y: first - j * lh, size, font: fonts.bold, color: ink })));
    y = first - (r.n - 1) * lh - 3;
    if (showBorders) {
      line(y);
    } else if (i < rowsWithLines.length - 1) {
      page.drawLine({ start: { x: left, y }, end: { x: right, y }, thickness: 0.5, color: rule });
    }
  });

  const bottomY = y;

  if (showBorders) {
    // Draw vertical column divider and outer frame lines
    vLine(tableLeft, topY, bottomY); // Left border
    vLine(colX[0] - 4, topY, bottomY); // Between # and SKU
    if (!allSku && colX.length > 1) {
      vLine(colX[1] - 4, topY, bottomY); // Between SKU and Variasi
    }
    vLine(qtyX - 4, topY, bottomY); // Between SKU/Variasi and Qty
    vLine(tableRight, topY, bottomY); // Right border
  }

  // If table expanded over stop (e.g. "Pesan: (...)"), redraw it cleanly below the new table
  if (stop && bottomY < stop.transform[5] + 5 && bottomY > minSafeY + 14) {
    page.drawText(sanitize(fonts.regular, stop.str), {
      x: left,
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
