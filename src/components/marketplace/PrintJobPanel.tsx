"use client";
import { CheckCircle2, Loader2, Printer, X, XCircle } from "lucide-react";
import { useEffect, useState } from "react";
import { API_URL, api, getToken } from "@/lib/api";
import { showPdfViewer } from "@/lib/awb";

export type PrintJob = {
  id: number; scope: "selected" | "new" | "all"; status: "queued" | "running" | "done" | "failed"; stage: "checking" | "downloading" | "formatting" | null;
  total: number; done: number; pages: number; skipped: string[]; errors: string[]; has_file: boolean;
};

const KEY = "awb_print_job";
export const rememberPrintJob = (id: number | null) => { try { id ? localStorage.setItem(KEY, String(id)) : localStorage.removeItem(KEY); } catch {} };
export const rememberedPrintJob = (): number | null => { try { return Number(localStorage.getItem(KEY)) || null; } catch { return null; } };

/** Start a background print on the server (hundreds or thousands of Shopee labels → one PDF). */
export function startPrintJob(scope: PrintJob["scope"], orderIds: number[] = [], bookingIds: number[] = []): Promise<PrintJob> {
  return api<PrintJob>("/labels/shopee/print-jobs", { method: "POST", json: { scope, order_ids: orderIds, booking_ids: bookingIds } });
}

/**
 * Progress of a background print ("Cetak resi di latar belakang"): the server checks the orders with Shopee,
 * downloads the labels 50 at a time and formats them like the browser does. The seller can leave the page; a
 * notification (bell + Telegram) brings them back here when the PDF is ready.
 */
export function PrintJobPanel({ id, onClose, onFinished }: { id: number; onClose: () => void; onFinished?: () => void }) {
  const [job, setJob] = useState<PrintJob | null>(null);
  const [opening, setOpening] = useState(false);
  const [err, setErr] = useState("");

  useEffect(() => {
    let stop = false;
    let timer: ReturnType<typeof setTimeout>;
    const tick = async () => {
      try {
        const j = await api<PrintJob>(`/labels/shopee/print-jobs/${id}`);
        if (stop) return;
        setJob(j);
        if (j.status === "queued" || j.status === "running") timer = setTimeout(tick, 2500);
        else onFinished?.();
      } catch { if (!stop) setErr("Status cetak tidak bisa dibaca."); }
    };
    tick();
    return () => { stop = true; clearTimeout(timer); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const open = async () => {
    const win = window.open("", "_blank");
    setOpening(true); setErr("");
    try {
      const res = await fetch(`${API_URL}/labels/shopee/print-jobs/${id}/file`, { headers: { Authorization: `Bearer ${getToken()}`, Accept: "application/pdf" } });
      if (!res.ok) throw new Error((await res.json().catch(() => ({}))).message ?? "File resi tidak tersedia.");
      const url = URL.createObjectURL(await res.blob());
      if (win) showPdfViewer(win, url, `resi-shopee-${id}.pdf`, job?.pages ?? 0);
      else window.location.href = url;
    } catch (e) { win?.close(); setErr((e as Error).message); }
    finally { setOpening(false); }
  };

  const running = !job || job.status === "queued" || job.status === "running";
  const pct = job && job.total ? Math.round((job.done / job.total) * 100) : 0;
  const stage = !job || job.status === "queued" ? "Menyiapkan…"
    : job.stage === "checking" ? "Memeriksa status pesanan di Shopee…"
    : job.stage === "formatting" ? `Memformat ${job.done} label (nama produk disembunyikan)…`
    : `Mengambil resi dari Shopee… ${job.done}/${job.total}`;

  return (
    <div className={`rounded-xl border p-4 text-sm ${job?.status === "failed" ? "border-rose-200 bg-rose-50" : job?.status === "done" ? "border-emerald-200 bg-emerald-50" : "border-sky-200 bg-sky-50"}`}>
      <div className="flex items-start gap-3">
        <span className="mt-0.5 shrink-0">{running ? <Loader2 size={18} className="animate-spin text-sky-600" /> : job?.status === "done" ? <CheckCircle2 size={18} className="text-emerald-600" /> : <XCircle size={18} className="text-rose-600" />}</span>
        <div className="min-w-0 flex-1">
          <b className="block text-navy">{running ? "Cetak resi di latar belakang" : job?.status === "done" ? `${job.done} resi siap dicetak${job.pages ? ` · ${job.pages} halaman` : ""}` : "Cetak resi gagal"}</b>
          {running && <>
            <p className="text-slate-600">{stage} Halaman ini boleh ditutup; kamu akan dapat notifikasi saat PDF siap.</p>
            <div className="mt-2 h-2 overflow-hidden rounded-full bg-white"><div className="h-full rounded-full bg-sky-500 transition-all" style={{ width: `${job?.stage === "formatting" ? 100 : pct}%` }} /></div>
          </>}
          {!!job?.skipped.length && <p className="mt-1 text-xs text-slate-600">{job.skipped.length} resi tidak dicetak karena sudah dikirim (pindah ke tab Dikirim).</p>}
          {!!job?.errors.length && <p className="mt-1 text-xs text-rose-700">{job.errors.join(" · ")}</p>}
          {err && <p className="mt-1 text-xs text-rose-700">{err}</p>}
        </div>
        {job?.has_file && <button onClick={open} disabled={opening} className="flex h-9 shrink-0 items-center gap-1.5 rounded-lg bg-brand-600 px-4 text-sm font-semibold text-white hover:bg-brand-700 disabled:opacity-60">{opening ? <Loader2 size={15} className="animate-spin" /> : <Printer size={15} />}Buka & cetak PDF</button>}
        {!running && <button onClick={onClose} className="shrink-0 text-slate-400 hover:text-navy" aria-label="Tutup"><X size={16} /></button>}
      </div>
    </div>
  );
}
