"use client";
/**
 * Cetak langsung ke printer label thermal (Xprinter XP-420B dan sejenisnya) dari Chrome/Edge di Mac atau Windows,
 * tanpa dialog print. Printer di-pair dulu lewat Bluetooth OS (atau USB-serial); browser mengaksesnya lewat Web Serial.
 * Setiap halaman PDF dirender 203 dpi sesuai ukuran label, dijadikan bitmap 1-bit, lalu dikirim sebagai perintah TSPL.
 */
import type { PaperSize } from "@/lib/printSettings";

/** Bluetooth classic Serial Port Profile. */
const SPP = "00001101-0000-1000-8000-00805f9b34fb";
const DPMM = 8; // 203 dpi
const KEY = "pesanin_direct_print";

type SerialPortLike = {
  open(o: { baudRate: number }): Promise<void>;
  close(): Promise<void>;
  forget?(): Promise<void>;
  setSignals?(s: { dataTerminalReady?: boolean; requestToSend?: boolean }): Promise<void>;
  readable: ReadableStream<Uint8Array> | null;
  writable: WritableStream<Uint8Array> | null;
  getInfo(): { usbVendorId?: number; usbProductId?: number; bluetoothServiceClassId?: string };
};
type SerialLike = { requestPort(o?: { allowedBluetoothServiceClassIds?: string[]; filters?: unknown[] }): Promise<SerialPortLike>; getPorts(): Promise<SerialPortLike[]> };
const serial = (): SerialLike | null => (typeof navigator !== "undefined" && "serial" in navigator ? (navigator as unknown as { serial: SerialLike }).serial : null);

export type DirectPrintPrefs = { enabled: boolean; invert: boolean; density: number; gap: number; port: number };
const DEFAULTS: DirectPrintPrefs = { enabled: false, invert: false, density: 8, gap: 2, port: -1 };

export const directSupported = () => !!serial();

export function getDirectPrefs(): DirectPrintPrefs {
  try { return { ...DEFAULTS, ...JSON.parse(localStorage.getItem(KEY) ?? "{}") }; } catch { return DEFAULTS; }
}
export function setDirectPrefs(p: Partial<DirectPrintPrefs>) {
  try { localStorage.setItem(KEY, JSON.stringify({ ...getDirectPrefs(), ...p })); } catch { /* private mode */ }
}

/** Label size in mm per paper setting (A4 is not a thermal label). */
export const LABEL_MM: Partial<Record<PaperSize, [number, number]>> = { "100x150": [100, 150], "78x100": [78, 100], "100x100": [100, 100] };

/** Ask the user to pick the printer once (Chrome remembers the permission). */
export async function pickPrinter(): Promise<SerialPortLike> {
  const s = serial();
  if (!s) throw new Error("Browser ini belum mendukung cetak langsung. Pakai Google Chrome atau Microsoft Edge versi terbaru di Mac/Windows.");
  return s.requestPort({ allowedBluetoothServiceClassIds: [SPP] });
}

/** Every port this browser may use (the user picks the right one when there are several). */
export async function grantedPorts(): Promise<SerialPortLike[]> {
  const s = serial();
  return s ? s.getPorts() : [];
}

/** The printer chosen in the card (or the last one granted). */
export async function savedPrinter(): Promise<SerialPortLike | null> {
  const ports = await grantedPorts();
  const i = getDirectPrefs().port;
  return ports[i >= 0 && i < ports.length ? i : ports.length - 1] ?? null;
}

/**
 * Human name of a port. Chrome lists a Bluetooth printer twice on Mac: through its own Bluetooth link
 * ("Bluetooth langsung") and as the serial port macOS made for it after pairing ("port serial", usually the one that works).
 */
export function printerName(p: SerialPortLike | null): string {
  if (!p) return "Belum ada printer";
  const i = p.getInfo();
  return i.bluetoothServiceClassId ? "Bluetooth langsung (Chrome)" : i.usbVendorId ? `USB ${i.usbVendorId.toString(16)}:${(i.usbProductId ?? 0).toString(16)}` : "Port serial (Bluetooth / USB dari sistem)";
}

