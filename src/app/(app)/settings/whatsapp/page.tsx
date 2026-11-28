"use client";
import { AlertTriangle, CheckCircle2, ChevronRight, Copy, ExternalLink, Loader2, MessageCircle, RefreshCcw, Send, Unplug } from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { askConfirm } from "@/components/Dialogs";
import { PageHead, Panel } from "@/components/kit";
import { api, ApiError } from "@/lib/api";

type Status = {
  connected: boolean; phone: string | null; verified_name: string | null; quality: string | null; connected_via: "login" | "token" | null;
  token_expires_at: string | null; last_error: string | null; last_inbound_at: string | null; pending_numbers: number;
};
type WaNumber = { id: string; waba_id: string; display_phone: string | null; verified_name: string | null; quality: string | null };
type Integration = { connected: boolean; keys?: Record<string, string | null>; webhook_url?: string | null; verify_token?: string | null };
type Note = { ok: boolean; text: string } | null;

const QUALITY: Record<string, [string, string]> = { GREEN: ["Kualitas baik", "text-emerald-700"], YELLOW: ["Kualitas sedang", "text-amber-700"], RED: ["Kualitas rendah", "text-rose-700"] };
const daysLeft = (iso: string | null) => (iso ? Math.ceil((new Date(iso).getTime() - Date.now()) / 86400000) : null);

/**
 * Pengaturan → WhatsApp: connect a WhatsApp Business number step by step — what to prepare, sign in with Facebook,
 * pick the number, prove it works (test message out, a customer chat in), then where to use it.
 */
