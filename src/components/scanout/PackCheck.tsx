"use client";
import { Camera, Check, ImagePlus, Loader2, Minus, PackageCheck, Plus, X } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { feedback } from "@/lib/scanOut";

/**
 * "Cek isi paket" in Scan Out: after a resi is scanned, every product of the order is scanned (SKU barcode) or
 * ticked by hand; a wrong or extra product is refused with a sound. A photo of the open parcel is taken, then
 * "Selesai paket" (or Enter) saves it: the photo is kept on the order as proof when a buyer disputes.
 */
export type PackItem = { name: string; variant: string | null; sku: string | null; qty: number; image: string | null };
export type PackOrder = { id: number; code: string; order_sn: string | null; resi: string | null; note: string | null; items: PackItem[]; packed_at: string | null; packed_by: string | null };
type Line = PackItem & { packed: number; scanned: boolean };
export type PackMsg = { ok: boolean; text: string };

const KEY = "pesanin_scan_check";
const norm = (s: string | null | undefined) => (s ?? "").trim().toUpperCase().replace(/\s+/g, "");

/** "Cek isi paket" on/off, remembered per device (on by default). */
export function useCheckToggle(): [boolean, (v: boolean) => void] {
  const [on, setOn] = useState(true);
  useEffect(() => { try { setOn(localStorage.getItem(KEY) !== "0"); } catch { /* private mode */ } }, []);
  return [on, (v: boolean) => { setOn(v); try { localStorage.setItem(KEY, v ? "1" : "0"); } catch { /* private mode */ } }];
}

export function usePackCheck(save: (orderId: number, fd: FormData) => Promise<unknown>) {
  const [order, setOrder] = useState<PackOrder | null>(null);
  const [lines, setLines] = useState<Line[]>([]);
  const [photo, setPhotoState] = useState<Blob | null>(null);
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<PackMsg | null>(null);

  const setPhoto = useCallback((b: Blob | null) => {
    setPhotoState(b);
    setPhotoUrl((old) => { if (old) URL.revokeObjectURL(old); return b ? URL.createObjectURL(b) : null; });
  }, []);
  const reset = useCallback(() => { setOrder(null); setLines([]); setPhoto(null); }, [setPhoto]);

  const complete = lines.length > 0;
  const missing = 0;

  const start = (o: PackOrder) => {
    setOrder(o);
    setLines(o.items.map((i) => ({ ...i, packed: i.qty, scanned: false })));
    setPhoto(null);
    setMsg({ ok: true, text: o.packed_at ? "Pesanan ini sudah punya bukti foto. Ambil foto baru untuk mengganti, atau Lewati." : "Ambil / upload foto bukti paket, lalu klik Simpan bukti." });
  };

  /** While a parcel proof card is open, ignore re-scans of the same label. */
  const scan = (raw: string): PackMsg => {
    const c = norm(raw);
    if (!order || !c) return { ok: true, text: "" };
    if ([order.resi, order.order_sn, order.code].some((x) => norm(x) === c)) {
      const m = { ok: true, text: "Resi sudah terbaca. Silakan foto / upload bukti paket, atau scan resi berikutnya." };
      setMsg(m);
      return m;
    }
    return { ok: true, text: "" };
  };

  const bump = (i: number, d: number) => setLines((ls) => ls.map((l, j) => (j === i ? { ...l, packed: Math.max(0, Math.min(l.qty, l.packed + d)) } : l)));
  const fillAll = () => {
    setLines((ls) => ls.map((l) => ({ ...l, packed: l.qty })));
    feedback("ok");
    setMsg({ ok: true, text: "Produk lengkap! Sekarang foto/upload bukti paket, lalu klik Selesai paket." });
  };

  const finish = async () => {
    if (!order || !complete || saving) return;
    setSaving(true);
    try {
      const fd = new FormData();
      fd.append("check", JSON.stringify(lines.map((l) => ({ name: l.name, sku: l.sku, qty: l.qty, packed: l.qty, scanned: false }))));
      if (photo) fd.append("photo", photo, `paket-${order.code}.jpg`);
      await save(order.id, fd);
      feedback("ok");
      setMsg({ ok: true, text: `Bukti paket ${order.order_sn ?? order.code} tersimpan${photo ? " + foto" : ""}. Scan resi berikutnya.` });
      reset();
    } catch (e) {
      feedback("invalid");
      setMsg({ ok: false, text: e instanceof Error ? e.message : "Gagal menyimpan" });
    } finally { setSaving(false); }
  };

  return { order, lines, complete, missing, photo, photoUrl, setPhoto, saving, msg, setMsg, start, scan, bump, fillAll, finish, cancel: reset };
}

export type PackCheckState = ReturnType<typeof usePackCheck>;

