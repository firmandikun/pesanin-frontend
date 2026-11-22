"use client";
import type { IScannerControls } from "@zxing/browser";
import { Camera, CheckCircle2, Keyboard, Loader2, PackageCheck, Undo2 } from "lucide-react";
import { use, useCallback, useEffect, useRef, useState } from "react";
import { askConfirm } from "@/components/Dialogs";
import { api, ApiError } from "@/lib/api";
import { CheckToggle, PackPanel, useCheckToggle, usePackCheck } from "@/components/scanout/PackCheck";
import { feedback, scanTime, STATUS_STYLE, type Parcel, type ScanPayload, type ScanResult, type Summary } from "@/lib/scanOut";

/**
 * Phone scanner opened from the Scan Out QR on the dashboard (no login: the session token is the access).
 * Back camera reads the resi barcode, each code is sent once, and Selesai shows the count per shop + total.
 */
const STAFF_KEY = "pesanin_scan_staff";

/** Reject Pesanin dashboard QR links / URLs or malformed strings before hitting the API. */
function validateResiCode(raw: string): string | null {
  const code = raw.trim().replace(/\s+/g, "").toUpperCase();
  if (!code) return "Kode kosong.";
  if (/^https?:\/\//i.test(code) || code.includes("://") || /\/scan\//i.test(code)) {
    return "Ini QR link Pesanin / URL, bukan nomor resi. Arahkan kamera ke barcode resi di label paket.";
  }
  if (code.length < 6 || code.length > 100) {
    return "Kode terlalu pendek/panjang, scan ulang barcode resi.";
  }
  if (!/^[A-Z0-9\-_|,;]+$/.test(code)) {
    return "Format bukan nomor resi yang valid. Scan ulang barcode resi di label paket.";
  }
  return null;
}

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
  // Viewfinder follows the label: auto-detects both 1D barcode & QR/Data Matrix by default, or locks to one.
  const [scanMode, setScanMode] = useState<"auto" | "bar" | "qr">("auto");
  const [guide, setGuide] = useState<"bar" | "qr">("bar");
  const [hit, setHit] = useState<{ left: number; top: number; width: number; height: number } | null>(null);
  const hitTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const seen = useRef<{ code: string; at: number }>({ code: "", at: 0 });
  // "Cek isi paket": after a resi, scan each product + photo before the next resi.
  const [check, setCheck] = useCheckToggle();
  // Several warehouse staff can scan with the same QR: each phone remembers whose it is.
  const [staff, setStaffState] = useState<string | null>(null);
  const [staffDraft, setStaffDraft] = useState("");
  const staffRef = useRef<string | null>(null);
  staffRef.current = staff;
  useEffect(() => { try { const n = localStorage.getItem(STAFF_KEY); setStaffState(n || ""); setStaffDraft(n || ""); } catch { setStaffState(""); } }, []);
  const setStaff = (n: string) => { const v = n.trim().slice(0, 60); setStaffState(v); try { localStorage.setItem(STAFF_KEY, v); } catch { /* private mode */ } };
  const pack = usePackCheck((id, fd) => { if (staffRef.current) fd.append("by", staffRef.current); return api(`${base}/pack/${id}`, { method: "POST", body: fd }); });
  const packRef = useRef(pack);
  packRef.current = pack;
  const checkRef = useRef(check);
  checkRef.current = check;

  useEffect(() => {
    api<ScanPayload>(base).then((p) => {
      setInfo(p); setSummary(p.summary); setRecent(p.parcels);
      if (!p.session.open) setFinished(true);
    }).catch((e) => setErr(e instanceof ApiError ? e.message : "Link scan tidak valid."));
  }, [base]);

  const send = useCallback(async (raw: string) => {
    const code = raw.trim();
    const now = Date.now();
    // The camera reads the same label many times a second: ignore repeats for a few seconds
    // (1.5 s while checking products, so two units of the same product can be scanned one after another).
    const open = packRef.current.order;
    if (!code || busy.current || (seen.current.code === code && now - seen.current.at < 4000)) return;
    seen.current = { code, at: now };
    if (open) {
      const sameLabel = [open.resi, open.order_sn, open.code].some(
        (x) => (x ?? "").trim().replace(/\s+/g, "").toUpperCase() === code.replace(/\s+/g, "").toUpperCase(),
      );
      if (sameLabel) { packRef.current.scan(code); return; }
      // Scanning a new resi automatically moves on from the previous proof card.
      packRef.current.cancel();
    }
    const resiErr = validateResiCode(code);
    if (resiErr) {
      feedback("invalid");
      setLast({ status: "invalid", message: resiErr, parcel: null });
      return;
    }
    busy.current = true;
    try {
      const r = await api<ScanResult>(`${base}/scan`, { method: "POST", json: { code, by: staffRef.current || undefined } });
      feedback(r.status);
      setLast({ ...r, parcel: r.parcel ?? ({ code } as Parcel) });
      if (r.summary) setSummary(r.summary);
      if (r.parcel && (r.status === "ok" || r.status === "unknown")) setRecent((x) => [r.parcel!, ...x].slice(0, 30));
      packRef.current.setMsg(null);
      if (r.status === "ok" && r.order && checkRef.current) packRef.current.start(r.order);
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

  /** Box around the decoded code, in on-screen pixels (the video is object-cover, so scale + crop offset). */
  const markHit = (pts: [number, number][], square: boolean) => {
    const v = video.current;
    if (!v || !pts.length || !v.videoWidth) return;
    const el = v.getBoundingClientRect();
    const scale = Math.max(el.width / v.videoWidth, el.height / v.videoHeight);
    const ox = (el.width - v.videoWidth * scale) / 2, oy = (el.height - v.videoHeight * scale) / 2;
    const xs = pts.map(([x]) => x * scale + ox), ys = pts.map(([, y]) => y * scale + oy);
    let [x0, x1, y0, y1] = [Math.min(...xs), Math.max(...xs), Math.min(...ys), Math.max(...ys)];
    const w = Math.max(x1 - x0, 40);
    // A 1D barcode only reports points along one line: give it the usual bar height. QR points are corners.
    const h = square ? Math.max(y1 - y0, w) : Math.max(y1 - y0, w * 0.35);
    const pad = square ? w * 0.15 : 12;
    const cx = (x0 + x1) / 2, cy = (y0 + y1) / 2;
    [x0, x1, y0, y1] = [cx - w / 2 - pad, cx + w / 2 + pad, cy - h / 2 - pad, cy + h / 2 + pad];
    setHit({ left: Math.max(0, x0), top: Math.max(0, y0), width: Math.min(el.width, x1) - Math.max(0, x0), height: Math.min(el.height, y1) - Math.max(0, y0) });
    clearTimeout(hitTimer.current);
    hitTimer.current = setTimeout(() => setHit(null), 900);
  };

  const stopCam = () => { gen.current++; controls.current?.stop(); controls.current = null; setCamOn(false); };
  const startCam = useCallback(async (mode: "auto" | "bar" | "qr" = scanMode) => {
    setCamErr("");
    if (!video.current) return;
    if (!window.isSecureContext || !navigator.mediaDevices?.getUserMedia) {
      setCamErr("Kamera hanya bisa dibuka lewat HTTPS. Buka link ini dari alamat https:// (domain Pesanin), atau ketik resi manual di bawah.");
      return;
    }
    const my = ++gen.current;
    controls.current?.stop();
    try {
      const v = video.current;
      v.setAttribute("playsinline", "true");
      v.setAttribute("autoplay", "true");
      v.muted = true;
      const [{ BrowserMultiFormatReader }, { BarcodeFormat, DecodeHintType }] = await Promise.all([import("@zxing/browser"), import("@zxing/library")]);
      const hints = new Map();
      const oneD = [BarcodeFormat.CODE_128, BarcodeFormat.CODE_39, BarcodeFormat.CODE_93, BarcodeFormat.EAN_13, BarcodeFormat.ITF, BarcodeFormat.CODABAR];
      const twoD = [BarcodeFormat.QR_CODE, BarcodeFormat.DATA_MATRIX];
      const formats = mode === "qr" ? twoD : mode === "bar" ? oneD : [...oneD, ...twoD];
      hints.set(DecodeHintType.POSSIBLE_FORMATS, formats);
      hints.set(DecodeHintType.TRY_HARDER, true);
      const reader = new BrowserMultiFormatReader(hints, { delayBetweenScanAttempts: mode === "bar" ? 80 : 90 });
      const c = await reader.decodeFromConstraints(
        { video: { facingMode: { ideal: "environment" }, width: { ideal: 1920 }, height: { ideal: 1080 } } },
        v,
        (res) => {
          if (!res) return;
          const square = res.getBarcodeFormat() === BarcodeFormat.QR_CODE || res.getBarcodeFormat() === BarcodeFormat.DATA_MATRIX;
          setGuide(square ? "qr" : "bar");
          markHit(res.getResultPoints().map((p) => [p.getX(), p.getY()] as [number, number]), square);
          send(res.getText());
        },
      );
      if (my !== gen.current) { c.stop(); return; } // closed/restarted meanwhile
      controls.current = c;
      v.play().catch(() => {});
      setCamOn(true);
    } catch (e: any) {
      setCamErr(e?.name === "NotAllowedError" ? "Izin kamera ditolak. Izinkan kamera di pengaturan browser lalu coba lagi." : "Kamera tidak bisa dibuka. Coba lagi atau ketik resi manual.");
    }
  }, [scanMode, send]);

  // Open the camera right away once the session is valid and staff name is set (and restart when scan mode changes).
  useEffect(() => {
    if (info?.session.open && !finished && staff) startCam(scanMode);
    return () => { gen.current++; controls.current?.stop(); controls.current = null; };
  }, [info, finished, staff, scanMode, startCam]);

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
    if (!(await askConfirm(`Selesai scan? Total ${summary?.total ?? 0} paket. Sesi ditutup untuk SEMUA petugas dan link ini tidak bisa dipakai lagi. Kalau hanya kamu yang selesai, cukup tutup halaman ini.`, { title: "Selesai scan", confirmLabel: "Selesai" }))) return;
    try {
      const r = await api<{ summary: Summary }>(`${base}/finish`, { method: "POST" });
      stopCam(); setSummary(r.summary); setFinished(true);
    } catch (e) { setLast({ status: "invalid", message: e instanceof ApiError ? e.message : "Gagal", parcel: null }); }
  };

  // Photo of the open parcel from the running camera.
  const snap = async (): Promise<Blob | null> => {
    const v = video.current;
    if (!v || !v.videoWidth) return null;
    const c = document.createElement("canvas");
    c.width = v.videoWidth; c.height = v.videoHeight;
    c.getContext("2d")!.drawImage(v, 0, 0);
    return new Promise((res) => c.toBlob(res, "image/jpeg", 0.85));
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
          <div className="mb-1 text-xs font-semibold uppercase tracking-wide text-slate-400">Per ekspedisi</div>
          {summary.by_expedition.map((s) => <div key={s.name} className="flex justify-between border-b border-slate-100 py-2 text-sm"><span className="text-slate-600">{s.name}</span><b>{s.count} paket</b></div>)}
        </div>
        <div>
          <div className="mb-1 text-xs font-semibold uppercase tracking-wide text-slate-400">Per toko</div>
          {summary.by_shop.map((s) => <div key={s.name} className="flex justify-between border-b border-slate-100 py-2 text-sm"><span className="text-slate-600">{s.name}</span><b>{s.count} paket</b></div>)}
          {!summary.by_shop.length && <p className="text-sm text-slate-400">Tidak ada paket.</p>}
        </div>
      </div>
    </Shell>
  );

  if (staff === "") return (
    <Shell store={info.store_name}>
      <form onSubmit={(e) => { e.preventDefault(); if (staffDraft.trim()) setStaff(staffDraft); }} className="space-y-3 rounded-2xl bg-white p-5 shadow-sm">
        <h1 className="text-base font-bold text-slate-800">Siapa yang scan?</h1>
        <p className="text-xs text-slate-500">Tulis nama kamu sekali saja (tersimpan di HP ini). Beberapa petugas gudang bisa scan bersamaan pakai QR yang sama, dan tiap paket tercatat atas nama yang scan.</p>
        <input autoFocus value={staffDraft} onChange={(e) => setStaffDraft(e.target.value)} maxLength={60} placeholder="Nama petugas, mis. Rina" className="h-11 w-full rounded-xl border border-slate-200 px-3 text-sm outline-none focus:border-brand-500" />
        <button disabled={!staffDraft.trim()} className="h-11 w-full rounded-xl bg-brand-600 text-sm font-semibold text-white disabled:opacity-50">Mulai scan</button>
      </form>
    </Shell>
  );

  return (
    <Shell store={info.store_name}>
      <div className="relative aspect-[4/3] w-full overflow-hidden rounded-2xl bg-slate-900">
        <video ref={video} className="h-full w-full object-cover" autoPlay muted playsInline style={{ transform: "translateZ(0)" }} />
        {camOn && (
          <div className={`pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 rounded-xl border-2 border-white/85 bg-white/5 transition-all duration-300 ${(scanMode === "qr" || (scanMode === "auto" && guide === "qr")) ? "aspect-square w-[56%]" : "h-24 w-[84%]"}`} />
        )}
        {camOn && hit && <div className="pointer-events-none absolute rounded-lg border-[3px] border-emerald-400 bg-emerald-400/15 transition-all duration-150" style={hit} />}
        {camOn && (
          <div className="absolute bottom-2.5 left-1/2 flex -translate-x-1/2 overflow-hidden rounded-full bg-black/65 p-0.5 text-xs font-semibold text-white shadow-sm backdrop-blur-sm">
            {([["auto", "Otomatis"], ["bar", "Barcode"], ["qr", "QR / kotak"]] as const).map(([m, label]) => (
              <button key={m} type="button" onClick={() => { setScanMode(m); if (m !== "auto") setGuide(m); }} className={`whitespace-nowrap rounded-full px-3 py-1 transition-colors ${scanMode === m ? "bg-white text-slate-800" : "text-white/90"}`}>{label}</button>
            ))}
          </div>
        )}
        {!camOn && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 p-6 text-center">
            {camErr && <p className="text-sm text-white/90">{camErr}</p>}
            <button type="button" onClick={() => startCam(scanMode)} className="flex items-center gap-2 rounded-full bg-white px-5 py-2.5 text-sm font-semibold text-slate-800 shadow-sm"><Camera size={16} />Buka kamera</button>
          </div>
        )}
        <div className="absolute left-3 top-3 rounded-full bg-black/65 px-3 py-1 text-xs font-bold text-white backdrop-blur-sm">{summary.total} paket</div>
      </div>

      <div className="space-y-2 rounded-2xl bg-white px-4 py-2.5 shadow-sm">
        <div className="flex items-center justify-between gap-2 text-xs text-slate-500"><span>Petugas: <b className="text-slate-700">{staff}</b></span><button onClick={() => setStaffState("")} className="font-semibold text-brand-600">Ganti</button></div>
        <CheckToggle on={check} onChange={(v) => { setCheck(v); if (!v) pack.cancel(); }} />
      </div>

      {pack.order && pack.msg && <div className={`rounded-2xl p-3 text-sm font-semibold ring-1 ${pack.msg.ok ? "bg-emerald-50 text-emerald-800 ring-emerald-200" : "bg-rose-50 text-rose-800 ring-rose-200"}`}>{pack.msg.text}</div>}
      {pack.order && <PackPanel pack={pack} snap={camOn ? snap : undefined} compact />}

      {!pack.order && pack.msg?.ok && pack.msg.text.startsWith("Bukti paket ") && <div className="rounded-2xl bg-emerald-50 p-3 text-sm font-semibold text-emerald-800 ring-1 ring-emerald-200">{pack.msg.text}</div>}
      {last && !pack.order && (
        <div className={`overflow-hidden rounded-2xl p-4 ring-1 ${STATUS_STYLE[last.status].box}`}>
          <div className="text-xs font-bold uppercase">{STATUS_STYLE[last.status].label}</div>
          {last.parcel?.code && <div className="mt-0.5 break-all font-mono text-base font-bold">{last.parcel.code}</div>}
          <div className="mt-0.5 break-words text-sm">{last.message}</div>
        </div>
      )}

      <form onSubmit={(e) => { e.preventDefault(); seen.current = { code: "", at: 0 }; send(manual); setManual(""); }} className="flex gap-2">
        <div className="relative min-w-0 flex-1">
          <Keyboard size={16} className="absolute left-3 top-3 text-slate-400" />
          <input value={manual} onChange={(e) => setManual(e.target.value)} placeholder="Ketik resi manual" className="h-10 w-full rounded-xl border border-slate-200 bg-white pl-9 pr-3 font-mono text-sm outline-none focus:border-brand-500" />
        </div>
        <button className="shrink-0 rounded-xl bg-slate-800 px-4 text-sm font-semibold text-white">Kirim</button>
      </form>

      <div className="grid grid-cols-2 gap-2">
        <button type="button" onClick={undo} disabled={!summary.total} className="flex h-12 items-center justify-center gap-1.5 rounded-xl bg-white px-3 text-xs font-semibold text-slate-700 ring-1 ring-slate-200 disabled:opacity-40 sm:text-sm"><Undo2 size={16} className="shrink-0" /><span>Batal scan terakhir</span></button>
        <button type="button" onClick={finish} className="flex h-12 items-center justify-center gap-1.5 rounded-xl bg-brand-600 px-3 text-xs font-semibold text-white sm:text-sm"><CheckCircle2 size={16} className="shrink-0" /><span>Selesai</span></button>
      </div>

      <div className="overflow-hidden rounded-2xl bg-white p-4 shadow-sm">
        <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-400">Per ekspedisi</div>
        {summary.by_expedition.map((s) => <div key={s.name} className="flex justify-between gap-2 py-1 text-sm"><span className="min-w-0 truncate text-slate-600">{s.name}</span><b className="shrink-0">{s.count}</b></div>)}
        <div className="mb-2 mt-3 text-xs font-semibold uppercase tracking-wide text-slate-400">Per toko</div>
        {summary.by_shop.map((s) => <div key={s.name} className="flex justify-between gap-2 py-1 text-sm"><span className="min-w-0 truncate text-slate-600">{s.name}</span><b className="shrink-0">{s.count}</b></div>)}
        {(summary.by_staff?.length ?? 0) > 0 && <div className="mb-2 mt-3 text-xs font-semibold uppercase tracking-wide text-slate-400">Per petugas</div>}
        {summary.by_staff?.map((s) => <div key={s.name} className="flex justify-between gap-2 py-1 text-sm"><span className="min-w-0 truncate text-slate-600">{s.name}</span><b className="shrink-0">{s.count}</b></div>)}
        {!summary.by_shop.length && <p className="text-sm text-slate-400">Belum ada paket.</p>}
        {recent.length > 0 && (
          <>
            <div className="mb-1 mt-4 text-xs font-semibold uppercase tracking-wide text-slate-400">Terakhir di-scan</div>
            {recent.slice(0, 10).map((p) => (
              <div key={p.id} className="flex items-center justify-between gap-2 border-t border-slate-100 py-1.5 text-xs">
                <span className="min-w-0 flex-1 break-all font-mono font-semibold text-slate-700">{p.code}</span>
                <span className={`max-w-[52%] shrink-0 truncate text-right ${p.matched ? "text-slate-500" : "text-amber-600"}`}>{p.shop_name ?? "Tidak dikenal"}{p.expedition ? ` · ${p.expedition}` : ""} · {scanTime(p.scanned_at).slice(0, 5)}</span>
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
    <div className="min-h-screen overflow-x-hidden bg-slate-100">
      <div className="mx-auto w-full min-w-0 max-w-md space-y-3 p-3 pb-10">
        <div className="flex items-center justify-between gap-2 px-1 pt-1">
          <div className="shrink-0 text-base font-bold text-slate-800">Scan Out</div>
          {store && <div className="min-w-0 truncate text-xs text-slate-500">{store}</div>}
        </div>
        {children}
      </div>
    </div>
  );
}
