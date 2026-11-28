"use client";
import { Bot, CheckCircle2, CreditCard, ExternalLink, Loader2, MapPinned, MessageCircle, ShoppingBag, TrendingUp, Truck, Unplug } from "lucide-react";
import { useEffect, useState } from "react";
import { PageHead, Panel } from "@/components/kit";
import { api, ApiError } from "@/lib/api";
import { askConfirm } from "@/components/Dialogs";
import { useAuth } from "@/lib/auth";
import Link from "next/link";
import { ShopeeMark } from "@/components/ChannelBadge";

type State = { connected: boolean; is_production?: boolean; verified_at?: string; last_error?: string | null; settings?: { cod_type?: string; delivery?: { enabled?: boolean; sandbox?: boolean; vehicle?: string } } | null; keys?: Record<string, string | null>; webhook_url?: string | null; verify_token?: string | null; details?: { display_phone?: string; verified_name?: string; quality?: string } | null; from_env?: boolean };
type All = { kiriminaja?: State; rajaongkir?: State; midtrans: State; shopee_affiliate: State; serpapi: State; whatsapp_cloud: State; gemini?: State };

/** Pengaturan → Integrasi: status KiriminAja (ongkir, wilayah, lacak resi) dan integrasi seller. */
export default function Integrations() {
  // Only the integrations of the store's track (both with the add-on).
  const { user } = useAuth();
  const showMp = !!user?.plan_addon || user?.plan_track !== "social";
  const showSocial = !!user?.plan_addon || user?.plan_track !== "marketplace";
  const [data, setData] = useState<All | null>(null);
  const load = () => api<All>("/integrations").then(setData);
  useEffect(() => { load(); }, []);
  // Links like /settings/integrations#whatsapp land on the card once the data has rendered.
  useEffect(() => { if (data && location.hash) document.getElementById(location.hash.slice(1))?.scrollIntoView({ block: "start" }); }, [!!data]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="max-w-4xl space-y-5">
      <PageHead title="Integrasi" tutorial={false} crumbs={[["Settings"], ["Integrasi"]]} />
      <p className="-mt-2 text-sm text-slate-500">{showSocial ? "Hubungkan WhatsApp Business milikmu. Ongkir, pesan kurir, dan pembayaran online sudah disediakan Pesanin, tidak perlu diatur." : "Toko Shopee terhubung lewat login resmi Shopee. Hubungkan akun riset milikmu kalau ingin riset tanpa batas."}</p>
      {!data ? <p className="flex items-center gap-2 text-sm text-slate-500"><Loader2 size={16} className="animate-spin" />Memuat…</p> : (
        <>
          {showMp && (
            <>
              <h2 className="text-sm font-bold uppercase tracking-wide text-slate-500">Marketplace</h2>
              <Panel className="flex flex-wrap items-center gap-3 p-5 text-sm">
                <ShopeeMark size={22} />
                <div className="flex-1"><b className="text-slate-800">Toko Shopee (Shopee Open Platform)</b><p className="text-slate-500">Pesanan, produk, stok, chat, iklan & saldo tersinkron otomatis tiap 30 detik.</p></div>
                <Link href="/marketplace/shops" className="h-9 rounded-lg bg-brand-600 px-4 py-2 text-xs font-semibold text-white">Kelola toko</Link>
              </Panel>
            </>
          )}
          {showSocial && <>
          <h2 className="text-sm font-bold uppercase tracking-wide text-slate-500">Pengiriman & pembayaran</h2>
          <Panel className="space-y-2 p-5 text-sm">
            {(() => {
              const ship = data.kiriminaja ?? data.rajaongkir;
              return (
                <>
                  <p className="flex items-center gap-2"><MapPinned size={16} className="text-slate-500" /><b className="text-slate-800">Ongkir &amp; kurir (KiriminAja)</b>
                    <span className={`rounded-md px-2 py-0.5 text-xs font-semibold ${ship?.connected ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-700"}`}>{ship?.connected ? "Aktif" : "Belum aktif"}</span></p>
                  <p className="text-slate-500">Ongkir asli di checkout, pencarian alamat sampai kelurahan, lacak resi{ship?.settings?.delivery?.enabled ? ", dan pesan kurir + resi otomatis" : ""}. Disediakan Pesanin.</p>
                </>
              );
            })()}
            <p className="flex items-center gap-2 pt-2"><CreditCard size={16} className="text-slate-500" /><b className="text-slate-800">Pembayaran online (Midtrans)</b>
              <span className={`rounded-md px-2 py-0.5 text-xs font-semibold ${data.midtrans.connected ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-700"}`}>{data.midtrans.connected ? "Aktif" : "Belum aktif"}</span></p>
            <p className="text-slate-500">QRIS, Virtual Account, dan e-wallet lewat akun Midtrans Pesanin. Dana pembeli tercatat di <a href="/settings/balance" className="font-semibold text-brand-700">Saldo</a>.</p>
          </Panel>
          </>}
          {showSocial && <>
          <div className="pt-3"><h2 className="text-sm font-bold uppercase tracking-wide text-slate-500">Chat</h2><p className="text-xs text-slate-500">Pesan pelanggan masuk ke menu Chat. Facebook & Instagram dihubungkan langsung dari menu Chat.</p></div>
          <WhatsAppCard state={data.whatsapp_cloud} />
          </>}
          <div className="pt-3"><h2 className="text-sm font-bold uppercase tracking-wide text-slate-500">AI &amp; Diagnosa Bisnis</h2><p className="text-xs text-slate-500">Hubungkan API Key Google Gemini untuk menganalisis produk rugi, produk terlaris, dan kebocoran dana bisnis secara otomatis.</p></div>
          <KeyCard provider="gemini" icon={Bot} title="Google Gemini AI" state={data.gemini ?? { connected: false }} onChange={load} link="https://aistudio.google.com/apikey"
            desc="Dipakai oleh fitur Diagnosa Bisnis AI untuk membaca data penjualan, HPP, iklan, dan stok master Anda."
            help="aistudio.google.com/apikey → Create API Key → tempel di sini. Key disimpan terenkripsi."
            fields={[["api_key", "Gemini API Key"]]} />
        </>
      )}
    </div>
  );
}

