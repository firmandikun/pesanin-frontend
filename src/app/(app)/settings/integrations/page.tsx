"use client";
import { CheckCircle2, Copy, CreditCard, ExternalLink, Loader2, MapPinned, MessageCircle, ShoppingBag, TrendingUp, Truck, Unplug } from "lucide-react";
import { useEffect, useState } from "react";
import { PageHead, Panel } from "@/components/kit";
import { Select } from "@/components/Select";
import { api, ApiError } from "@/lib/api";
import { askConfirm } from "@/components/Dialogs";

type State = { connected: boolean; is_production?: boolean; verified_at?: string; last_error?: string | null; settings?: { cod_type?: string } | null; keys?: Record<string, string | null>; webhook_url?: string | null; verify_token?: string | null; details?: { display_phone?: string; verified_name?: string; quality?: string } | null };
type All = { rajaongkir: State; biteship: State; midtrans: State; shopee_affiliate: State; serpapi: State; whatsapp_cloud: State };

/** Pengaturan → Integrasi: the seller connects their own Biteship (couriers, COD) and Midtrans (online payment) accounts. */
export default function Integrations() {
  const [data, setData] = useState<All | null>(null);
  const load = () => api<All>("/integrations").then(setData);
  useEffect(() => { load(); }, []);
  // Links like /settings/integrations#whatsapp land on the card once the data has rendered.
  useEffect(() => { if (data && location.hash) document.getElementById(location.hash.slice(1))?.scrollIntoView({ block: "start" }); }, [!!data]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="max-w-4xl space-y-5">
      <PageHead title="Integrasi" tutorial={false} crumbs={[["Settings"], ["Integrasi"]]} />
      <p className="-mt-2 text-sm text-slate-500">Hubungkan akun milikmu sendiri. Ongkir, saldo, dan uang pembeli langsung masuk ke akunmu; Pesanin tidak memegang dana.</p>
      {!data ? <p className="flex items-center gap-2 text-sm text-slate-500"><Loader2 size={16} className="animate-spin" />Memuat…</p> : (
        <>
          <h2 className="text-sm font-bold uppercase tracking-wide text-slate-500">Pengiriman & pembayaran</h2>
          <RajaOngkir state={data.rajaongkir} onChange={load} />
          <Biteship state={data.biteship} onChange={load} />
          <Midtrans state={data.midtrans} onChange={load} />
          <div className="pt-3"><h2 className="text-sm font-bold uppercase tracking-wide text-slate-500">Riset Pasar (opsional)</h2><p className="text-xs text-slate-500">Riset Pasar sudah bisa dipakai tanpa daftar apa pun (kuota harian sesuai paket). Hubungkan akun sendiri kalau ingin tanpa batas.</p></div>
          <KeyCard provider="shopee_affiliate" icon={ShoppingBag} title="Shopee Affiliate" state={data.shopee_affiliate} onChange={load} link="https://affiliate.shopee.co.id"
            desc="Data produk Shopee untuk Riset Pasar: produk terlaris per kata kunci, harga, terjual, rating, toko."
            help="affiliate.shopee.co.id → Open API (setelah akun affiliate disetujui) → AppId & Secret."
            fields={[["app_id", "AppId"], ["secret", "Secret"]]} />
          <KeyCard provider="serpapi" icon={TrendingUp} title="SerpApi (Google Trends)" state={data.serpapi} onChange={load} link="https://serpapi.com/manage-api-key"
            desc="Minat pencarian Google per kata kunci, kata kunci yang sedang naik, dan minat per provinsi."
            help="serpapi.com → Dashboard → API Key. Paket gratis punya kuota pencarian per bulan; hasil disimpan 12 jam agar hemat."
            fields={[["api_key", "API key"]]} />
          <div className="pt-3"><h2 className="text-sm font-bold uppercase tracking-wide text-slate-500">Chat</h2><p className="text-xs text-slate-500">Pesan pelanggan masuk ke menu Chat. Facebook & Instagram dihubungkan langsung dari menu Chat.</p></div>
          <WhatsAppCard state={data.whatsapp_cloud} onChange={load} />
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
            ? <span className="flex items-center gap-1 rounded-md bg-emerald-50 px-2 py-0.5 text-xs font-semibold text-emerald-700"><CheckCircle2 size={13} />Terhubung · {state.is_production ? "Production" : "Sandbox/Test"}</span>
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

type WaNumber = { id: string; waba_id: string; display_phone: string | null; verified_name: string | null; quality: string | null };

/**
 * WhatsApp Business Cloud API. Normal path: "Masuk dengan Facebook" (login grants access, we pick the number).
 * Manual token + webhook details stay available under "lanjutan".
 */
function WhatsAppCard({ state, onChange }: { state: State; onChange: () => void }) {
  const [vals, setVals] = useState<Record<string, string>>({});
  const [copied, setCopied] = useState("");
  const [loggingIn, setLoggingIn] = useState(false);
  const [numbers, setNumbers] = useState<WaNumber[] | null>(null);
  const [pick, setPick] = useState("");
  const [notice, setNotice] = useState<{ ok: boolean; text: string } | null>(null);
  const { busy, msg, save, disconnect } = useSave("whatsapp_cloud", onChange);
  const copy = (k: string, v: string) => { navigator.clipboard.writeText(v); setCopied(k); setTimeout(() => setCopied(""), 1500); };
  const field = (k: string, label: string, ph: string) => (
    <label className="block text-sm"><span className="mb-1 block font-medium text-slate-700">{label}</span>
      <input className="input h-10 font-mono" placeholder={state.keys?.[k] ?? ph} value={vals[k] ?? ""} onChange={(e) => setVals({ ...vals, [k]: e.target.value })} autoComplete="off" /></label>
  );

  // Back from the Facebook login: ?wa=connected | pick, or ?wa_error=…
  useEffect(() => {
    const q = new URLSearchParams(location.search);
    if (q.get("wa") === "connected") setNotice({ ok: true, text: "WhatsApp terhubung lewat login Facebook." });
    if (q.get("wa_error")) setNotice({ ok: false, text: q.get("wa_error")! });
    if (q.get("wa") === "pick") api<{ numbers: WaNumber[] }>("/whatsapp/connect/pending").then((r) => { setNumbers(r.numbers); setPick(r.numbers[0]?.id ?? ""); });
    if (q.get("wa") || q.get("wa_error")) history.replaceState(null, "", location.pathname + "#whatsapp");
  }, []);

  const login = async () => {
    setLoggingIn(true); setNotice(null);
    try { const { url } = await api<{ url: string }>("/whatsapp/connect", { method: "POST" }); location.href = url; }
    catch (e) { setNotice({ ok: false, text: e instanceof ApiError ? e.message : "Gagal memulai login" }); setLoggingIn(false); }
  };
  const choose = async () => {
    setLoggingIn(true);
    try { const r = await api<{ phone: string }>("/whatsapp/connect/select", { method: "POST", json: { phone_number_id: pick } }); setNumbers(null); setNotice({ ok: true, text: `WhatsApp ${r.phone ?? ""} terhubung.` }); onChange(); }
    catch (e) { setNotice({ ok: false, text: e instanceof ApiError ? e.message : "Gagal menghubungkan nomor" }); }
    finally { setLoggingIn(false); }
  };
  const d = state.details as (State["details"] & { connected_via?: string; token_expires_at?: string | null }) | null | undefined;

  return (
    <div id="whatsapp" className="scroll-mt-24"><Panel className="space-y-4 p-5">
      <Header icon={MessageCircle} title="WhatsApp Business (Cloud API)" state={state} link="https://business.facebook.com/wa/manage/home/"
        desc="Chat WhatsApp pelanggan masuk ke menu Chat Pesanin, bisa dibalas dan dipakai untuk Broadcast. Memakai API resmi Meta, jadi nomor aman dari blokir." />
      {state.connected && d?.display_phone && (
        <p className="rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-800">Nomor <b>{d.display_phone}</b>{d.verified_name && <> · {d.verified_name}</>}{d.quality && <> · kualitas {d.quality}</>}
          {d.connected_via === "login" && <span className="block text-xs text-emerald-700">Terhubung lewat login Facebook{d.token_expires_at ? ` · login berlaku sampai ${new Date(d.token_expires_at).toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" })}` : " · tanpa batas waktu"}</span>}</p>
      )}
      {notice && <Msg msg={notice} />}

      {numbers ? (
        <div className="space-y-2 rounded-xl bg-slate-50 p-4">
          <p className="text-sm font-semibold text-slate-700">Pilih nomor WhatsApp yang dipakai di Pesanin</p>
          {numbers.map((n) => (
            <label key={n.id} className="flex cursor-pointer items-center gap-3 rounded-lg bg-white p-3 text-sm ring-1 ring-slate-200">
              <input type="radio" name="wa-number" checked={pick === n.id} onChange={() => setPick(n.id)} />
              <span className="flex-1"><b className="block text-slate-800">{n.display_phone ?? n.id}</b><span className="text-xs text-slate-500">{n.verified_name ?? "–"}{n.quality && ` · kualitas ${n.quality}`}</span></span>
            </label>
          ))}
          <div className="flex justify-end"><button onClick={choose} disabled={!pick || loggingIn} className="flex h-10 items-center gap-2 rounded-lg bg-[#25d366] px-5 text-sm font-semibold text-white disabled:opacity-50">{loggingIn && <Loader2 size={15} className="animate-spin" />}Pakai nomor ini</button></div>
        </div>
      ) : (
        <div className="flex flex-wrap items-center gap-3 rounded-xl bg-slate-50 p-4">
          <div className="min-w-0 flex-1 text-sm text-slate-600"><b className="block text-slate-800">{state.connected ? "Ganti atau perbarui login" : "Hubungkan dengan login Facebook"}</b>
            Masuk dengan akun Facebook yang mengelola WhatsApp Business-mu, pilih akun bisnis dan nomornya, selesai. Tidak perlu menyalin token.</div>
          <button onClick={login} disabled={loggingIn} className="flex h-10 items-center gap-2 rounded-lg bg-[#1877f2] px-5 text-sm font-semibold text-white disabled:opacity-60">
            {loggingIn ? <Loader2 size={15} className="animate-spin" /> : <span className="text-base font-black">f</span>}Masuk dengan Facebook</button>
        </div>
      )}

      <details className="group rounded-xl ring-1 ring-slate-100">
        <summary className="cursor-pointer select-none px-4 py-3 text-sm font-medium text-slate-600">Lanjutan: pakai token manual & info webhook</summary>
        <div className="space-y-4 border-t border-slate-100 p-4">
          <div className="grid gap-3 sm:grid-cols-2">
            {field("phone_number_id", "Phone Number ID", "mis. 123456789012345")}
            {field("access_token", "Access token", "EAAG…")}
            {field("app_secret", "App Secret (opsional)", "untuk memverifikasi webhook")}
            {field("waba_id", "WhatsApp Business Account ID (opsional)", "terdeteksi otomatis")}
          </div>
          <p className="text-xs text-slate-400">Meta for Developers → app → WhatsApp → API Setup: salin Phone Number ID dan token. Pakai token permanen dari System User (token sementara hanya 24 jam).</p>
          {state.connected && state.webhook_url && (
            <div className="space-y-2 rounded-xl bg-slate-50 p-3 text-sm">
              <p className="font-medium text-slate-700">Webhook <span className="font-normal text-slate-500">(Meta → WhatsApp → Konfigurasi → Webhook: tempel keduanya, lalu langganan field <b>messages</b>)</span></p>
              {([["url", "Callback URL", state.webhook_url], ["token", "Verify token", state.verify_token ?? ""]] as const).map(([k, l, v]) => (
                <div key={k} className="flex items-center gap-2"><span className="w-28 shrink-0 text-xs text-slate-500">{l}</span>
                  <code className="min-w-0 flex-1 truncate rounded-lg bg-white px-3 py-2 text-xs text-slate-600">{v}</code>
                  <button onClick={() => copy(k, v)} className="flex items-center gap-1 rounded-lg bg-white px-3 py-2 text-xs font-semibold text-slate-700">{copied === k ? <CheckCircle2 size={14} /> : <Copy size={14} />}{copied === k ? "Disalin" : "Salin"}</button></div>
              ))}
              {state.webhook_url.startsWith("http://") && <p className="text-xs text-amber-700">Meta hanya menerima webhook HTTPS publik. Saat masih di localhost, isi WHATSAPP_WEBHOOK_BASE di backend/.env dengan alamat tunnel (mis. cloudflared), atau tunggu domain.</p>}
            </div>
          )}
          <div className="flex justify-end">
            <button disabled={busy || (!state.connected && !(vals.phone_number_id && vals.access_token))} onClick={() => save({ phone_number_id: vals.phone_number_id || undefined, access_token: vals.access_token || undefined, app_secret: vals.app_secret || undefined, waba_id: vals.waba_id || undefined }, () => setVals({}))} className="flex h-10 items-center gap-2 rounded-lg bg-slate-800 px-5 text-sm font-semibold text-white disabled:opacity-50">
              {busy && <Loader2 size={15} className="animate-spin" />}{state.connected ? "Simpan token & tes ulang" : "Hubungkan dengan token"}
            </button>
          </div>
        </div>
      </details>
      {state.last_error && <p className="text-xs text-amber-700">Terakhir: {state.last_error}</p>}
      <Msg msg={msg} />
      {state.connected && <div className="flex justify-end"><button onClick={disconnect} className="flex h-10 items-center gap-1.5 rounded-lg bg-slate-100 px-4 text-sm font-semibold text-slate-600"><Unplug size={15} />Putuskan</button></div>}
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

function RajaOngkir({ state, onChange }: { state: State; onChange: () => void }) {
  const [key, setKey] = useState("");
  const { busy, msg, save, disconnect } = useSave("rajaongkir", onChange);
  return (
    <Panel className="space-y-4 p-5">
      <Header icon={MapPinned} title="RajaOngkir (Komerce)" state={state} link="https://collaborator.komerce.id/dashboard"
        desc="Ongkir asli 10 ekspedisi di checkout, pencarian alamat sampai kelurahan + kode pos, dan lacak resi. Dipakai lebih dulu daripada Biteship." />
      <label className="block text-sm"><span className="mb-1 block font-medium text-slate-700">API key</span>
        <input className="input h-10 font-mono" placeholder={state.keys?.api_key ?? "API key Shipping Cost dari Komerce"} value={key} onChange={(e) => setKey(e.target.value)} autoComplete="off" />
        <span className="mt-1 block text-xs text-slate-400">collaborator.komerce.id → Developer → API Key (Shipping Cost). Paket Starter punya kuota harian; Pesanin menyimpan hasil ongkir & alamat agar hemat kuota.</span>
      </label>
      {state.last_error && <p className="text-xs text-amber-700">Terakhir: {state.last_error}</p>}
      <Msg msg={msg} />
      <div className="flex justify-end gap-2">
        {state.connected && <button onClick={disconnect} className="flex h-10 items-center gap-1.5 rounded-lg bg-slate-100 px-4 text-sm font-semibold text-slate-600"><Unplug size={15} />Putuskan</button>}
        <button disabled={busy || (!key && !state.connected)} onClick={() => save({ api_key: key || undefined }, () => setKey(""))} className="flex h-10 items-center gap-2 rounded-lg bg-brand-600 px-5 text-sm font-semibold text-white disabled:opacity-50">
          {busy && <Loader2 size={15} className="animate-spin" />}{state.connected ? "Simpan & tes ulang" : "Hubungkan"}
        </button>
      </div>
    </Panel>
  );
}

function Biteship({ state, onChange }: { state: State; onChange: () => void }) {
  const [key, setKey] = useState("");
  const [cod, setCod] = useState(state.settings?.cod_type ?? "7_days");
  const [copied, setCopied] = useState(false);
  const { busy, msg, save, disconnect } = useSave("biteship", onChange);
  return (
    <Panel className="space-y-4 p-5">
      <Header icon={Truck} title="Biteship" state={state} link="https://dashboard.biteship.com"
        desc="Kirim pesanan + resi otomatis dan COD. Ongkir dari Biteship dipakai bila RajaOngkir tidak terhubung." />
      <div className="grid gap-3 sm:grid-cols-[1fr_200px]">
        <label className="block text-sm"><span className="mb-1 block font-medium text-slate-700">API key</span>
          <input className="input h-10 font-mono" placeholder={state.keys?.api_key ?? "biteship_test.xxxx atau biteship_live.xxxx"} value={key} onChange={(e) => setKey(e.target.value)} autoComplete="off" />
          <span className="mt-1 block text-xs text-slate-400">Dashboard Biteship → Integrasi → API Keys. Key berawalan biteship_test = mode Testing.</span>
        </label>
        <label className="block text-sm"><span className="mb-1 block font-medium text-slate-700">Pencairan COD</span>
          <Select className="input h-10" value={cod} onChange={(e) => setCod(e.target.value)}>
            <option value="7_days">7 hari</option><option value="5_days">5 hari</option><option value="3_days">3 hari</option>
          </Select>
          <span className="mt-1 block text-xs text-slate-400">Lebih cepat = biaya COD lebih tinggi.</span>
        </label>
      </div>
      {state.connected && state.webhook_url && (
        <div className="rounded-xl bg-slate-50 p-3 text-sm">
          <p className="font-medium text-slate-700">Webhook URL <span className="font-normal text-slate-500">(tempel di Dashboard Biteship → Integrasi → Webhook, untuk status kirim otomatis)</span></p>
          <div className="mt-2 flex gap-2">
            <code className="min-w-0 flex-1 truncate rounded-lg bg-white px-3 py-2 text-xs text-slate-600">{state.webhook_url}</code>
            <button onClick={() => { navigator.clipboard.writeText(state.webhook_url!); setCopied(true); setTimeout(() => setCopied(false), 1500); }} className="flex items-center gap-1 rounded-lg bg-white px-3 text-xs font-semibold text-slate-700">{copied ? <CheckCircle2 size={14} /> : <Copy size={14} />}{copied ? "Disalin" : "Salin"}</button>
          </div>
        </div>
      )}
      {state.last_error && <p className="text-xs text-amber-700">Terakhir: {state.last_error}</p>}
      <Msg msg={msg} />
      <div className="flex justify-end gap-2">
        {state.connected && <button onClick={disconnect} className="flex h-10 items-center gap-1.5 rounded-lg bg-slate-100 px-4 text-sm font-semibold text-slate-600"><Unplug size={15} />Putuskan</button>}
        <button disabled={busy || (!key && !state.connected)} onClick={() => save({ api_key: key || undefined, cod_type: cod }, () => setKey(""))} className="flex h-10 items-center gap-2 rounded-lg bg-brand-600 px-5 text-sm font-semibold text-white disabled:opacity-50">
          {busy && <Loader2 size={15} className="animate-spin" />}{state.connected ? "Simpan & tes ulang" : "Hubungkan"}
        </button>
      </div>
    </Panel>
  );
}

function Midtrans({ state, onChange }: { state: State; onChange: () => void }) {
  const [server, setServer] = useState("");
  const [client, setClient] = useState("");
  const [prod, setProd] = useState(!!state.is_production);
  const { busy, msg, save, disconnect } = useSave("midtrans", onChange);
  return (
    <Panel className="space-y-4 p-5">
      <Header icon={CreditCard} title="Midtrans" state={state} link={prod ? "https://dashboard.midtrans.com" : "https://dashboard.sandbox.midtrans.com"}
        desc="Metode E-Payment di checkout: QRIS, GoPay, ShopeePay, Virtual Account. Pesanan otomatis jadi Lunas saat dibayar." />
      <div className="flex gap-2">
        {[false, true].map((v) => (
          <button key={String(v)} onClick={() => setProd(v)} className={`h-9 rounded-lg px-3.5 text-sm font-semibold ${prod === v ? "bg-navy text-white" : "bg-slate-100 text-slate-600"}`}>{v ? "Production" : "Sandbox"}</button>
        ))}
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="block text-sm"><span className="mb-1 block font-medium text-slate-700">Server key</span>
          <input className="input h-10 font-mono" placeholder={state.keys?.server_key ?? (prod ? "Mid-server-…" : "SB-Mid-server-…")} value={server} onChange={(e) => setServer(e.target.value)} autoComplete="off" />
        </label>
        <label className="block text-sm"><span className="mb-1 block font-medium text-slate-700">Client key <span className="font-normal text-slate-400">(opsional)</span></span>
          <input className="input h-10 font-mono" placeholder={state.keys?.client_key ?? (prod ? "Mid-client-…" : "SB-Mid-client-…")} value={client} onChange={(e) => setClient(e.target.value)} autoComplete="off" />
        </label>
      </div>
      <p className="text-xs text-slate-400">Dashboard Midtrans → Settings → Access Keys. Notifikasi pembayaran diatur otomatis oleh Pesanin, tidak perlu mengisi Notification URL.</p>
      <Msg msg={msg} />
      <div className="flex justify-end gap-2">
        {state.connected && <button onClick={disconnect} className="flex h-10 items-center gap-1.5 rounded-lg bg-slate-100 px-4 text-sm font-semibold text-slate-600"><Unplug size={15} />Putuskan</button>}
        <button disabled={busy || (!state.connected && !server)} onClick={() => save({ server_key: server || undefined, client_key: client || undefined, is_production: prod }, () => { setServer(""); setClient(""); })} className="flex h-10 items-center gap-2 rounded-lg bg-brand-600 px-5 text-sm font-semibold text-white disabled:opacity-50">
          {busy && <Loader2 size={15} className="animate-spin" />}{state.connected ? "Simpan & tes ulang" : "Hubungkan"}
        </button>
      </div>
    </Panel>
  );
}
