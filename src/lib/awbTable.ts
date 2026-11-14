import { PDFFont, PDFPage, rgb } from "pdf-lib";

export type TextItem = { str: string; transform: number[]; width: number; height: number };
type Fonts = { regular: PDFFont; bold: PDFFont };
type Row = { no: string; sku: string; qty: string };

const HEADER = /^(Nama\s*Produk|Product\s*Name)$/i;

/**
 * Shopee's AWB item table is "# | Nama Produk | SKU | Variasi | Qty". Pesanin hides product names,
 * so the whole table is cleared and redrawn as "# | SKU | Qty" at full width (the variant *name* is dropped; the SKU is enough).
 * pdf.js merges neighbouring cells into one text run ("CEK-BLUE-M blue,M"), so every run is split
 * back into characters and each character is assigned to the column whose header it sits under.
 * Returns false (page left untouched) when the table layout isn't recognised.
 */
export function redrawItemTable(page: PDFPage, items: TextItem[], fonts: Fonts): boolean {
  const name = items.find((i) => HEADER.test(i.str.trim()));
  if (!name) return false;
  const hy = name.transform[5];
  const onHeader = (re: RegExp) => items.find((i) => re.test(i.str.trim()) && Math.abs(i.transform[5] - hy) < 3);
  const hash = onHeader(/^#$/), sku = onHeader(/^SKU$/i), variant = onHeader(/^(Variasi|Variation)$/i), qty = onHeader(/^(Qty|Jumlah)$/i);
  if (!hash || !sku || !variant || !qty) return false;

  const x = { name: name.transform[4] - 1, sku: sku.transform[4] - 1, variant: variant.transform[4] - 1, qty: qty.transform[4] - 1 };
  const size = name.height || name.transform[3] || 7;

  // Items below the header, top to bottom, until the first line that isn't part of the table
  // (e.g. "Komentar Pembeli" or "Pesan: <no. pesanan>"): text in the # column that isn't a number.
  const below = items.filter((i) => i.str.trim() && i.transform[5] < hy - 1).sort((a, b) => b.transform[5] - a.transform[5]);
  const stop = below.find((i) => i.transform[4] < x.name && !/^\d+$/.test(i.str.trim()));
  const body = below.filter((i) => !stop || i.transform[5] > stop.transform[5] + 1);
  const numbers = body.filter((i) => i.transform[4] < x.name && /^\d+$/.test(i.str.trim()));
  if (!numbers.length) return false;

  // Split each run into characters positioned with Helvetica metrics scaled to the run's real width.
  const cells = numbers.map((n) => ({ y: n.transform[5], no: n.str.trim(), sku: [] as [number, string][], qty: [] as [number, string][] }));
  for (const it of body) {
    if (numbers.includes(it)) continue;
    const y = it.transform[5];
    const row = [...cells].reverse().find((c) => c.y >= y - 1) ?? cells[0];
    const chars = [...it.str];
    const widths = chars.map((c) => safeWidth(fonts.regular, c, size));
    const total = widths.reduce((a, b) => a + b, 0) || 1;
    const scale = it.width ? it.width / total : 1;
    let cx = it.transform[4];
    chars.forEach((c, k) => {
      const mid = cx + (widths[k] * scale) / 2;
      cx += widths[k] * scale;
      // Characters between the Variasi and Qty columns are the variant name — dropped on purpose.
      const col = mid >= x.qty ? "qty" : mid >= x.variant ? null : mid >= x.sku ? "sku" : null;
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
  const rows: Row[] = cells.map((c) => ({ no: c.no, sku: join(c.sku) || "-", qty: join(c.qty) || "1" }));

  // Clear the old table (header included) across the page, from the header top to just above the next block.
  const { width: pw } = page.getSize();
  const top = hy + size + 1.5;
  const lowest = Math.min(...body.map((i) => i.transform[5]));
  const bottom = stop ? stop.transform[5] + (stop.height || size) * 0.8 : lowest - size * 0.4;
  page.drawRectangle({ x: 1.5, y: bottom, width: pw - 3, height: top - bottom, color: rgb(1, 1, 1) });

  // New columns: # | SKU (wide) | Variasi | Qty, filling the same width as the original table.
  const left = hash.transform[4];
  const right = pw - left;
  const col = { no: left, sku: left + 14, qty: right - 18 };
  const ink = rgb(0, 0, 0), rule = rgb(0.6, 0.6, 0.6);
  const line = (y: number) => page.drawLine({ start: { x: left, y }, end: { x: right, y }, thickness: 0.5, color: rule });
  const lh = size * 1.18;

  let y = hy;
  [["#", col.no], ["SKU", col.sku], ["Qty", col.qty]].forEach(([t, cx]) =>
    page.drawText(t as string, { x: cx as number, y, size, font: fonts.bold, color: ink }));
  y -= size * 0.32;
  line(y);
  rows.forEach((r, i) => {
    const skuLines = wrap(r.sku, fonts.bold, size, col.qty - col.sku - 6);
    const n = skuLines.length;
    const first = y - size * 1.0;
    if (first - (n - 1) * lh < bottom) return; // never spill into the block below
    page.drawText(r.no, { x: col.no, y: first, size, font: fonts.regular, color: ink });
    page.drawText(sanitize(fonts.regular, r.qty), { x: col.qty, y: first, size, font: fonts.bold, color: ink });
    for (let k = 0; k < n; k++) {
      if (skuLines[k]) page.drawText(skuLines[k], { x: col.sku, y: first - k * lh, size, font: fonts.bold, color: ink });
    }
    y = first - (n - 1) * lh - size * 0.32;
    if (i < rows.length - 1) line(y);
  });
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
  const out: string[] = [];
  let cur = "";
  for (const ch of [...sanitize(font, text)]) {
    if (font.widthOfTextAtSize(cur + ch, size) > max && cur) {
      // Prefer breaking after a space or hyphen inside the current line.
      const cut = Math.max(cur.lastIndexOf(" "), cur.lastIndexOf("-"));
      if (cut > 0) { out.push(cur.slice(0, cut + 1).trimEnd()); cur = cur.slice(cut + 1).trimStart() + ch; }
      else { out.push(cur); cur = ch; }
    } else cur += ch;
  }
  if (cur) out.push(cur);
  return out;
}