function Header({ icon: Icon, title, desc, state, link }: { icon: typeof Truck; title: string; desc: string; state: State; link: string }) {
  return (
    <div className="flex flex-wrap items-start gap-4">
      <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-brand-50 text-brand-600"><Icon size={22} /></span>
      <div className="min-w-0 flex-1">
        <h2 className="flex flex-wrap items-center gap-2 text-lg font-bold text-navy">{title}
          {state.connected
            ? <span className="flex items-center gap-1 rounded-md bg-emerald-50 px-2 py-0.5 text-xs font-semibold text-emerald-700"><CheckCircle2 size={13} />Terhubung · {state.is_production ? "Production" : "Sandbox/Test"}{state.from_env ? " (.env)" : ""}</span>
            : <span className="rounded-md bg-slate-100 px-2 py-0.5 text-xs font-semibold text-slate-500">Belum terhubung</span>}
        </h2>
        <p className="text-sm text-slate-500">{desc}</p>
      </div>
      <a href={link} target="_blank" rel="noreferrer" className="flex items-center gap-1 text-xs font-semibold text-brand-600">Buka dashboard<ExternalLink size={12} /></a>
    </div>
  );
}

function useSave(provider: string, onChange: () => void) {
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const save = async (json: Record<string, unknown>, clear?: () => void) => {
    setBusy(true); setMsg(null);
    try { await api(`/integrations/${provider}`, { method: "PUT", json }); clear?.(); setMsg({ ok: true, text: "Terhubung. Kunci sudah dites ke server dan disimpan terenkripsi." }); onChange(); }
    catch (e) { setMsg({ ok: false, text: e instanceof ApiError ? e.message : "Gagal menyimpan" }); }
    finally { setBusy(false); }
  };
  const disconnect = async () => {
    if (!(await askConfirm("Putuskan integrasi ini? Checkout akan kembali memakai pengaturan bawaan."))) return;
    await api(`/integrations/${provider}`, { method: "DELETE" }); setMsg(null); onChange();
  };
  return { busy, msg, save, disconnect };
}

