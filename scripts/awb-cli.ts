// Server-side Shopee AWB formatter. Built by `npm run build:awb` into backend/scripts/awb/awb.mjs and run by
// Laravel (AwbSchedule, AwbPrintJob) as `node awb.mjs <job.json>`. Uses the same formatting as the browser
// (src/lib/awbFormat.ts), so labels from "Cetak Resi", background printing and Telegram are identical.
//
// job.json: { "output": "/abs/result.pdf", "print_settings": {...},
//             "parts": [{ "pdf": "/abs/raw.pdf", "orders": [{ "sns": ["2611..."], "rows": [{ "parent": "SKU", "variant": "-", "qty": 1 }] }] }] }
// Prints {"ok":true,"pages":N} on success.
import { readFile, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { PDFDocument } from "pdf-lib";
import * as pdfjs from "pdfjs-dist/legacy/build/pdf.mjs";
import { formatAwbPart, type AwbLabel, type PdfJs } from "../src/lib/awbFormat";

type LegacyItem = { sku?: string; name?: string; variant?: string; qty?: number };
type JobOrder = Partial<AwbLabel> & { items?: LegacyItem[]; external_order_sn?: string; booking_sn?: string; order_sn?: string; tracking_number?: string };
type Job = { output: string; print_settings?: Record<string, unknown>; parts: { pdf: string; orders?: JobOrder[] }[] };

// pdf.js in Node reads standard fonts from a folder path (a file:// URL fails to load).
const standardFontDataUrl = fileURLToPath(new URL("./node_modules/pdfjs-dist/standard_fonts/", import.meta.url));

/** Accepts the current shape (sns + rows) and the older one (order numbers + items with a single sku). */
function toLabel(o: JobOrder): AwbLabel {
  const sns = o.sns ?? [o.external_order_sn, o.booking_sn, o.order_sn, o.tracking_number].filter((x): x is string => !!x);
  const rows = o.rows ?? (o.items ?? []).map((it) => ({ parent: it.sku || "-", variant: "-", name: it.name || undefined, varName: it.variant || undefined, qty: it.qty ?? 1 }));
  return { sns, rows };
}

const job: Job = JSON.parse(await readFile(process.argv[2], "utf8"));
const merged = await PDFDocument.create();
const failed: string[] = [];
for (const part of job.parts) {
  try {
    const bytes = new Uint8Array(await readFile(part.pdf));
    await formatAwbPart(merged, bytes, (part.orders ?? []).map(toLabel), job.print_settings ?? {}, pdfjs as unknown as PdfJs,
      { isEvalSupported: false, disableFontFace: true, standardFontDataUrl });
  } catch (e) {
    failed.push(`${part.pdf}: ${(e as Error).message}`);
  }
}
if (!merged.getPageCount()) {
  console.error(failed.join("\n") || "no pages");
  process.exit(1);
}
await writeFile(job.output, await merged.save());
console.log(JSON.stringify({ ok: true, pages: merged.getPageCount(), failed }));
