"use client";
import type { IScannerControls } from "@zxing/browser";
import { Camera, CheckCircle2, Keyboard, Loader2, PackageCheck, Undo2 } from "lucide-react";
import { use, useCallback, useEffect, useRef, useState } from "react";
import { askConfirm } from "@/components/Dialogs";
import { api, ApiError } from "@/lib/api";
import { feedback, scanTime, STATUS_STYLE, type Parcel, type ScanPayload, type ScanResult, type Summary } from "@/lib/scanOut";

/**
 * Phone scanner opened from the Scan Out QR on the dashboard (no login: the session token is the access).
 * Back camera reads the resi barcode, each code is sent once, and Selesai shows the count per shop + total.
 */
export default function PhoneScan({ params }: { params: Promise<{ token: string }> }) {
  const { token } = use(params);
  const base = `/public/scan-out/${token}`;
  const [info, setInfo] = useState<ScanPayload | null>(null);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [recent, setRecent] = useState<Parcel[]>([]);
  const [last, setLast] = useState<ScanResult | null>(null);
  const [err, setErr] = useState("");
  const [camErr, setCamErr] = useState("");
  const [camOn, setCamOn] = useState(false);
  const [finished, setFinished] = useState(false);
  const [manual, setManual] = useState("");
  const video = useRef<HTMLVideoElement>(null);
  const controls = useRef<IScannerControls | null>(null);
  const busy = useRef(false);
  const gen = useRef(0);
  const seen = useRef<{ code: string; at: number }>({ code: "", at: 0 });

  useEffect(() => {
    api<ScanPayload>(base).then((p) => {
      setInfo(p); setSummary(p.summary); setRecent(p.parcels);
      if (!p.session.open) setFinished(true);
    }).catch((e) => setErr(e instanceof ApiError ? e.message : "Link scan tidak valid."));
  }, [base]);

  const send = useCallback(async (raw: string) => {
    const code = raw.trim();
    const now = Date.now();
    // The camera reads the same label many times a second: ignore repeats for a few seconds.
    if (!code || busy.current || (seen.current.code === code && now - seen.current.at < 4000)) return;
    seen.current = { code, at: now };
    busy.current = true;
    try {
      const r = await api<ScanResult>(`${base}/scan`, { method: "POST", json: { code } });
      feedback(r.status);
      setLast({ ...r, message: r.message, parcel: r.parcel ?? { code } as Parcel });
      if (r.summary) setSummary(r.summary);
      if (r.parcel && r.status !== "duplicate" && r.status !== "invalid") setRecent((x) => [r.parcel!, ...x].slice(0, 30));
    } catch (e) {
      feedback("invalid");
      const msg = e instanceof ApiError ? e.message : "Gagal mengirim, cek koneksi.";
      if (e instanceof ApiError && e.status === 410) { stopCam(); setFinished(true); }
      setLast({ status: "invalid", message: msg, parcel: null });
      seen.current = { code: "", at: 0 }; // allow retrying the same code
    } finally {
      busy.current = false;
    }
  }, [base]);

  const stopCam = () => { gen.current++; controls.current?.stop(); controls.current = null; setCamOn(false); };
  const startCam = useCallback(async () => {
    setCamErr("");
    if (!window.isSecureContext || !navigator.mediaDevices?.getUserMedia) {
      setCamErr("Kamera hanya bisa dibuka lewat HTTPS. Buka link ini dari alamat https:// (domain Pesanin), atau ketik resi manual di bawah.");
      return;
    }
    const my = ++gen.current;
    controls.current?.stop();
    try {
      const [{ BrowserMultiFormatReader }, { BarcodeFormat, DecodeHintType }] = await Promise.all([import("@zxing/browser"), import("@zxing/library")]);
      const hints = new Map();
      hints.set(DecodeHintType.POSSIBLE_FORMATS, [BarcodeFormat.CODE_128, BarcodeFormat.CODE_39, BarcodeFormat.CODE_93, BarcodeFormat.EAN_13, BarcodeFormat.ITF, BarcodeFormat.CODABAR, BarcodeFormat.QR_CODE, BarcodeFormat.DATA_MATRIX]);
      const reader = new BrowserMultiFormatReader(hints, { delayBetweenScanAttempts: 120 });
      const c = await reader.decodeFromConstraints(
        { video: { facingMode: { ideal: "environment" }, width: { ideal: 1280 }, height: { ideal: 720 } } },
        video.current!,
        (res) => { if (res) send(res.getText()); },
      );
      if (my !== gen.current) { c.stop(); return; } // closed/restarted meanwhile
      controls.current = c;
      setCamOn(true);
    } catch (e: any) {
      setCamErr(e?.name === "NotAllowedError" ? "Izin kamera ditolak. Izinkan kamera di pengaturan browser lalu coba lagi." : "Kamera tidak bisa dibuka. Coba lagi atau ketik resi manual.");
    }
  }, [send]);

  // Open the camera right away once the session is valid.
  useEffect(() => {
    if (info?.session.open && !finished) startCam();
    return () => { gen.current++; controls.current?.stop(); controls.current = null; };
  }, [info, finished, startCam]);

  const undo = async () => {
    try {
      const r = await api<{ removed: string | null; summary: Summary }>(`${base}/undo`, { method: "POST" });
      setSummary(r.summary);
      setRecent((x) => x.slice(1));
      setLast(r.removed ? { status: "invalid", message: `Scan terakhir (${r.removed}) dibatalkan.`, parcel: null } : null);
      seen.current = { code: "", at: 0 };
    } catch (e) { setLast({ status: "invalid", message: e instanceof ApiError ? e.message : "Gagal membatalkan", parcel: null }); }
  };
  const finish = async () => {
    if (!(await askConfirm(`Selesai scan? Total ${summary?.total ?? 0} paket. Setelah selesai, link ini tidak bisa dipakai lagi.`, { title: "Selesai scan", confirmLabel: "Selesai" }))) return;
    try {
      const r = await api<{ summary: Summary }>(`${base}/finish`, { method: "POST" });
      stopCam(); setSummary(r.summary); setFinished(true);
    } catch (e) { setLast({ status: "invalid", message: e instanceof ApiError ? e.message : "Gagal", parcel: null }); }
  };

  if (err) return <Shell><p className="rounded-2xl bg-rose-50 p-5 text-center text-sm text-rose-700">{err}</p></Shell>;
  if (!info || !summary) return <Shell><p className="flex justify-center p-10"><Loader2 className="animate-spin text-slate-400" /></p></Shell>;

  if (finished) return (
    <Shell store={info.store_name}>
      <div className="space-y-4 rounded-2xl bg-white p-5 shadow-sm">
        <div className="flex flex-col items-center gap-2 text-center">
          <span className="flex h-14 w-14 items-center justify-center rounded-full bg-emerald-100 text-emerald-600"><PackageCheck size={28} /></span>
          <h1 className="text-lg font-bold text-slate-800">Scan selesai</h1>
          <p className="text-xs text-slate-500">PDF bukti serah terima bisa diunduh di dashboard → Scan Out.</p>
        </div>
        <div className="rounded-xl bg-brand-50 p-4 text-center"><div className="text-4xl font-bold text-brand-700">{summary.total}</div><div className="text-sm text-brand-700/80">total paket</div></div>
        <div>
          <div className="mb-1 text-xs font-semibold uppercase tracking-wide text-slate-400">Per toko</div>
          {summary.by_shop.map((s) => <div key={s.name} className="flex justify-between border-b border-slate-100 py-2 text-sm"><span className="text-slate-600">{s.name}</span><b>{s.count} paket</b></div>)}
          {!summary.by_shop.length && <p className="text-sm text-slate-400">Tidak ada paket.</p>}
        </div>
        {summary.by_courier.length > 0 && (
          <div>
            <div className="mb-1 text-xs font-semibold uppercase tracking-wide text-slate-400">Per kurir</div>
            {summary.by_courier.map((s) => <div key={s.name} className="flex justify-between border-b border-slate-100 py-2 text-sm"><span className="text-slate-600">{s.name}</span><b>{s.count}</b></div>)}
          </div>
        )}
      </div>
    </Shell>
  );

  return (
    <Shell store={info.store_name}>
      <div className="relative overflow-hidden rounded-2xl bg-black">
        <video ref={video} className="aspect-[4/3] w-full object-cover" muted playsInline />
        {camOn && <div className="pointer-events-none absolute inset-x-8 top-1/2 h-24 -translate-y-1/2 rounded-xl border-2 border-white/80 shadow-[0_0_0_9999px_rgba(0,0,0,0.35)]" />}
        {!camOn && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 p-6 text-center">
            {camErr && <p className="text-sm text-white/90">{camErr}</p>}
            <button onClick={startCam} className="flex items-center gap-2 rounded-full bg-white px-5 py-2.5 text-sm font-semibold text-slate-800"><Camera size={16} />Buka kamera</button>
          </div>
        )}
        <div className="absolute left-3 top-3 rounded-full bg-black/60 px-3 py-1 text-sm font-bold text-white">{summary.total} paket</div>
      </div>

      {last && (
        <div className={`rounded-2xl p-4 ring-1 ${STATUS_STYLE[last.status].box}`}>
          <div className="text-xs font-bold uppercase">{STATUS_STYLE[last.status].label}</div>
          {last.parcel?.code && <div className="font-mono text-base font-bold">{last.parcel.code}</div>}
          <div className="text-sm">{last.message}</div>
        </div>
      )}

      <form onSubmit={(e) => { e.preventDefault(); seen.current = { code: "", at: 0 }; send(manual); setManual(""); }} className="flex gap-2">
        <div className="relative flex-1">
          <Keyboard size={16} className="absolute left-3 top-3 text-slate-400" />
          <input value={manual} onChange={(e) => setManual(e.target.value)} placeholder="Ketik resi manual" className="h-10 w-full rounded-xl border border-slate-200 bg-white pl-9 pr-3 font-mono text-sm outline-none focus:border-brand-500" />
        </div>
        <button className="rounded-xl bg-slate-800 px-4 text-sm font-semibold text-white">Kirim</button>
      </form>

      <div className="grid grid-cols-2 gap-2">
        <button onClick={undo} disabled={!summary.total} className="flex h-12 items-center justify-center gap-2 rounded-xl bg-white text-sm font-semibold text-slate-700 ring-1 ring-slate-200 disabled:opacity-40"><Undo2 size={16} />Batal scan terakhir</button>
        <button onClick={finish} className="flex h-12 items-center justify-center gap-2 rounded-xl bg-brand-600 text-sm font-semibold text-white"><CheckCircle2 size={16} />Selesai</button>
      </div>

      <div className="rounded-2xl bg-white p-4 shadow-sm">
        <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-400">Per toko</div>
        {summary.by_shop.map((s) => <div key={s.name} className="flex justify-between py-1 text-sm"><span className="text-slate-600">{s.name}</span><b>{s.count}</b></div>)}
        {!summary.by_shop.length && <p className="text-sm text-slate-400">Belum ada paket.</p>}
        {recent.length > 0 && (
          <>
            <div className="mb-1 mt-4 text-xs font-semibold uppercase tracking-wide text-slate-400">Terakhir di-scan</div>
            {recent.slice(0, 10).map((p) => (
              <div key={p.id} className="flex items-center justify-between gap-2 border-t border-slate-100 py-1.5 text-xs">
                <span className="font-mono font-semibold text-slate-700">{p.code}</span>
                <span className={`truncate ${p.matched ? "text-slate-500" : "text-amber-600"}`}>{p.shop_name ?? "Tidak dikenal"} · {scanTime(p.scanned_at).slice(0, 5)}</span>
              </div>
            ))}
          </>
        )}
      </div>
    </Shell>
  );
}

function Shell({ children, store }: { children: React.ReactNode; store?: string | null }) {
  return (
    <div className="min-h-screen bg-slate-100">
      <div className="mx-auto max-w-md space-y-3 p-3 pb-10">
        <div className="flex items-center justify-between px-1 pt-1">
          <div className="text-base font-bold text-slate-800">Scan Out</div>
          {store && <div className="truncate text-xs text-slate-500">{store}</div>}
        </div>
        {children}
      </div>
    </div>
  );
}