/**
 * The port stays open while the page is open: on a Mac, closing a Bluetooth serial port waits for the radio to drain
 * and reopening it is slow (and sometimes hangs), so a second print right after the first would stall.
 * It is closed when the tab goes away, or after an error so the next print starts clean.
 */
let current: SerialPortLike | null = null;
if (typeof window !== "undefined") {
  window.addEventListener("pagehide", () => { current?.close().catch(() => {}); current = null; });
}

async function openPort(port: SerialPortLike) {
  if (current === port && port.writable) return;
  if (current && current !== port) { await current.close().catch(() => {}); current = null; }
  const tryOpen = () => withTimeout(port.open({ baudRate: 9600 }), 20000, "Printer tidak menjawab saat dihubungkan. Matikan-nyalakan printer lalu coba lagi.");
  try {
    await tryOpen();
  } catch (e) {
    const err = e as DOMException;
    if (err.name === "InvalidStateError" && port.writable) { current = port; return; }
    if (!(err instanceof DOMException)) throw e;
    try { await port.close(); } catch { /* not open */ }
    await new Promise((r) => setTimeout(r, 800));
    try {
      await tryOpen();
    } catch (e2) {
      const x = e2 as DOMException;
      throw new Error(x.name === "NetworkError"
        ? "Printer sedang dipakai tab/aplikasi lain atau belum tersambung. Tutup tab Pesanin lain (atau muat ulang halaman ini), pastikan printer menyala & ter-pair di Bluetooth, lalu coba lagi."
        : x.name ? `Printer tidak bisa dibuka (${x.name}: ${x.message}).` : (e2 as Error).message);
    }
  }
  current = port;
  await port.setSignals?.({ dataTerminalReady: true, requestToSend: true }).catch(() => {});
}

async function resetPort(port: SerialPortLike) {
  try { await port.close(); } catch { /* already closed */ }
  if (current === port) current = null;
}

/** Close and revoke all saved serial ports so the user can pick a clean port. */
export async function forgetAllPrinters(): Promise<void> {
  if (current) { await current.close().catch(() => {}); current = null; }
  const ports = await grantedPorts();
  for (const p of ports) {
    try { await p.close(); } catch { /* ignore */ }
    try { await p.forget?.(); } catch { /* ignore */ }
  }
  setDirectPrefs({ port: -1 });
}

/** Serialize jobs: one print at a time per page. */
let queue: Promise<unknown> = Promise.resolve();

const ascii = (s: string) => new TextEncoder().encode(s);

/** 1-bit bitmap (TSPL: 1 = white / no dot, 0 = black dot) from a canvas, threshold on luminance. */
function bitmap(ctx: CanvasRenderingContext2D, w: number, h: number, invert: boolean): Uint8Array {
  const data = ctx.getImageData(0, 0, w, h).data;
  const wb = Math.ceil(w / 8);
  const out = new Uint8Array(wb * h).fill(0xff);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const i = (y * w + x) * 4;
      const lum = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
      const dark = data[i + 3] > 0 && lum < 160;
      if (dark !== invert) out[y * wb + (x >> 3)] &= ~(0x80 >> (x & 7));
    }
  }
  return out;
}

/**
 * TSPL job for one label, kept small for Bluetooth (a few KB per second). The label is cut into strips of 16 rows;
 * each strip is sent either as rectangles (BAR: lines, frames, barcodes — a few bytes each) or as a bitmap trimmed
 * to the columns that have ink, whichever is shorter. Empty strips are skipped.
 */
