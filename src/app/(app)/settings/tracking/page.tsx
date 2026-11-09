"use client";
import { Trash2 } from "lucide-react";
import { useState } from "react";
import { ApiError } from "@/lib/api";
import { Dialog, DialogActions, EmptyState, FieldLabel, PageHead, Panel, Toggle, useResource } from "@/components/kit";

type Px = { id: number; platform: string; pixel_id: string; name?: string; server_side: boolean };
const TABS: [string, string, React.ReactNode][] = [
  ["facebook", "Facebook", <span key="f" className="flex h-5 w-5 items-center justify-center rounded-full bg-[#1877f2] text-[11px] font-bold text-white">f</span>],
  ["tiktok", "Tiktok", <span key="t" className="flex h-5 w-5 items-center justify-center rounded-full bg-black text-[10px] font-bold text-white">♪</span>],
  ["google_ads", "Google Ads", <span key="g" className="text-base font-bold text-[#4285f4]">G</span>],
  ["gtm", "Google Tag Manager", <span key="m" className="h-3.5 w-3.5 rotate-45 rounded-sm bg-[#4285f4]" />],
  ["snack", "Snack Video", <span key="s" className="flex h-5 w-5 items-center justify-center rounded-full bg-[#ffd400] text-[10px] font-bold">S</span>],
];

function TrackingArt() {
  return (
    <svg viewBox="0 0 220 150" className="h-40 w-56" aria-hidden>
      <rect x="80" y="18" width="110" height="80" rx="6" fill="#f56a1b" /><rect x="88" y="26" width="94" height="64" rx="4" fill="#fff5ed" />
      {[0, 1, 2, 3].map((i) => <rect key={i} x={100 + i * 18} y={70 - i * 10} width="8" height={14 + i * 10} fill="#f56a1b" />)}
      <path d="M100 50 q20-20 40-6 t40-10" stroke="#f56a1b" strokeWidth="2" fill="none" />
      <circle cx="182" cy="22" r="12" fill="#e9574f" /><path d="M182 28v-12m-5 5l5-5 5 5" stroke="#fff" strokeWidth="2" fill="none" />
      <rect x="64" y="4" width="34" height="28" rx="4" fill="#5ec5d6" /><circle cx="78" cy="14" r="5" fill="var(--color-brand-600)" />
      <rect x="140" y="98" width="40" height="34" rx="3" fill="#f6c25b" /><rect x="150" y="106" width="20" height="18" fill="#e9837e" />
      <circle cx="56" cy="60" r="16" fill="#f2b9a0" /><path d="M40 56 q16-28 32 0 q-6-18-16-18 q-12 0-16 18z" fill="#7b4a2a" />
      <rect x="40" y="76" width="34" height="50" rx="12" fill="#e9837e" /><rect x="46" y="82" width="22" height="44" rx="4" fill="#f6c25b" />
      <rect x="20" y="132" width="180" height="3" fill="#fecdab" />
    </svg>
  );
}

export default function Tracking() {
  const [tab, setTab] = useState("facebook");
  const res = useResource<Px>("pixels", { platform: tab });
  const [open, setOpen] = useState(false);

  return (
    <div className="space-y-4">
      <PageHead title="Tracking" />
      <div className="flex overflow-x-auto border-b border-transparent text-sm">
        {TABS.map(([k, label, icon]) => (
          <button key={k} onClick={() => setTab(k)} className={`flex items-center gap-2 whitespace-nowrap border-b-2 px-3 py-2 ${tab === k ? "border-brand-600 font-medium text-slate-800" : "border-transparent text-slate-600"}`}>{label}{icon}</button>
        ))}
      </div>
      {res.data && !res.rows.length ? (
        <div className="flex flex-col items-center gap-3 py-8 text-center">
          <TrackingArt />
          <h2 className="text-lg font-semibold text-slate-800">Tambahkan pelacakan sisi server</h2>
          <p className="max-w-md text-sm text-slate-600">Tambahkan pelacakan sisi server sehingga kamu dapat mengelola semua paket dengan mudah.</p>
          <button onClick={() => setOpen(true)} className="mt-2 h-10 w-64 rounded-lg bg-brand-600 text-sm font-semibold text-white">Tambah Pelacakan</button>
        </div>
      ) : (
        <Panel>
          <div className="flex justify-end p-4"><button onClick={() => setOpen(true)} className="h-10 rounded-lg bg-brand-600 px-5 text-sm font-semibold text-white">Tambah Pelacakan</button></div>
          <table className="w-full text-sm">
            <thead><tr className="border-y border-slate-100 text-left text-[13px] text-slate-500"><th className="px-5 py-3 font-medium">Pixel Name</th><th className="px-5 font-medium">Pixel ID</th><th className="px-5 font-medium">Server Side</th><th /></tr></thead>
            <tbody>{res.rows.map((p) => (
              <tr key={p.id} className="border-b border-slate-100">
                <td className="px-5 py-3 font-medium text-slate-800">{p.name || "-"}</td><td className="px-5 font-mono text-slate-700">{p.pixel_id}</td>
                <td className="px-5"><Toggle checked={p.server_side} onChange={(v) => res.update(p.id, { server_side: v })} /></td>
                <td className="px-5 text-right"><button onClick={() => res.remove(p.id)} className="text-slate-400 hover:text-rose-600" aria-label="Hapus"><Trash2 size={16} /></button></td>
              </tr>
            ))}</tbody>
          </table>
        </Panel>
      )}
      {open && <AddPixel platform={tab} onClose={() => setOpen(false)} onSave={async (b) => { await res.create(b); setOpen(false); }} />}
    </div>
  );
}

function AddPixel({ platform, onClose, onSave }: { platform: string; onClose: () => void; onSave: (b: unknown) => Promise<void> }) {
  const [f, setF] = useState({ pixel_id: "", name: "", server_side: false });
  const [err, setErr] = useState("");
  return (
    <Dialog title="Tambah Pixel ID" onClose={onClose}>
      <form onSubmit={async (e) => { e.preventDefault(); try { await onSave({ ...f, platform }); } catch (x) { setErr(x instanceof ApiError ? Object.values(x.errors)[0]?.[0] ?? x.message : "Gagal"); } }}>
        <div className="grid grid-cols-2 gap-3">
          <div><FieldLabel>Pixel Id</FieldLabel><input className="input" placeholder="Pixel Id" value={f.pixel_id} onChange={(e) => setF({ ...f, pixel_id: e.target.value })} /></div>
          <div><FieldLabel>Pixel Name</FieldLabel><input className="input" placeholder="Pixel Name" value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} /></div>
        </div>
        <label className="mt-4 flex items-center gap-3 text-sm"><Toggle checked={f.server_side} onChange={(v) => setF({ ...f, server_side: v })} />Server Side</label>
        {err && <p className="mt-2 text-xs text-rose-600">{err}</p>}
        <DialogActions onCancel={onClose} label="Add" cancel="Cancel" />
      </form>
    </Dialog>
  );
}
