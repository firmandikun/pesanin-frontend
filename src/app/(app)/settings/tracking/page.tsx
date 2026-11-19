"use client";
import { Trash2 } from "lucide-react";
import { useState } from "react";
import { api, ApiError } from "@/lib/api";
import { Dialog, DialogActions, EmptyState, FieldLabel, PageHead, Panel, Toggle, useResource } from "@/components/kit";

type Px = { id: number; platform: string; pixel_id: string; name?: string; all_pages: boolean; server_side: boolean; has_capi_token: boolean; capi_test_code?: string | null; capi_last_at?: string | null; capi_last_error?: string | null };
const TABS: [string, string, React.ReactNode][] = [
  ["facebook", "Facebook", <span key="f" className="flex h-5 w-5 items-center justify-center rounded-full bg-[#1877f2] text-[11px] font-bold text-white">f</span>],
  ["tiktok", "Tiktok", <span key="t" className="flex h-5 w-5 items-center justify-center rounded-full bg-black text-[10px] font-bold text-white">♪</span>],
  ["google_ads", "Google Ads", <span key="g" className="text-base font-bold text-[#4285f4]">G</span>],
  ["gtm", "Google Tag Manager", <span key="m" className="h-3.5 w-3.5 rotate-45 rounded-sm bg-[#4285f4]" />],
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
  const [capi, setCapi] = useState<Px | null>(null);

  return (
    <div className="space-y-4">
      <PageHead title="Tracking" />
      <p className="text-sm text-slate-500">Event yang dikirim: PageView &amp; ViewContent di landing page, InitiateCheckout di checkout, dan Purchase / CompletePayment / konversi Google Ads saat pesanan dibuat.</p>
      <div className="flex overflow-x-auto border-b border-transparent text-sm">
        {TABS.map(([k, label, icon]) => (
          <button key={k} onClick={() => setTab(k)} className={`flex items-center gap-2 whitespace-nowrap border-b-2 px-3 py-2 ${tab === k ? "border-brand-600 font-medium text-slate-800" : "border-transparent text-slate-600"}`}>{label}{icon}</button>
        ))}
      </div>
      {res.data && !res.rows.length ? (
        <div className="flex flex-col items-center gap-3 py-8 text-center">
          <TrackingArt />
          <h2 className="text-lg font-semibold text-slate-800">Simpan Pixel iklan kamu sekali</h2>
          <p className="max-w-md text-sm text-slate-600">Pixel bertanda &quot;Semua halaman&quot; otomatis terpasang di semua checkout &amp; landing page kamu. Pixel lain bisa dipilih per produk / landing page.</p>
          <button onClick={() => setOpen(true)} className="mt-2 h-10 w-64 rounded-lg bg-brand-600 text-sm font-semibold text-white">Tambah Pelacakan</button>
        </div>
      ) : (
        <Panel>
          <div className="flex justify-end p-4"><button onClick={() => setOpen(true)} className="h-10 rounded-lg bg-brand-600 px-5 text-sm font-semibold text-white">Tambah Pelacakan</button></div>
          <table className="w-full text-sm">
            <thead><tr className="border-y border-slate-100 text-left text-[13px] text-slate-500"><th className="px-5 py-3 font-medium">Pixel Name</th><th className="px-5 font-medium">Pixel ID</th><th className="px-5 font-medium">Semua Halaman</th>{tab === "facebook" && <th className="px-5 font-medium">Server Side (CAPI)</th>}<th /></tr></thead>
            <tbody>{res.rows.map((p) => (
              <tr key={p.id} className="border-b border-slate-100">
                <td className="px-5 py-3 font-medium text-slate-800">{p.name || "-"}</td><td className="px-5 font-mono text-slate-700">{p.pixel_id}</td>
                <td className="px-5"><Toggle checked={p.all_pages} onChange={(v) => res.update(p.id, { all_pages: v })} /></td>
                {tab === "facebook" && (
                  <td className="px-5">
                    <button onClick={() => setCapi(p)} className="flex items-center gap-2 text-left text-xs">
                      <span className={`h-2 w-2 shrink-0 rounded-full ${!p.server_side || !p.has_capi_token ? "bg-slate-300" : p.capi_last_error ? "bg-rose-500" : "bg-emerald-500"}`} />
                      <span>
                        <b className="block text-slate-700">{!p.server_side || !p.has_capi_token ? "Belum aktif" : p.capi_last_error ? "Error" : "Aktif"}</b>
                        <span className="text-brand-700">Atur</span>
                      </span>
                    </button>
                  </td>
                )}
                <td className="px-5 text-right"><button onClick={() => res.remove(p.id)} className="text-slate-400 hover:text-rose-600" aria-label="Hapus"><Trash2 size={16} /></button></td>
              </tr>
            ))}</tbody>
          </table>
        </Panel>
      )}
      {capi && <CapiDialog px={capi} onClose={() => setCapi(null)} onSaved={async (b) => { await res.update(capi.id, b); }} />}
      {open && <AddPixel platform={tab} onClose={() => setOpen(false)} onSave={async (b) => { await res.create(b); setOpen(false); }} />}
    </div>
  );
}