function tspl(bits: Uint8Array, wDots: number, hDots: number, [wmm, hmm]: [number, number], prefs: DirectPrintPrefs): Uint8Array {
  const wb = Math.ceil(wDots / 8);
  const black = (x: number, y: number) => !(bits[y * wb + (x >> 3)] & (0x80 >> (x & 7)));
  const parts: Uint8Array[] = [ascii(
    `SIZE ${wmm} mm,${hmm} mm\r\nGAP ${prefs.gap} mm,0 mm\r\nDENSITY ${prefs.density}\r\nSPEED 4\r\nDIRECTION 1,0\r\nREFERENCE 0,0\r\nCLS\r\n`,
  )];
  const STRIP = 16;
  for (let y0 = 0; y0 < hDots; y0 += STRIP) {
    const y1 = Math.min(hDots, y0 + STRIP);
    let x0 = wb, x1 = -1;
    for (let r = y0; r < y1; r++) for (let x = 0; x < wb; x++) if (bits[r * wb + x] !== 0xff) { if (x < x0) x0 = x; if (x > x1) x1 = x; }
    if (x1 < 0) continue; // white strip
    // Rectangles: black runs per row, merged with the identical run on the rows below.
    let bars = "";
    const open = new Map<string, number>(); // "start,end" -> first row
    const flush = (key: string, top: number, bottom: number) => { const [a, b] = key.split(",").map(Number); bars += `BAR ${a},${top},${b - a},${bottom - top}\r\n`; };
    for (let r = y0; r <= y1 && bars.length < 4096; r++) {
      const runs = new Set<string>();
      if (r < y1) for (let x = x0 * 8; x < Math.min(wDots, (x1 + 1) * 8); x++) {
        if (!black(x, r)) continue;
        const s0 = x; while (x < wDots && black(x, r)) x++;
        runs.add(`${s0},${x}`);
      }
      for (const [k, top] of open) if (!runs.has(k)) { flush(k, top, r); open.delete(k); }
      for (const k of runs) if (!open.has(k)) open.set(k, r);
    }
    const bw = x1 - x0 + 1, bh = y1 - y0;
    if (bars.length < bw * bh + 24) { parts.push(ascii(bars)); continue; }
    const band = new Uint8Array(bw * bh);
    for (let r = 0; r < bh; r++) band.set(bits.subarray((y0 + r) * wb + x0, (y0 + r) * wb + x1 + 1), r * bw);
    parts.push(ascii(`BITMAP ${x0 * 8},${y0},${bw},${bh},0,`), band, ascii("\r\n"));
  }
  parts.push(ascii("PRINT 1,1\r\n"));
  const job = new Uint8Array(parts.reduce((n, q) => n + q.length, 0));
  let o = 0; for (const q of parts) { job.set(q, o); o += q.length; }
  return job;
}

/**
 * Ask the printer for its status (TSPL <ESC>!?). Returns the status byte, or null when the printer does not answer
 * (some firmwares don't over Bluetooth) — then printing just goes ahead.
 */
async function printerStatus(port: SerialPortLike, writer: WritableStreamDefaultWriter<Uint8Array>): Promise<number | null> {
  if (!port.readable || port.readable.locked) return null;
  const reader = port.readable.getReader();
  try {
    await withTimeout(writer.write(new Uint8Array([0x1b, 0x21, 0x3f])), 5000);
    const r = await Promise.race([reader.read(), new Promise<null>((res) => setTimeout(() => res(null), 1500))]);
    return r && r.value && r.value.length ? r.value[r.value.length - 1] : null;
  } catch {
    return null;
  } finally {
    await reader.cancel().catch(() => {});
    try { reader.releaseLock(); } catch { /* released */ }
  }
}

/** Human message for a TSPL status byte with an error bit, or null when the printer is fine. */
function statusError(st: number): string | null {
  const why: string[] = [];
  if (st & 0x01) why.push("tutup printer terbuka");
  if (st & 0x02) why.push("kertas macet / jarak label (gap) tidak terbaca");
  if (st & 0x04) why.push("kertas habis atau tidak terdeteksi");
  if (st & 0x10) why.push("printer dalam keadaan pause");
  if (!why.length) return null;
  return `Printer melaporkan: ${why.join(", ")}. Periksa kertas & tutup, lalu matikan-nyalakan printer. Kalau label sudah benar tapi masih muncul, kalibrasi: tahan tombol FEED sampai printer menarik beberapa label lalu lepas.`;
}