function Msg({ msg }: { msg: { ok: boolean; text: string } | null }) {
  return msg ? <p className={`rounded-lg p-2.5 text-sm ${msg.ok ? "bg-emerald-50 text-emerald-700" : "bg-rose-50 text-rose-700"}`}>{msg.text}</p> : null;
}

/** WhatsApp lives on its own step-by-step page (Pengaturan → WhatsApp); here only the status and a link. */
function WhatsAppCard({ state }: { state: State }) {
  const d = state.details;
  return (
    <div id="whatsapp" className="scroll-mt-24"><Panel className="flex flex-wrap items-center gap-4 p-5">
      <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#25d366]/10 text-[#25d366]"><MessageCircle size={22} /></span>
      <div className="min-w-0 flex-1">
        <h2 className="flex flex-wrap items-center gap-2 text-lg font-bold text-navy">WhatsApp Business
          {state.connected
            ? <span className="flex items-center gap-1 rounded-md bg-emerald-50 px-2 py-0.5 text-xs font-semibold text-emerald-700"><CheckCircle2 size={13} />Terhubung{d?.display_phone ? ` · ${d.display_phone}` : ""}</span>
            : <span className="rounded-md bg-slate-100 px-2 py-0.5 text-xs font-semibold text-slate-500">Belum terhubung</span>}
        </h2>
        <p className="text-sm text-slate-500">Chat, broadcast, konfirmasi COD dan follow up lewat API resmi Meta.</p>
      </div>
      <Link href="/settings/whatsapp" className="h-9 rounded-lg bg-brand-600 px-4 py-2 text-xs font-semibold text-white">{state.connected ? "Kelola" : "Hubungkan"}</Link>
    </Panel></div>
  );
}

/** Simple "paste keys → test → save" card used by the research providers. */
function KeyCard({ provider, icon, title, desc, help, link, fields, state, onChange }: {
  provider: string; icon: typeof Truck; title: string; desc: string; help: string; link: string; fields: [string, string][]; state: State; onChange: () => void;
}) {
  const [vals, setVals] = useState<Record<string, string>>({});
  const { busy, msg, save, disconnect } = useSave(provider, onChange);
  const filled = fields.every(([k]) => vals[k]);
  return (
    <Panel className="space-y-4 p-5">
      <Header icon={icon} title={title} state={state} link={link} desc={desc} />
      <div className={`grid gap-3 ${fields.length > 1 ? "sm:grid-cols-2" : ""}`}>
        {fields.map(([k, label]) => (
          <label key={k} className="block text-sm"><span className="mb-1 block font-medium text-slate-700">{label}</span>
            <input className="input h-10 font-mono" placeholder={state.keys?.[k] ?? label} value={vals[k] ?? ""} onChange={(e) => setVals({ ...vals, [k]: e.target.value })} autoComplete="off" />
          </label>
        ))}
      </div>
      <p className="text-xs text-slate-400">{help}</p>
      <Msg msg={msg} />
      <div className="flex justify-end gap-2">
        {state.connected && <button onClick={disconnect} className="flex h-10 items-center gap-1.5 rounded-lg bg-slate-100 px-4 text-sm font-semibold text-slate-600"><Unplug size={15} />Putuskan</button>}
        <button disabled={busy || (!state.connected && !filled)} onClick={() => save(Object.fromEntries(fields.map(([k]) => [k, vals[k] || undefined])), () => setVals({}))} className="flex h-10 items-center gap-2 rounded-lg bg-brand-600 px-5 text-sm font-semibold text-white disabled:opacity-50">
          {busy && <Loader2 size={15} className="animate-spin" />}{state.connected ? "Simpan & tes ulang" : "Hubungkan"}
        </button>
      </div>
    </Panel>
  );
}