function AddPixel({ platform, onClose, onSave }: { platform: string; onClose: () => void; onSave: (b: unknown) => Promise<void> }) {
  const [f, setF] = useState({ pixel_id: "", name: "", all_pages: true });
  const hint: Record<string, string> = { facebook: "Contoh: 123456789012345 (Events Manager → Data Sources)", tiktok: "Contoh: C1ABCDEFGH2IJKLMNO (TikTok Ads → Assets → Events)", google_ads: "AW-123456789/AbCdEfGh (ID/label konversi pembelian; tanpa label hanya mencatat kunjungan)", gtm: "Contoh: GTM-ABC1234" };
  const [err, setErr] = useState("");
  return (
    <Dialog title="Tambah Pixel ID" onClose={onClose}>
      <form onSubmit={async (e) => { e.preventDefault(); try { await onSave({ ...f, platform }); } catch (x) { setErr(x instanceof ApiError ? Object.values(x.errors)[0]?.[0] ?? x.message : "Gagal"); } }}>
        <div className="grid grid-cols-2 gap-3">
          <div><FieldLabel>{platform === "google_ads" ? "Conversion ID / Label" : platform === "gtm" ? "Container ID" : "Pixel ID"}</FieldLabel><input className="input" placeholder={platform === "google_ads" ? "AW-123456789/Label" : platform === "gtm" ? "GTM-XXXXXX" : "Pixel ID"} value={f.pixel_id} onChange={(e) => setF({ ...f, pixel_id: e.target.value.trim() })} /></div>
          <div><FieldLabel>Pixel Name</FieldLabel><input className="input" placeholder="Pixel Name" value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} /></div>
        </div>
        <p className="mt-1.5 text-[11px] text-slate-500">{hint[platform]}</p>
        <label className="mt-4 flex items-center gap-3 text-sm"><Toggle checked={f.all_pages} onChange={(v) => setF({ ...f, all_pages: v })} /><span>Pasang otomatis di semua halaman<span className="block text-xs text-slate-500">Semua checkout &amp; landing page kamu. Matikan kalau pixel ini hanya untuk produk tertentu.</span></span></label>
        {err && <p className="mt-2 text-xs text-rose-600">{err}</p>}
        <DialogActions onCancel={onClose} label="Add" cancel="Cancel" />
      </form>
    </Dialog>
  );
}