async function send(port: SerialPortLike, jobs: Uint8Array[], onProgress?: (done: number, total: number) => void, checkStatus = true) {
  const run = async () => {
    await openPort(port);
    if (!port.writable) throw new Error("Printer terbuka tapi tidak bisa ditulisi. Matikan-nyalakan printer lalu coba lagi.");
    const writer = port.writable.getWriter();
    let failed = false;
    let written = 0;
    const total = jobs.reduce((n, j) => n + j.length, 0);
    try {
      if (checkStatus) {
        const st = await printerStatus(port, writer);
        const bad = st === null ? null : statusError(st);
        if (bad) throw new Error(bad);
      }
      for (let j = 0; j < jobs.length; j++) {
        // Small chunks with a pause: Bluetooth printers drop bytes when flooded.
        for (let i = 0; i < jobs[j].length; i += 512) {
          const chunk = jobs[j].slice(i, i + 512);
          await withTimeout(writer.write(chunk), 30000);
          written += chunk.length;
          await new Promise((r) => setTimeout(r, 20));
        }
        onProgress?.(j + 1, jobs.length);
      }
      await withTimeout(writer.ready, 30000);
    } catch (e) {
      failed = true;
      await writer.abort().catch(() => {});
      if ((e as Error).message.startsWith("Printer tidak merespons")) {
        const info = `(${written}/${total} byte · ${printerName(port)})`;
        throw new Error(written === 0
          ? `Printer tidak merespons saat mengirim data awal ${info}. Di Mac, coba ganti pilihan port (misalnya pilih Port serial / cu.XP-... atau sebaliknya), lalu pastikan printer menyala dan ter-pair di Bluetooth.`
          : `Printer berhenti menerima data ${info}. Jika bukan karena kertas habis/lampu merah, kemungkinan port "${printerName(port)}" macet saat kirim — coba klik "Ganti printer" dan pilih port lainnya.`);
      }
      throw e;
    } finally {
      try { writer.releaseLock(); } catch { /* aborted */ }
      if (failed) await resetPort(port);
    }
  };
  const p = queue.then(run, run);
  queue = p.catch(() => {});
  return p;
}

function withTimeout<T>(p: Promise<T>, ms: number, msg = "Printer tidak merespons (data tidak terkirim). Matikan-nyalakan printer, pastikan dekat dengan laptop dan kertas terpasang, lalu coba lagi."): Promise<T> {
  let t: ReturnType<typeof setTimeout>;
  return Promise.race([p.finally(() => clearTimeout(t)), new Promise<T>((_, rej) => { t = setTimeout(() => rej(new Error(msg)), ms); })]);
}

type PdfPage = { getViewport(o: { scale: number }): { width: number; height: number }; render(o: unknown): { promise: Promise<void> } };

/**
 * Render a PDF page onto a label canvas so the resi fills the label: white margins around the printed area are
 * cropped, the content is turned 90° when that makes it bigger (landscape resi on a portrait label), then scaled
 * to fit with a 2 mm margin and centred.
 */
async function fitPageToLabel(page: PdfPage, wDots: number, hDots: number): Promise<HTMLCanvasElement> {
  const base = page.getViewport({ scale: 1 });
  // Render with enough detail for the label (about 2× its resolution), capped to keep memory sane.
  const scale = Math.min((Math.max(wDots, hDots) * 2) / Math.min(base.width, base.height), 4000 / Math.max(base.width, base.height));
  const vp = page.getViewport({ scale });
  const src = document.createElement("canvas");
  src.width = Math.ceil(vp.width); src.height = Math.ceil(vp.height);
  const sctx = src.getContext("2d", { willReadFrequently: true })!;
  sctx.fillStyle = "#fff"; sctx.fillRect(0, 0, src.width, src.height);
  await page.render({ canvasContext: sctx, viewport: vp, canvas: src }).promise;

  // Bounding box of the ink.
  const px = sctx.getImageData(0, 0, src.width, src.height).data;
  let x0 = src.width, y0 = src.height, x1 = -1, y1 = -1;
  for (let y = 0; y < src.height; y++) {
    for (let x = 0; x < src.width; x++) {
      const i = (y * src.width + x) * 4;
      if (0.299 * px[i] + 0.587 * px[i + 1] + 0.114 * px[i + 2] < 200) {
        if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y;
      }
    }
  }
  if (x1 < 0) { x0 = 0; y0 = 0; x1 = src.width - 1; y1 = src.height - 1; } // blank page
  const cw = x1 - x0 + 1, ch = y1 - y0 + 1;

  const margin = 2 * DPMM;
  const [aw, ah] = [wDots - 2 * margin, hDots - 2 * margin];
  const upright = Math.min(aw / cw, ah / ch);
  const turned = Math.min(aw / ch, ah / cw);
  const rotate = turned > upright * 1.05;
  const k = rotate ? turned : upright;

  const out = document.createElement("canvas");
  out.width = wDots; out.height = hDots;
  const ctx = out.getContext("2d", { willReadFrequently: true })!;
  ctx.fillStyle = "#fff"; ctx.fillRect(0, 0, wDots, hDots);
  ctx.imageSmoothingEnabled = true; ctx.imageSmoothingQuality = "high";
  ctx.translate(wDots / 2, hDots / 2);
  if (rotate) ctx.rotate(Math.PI / 2);
  ctx.drawImage(src, x0, y0, cw, ch, (-cw * k) / 2, (-ch * k) / 2, cw * k, ch * k);
  return out;
}

