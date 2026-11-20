"use client";
import { CheckCircle2, FileDown, History, Loader2, PackageCheck, QrCode, ScanLine, Smartphone, Trash2 } from "lucide-react";
import QRCode from "qrcode";
import { useCallback, useEffect, useRef, useState } from "react";
import { askConfirm } from "@/components/Dialogs";
import { PageHead, Panel } from "@/components/kit";
import { Modal, Pagination } from "@/components/ui";
import { api, ApiError, type Paginated } from "@/lib/api";
import { downloadScanPdf, scanTime, STATUS_STYLE, type Count, type ScanPayload, type ScanResult, type Summary } from "@/lib/scanOut";

type HistoryRow = { id: number; status: string; scanned_by: string | null; parcels_count: number; started_at: string; finished_at: string | null; open: boolean };

/**
 * Marketplace → Scan Out: before the courier picks up, scan every parcel's resi (phone camera via the QR, or a USB
 * scanner here). A resi can only be counted once, the totals per shop show what goes out, and the PDF is the
 * handover proof for the expedition.
 */
export default function ScanOutPage() {
  const [cur, setCur] = useState<ScanPayload | null>(null);
  const [qr, setQr] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [done, setDone] = useState<ScanPayload | null>(null);
  const [hist, setHist] = useState<Paginated<HistoryRow> | null>(null);
  const [page, setPage] = useState(1);
  const curRef = useRef(cur);
  curRef.current = cur;
  const fail = (e: unknown, msg: string) => setErr(e instanceof ApiError ? e.message : msg);

  const loadHistory = useCallback(() => {
    api<Paginated<HistoryRow>>(`/scan-out/sessions?page=${page}`).then((h) => {
      setHist(h);
      // Resume the open session (e.g. after a reload) so its QR stays usable.
      const open = h.data.find((r) => r.open);
      if (!curRef.current && open && page === 1) api<ScanPayload>(`/scan-out/sessions/${open.id}`).then((p) => p.session.token && setCur(p)).catch(() => {});
    }).catch((e) => fail(e, "Gagal memuat riwayat"));
  }, [page]);
  useEffect(() => { loadHistory(); }, [loadHistory]);

  const url = cur?.session.token && typeof window !== "undefined" ? `${window.location.origin}/scan/${cur.session.token}` : "";
  useEffect(() => { if (url) QRCode.toDataURL(url, { width: 260, margin: 1 }).then(setQr); else setQr(""); }, [url]);

  // Live: the phone posts the scans, the dashboard polls.
  const id = cur?.session.id;
  useEffect(() => {
    if (!id) return;
    const t = setInterval(() => {
      if (document.hidden) return;
      api<ScanPayload>(`/scan-out/sessions/${id}`).then((p) => {
        if (!p.session.open) { setCur(null); setDone(p); loadHistory(); } else setCur(p);
      }).catch(() => {});
    }, 2000);
    return () => clearInterval(t);
  }, [id, loadHistory]);

  const start = () => {
    setBusy(true); setErr("");
    api<ScanPayload>("/scan-out/sessions", { method: "POST" }).then((p) => { setCur(p); loadHistory(); }).catch((e) => fail(e, "Gagal membuka sesi")).finally(() => setBusy(false));
  };
  const finish = async () => {
    if (!cur) return;
    if (!(await askConfirm(`Selesaikan sesi dengan ${cur.summary.total} paket? Setelah selesai, QR tidak bisa dipakai lagi.`, { title: "Selesai scan", confirmLabel: "Selesai" }))) return;
    setBusy(true);
    api<ScanPayload>(`/scan-out/sessions/${cur.session.id}/finish`, { method: "POST" })
      .then((p) => { setCur(null); setDone(p); loadHistory(); }).catch((e) => fail(e, "Gagal menyelesaikan sesi")).finally(() => setBusy(false));
  };
  const remove = async (pid: number, code: string) => {
    if (!cur || !(await askConfirm(`Hapus resi ${code} dari sesi ini?`, { danger: true, confirmLabel: "Hapus" }))) return;
    api<{ summary: Summary }>(`/scan-out/sessions/${cur.session.id}/parcels/${pid}`, { method: "DELETE" })
      .then((r) => setCur((c) => c && { ...c, summary: r.summary, parcels: c.parcels.filter((p) => p.id !== pid) })).catch((e) => fail(e, "Gagal menghapus"));
  };
  const pdf = (sid: number) => api<ScanPayload>(`/scan-out/sessions/${sid}`).then(downloadScanPdf).catch((e) => fail(e, "Gagal membuat PDF"));
  const view = (sid: number) => api<ScanPayload>(`/scan-out/sessions/${sid}`).then(setDone).catch((e) => fail(e, "Gagal memuat sesi"));

  return (
    <div className="space-y-5">
      <PageHead title="Scan Out" tutorial={false} crumbs={[["Marketplace"], ["Scan Out"]]}>
        {!cur && (
          <button onClick={start} disabled={busy} className="flex h-10 items-center gap-2 rounded-lg bg-brand-600 px-4 text-sm font-semibold text-white hover:bg-brand-700 disabled:opacity-50">
            {busy ? <Loader2 size={16} className="animate-spin" /> : <ScanLine size={16} />}Mulai Sesi Scan
          </button>
        )}
      </PageHead>
      <p className="-mt-2 text-sm text-slate-500">Scan resi setiap paket sebelum diserahkan ke kurir. Resi yang sama tidak bisa ter-scan dua kali, dan hasilnya bisa diunduh sebagai PDF bukti serah terima ke ekspedisi.</p>
      {err && <p className="rounded-xl bg-rose-50 p-3 text-sm text-rose-700">{err}</p>}

      {cur ? (
        <div className="grid gap-5 lg:grid-cols-[320px_1fr]">
          <Panel className="space-y-4 p-5">
            <div className="flex items-center gap-2 text-[15px] font-semibold text-slate-800"><Smartphone size={18} className="text-brand-600" />Scan pakai HP</div>
            <div className="flex justify-center rounded-xl bg-white p-3 ring-1 ring-slate-200">
              {qr ? <img src={qr} alt="QR scan out" className="h-56 w-56" /> : <Loader2 className="m-20 animate-spin text-slate-400" />}
            </div>
            <ol className="list-decimal space-y-1 pl-5 text-xs text-slate-500">
              <li>Scan QR ini dengan kamera HP.</li>
              <li>Izinkan kamera, lalu arahkan ke barcode resi satu per satu.</li>
              <li>Klik <b>Selesai</b> di HP atau di sini setelah semua paket ter-scan.</li>
            </ol>
            <button onClick={() => url && navigator.clipboard?.writeText(url)} className="w-full truncate rounded-lg bg-slate-50 px-3 py-2 text-left text-[11px] text-slate-500 hover:bg-slate-100" title="Salin link">{url}</button>
            <ManualScan sessionId={cur.session.id} onResult={(r) => r.summary && setCur((c) => c && { ...c, summary: r.summary!, parcels: r.parcel && r.status !== "duplicate" ? [r.parcel, ...c.parcels] : c.parcels })} />
          </Panel>

          <div className="space-y-5">
            <Panel className="p-5">
              <div className="flex flex-wrap items-center gap-3">
                <span className="flex items-center gap-2 rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700"><span className="h-2 w-2 animate-pulse rounded-full bg-emerald-500" />Sesi #{cur.session.id} aktif</span>
                <span className="text-xs text-slate-400">Mulai {scanTime(cur.session.started_at, true)} · {cur.session.scanned_by}</span>
                <button onClick={finish} disabled={busy} className="ml-auto flex h-10 items-center gap-2 rounded-lg bg-navy px-5 text-sm font-semibold text-white disabled:opacity-50"><CheckCircle2 size={16} />Selesai</button>
              </div>
              <Totals summary={cur.summary} />
            </Panel>
            <Panel className="overflow-hidden">
              <div className="border-b border-slate-100 px-5 py-3 text-sm font-semibold text-slate-700">Resi ter-scan ({cur.summary.total})</div>
              {!cur.parcels.length ? <p className="p-8 text-center text-sm text-slate-400">Belum ada resi. Mulai scan dari HP atau ketik resi di kolom kiri.</p> : (
                <div className="max-h-[480px] overflow-auto">
                  <table className="w-full text-sm">
                    <thead className="sticky top-0 bg-slate-50 text-left text-xs text-slate-500"><tr><th className="px-4 py-2">Resi</th><th className="px-4 py-2">Toko</th><th className="px-4 py-2">Jam</th><th /></tr></thead>
                    <tbody>
                      {cur.parcels.map((p) => (
                        <tr key={p.id} className="border-t border-slate-100">
                          <td className="px-4 py-2 font-mono text-xs font-semibold text-slate-800">{p.code}</td>
                          <td className="px-4 py-2">{p.matched ? p.shop_name : <span className="rounded bg-amber-100 px-1.5 py-0.5 text-xs text-amber-700">Tidak dikenal</span>}</td>
                          <td className="px-4 py-2 text-xs text-slate-500">{scanTime(p.scanned_at)}</td>
                          <td className="px-2"><button onClick={() => remove(p.id, p.code)} className="rounded p-1.5 text-slate-400 hover:bg-rose-50 hover:text-rose-600" title="Hapus"><Trash2 size={15} /></button></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </Panel>
          </div>
        </div>
      ) : (
        <Panel className="flex flex-col items-center gap-3 p-10 text-center">
          <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-brand-50 text-brand-600"><QrCode size={26} /></span>
          <p className="max-w-md text-sm text-slate-500">Klik <b>Mulai Sesi Scan</b> untuk menampilkan QR. Scan QR dengan HP untuk membuka kamera scanner, atau pakai scanner barcode USB langsung di halaman ini.</p>
        </Panel>
      )}

      <Panel className="overflow-hidden">
        <div className="flex items-center gap-2 border-b border-slate-100 px-5 py-3 text-sm font-semibold text-slate-700"><History size={16} />Riwayat Scan Out</div>
        {!hist ? <p className="p-6 text-sm text-slate-400"><Loader2 size={16} className="inline animate-spin" /> Memuat…</p>
          : !hist.data.length ? <p className="p-8 text-center text-sm text-slate-400">Belum ada sesi scan.</p> : (
            <table className="w-full text-sm">
              <thead className="bg-slate-50 text-left text-xs text-slate-500"><tr><th className="px-5 py-2">Sesi</th><th className="px-5 py-2">Waktu</th><th className="px-5 py-2">Petugas</th><th className="px-5 py-2">Paket</th><th className="px-5 py-2">Status</th><th /></tr></thead>
              <tbody>
                {hist.data.map((h) => (
                  <tr key={h.id} className="border-t border-slate-100">
                    <td className="px-5 py-2 font-semibold text-slate-700">#{h.id}</td>
                    <td className="px-5 py-2 text-slate-600">{scanTime(h.started_at, true)}{h.finished_at && <span className="text-slate-400"> – {scanTime(h.finished_at).slice(0, 5)}</span>}</td>
                    <td className="px-5 py-2 text-slate-600">{h.scanned_by ?? "-"}</td>
                    <td className="px-5 py-2 font-semibold">{cur?.session.id === h.id ? cur.summary.total : h.parcels_count}</td>
                    <td className="px-5 py-2">{h.open ? <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-semibold text-emerald-700">Aktif</span> : <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-600">Selesai</span>}</td>
                    <td className="space-x-1 whitespace-nowrap px-4 py-2 text-right">
                      <button onClick={() => view(h.id)} className="rounded-lg px-2.5 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-100">Rekap</button>
                      <button onClick={() => pdf(h.id)} className="inline-flex items-center gap-1 rounded-lg bg-brand-50 px-2.5 py-1.5 text-xs font-semibold text-brand-700 hover:bg-brand-100"><FileDown size={14} />PDF</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        {hist && hist.last_page > 1 && <div className="border-t border-slate-100 p-3"><Pagination page={page} last={hist.last_page} onChange={setPage} total={hist.total} /></div>}
      </Panel>

      <Modal open={!!done} onClose={() => setDone(null)} title={`Rekap Scan Out #${done?.session.id ?? ""}`} icon={PackageCheck}>
        {done && (
          <div className="space-y-4">
            <p className="text-xs text-slate-500">{scanTime(done.session.started_at, true)}{done.session.finished_at && ` – ${scanTime(done.session.finished_at, true)}`} · {done.session.scanned_by}</p>
            <Totals summary={done.summary} />
            <button onClick={() => downloadScanPdf(done)} className="flex h-11 w-full items-center justify-center gap-2 rounded-lg bg-brand-600 text-sm font-semibold text-white hover:bg-brand-700"><FileDown size={16} />Export PDF Bukti Serah Terima</button>
          </div>
        )}
      </Modal>
    </div>
  );
}

/** Total + count per shop. */
function Totals({ summary }: { summary: Summary }) {
  const list = (title: string, rows: Count[]) => (
    <div className="rounded-xl bg-slate-50 p-3">
      <div className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-slate-400">{title}</div>
      {!rows.length ? <p className="text-xs text-slate-400">-</p> : rows.map((r) => (
        <div key={r.name} className="flex justify-between gap-3 py-0.5 text-sm"><span className="truncate text-slate-600">{r.name}</span><b className="text-slate-800">{r.count}</b></div>
      ))}
    </div>
  );
  return (
    <div className="mt-4 grid gap-3 sm:grid-cols-[150px_1fr]">
      <div className="flex flex-col justify-center rounded-xl bg-brand-50 p-3 text-center">
        <div className="text-3xl font-bold text-brand-700">{summary.total}</div>
        <div className="text-xs text-brand-700/80">total paket</div>
        {summary.unknown > 0 && <div className="mt-1 text-[11px] text-amber-700">{summary.unknown} tidak dikenal</div>}
      </div>
      {list("Per toko", summary.by_shop)}
    </div>
  );
}

/** USB barcode scanners type the code + Enter, so a focused input is enough. */
function ManualScan({ sessionId, onResult }: { sessionId: number; onResult: (r: ScanResult) => void }) {
  const [code, setCode] = useState("");
  const [last, setLast] = useState<ScanResult | null>(null);
  const [busy, setBusy] = useState(false);
  const ref = useRef<HTMLInputElement>(null);
  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!code.trim() || busy) return;
    setBusy(true);
    api<ScanResult>(`/scan-out/sessions/${sessionId}/scan`, { method: "POST", json: { code } })
      .then((r) => { setLast(r); onResult(r); setCode(""); })
      .catch((e) => setLast({ status: "invalid", message: e instanceof ApiError ? e.message : "Gagal", parcel: null }))
      .finally(() => { setBusy(false); ref.current?.focus(); });
  };
  return (
    <form onSubmit={submit} className="space-y-2 border-t border-slate-100 pt-4">
      <label className="text-xs font-semibold text-slate-600">Scanner USB / ketik resi</label>
      <input ref={ref} value={code} onChange={(e) => setCode(e.target.value)} placeholder="Scan / ketik resi lalu Enter" className="h-10 w-full rounded-lg border border-slate-200 px-3 font-mono text-sm outline-none focus:border-brand-500" />
      {last && <p className={`rounded-lg px-3 py-2 text-xs ring-1 ${STATUS_STYLE[last.status].box}`}><b>{STATUS_STYLE[last.status].label}</b> {last.message}</p>}
    </form>
  );
}
