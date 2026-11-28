"use client";
import { PDFDocument } from "pdf-lib";
import { formatAwbPart, type AwbLabel, type PdfJs } from "@/lib/awbFormat";
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

/** Shopee's limit of labels per shipping document. */
const AWB_CHUNK = 50;
/** Documents fetched at the same time (each one makes Shopee build a PDF). */
const AWB_PARALLEL = 3;

/** Run `fn` over `items` with at most `limit` running at once; results keep the input order. */
async function mapLimit<T, R>(items: T[], limit: number, fn: (item: T) => Promise<R>): Promise<R[]> {
  const out: R[] = new Array(items.length);
  let next = 0;
  const worker = async () => {
    while (next < items.length) {
      const i = next++;
      out[i] = await fn(items[i]);
    }
  };
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, worker));
  return out;
}

/** Browser side: the numbers on an order's label and its "SKU | Variasi | Qty" rows. */
function toLabel(o: AwbOrder): AwbLabel {
  return {
    sns: [o.external_order_sn, o.booking_sn, o.order_sn, o.tracking_number].filter((sn): sn is string => !!sn),
    rows: (o.items ?? []).map((it) => ({
      parent: (it.item_sku ?? it.sku ?? "") || "-", variant: (it.model_sku ?? "") || "-",
      name: it.name ?? undefined, varName: it.variant ?? undefined, qty: it.qty ?? 1,
    })),
  };
}

let pdfjsBrowser: Promise<PdfJs> | null = null;
function loadPdfJs(): Promise<PdfJs> {
  return (pdfjsBrowser ??= import("pdfjs-dist").then((m) => { m.GlobalWorkerOptions.workerSrc = "/pdf.worker.min.mjs"; return m as unknown as PdfJs; }));
}

/**
 * Show a PDF in a tab opened earlier (from the click, so it isn't blocked as a pop-up) with "Cetak" and "Unduh" buttons.
 * Chrome's PDF viewer can't download a navigated blob: URL, hence the HTML wrapper with an <a download>.
 */
export function showPdfViewer(win: Window, url: string, filename: string, pages: number): void {
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
        <span class="badge">${pages} halaman</span>
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
}

/** What a print left out: parcels already shipped (skipped) and groups that failed (errors). */
export type AwbResult = { skipped: string[]; errors: string[]; printed?: number };

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
    </style></head><body><div class="card"><div class="spin"></div><h1>Menyiapkan Resi Shopee…</h1><p id="progress">Menggabungkan &amp; memformat label pengiriman Anda.</p></div></body></html>`);
  }
  try {
    const merged = await PDFDocument.create();
    const progress = (text: string) => { const el = win?.document.getElementById("progress"); if (el) el.textContent = text; };
    // Shopee can't mix couriers in one document and takes at most 50 labels per document: group each kind by
    // shop + courier, then split every group into chunks of 50.
    const tasks: { kind: "order" | "booking"; group: AwbOrder[] }[] = [];
    for (const [kind, list] of [["order", orders], ["booking", bookings]] as const) {
      const groups = Object.values(list.reduce<Record<string, AwbOrder[]>>((acc, o) => {
        (acc[`${o.marketplace_shop_id}|${o.courier}`] ??= []).push(o);
        return acc;
      }, {}));
      for (const group of groups) {
        for (let i = 0; i < group.length; i += AWB_CHUNK) tasks.push({ kind, group: group.slice(i, i + AWB_CHUNK) });
      }
    }
    // Download a few chunks at a time (Shopee prepares each document on its side), keeping the original order.
    let done = 0;
    const total = tasks.reduce((t, x) => t + x.group.length, 0);
    progress(`Mengambil ${total} resi dari Shopee…`);
    const fetched = await mapLimit(tasks, AWB_PARALLEL, async (t) => {
      try {
        return await fetchAwb(t.group.map((o) => o.id), t.kind);
      } catch (e) {
        return e as Error;
      } finally {
        done += t.group.length;
        progress(`Mengambil resi dari Shopee… ${done}/${total}`);
      }
    });
    for (let i = 0; i < tasks.length; i++) {
      const r = fetched[i];
      if (r instanceof Error) { result.errors.push(r.message); continue; }
      result.skipped.push(...r.skipped);
      progress(`Memformat label… ${i + 1}/${tasks.length}`);
      try {
        await formatAwbPart(merged, r.bytes, tasks[i].group.map(toLabel), printSettings, await loadPdfJs());
      } catch (e) {
        result.errors.push((e as Error).message);
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
      showPdfViewer(win, url, filename, merged.getPageCount());
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