/** Render every page of a PDF to the label size and print it on the thermal printer. */
export async function printPdfDirect(pdf: Uint8Array, paper: PaperSize, onProgress?: (done: number, total: number) => void): Promise<number> {
  const mm = LABEL_MM[paper];
  if (!mm) throw new Error("Ukuran kertas A4 tidak bisa dicetak ke printer label. Pilih ukuran label di Cetak Resi & Label.");
  const port = await savedPrinter();
  if (!port) throw new Error("Printer belum dihubungkan. Buka Pengaturan → Cetak Resi & Label → Printer Bluetooth.");
  const prefs = getDirectPrefs();
  const pdfjs = await import("pdfjs-dist");
  pdfjs.GlobalWorkerOptions.workerSrc = "/pdf.worker.min.mjs";
  const doc = await pdfjs.getDocument({ data: pdf.slice() }).promise;
  const [wDots, hDots] = [mm[0] * DPMM, mm[1] * DPMM];
  const jobs: Uint8Array[] = [];
  for (let n = 1; n <= doc.numPages; n++) {
    const canvas = await fitPageToLabel(await doc.getPage(n), wDots, hDots);
    const ctx = canvas.getContext("2d", { willReadFrequently: true })!;
    jobs.push(tspl(bitmap(ctx, wDots, hDots, prefs.invert), wDots, hDots, mm, prefs));
  }
  await send(port, jobs, onProgress);
  return jobs.length;
}

/** A test label: frame, text and a bar to check size, gap and darkness. */
export async function printTest(paper: PaperSize): Promise<void> {
  const mm = LABEL_MM[paper] ?? [100, 150];
  const port = await savedPrinter();
  if (!port) throw new Error("Printer belum dihubungkan.");
  const prefs = getDirectPrefs();
  const [w, h] = [mm[0] * DPMM, mm[1] * DPMM];
  const canvas = document.createElement("canvas");
  canvas.width = w; canvas.height = h;
  const ctx = canvas.getContext("2d", { willReadFrequently: true })!;
  ctx.fillStyle = "#fff"; ctx.fillRect(0, 0, w, h);
  ctx.strokeStyle = "#000"; ctx.lineWidth = 6; ctx.strokeRect(8, 8, w - 16, h - 16);
  ctx.fillStyle = "#000"; ctx.font = "bold 56px sans-serif"; ctx.fillText("Tes Pesanin", 40, 110);
  ctx.font = "32px sans-serif"; ctx.fillText(`Label ${mm[0]} x ${mm[1]} mm · 203 dpi`, 40, 170);
  ctx.fillText("Kalau tercetak terbalik hitam-putih,", 40, 230); ctx.fillText("aktifkan \"Balik warna\".", 40, 270);
  for (let i = 0; i < 40; i++) ctx.fillRect(40 + i * 18, 320, i % 3 ? 6 : 10, 160);
  await send(port, [tspl(bitmap(ctx, w, h, prefs.invert), w, h, mm, prefs)], undefined, false);
}