export default function WhatsAppSetup() {
  const [s, setS] = useState<Status | null>(null);
  const [numbers, setNumbers] = useState<WaNumber[] | null>(null);
  const [pick, setPick] = useState("");
  const [busy, setBusy] = useState("");
  const [note, setNote] = useState<Note>(null);
  const [testTo, setTestTo] = useState("");
  const [testNote, setTestNote] = useState<Note>(null);

  const load = useCallback(() => api<Status>("/whatsapp/status").then(setS).catch(() => setS({ connected: false } as Status)), []);

  // Back from the Facebook login: ?wa=connected | pick, or ?wa_error=…
  useEffect(() => {
    const q = new URLSearchParams(location.search);
    if (q.get("wa") === "connected") setNote({ ok: true, text: "WhatsApp terhubung. Lanjutkan dengan tes di langkah 3." });
    if (q.get("wa_error")) setNote({ ok: false, text: q.get("wa_error")! });
    if (q.get("wa") === "pick") api<{ numbers: WaNumber[] }>("/whatsapp/connect/pending").then((r) => { setNumbers(r.numbers); setPick(r.numbers[0]?.id ?? ""); });
    if (q.toString()) history.replaceState(null, "", location.pathname);
    load();
  }, [load]);

  // Waiting for the first customer chat (proof that incoming messages reach Pesanin): check every 5 seconds.
  useEffect(() => {
    if (!s?.connected || s.last_inbound_at) return;
    const t = setInterval(load, 5000);
    return () => clearInterval(t);
  }, [s?.connected, s?.last_inbound_at, load]);

  const login = async () => {
    setBusy("login"); setNote(null);
    try { const { url } = await api<{ url: string }>("/whatsapp/connect", { method: "POST" }); location.href = url; }
    catch (e) { setNote({ ok: false, text: e instanceof ApiError ? e.message : "Gagal memulai login" }); setBusy(""); }
  };
  const choose = async () => {
    setBusy("pick");
    try { const r = await api<{ phone: string }>("/whatsapp/connect/select", { method: "POST", json: { phone_number_id: pick } }); setNumbers(null); setNote({ ok: true, text: `WhatsApp ${r.phone ?? ""} terhubung. Lanjutkan dengan tes di langkah 3.` }); load(); }
    catch (e) { setNote({ ok: false, text: e instanceof ApiError ? e.message : "Gagal menghubungkan nomor" }); }
    finally { setBusy(""); }
  };
  const sendTest = async () => {
    setBusy("test"); setTestNote(null);
    try { await api("/whatsapp/test", { method: "POST", json: { to: testTo } }); setTestNote({ ok: true, text: "Pesan tes terkirim. Cek WhatsApp di nomor tujuan (pesan \"Hello World\" dari Meta)." }); }
    catch (e) { setTestNote({ ok: false, text: e instanceof ApiError ? e.message : "Pesan tes gagal" }); }
    finally { setBusy(""); }
  };
  const disconnect = async () => {
    if (!(await askConfirm("Putuskan WhatsApp? Chat, broadcast, konfirmasi COD dan pengiriman produk digital lewat WhatsApp akan berhenti."))) return;
    await api("/integrations/whatsapp_cloud", { method: "DELETE" }); setNote(null); load();
  };

  const connected = !!s?.connected;
  const exp = daysLeft(s?.token_expires_at ?? null);
  const step = !connected ? (numbers ? 2 : 1) : 3;

  return (
    <div className="max-w-3xl space-y-5">
      <PageHead title="WhatsApp Business" tutorial={false} crumbs={[["Pengaturan"], ["WhatsApp"]]} />
      <p className="-mt-2 text-sm text-slate-500">Satu nomor WhatsApp Business untuk Chat, Broadcast, konfirmasi COD, follow up dan pengiriman produk digital. Memakai API resmi Meta, jadi nomor aman dari blokir.</p>
      {note && <p className={`rounded-lg p-3 text-sm ${note.ok ? "bg-emerald-50 text-emerald-800" : "bg-rose-50 text-rose-700"}`}>{note.text}</p>}

      {!s ? <p className="flex items-center gap-2 text-sm text-slate-500"><Loader2 size={16} className="animate-spin" />Memuat…</p> : (
        <>
          {connected && (
            <Panel className="flex flex-wrap items-center gap-4 p-5">
              <span className="flex h-12 w-12 items-center justify-center rounded-full bg-[#25d366]/10 text-[#25d366]"><MessageCircle size={24} /></span>
              <div className="min-w-0 flex-1">
                <p className="flex flex-wrap items-center gap-2 text-lg font-bold text-navy">{s.phone ?? "Nomor terhubung"}<span className="flex items-center gap-1 rounded-md bg-emerald-50 px-2 py-0.5 text-xs font-semibold text-emerald-700"><CheckCircle2 size={13} />Terhubung</span></p>
                <p className="text-sm text-slate-500">{[s.verified_name, s.quality && QUALITY[s.quality]?.[0], s.connected_via === "login" ? "lewat login Facebook" : "lewat token manual"].filter(Boolean).join(" · ")}</p>
                {exp !== null && exp <= 14 && <p className="mt-1 flex items-center gap-1 text-xs font-semibold text-amber-700"><AlertTriangle size={13} />Login berakhir {exp <= 0 ? "hari ini" : `${exp} hari lagi`}. Klik &quot;Login ulang&quot; agar WhatsApp tidak terputus.</p>}
                {s.last_error && <p className="mt-1 text-xs text-amber-700">Terakhir: {s.last_error}</p>}
              </div>
              <div className="flex gap-2">
                <button onClick={login} disabled={!!busy} className="flex h-9 items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 text-sm font-semibold text-navy hover:bg-slate-50 disabled:opacity-50">{busy === "login" ? <Loader2 size={14} className="animate-spin" /> : <RefreshCcw size={14} />}Login ulang / ganti nomor</button>
                <button onClick={disconnect} className="flex h-9 items-center gap-1.5 rounded-lg bg-slate-100 px-3 text-sm font-semibold text-slate-600"><Unplug size={14} />Putuskan</button>
              </div>
            </Panel>
          )}

          {!connected && (
            <Panel className="p-5">
              <p className="mb-3 font-bold text-navy">Sebelum mulai, siapkan:</p>
              <ul className="space-y-2.5 text-sm text-slate-700">
                <li className="flex gap-2.5"><span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-brand-50 text-xs font-bold text-brand-600">1</span><span><b>Akun Facebook</b> pemilik toko. Akun Meta Business dan akun WhatsApp Business bisa langsung dibuat di jendela login kalau belum ada.</span></li>
                <li className="flex gap-2.5"><span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-brand-50 text-xs font-bold text-brand-600">2</span><span><b>Nomor HP untuk WhatsApp Business</b> yang bisa menerima SMS atau telepon (untuk kode verifikasi). Sebaiknya <b>nomor khusus toko yang belum dipakai di aplikasi WhatsApp</b>. Kalau nomornya masih aktif di aplikasi WhatsApp, hapus dulu akun WhatsApp di nomor itu (Setelan → Akun → Hapus akun).</span></li>
                <li className="flex gap-2.5"><span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-brand-50 text-xs font-bold text-brand-600">3</span><span><b>Nama tampilan bisnis</b> (mis. nama toko). Meta meninjau nama ini; pakai nama yang sama dengan toko/brand-mu.</span></li>
              </ul>
              <p className="mt-3 rounded-lg bg-slate-50 p-3 text-xs text-slate-500">Biaya: membalas chat pelanggan dalam 24 jam gratis. Pesan template (konfirmasi COD, broadcast, follow up) ditagih langsung oleh Meta ke kartu yang kamu daftarkan di Meta Business, bukan oleh Pesanin.</p>
            </Panel>
          )}

          {/* 1 · Login */}
          <Step n={1} title="Masuk dengan Facebook" done={connected || !!numbers} active={step === 1}>
            {!connected && !numbers && (
              <>
                <p className="text-sm text-slate-600">Jendela Meta akan memandu:</p>
                <ol className="list-decimal space-y-1 pl-5 text-sm text-slate-600">
                  <li>Pilih atau buat <b>portofolio bisnis</b> (Meta Business).</li>
                  <li>Pilih atau buat <b>akun WhatsApp Business</b>, isi nama tampilan & kategori.</li>
                  <li>Masukkan <b>nomor HP</b>, lalu kode verifikasi dari SMS/telepon.</li>
                  <li>Klik <b>Lanjutkan / Izinkan</b> sampai kembali ke Pesanin. Jangan tutup jendela di tengah jalan.</li>
                </ol>
                <button onClick={login} disabled={!!busy} className="flex h-11 items-center gap-2 rounded-lg bg-[#1877f2] px-6 text-sm font-semibold text-white disabled:opacity-60">
                  {busy === "login" ? <Loader2 size={15} className="animate-spin" /> : <span className="text-base font-black">f</span>}Masuk dengan Facebook</button>
              </>
            )}
          </Step>

          {/* 2 · Pick the number */}
          <Step n={2} title="Pilih nomor" done={connected} active={step === 2}>
            {numbers && (
              <div className="space-y-2">
                <p className="text-sm text-slate-600">Akunmu punya beberapa nomor. Pilih yang dipakai untuk toko ini:</p>
                {numbers.map((n) => (
                  <label key={n.id} className="flex cursor-pointer items-center gap-3 rounded-lg bg-white p-3 text-sm ring-1 ring-slate-200">
                    <input type="radio" name="wa-number" checked={pick === n.id} onChange={() => setPick(n.id)} />
                    <span className="flex-1"><b className="block text-slate-800">{n.display_phone ?? n.id}</b><span className="text-xs text-slate-500">{n.verified_name ?? "–"}{n.quality && ` · ${QUALITY[n.quality]?.[0] ?? n.quality}`}</span></span>
                  </label>
                ))}
                <button onClick={choose} disabled={!pick || !!busy} className="flex h-10 items-center gap-2 rounded-lg bg-[#25d366] px-5 text-sm font-semibold text-white disabled:opacity-50">{busy === "pick" && <Loader2 size={15} className="animate-spin" />}Pakai nomor ini</button>
              </div>
            )}
            {!numbers && !connected && <p className="text-sm text-slate-400">Kalau akunmu punya lebih dari satu nomor, kamu memilihnya di sini setelah login.</p>}
          </Step>

          {/* 3 · Test both directions */}
          <Step n={3} title="Tes koneksi" done={connected && !!s.last_inbound_at} active={step === 3}>
            {connected ? (
              <div className="space-y-4">
                <div className="space-y-2">
                  <p className="text-sm font-semibold text-slate-700">a. Kirim pesan tes dari Pesanin</p>
                  <div className="flex flex-wrap gap-2">
                    <input className="input h-10 w-56" inputMode="tel" placeholder="Nomor WA kamu, mis. 0812…" value={testTo} onChange={(e) => setTestTo(e.target.value)} />
                    <button onClick={sendTest} disabled={!testTo || !!busy} className="flex h-10 items-center gap-2 rounded-lg bg-navy px-4 text-sm font-semibold text-white disabled:opacity-50">{busy === "test" ? <Loader2 size={15} className="animate-spin" /> : <Send size={15} />}Kirim pesan tes</button>
                  </div>
                  {testNote && <p className={`rounded-lg p-2.5 text-sm ${testNote.ok ? "bg-emerald-50 text-emerald-700" : "bg-rose-50 text-rose-700"}`}>{testNote.text}</p>}
                </div>
                <div className="space-y-1">
                  <p className="text-sm font-semibold text-slate-700">b. Terima chat pelanggan</p>
                  {s.last_inbound_at
                    ? <p className="flex items-center gap-1.5 text-sm text-emerald-700"><CheckCircle2 size={15} />Chat masuk sudah diterima ({new Date(s.last_inbound_at).toLocaleString("id-ID", { dateStyle: "medium", timeStyle: "short" })}). Pesan pelanggan muncul di menu <Link href="/chat" className="font-semibold underline">Chat</Link>.</p>
                    : <p className="flex items-center gap-2 text-sm text-slate-600"><Loader2 size={14} className="animate-spin text-slate-400" />Kirim chat apa saja dari HP lain ke <b>{s.phone ?? "nomor bisnis"}</b>. Halaman ini mengecek otomatis.</p>}
                </div>
              </div>
            ) : <p className="text-sm text-slate-400">Setelah terhubung, pastikan pesan bisa keluar dan masuk.</p>}
          </Step>

          {/* 4 · Use it */}
          <Step n={4} title="Mulai pakai" done={false} active={connected}>
            {connected ? (
              <div className="grid gap-2 sm:grid-cols-2">
                {([
                  ["/broadcast/templates", "Buat template pesan", "Wajib untuk pesan pertama ke pembeli (konfirmasi COD, follow up, broadcast)."],
                  ["/settings/automation", "Konfirmasi COD otomatis", "Pembeli COD diminta balas YA sebelum paket dikirim."],
                  ["/chat", "Balas chat pelanggan", "Semua chat WhatsApp masuk ke satu kotak masuk bersama tim."],
                  ["/broadcast", "Kirim broadcast", "Promo ke pelanggan dengan template yang disetujui Meta."],
                ] as const).map(([href, t, d]) => (
                  <Link key={href} href={href} className="group flex items-start gap-2 rounded-lg bg-slate-50 p-3 text-sm hover:bg-slate-100">
                    <span className="flex-1"><b className="block text-navy">{t}</b><span className="text-xs text-slate-500">{d}</span></span><ChevronRight size={16} className="mt-0.5 text-slate-400 group-hover:text-navy" />
                  </Link>
                ))}
              </div>
            ) : <p className="text-sm text-slate-400">Template, konfirmasi COD, chat dan broadcast bisa dipakai setelah terhubung.</p>}
          </Step>

          <Troubleshoot />
          <Advanced onChange={load} />
        </>
      )}
    </div>
  );
}