/** The open parcel: products to put in, photo, Selesai paket. `snap` takes the photo from a live camera, when there is one. */
export function PackPanel({ pack, snap, compact, onAction }: { pack: PackCheckState; snap?: () => Promise<Blob | null>; compact?: boolean; onAction?: () => void }) {
  const file = useRef<HTMLInputElement>(null);
  const o = pack.order;
  if (!o) return null;
  // Give the focus back to the scan box (a USB scanner's Enter must not press the button just clicked).
  const after = () => onAction?.();
  const img = compact ? "h-12 w-12" : "h-14 w-14";

  return (
    <div className="overflow-hidden rounded-2xl bg-white ring-1 ring-slate-200">
      <div className="flex items-start justify-between gap-2 border-b border-slate-100 p-3">
        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Upload bukti paket</p>
          <p className="truncate font-mono text-sm font-bold text-slate-800">{o.order_sn ?? o.code}</p>
        </div>
        <span className="shrink-0 rounded-full bg-brand-50 px-2.5 py-1 text-xs font-semibold text-brand-700">{pack.lines.reduce((n, l) => n + l.qty, 0)} pcs</span>
      </div>
      {o.note && <p className="mx-3 mt-2 rounded-lg bg-amber-50 p-2 text-xs text-amber-800"><b>Catatan:</b> {o.note}</p>}
      <div className="divide-y divide-slate-100">
        {pack.lines.map((l, i) => (
          <div key={i} className="flex items-center gap-2.5 px-3 py-2">
            {l.image ? <img src={l.image} alt="" className={`${img} shrink-0 rounded-lg object-cover`} /> : <div className={`${img} shrink-0 rounded-lg bg-slate-100`} />}
            <div className="min-w-0 flex-1">
              <p className="line-clamp-2 text-sm font-semibold text-slate-800">{l.name}</p>
              <p className="truncate text-[11px] text-slate-500">{[l.variant, `${l.qty} pcs`].filter(Boolean).join(" · ")}</p>
            </div>
          </div>
        ))}
      </div>
      <div className="space-y-2 border-t border-slate-100 p-3">
        <input ref={file} type="file" accept="image/*" capture="environment" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) pack.setPhoto(f); e.target.value = ""; after(); }} />
        {pack.photoUrl ? (
          <div className="flex items-center gap-2">
            <img src={pack.photoUrl} alt="Foto paket" className="h-14 w-14 rounded-lg object-cover ring-1 ring-slate-200" />
            <span className="flex-1 text-xs text-emerald-700">Foto bukti siap disimpan.</span>
            <button type="button" onClick={() => { pack.setPhoto(null); after(); }} className="text-xs font-semibold text-slate-500">Hapus</button>
          </div>
        ) : (
          <div className="flex gap-2">
            {snap && <button type="button" onClick={async () => { const b = await snap(); if (b) pack.setPhoto(b); after(); }} className="flex h-10 flex-1 items-center justify-center gap-1.5 rounded-xl bg-slate-800 text-sm font-semibold text-white"><Camera size={15} />Foto dari kamera</button>}
            <button type="button" onClick={() => file.current?.click()} className="flex h-10 flex-1 items-center justify-center gap-1.5 rounded-xl text-sm font-semibold text-slate-700 ring-1 ring-slate-200"><ImagePlus size={15} />{snap ? "Pilih foto" : "Upload foto"}</button>
          </div>
        )}
        <p className="text-[11px] text-slate-400">Foto paket sebelum dikirim: jadi bukti kalau pembeli komplain barang kurang/salah.</p>
        <div className="flex gap-2">
          <button type="button" onClick={pack.cancel} className="flex h-11 items-center justify-center gap-1.5 rounded-xl px-3 text-sm font-semibold text-slate-600 ring-1 ring-slate-200" title="Lewati foto bukti paket ini (resi tetap tercatat)"><X size={15} />Lewati</button>
          <button type="button" onClick={pack.finish} disabled={!pack.photoUrl || pack.saving} className="flex h-11 flex-1 items-center justify-center gap-2 rounded-xl bg-emerald-600 text-sm font-bold text-white disabled:opacity-40">
            {pack.saving ? <Loader2 size={16} className="animate-spin" /> : <PackageCheck size={17} />}Simpan bukti
          </button>
        </div>
      </div>
    </div>
  );
}

/** "Foto bukti paket" on/off switch. */
export function CheckToggle({ on, onChange }: { on: boolean; onChange: (v: boolean) => void }) {
  return (
    <label className="flex cursor-pointer items-center gap-2 text-xs font-semibold text-slate-600">
      <button type="button" role="switch" aria-checked={on} onClick={() => onChange(!on)} className={`relative h-5 w-9 shrink-0 rounded-full transition ${on ? "bg-emerald-500" : "bg-slate-300"}`}>
        <span className={`absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition-all ${on ? "left-[18px]" : "left-0.5"}`} />
      </button>
      Upload foto bukti setelah scan resi
    </label>
  );
}