/** Meta Conversions API for one saved Facebook pixel: token (write-only), test code, connection test, last status. */
function CapiDialog({ px, onClose, onSaved }: { px: Px; onClose: () => void; onSaved: (b: Record<string, unknown>) => Promise<void> }) {
  const [on, setOn] = useState(px.server_side);
  const [token, setToken] = useState("");
  const [code, setCode] = useState(px.capi_test_code ?? "");
  const [busy, setBusy] = useState("");
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(px.capi_last_error ? { ok: false, text: `Terakhir: ${px.capi_last_error}` } : null);
  const save = async () => {
    setBusy("save"); setMsg(null);
    try {
      await onSaved({ server_side: on, capi_test_code: code.trim() || null, ...(token.trim() ? { capi_token: token.trim() } : {}) });
      onClose();
    } catch (x) { setMsg({ ok: false, text: x instanceof ApiError ? Object.values(x.errors ?? {})[0]?.[0] ?? x.message : "Gagal menyimpan" }); } finally { setBusy(""); }
  };
  const test = async () => {
    setBusy("test"); setMsg(null);
    try {
      if (token.trim()) await onSaved({ capi_token: token.trim() });
      const r = await api<{ mode: string }>(`/pixels/${px.id}/capi-test`, { method: "POST", json: { test_code: code.trim() || null } });
      setMsg({ ok: true, text: r.mode === "event" ? "Event tes terkirim. Cek di Events Manager → Test Events." : "Token valid dan bisa mengakses pixel ini." });
    } catch (x) { setMsg({ ok: false, text: x instanceof ApiError ? x.message : "Tes gagal" }); } finally { setBusy(""); }
  };
  return (
    <Dialog title={`Server Side: ${px.name || px.pixel_id}`} onClose={onClose}>
      <div className="space-y-4 text-sm">
        <p className="rounded-lg bg-sky-50 p-3 text-xs text-sky-800">Meta Conversions API mengirim event <b>Purchase</b> dari server Pesanin setiap ada pesanan, jadi tetap tercatat walau pembeli pakai ad-blocker atau iPhone. Event dari browser &amp; server memakai ID yang sama sehingga Meta menghitungnya sekali.</p>
        <label className="flex items-center gap-3"><Toggle checked={on} onChange={setOn} />Aktifkan Server Side</label>
        <div>
          <FieldLabel>Access Token Conversions API</FieldLabel>
          <input type="password" autoComplete="off" className="input font-mono" placeholder={px.has_capi_token ? "Tersimpan. Kosongkan jika tidak diubah" : "EAAB..."} value={token} onChange={(e) => setToken(e.target.value)} />
          <p className="mt-1 text-[11px] text-slate-500">Events Manager → pilih pixel → Settings → Conversions API → Generate access token. Disimpan terenkripsi dan tidak ditampilkan lagi.</p>
        </div>
        <div>
          <FieldLabel>Test Event Code (opsional)</FieldLabel>
          <input className="input font-mono" placeholder="TEST12345" value={code} onChange={(e) => setCode(e.target.value)} />
          <p className="mt-1 text-[11px] text-slate-500">Dari Events Manager → Test Events. Selama terisi, event server masuk ke Test Events saja (tidak dihitung di iklan). <b>Kosongkan setelah selesai tes.</b></p>
        </div>
        {px.capi_last_at && <p className="text-xs text-slate-500">Terakhir terhubung ke Meta: {new Date(px.capi_last_at).toLocaleString("id-ID")}</p>}
        {msg && <p className={`rounded-lg p-2.5 text-xs ${msg.ok ? "bg-emerald-50 text-emerald-700" : "bg-rose-50 text-rose-700"}`}>{msg.text}</p>}
        <div className="flex justify-between gap-2 pt-1">
          <button type="button" onClick={test} disabled={!!busy || (!px.has_capi_token && !token.trim())} className="h-10 rounded-lg border border-slate-200 px-4 font-semibold text-navy disabled:opacity-50">{busy === "test" ? "Mengetes…" : "Tes koneksi"}</button>
          <div className="flex gap-2">
            <button type="button" onClick={onClose} className="h-10 rounded-lg px-4 text-slate-600">Batal</button>
            <button type="button" onClick={save} disabled={!!busy || (on && !px.has_capi_token && !token.trim())} className="h-10 rounded-lg bg-brand-600 px-5 font-semibold text-white disabled:opacity-50">{busy === "save" ? "Menyimpan…" : "Simpan"}</button>
          </div>
        </div>
      </div>
    </Dialog>
  );
}