function Step({ n, title, done, active, children }: { n: number; title: string; done: boolean; active: boolean; children: React.ReactNode }) {
  return (
    <Panel className={`p-5 ${active ? "ring-2 ring-brand-200" : ""}`}>
      <div className="flex items-start gap-3">
        <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm font-bold ${done ? "bg-emerald-500 text-white" : active ? "bg-brand-600 text-white" : "bg-slate-100 text-slate-500"}`}>{done ? <CheckCircle2 size={17} /> : n}</span>
        <div className="min-w-0 flex-1 space-y-3"><p className={`pt-1 font-bold ${active || done ? "text-navy" : "text-slate-400"}`}>{title}</p>{children}</div>
      </div>
    </Panel>
  );
}

/** Problems sellers actually hit, with the fix. */
function Troubleshoot() {
  const items: [string, string][] = [
    ["Muncul \"Tidak ada nomor WhatsApp Business yang diizinkan\"", "Saat login, di langkah izin pastikan akun WhatsApp Business DAN nomornya dicentang. Klik Masuk dengan Facebook lagi lalu pilih \"Edit akses\" jika ditawarkan."],
    ["Nomor ditolak karena sudah terdaftar di WhatsApp", "Nomor masih aktif di aplikasi WhatsApp/WhatsApp Business. Hapus akun WhatsApp di HP untuk nomor itu, tunggu beberapa menit, lalu ulangi login. Atau pakai nomor lain."],
    ["Kode verifikasi tidak masuk", "Pilih verifikasi lewat telepon, pastikan nomor aktif dan ada sinyal. Tunggu 1–2 menit sebelum meminta kode lagi."],
    ["Pesan tes gagal: template tidak ditemukan", "Akun lama kadang tidak punya template \"hello_world\". Koneksi tetap jalan; buat template sendiri di Broadcast → Template, lalu tunggu disetujui Meta."],
    ["Pesan tes gagal: metode pembayaran", "Tambahkan kartu di business.facebook.com → Penagihan & pembayaran → akun WhatsApp. Membalas chat pelanggan tetap gratis."],
    ["Chat pelanggan tidak muncul", "Klik Login ulang agar Pesanin mendaftarkan ulang penerimaan pesan. Jika masih belum, buka bagian Lanjutan di bawah dan cek webhook."],
  ];
  return (
    <details className="rounded-xl bg-white ring-1 ring-slate-100">
      <summary className="cursor-pointer select-none px-5 py-4 text-sm font-semibold text-navy">Ada kendala? Solusi masalah yang sering terjadi</summary>
      <div className="divide-y divide-slate-100 border-t border-slate-100">
        {items.map(([q, a]) => <div key={q} className="px-5 py-3 text-sm"><b className="block text-slate-800">{q}</b><span className="text-slate-600">{a}</span></div>)}
      </div>
    </details>
  );
}

/** Manual token + webhook details for developers or a System User token (no Facebook login). */
function Advanced({ onChange }: { onChange: () => void }) {
  const [st, setSt] = useState<Integration | null>(null);
  const [vals, setVals] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<Note>(null);
  const [copied, setCopied] = useState("");
  const load = () => api<{ whatsapp_cloud: Integration }>("/integrations").then((r) => setSt(r.whatsapp_cloud)).catch(() => {});
  useEffect(() => { load(); }, []);
  const save = async () => {
    setBusy(true); setMsg(null);
    try {
      await api("/integrations/whatsapp_cloud", { method: "PUT", json: { phone_number_id: vals.phone_number_id || undefined, access_token: vals.access_token || undefined, app_secret: vals.app_secret || undefined, waba_id: vals.waba_id || undefined } });
      setVals({}); setMsg({ ok: true, text: "Tersimpan dan sudah dites ke Meta." }); load(); onChange();
    } catch (e) { setMsg({ ok: false, text: e instanceof ApiError ? e.message : "Gagal menyimpan" }); }
    finally { setBusy(false); }
  };
  const copy = (k: string, v: string) => { navigator.clipboard.writeText(v); setCopied(k); setTimeout(() => setCopied(""), 1500); };
  const field = (k: string, label: string, ph: string) => (
    <label className="block text-sm"><span className="mb-1 block font-medium text-slate-700">{label}</span>
      <input className="input h-10 font-mono" placeholder={st?.keys?.[k] ?? ph} value={vals[k] ?? ""} onChange={(e) => setVals({ ...vals, [k]: e.target.value })} autoComplete="off" /></label>
  );
  return (
    <details className="rounded-xl bg-white ring-1 ring-slate-100">
      <summary className="cursor-pointer select-none px-5 py-4 text-sm font-medium text-slate-600">Lanjutan (untuk developer): token manual & webhook</summary>
      <div className="space-y-4 border-t border-slate-100 p-5">
        <div className="grid gap-3 sm:grid-cols-2">
          {field("phone_number_id", "Phone Number ID", "mis. 123456789012345")}
          {field("access_token", "Access token", "EAAG…")}
          {field("app_secret", "App Secret (opsional)", "untuk memverifikasi webhook")}
          {field("waba_id", "WhatsApp Business Account ID (opsional)", "terdeteksi otomatis")}
        </div>
        <p className="text-xs text-slate-400">Meta for Developers → app → WhatsApp → API Setup. Pakai token permanen dari System User (token sementara hanya 24 jam). <a href="https://business.facebook.com/wa/manage/home/" target="_blank" rel="noreferrer" className="inline-flex items-center gap-0.5 font-semibold text-brand-600">WhatsApp Manager<ExternalLink size={11} /></a></p>
        {st?.connected && st.webhook_url && (
          <div className="space-y-2 rounded-xl bg-slate-50 p-3 text-sm">
            <p className="font-medium text-slate-700">Webhook <span className="font-normal text-slate-500">(Meta → WhatsApp → Konfigurasi → Webhook, langganan field <b>messages</b>)</span></p>
            {([["url", "Callback URL", st.webhook_url], ["token", "Verify token", st.verify_token ?? ""]] as const).map(([k, l, v]) => (
              <div key={k} className="flex items-center gap-2"><span className="w-28 shrink-0 text-xs text-slate-500">{l}</span>
                <code className="min-w-0 flex-1 truncate rounded-lg bg-white px-3 py-2 text-xs text-slate-600">{v}</code>
                <button onClick={() => copy(k, v)} className="flex items-center gap-1 rounded-lg bg-white px-3 py-2 text-xs font-semibold text-slate-700">{copied === k ? <CheckCircle2 size={14} /> : <Copy size={14} />}{copied === k ? "Disalin" : "Salin"}</button></div>
            ))}
          </div>
        )}
        {msg && <p className={`rounded-lg p-2.5 text-sm ${msg.ok ? "bg-emerald-50 text-emerald-700" : "bg-rose-50 text-rose-700"}`}>{msg.text}</p>}
        <div className="flex justify-end">
          <button disabled={busy || (!st?.connected && !(vals.phone_number_id && vals.access_token))} onClick={save} className="flex h-10 items-center gap-2 rounded-lg bg-slate-800 px-5 text-sm font-semibold text-white disabled:opacity-50">
            {busy && <Loader2 size={15} className="animate-spin" />}{st?.connected ? "Simpan token & tes ulang" : "Hubungkan dengan token"}
          </button>
        </div>
      </div>
    </details>
  );
}
