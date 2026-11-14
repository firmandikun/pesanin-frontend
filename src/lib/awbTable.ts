import { PDFFont, PDFPage, rgb } from "pdf-lib";

export type TextItem = { str: string; transform: number[]; width: number; height: number };
type Fonts = { regular: PDFFont; bold: PDFFont };
type Row = { no: string; sku: string; qty: string; label: string };

const HEADER = /^(Nama\s*Produk|Product\s*Name)$/i;

/**
 * Shopee's AWB item table is "# | Nama Produk | SKU | Variasi | Qty". Pesanin hides product names,
 * so the whole table is cleared and redrawn as "# | SKU | Qty" at full width (the variant *name* is dropped; the SKU is enough).
 * pdf.js merges neighbouring cells into one text run ("CEK-BLUE-M blue,M"), so every run is split
 * back into characters and each character is assigned to the column whose header it sits under.
 * Returns false (page left untouched) when the table layout isn't recognised.
 */
/** Per-row SKU data from Pesanin's order, used to print "SKU Induk" and "SKU Variasi" separately. */
export type SkuRow = { parent: string; variant: string; /** "Nama Produk (Variasi)", printed when the item has no SKU. */ label?: string };

/** "Nama Produk (Variasi)", or just the name. */
const nameWithVariant = (name: string, variant: string) => (name ? (variant ? `${name} (${variant})` : name) : "");

export function redrawItemTable(page: PDFPage, items: TextItem[], fonts: Fonts, rowData?: SkuRow[]): boolean {
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
  const numericCandidates = body.filter((i) => i.transform[4] < x.name && /^\d+$/.test(i.str.trim()));
  // A Shopee label can print the numeric tracking number immediately below the item table at the
  // same x-position as the "#" column. It is not another item row. When the page has been matched
  // to an order, the API item count is the authoritative row count; without this cap a one-item
  // parcel could be redrawn with its tracking number as a fake second SKU.
  const numbers = rowData?.length ? numericCandidates.slice(0, rowData.length) : numericCandidates;
  if (!numbers.length) return false;

  // Split each run into characters positioned with Helvetica metrics scaled to the run's real width.
  const cells = numbers.map((n) => ({ y: n.transform[5], no: n.str.trim(), name: [] as [number, string][], sku: [] as [number, string][], vname: [] as [number, string][], qty: [] as [number, string][] }));
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
      // Product and variant names are only printed when the item has no SKU.
      const col = mid >= x.qty ? "qty" : mid >= x.variant ? "vname" : mid >= x.sku ? "sku" : mid >= x.name ? "name" : null;
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
  const rows: Row[] = cells.map((c) => ({ no: c.no, sku: join(c.sku) || "-", qty: join(c.qty) || "1", label: nameWithVariant(join(c.name), join(c.vname)) }));

  // Clear the old table (header included) across the page, from the header top to just above the next block.
  const { width: pw } = page.getSize();
  const top = hy + size + 1.5;
  const lowest = Math.min(...body.map((i) => i.transform[5]));
  const bottom = stop ? stop.transform[5] + (stop.height || size) * 0.8 : lowest - size * 0.4;
  page.drawRectangle({ x: 1.5, y: bottom, width: pw - 3, height: top - bottom, color: rgb(1, 1, 1) });

  // "# | SKU | Qty". With Pesanin's own order items (matched 1:1 to the label's rows) the SKU is the variation SKU
  // (or the product SKU when it has no variations); otherwise it comes from the label text. Qty always from the label.
  // No SKU at all → "Nama Produk (Variasi)" (from Pesanin's order, else as printed on Shopee's label).
  const own = !!rowData && rowData.length === rows.length && rows.length > 0;
  const has = (s?: string) => !!s && s !== "-";
  const pick = (d: SkuRow, r: Row) => (has(d.variant) ? d.variant : has(d.parent) ? d.parent : d.label || r.label || "-");
  const heads = ["SKU", "Qty"];
  const body2 = rows.map((r, i) => ({ no: r.no, cells: [own ? pick(rowData![i], r) : has(r.sku) ? r.sku : r.label || "-"], qty: r.qty }));

  const left = hash.transform[4];
  const right = pw - left;
  const qtyX = right - 18;
  const colX = [left + 14];
  const headX = [...colX, qtyX];
  const ink = rgb(0, 0, 0), rule = rgb(0.6, 0.6, 0.6);
  const line = (y: number) => page.drawLine({ start: { x: left, y }, end: { x: right, y }, thickness: 0.5, color: rule });
  const lh = size * 1.18;
  const widthFor = (k: number) => (k + 1 < colX.length ? colX[k + 1] : qtyX) - colX[k] - 6;

  let y = hy;
  page.drawText("#", { x: left, y, size, font: fonts.bold, color: ink });
  heads.forEach((t, k) => page.drawText(t, { x: headX[k], y, size, font: fonts.bold, color: ink }));
  y -= size * 0.32;
  line(y);
  body2.forEach((r, i) => {
    const lines = r.cells.map((c, k) => wrap(c, fonts.bold, size, widthFor(k)));
    const n = Math.max(1, ...lines.map((l) => l.length));
    const first = y - size * 1.0;
    if (first - (n - 1) * lh < bottom) return; // never spill into the block below
    page.drawText(r.no, { x: left, y: first, size, font: fonts.regular, color: ink });
    const qty = sanitize(fonts.regular, r.qty);
    page.drawText(qty, { x: qtyX, y: first, size, font: fonts.bold, color: ink });
    // Draw attention to multi-item orders: circle a quantity greater than 1 so it isn't missed when packing.
    if ((parseInt(r.qty, 10) || 1) > 1) {
      const tw = safeWidth(fonts.bold, qty, size);
      page.drawEllipse({ x: qtyX + tw / 2, y: first + size * 0.33, xScale: tw / 2 + 4, yScale: size * 0.72, borderColor: ink, borderWidth: 1.1 });
    }
    lines.forEach((col, k) => col.forEach((ln, j) => page.drawText(ln, { x: colX[k], y: first - j * lh, size, font: fonts.bold, color: ink })));
    y = first - (n - 1) * lh - size * 0.32;
    if (i < body2.length - 1) line(y);
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
