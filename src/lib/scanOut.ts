import { PDFDocument, StandardFonts, rgb, type PDFFont, type PDFPage } from "pdf-lib";

export type ScanStatus = "ok" | "unknown" | "duplicate" | "invalid";
export type Parcel = {
  id: number; code: string; matched: boolean; shop_name: string | null; courier: string | null; order_sn: string | null;
  customer_name: string | null; items_summary: string | null; scanned_by: string | null; scanned_at: string;
};
export type Count = { name: string; count: number };
export type Summary = { total: number; unknown: number; by_shop: Count[]; by_courier: Count[] };
export type ScanSession = {
  id: number; status: "open" | "closed"; scanned_by: string | null; started_at: string; finished_at: string | null;
  expires_at: string; open: boolean; token?: string;
};
export type ScanPayload = { session: ScanSession; store_name: string | null; parcels: Parcel[]; summary: Summary };
export type ScanResult = { status: ScanStatus; message: string; parcel: Parcel | null; summary?: Summary };

export const scanTime = (s: string, withDate = false) =>
  new Date(s).toLocaleString("id-ID", withDate ? { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" } : { hour: "2-digit", minute: "2-digit", second: "2-digit" });

/** Standard PDF fonts only know WinAnsi: drop emoji / non-Latin characters instead of crashing. */
const safe = (s: string | null | undefined) => (s ?? "").replace(/[‘’]/g, "'").replace(/[“”]/g, '"').replace(/[–—]/g, "-").replace(/…/g, "...").replace(/[^\x20-\x7E\xA0-\xFF]/g, "");

function fit(text: string, font: PDFFont, size: number, width: number) {
  let t = safe(text);
  if (font.widthOfTextAtSize(t, size) <= width) return t;
  while (t.length > 1 && font.widthOfTextAtSize(t + "...", size) > width) t = t.slice(0, -1);
  return t + "...";
}

/** "Bukti Serah Terima Paket": totals per shop & courier, every resi with its shop, and signature lines. */
export async function scanOutPdf(d: ScanPayload): Promise<Blob> {
  const doc = await PDFDocument.create();
  const font = await doc.embedFont(StandardFonts.Helvetica);
  const bold = await doc.embedFont(StandardFonts.HelveticaBold);
  const W = 595, H = 842, M = 40;
  const ink = rgb(0.12, 0.16, 0.23), muted = rgb(0.42, 0.46, 0.52), line = rgb(0.85, 0.87, 0.9), zebra = rgb(0.96, 0.97, 0.98), warn = rgb(0.75, 0.4, 0.05);
  let page: PDFPage = doc.addPage([W, H]);
  let y = H - M;
  const text = (t: string, x: number, size = 9, f = font, color = ink) => page.drawText(safe(t), { x, y, size, font: f, color });
  const newPage = () => { page = doc.addPage([W, H]); y = H - M; };
  const need = (h: number) => { if (y - h < M + 20) { newPage(); return true; } return false; };

  const { session: s, summary } = d;
  text("BUKTI SERAH TERIMA PAKET", M, 16, bold); y -= 18;
  text(`${d.store_name ?? "Toko"} - Scan Out #${s.id}`, M, 10, font, muted); y -= 22;
  const meta: [string, string][] = [
    ["Mulai", scanTime(s.started_at, true)], ["Selesai", s.finished_at ? scanTime(s.finished_at, true) : "Belum selesai"],
    ["Petugas", s.scanned_by ?? "-"], ["Total paket", `${summary.total} paket`],
  ];
  meta.forEach(([k, v]) => { text(k, M, 9, font, muted); text(`: ${v}`, M + 70, 9, k === "Total paket" ? bold : font); y -= 13; });
  if (summary.unknown) { text(`* ${summary.unknown} resi tidak ditemukan di pesanan Pesanin (tetap dihitung).`, M, 8, font, warn); y -= 13; }
  y -= 8;

  // Totals per shop and per courier, side by side.
  const colW = (W - 2 * M - 20) / 2;
  const box = (title: string, rows: Count[], x: number, top: number) => {
    let yy = top;
    page.drawText(title, { x, y: yy, size: 10, font: bold, color: ink }); yy -= 6;
    page.drawLine({ start: { x, y: yy }, end: { x: x + colW, y: yy }, thickness: 0.6, color: line }); yy -= 13;
    rows.forEach((r) => {
      page.drawText(fit(r.name, font, 9, colW - 60), { x, y: yy, size: 9, font, color: ink });
      const c = `${r.count} paket`;
      page.drawText(c, { x: x + colW - bold.widthOfTextAtSize(c, 9), y: yy, size: 9, font: bold, color: ink });
      yy -= 13;
    });
    return yy;
  };
  need(30 + 13 * Math.max(summary.by_shop.length, summary.by_courier.length));
  const top = y;
  y = Math.min(box("Per Toko", summary.by_shop, M, top), box("Per Kurir", summary.by_courier, M + colW + 20, top)) - 12;

  // Resi table.
  const cols = [
    { h: "No", w: 26 }, { h: "Resi", w: 120 }, { h: "Toko", w: 110 }, { h: "Kurir", w: 80 }, { h: "No. Pesanan", w: 112 }, { h: "Jam", w: 67 },
  ];
  const header = () => {
    page.drawRectangle({ x: M, y: y - 5, width: W - 2 * M, height: 17, color: rgb(0.13, 0.2, 0.33) });
    let x = M + 4;
    cols.forEach((c) => { page.drawText(c.h, { x, y, size: 8.5, font: bold, color: rgb(1, 1, 1) }); x += c.w; });
    y -= 17;
  };
  need(40); text("Daftar Resi", M, 10, bold); y -= 16; header();
  const rows = [...d.parcels].sort((a, b) => a.scanned_at.localeCompare(b.scanned_at));
  rows.forEach((p, i) => {
    if (need(15)) header();
    if (i % 2) page.drawRectangle({ x: M, y: y - 4, width: W - 2 * M, height: 14, color: zebra });
    const vals = [String(i + 1), p.code, p.shop_name ?? "Tidak dikenal", p.courier ?? "-", p.order_sn ?? "-", scanTime(p.scanned_at)];
    let x = M + 4;
    vals.forEach((v, k) => {
      page.drawText(fit(v, k === 1 ? bold : font, 8, cols[k].w - 6), { x, y, size: 8, font: k === 1 ? bold : font, color: !p.matched && k === 2 ? warn : ink });
      x += cols[k].w;
    });
    y -= 14;
  });
  if (!rows.length) { text("Belum ada resi yang di-scan.", M + 4, 9, font, muted); y -= 14; }

  // Signatures.
  if (need(110)) y -= 0;
  y -= 30;
  const sigW = 180;
  [["Diserahkan oleh (Toko)", M], ["Diterima oleh (Kurir/Ekspedisi)", W - M - sigW]].forEach(([label, x]) => {
    page.drawText(label as string, { x: x as number, y, size: 9, font, color: muted });
    page.drawLine({ start: { x: x as number, y: y - 55 }, end: { x: (x as number) + sigW, y: y - 55 }, thickness: 0.6, color: ink });
    page.drawText("Nama & tanda tangan", { x: x as number, y: y - 67, size: 7.5, font, color: muted });
  });

  const pages = doc.getPages();
  pages.forEach((pg, i) => pg.drawText(safe(`Dibuat dengan Pesanin - ${scanTime(new Date().toISOString(), true)} - Hal ${i + 1}/${pages.length}`), { x: M, y: 22, size: 7, font, color: muted }));
  return new Blob([(await doc.save()) as BlobPart], { type: "application/pdf" });
}

export async function downloadScanPdf(d: ScanPayload) {
  const url = URL.createObjectURL(await scanOutPdf(d));
  const a = Object.assign(document.createElement("a"), { href: url, download: `scan-out-${d.session.id}-${d.session.started_at.slice(0, 10)}.pdf` });
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}

/** Short beep + vibration on the phone: green = high, duplicate = low double buzz. */
export function feedback(status: ScanStatus) {
  try {
    const Ctx = window.AudioContext || (window as any).webkitAudioContext;
    const ctx = new Ctx();
    const tone = (freq: number, at: number, dur: number) => {
      const o = ctx.createOscillator(), g = ctx.createGain();
      o.frequency.value = freq; o.connect(g); g.connect(ctx.destination);
      g.gain.setValueAtTime(0.25, ctx.currentTime + at); g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + at + dur);
      o.start(ctx.currentTime + at); o.stop(ctx.currentTime + at + dur);
    };
    if (status === "ok") tone(1200, 0, 0.12);
    else if (status === "unknown") tone(700, 0, 0.18);
    else { tone(300, 0, 0.18); tone(300, 0.24, 0.18); }
    setTimeout(() => ctx.close(), 800);
  } catch { /* no audio */ }
  navigator.vibrate?.(status === "ok" ? 80 : status === "unknown" ? [80, 60, 80] : [250, 100, 250]);
}

export const STATUS_STYLE: Record<ScanStatus, { box: string; label: string }> = {
  ok: { box: "bg-emerald-50 text-emerald-800 ring-emerald-200", label: "Tercatat" },
  unknown: { box: "bg-amber-50 text-amber-800 ring-amber-200", label: "Tidak dikenal" },
  duplicate: { box: "bg-rose-50 text-rose-800 ring-rose-200", label: "DOBEL!" },
  invalid: { box: "bg-slate-100 text-slate-700 ring-slate-200", label: "Tidak valid" },
};
