"use client";
import { AlertTriangle, CheckCircle2, FileDown, Loader2, Plus, Send, Truck, X } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { PageHead, Panel, Toggle } from "@/components/kit";
import { Select } from "@/components/Select";
import { api, ApiError } from "@/lib/api";
import { WaTemplate } from "@/lib/broadcast";

type Automation = { auto_ship: boolean; auto_ship_cod: boolean; auto_ship_shopee: boolean; auto_ship_shopee_method: "auto" | "pickup" | "dropoff"; awb_schedule: boolean; awb_times: string[]; digital_email: boolean; digital_wa_template: { name: string; language: string; variables: number } | null };
const DEFAULTS: Automation = { auto_ship: false, auto_ship_cod: false, auto_ship_shopee: false, auto_ship_shopee_method: "auto", awb_schedule: false, awb_times: ["08:00"], digital_email: true, digital_wa_template: null };
type Telegram = { connected: boolean; bot_username: string | null; chat_name: string | null; ready: boolean };

/** Scheduled Shopee AWB PDF → the seller's own Telegram bot. */
function TelegramAwbPanel({ a, save }: { a: Automation; save: (next: Automation) => void }) {
  const [tg, setTg] = useState<Telegram | null>(null);
  const [token, setToken] = useState("");
  const [busy, setBusy] = useState("");
  const [note, setNote] = useState<{ ok: boolean; text: string } | null>(null);
  useEffect(() => { api<Telegram>("/telegram").then(setTg).catch(() => setTg({ connected: false, bot_username: null, chat_name: null, ready: false })); }, []);

  const run = async (key: string, fn: () => Promise<string | void>) => {
    setBusy(key); setNote(null);
    try { const t = await fn(); if (t) setNote({ ok: true, text: t }); }
    catch (e) { setNote({ ok: false, text: e instanceof ApiError ? e.message : "Gagal" }); }
    finally { setBusy(""); }
  };
  const times = a.awb_times?.length ? a.awb_times : ["08:00"];
  const setTimes = (next: string[]) => save({ ...a, awb_times: [...new Set(next.filter(Boolean))].sort() });
  const spin = (k: string) => busy === k && <Loader2 size={14} className="animate-spin" />;
  const btn = "flex h-9 items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 text-sm font-semibold text-navy hover:bg-slate-50 disabled:opacity-50";

  return (
    <Panel className="space-y-4 p-5">
      <div className="flex items-start gap-3">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-sky-50 text-sky-600"><Send size={20} /></span>
        <div className="flex-1"><b className="text-slate-800">Kirim resi Shopee otomatis ke Telegram</b>
          <p className="text-sm text-slate-500">Di jam yang kamu pilih, semua resi Shopee yang sudah terbit dan belum dicetak (termasuk Pengiriman Kilat) digabung jadi satu PDF — nama produk disembunyikan, tabel SKU | Qty — lalu dikirim ke Telegram-mu. Tiap resi hanya dikirim sekali.</p></div>
        <Toggle checked={a.awb_schedule} onChange={(v) => save({ ...a, awb_schedule: v })} />
      </div>

      {!tg ? <p className="text-xs text-slate-400">Memuat Telegram…</p> : !tg.connected ? (
        <div className="space-y-2 rounded-lg bg-slate-50 p-3 text-sm">
          <b className="block text-slate-700">Hubungkan bot Telegram</b>
          <ol className="list-decimal space-y-0.5 pl-5 text-xs text-slate-600">
            <li>Di Telegram buka <b>@BotFather</b>, kirim <code>/newbot</code>, beri nama bot.</li>
            <li>Salin <b>token</b> yang diberikan BotFather, tempel di bawah.</li>
            <li>Buka bot barumu dan tekan <b>Start</b>.</li>
          </ol>
          <div className="flex flex-wrap gap-2">
            <input className="input min-w-0 flex-1 bg-white font-mono text-xs" placeholder="123456789:AAH…" value={token} onChange={(e) => setToken(e.target.value.trim())} />
            <button className={btn} disabled={!token || !!busy} onClick={() => run("save", async () => { const r = await api<Telegram>("/telegram", { method: "PUT", json: { bot_token: token } }); setTg(r); setToken(""); return r.ready ? "Terhubung." : `Bot @${r.bot_username} tersimpan. Tekan Start di bot, lalu klik Deteksi chat.`; })}>{spin("save")}Hubungkan</button>
          </div>
        </div>
      ) : (
        <div className="flex flex-wrap items-center gap-2 rounded-lg bg-slate-50 p-3 text-sm">
          <span className="mr-auto text-slate-700">Bot <b>@{tg.bot_username}</b>{tg.ready ? <> · kirim ke <b>{tg.chat_name}</b></> : <span className="text-amber-700"> · chat belum terdeteksi</span>}</span>
          {!tg.ready && <button className={btn} disabled={!!busy} onClick={() => run("detect", async () => { setTg(await api<Telegram>("/telegram/detect", { method: "POST" })); return "Chat terdeteksi."; })}>{spin("detect")}Deteksi chat</button>}
          {tg.ready && <button className={btn} disabled={!!busy} onClick={() => run("test", async () => { await api("/telegram/test", { method: "POST" }); return "Pesan tes terkirim, cek Telegram."; })}>{spin("test")}Kirim tes</button>}
          {tg.ready && <button className={btn} disabled={!!busy} onClick={() => run("now", async () => { await api("/telegram/send-awb", { method: "POST" }); return "Sedang menyiapkan resi… PDF masuk ke Telegram dalam 1–2 menit."; })}>{spin("now")}Kirim resi sekarang</button>}
          <button className="text-xs font-semibold text-slate-500 hover:text-rose-600" disabled={!!busy} onClick={() => run("del", async () => { await api("/telegram", { method: "DELETE" }); setTg({ connected: false, bot_username: null, chat_name: null, ready: false }); })}>Putuskan</button>
        </div>
      )}

      <div className="space-y-2 rounded-lg bg-slate-50 p-3 text-sm">
        <b className="block text-slate-700">Jam kirim (WIB)</b>
        <div className="flex flex-wrap items-center gap-2">
          {times.map((t, i) => (
            <span key={`${t}-${i}`} className="flex items-center gap-1 rounded-lg border border-slate-200 bg-white pl-2">
              <input type="time" step={60} className="h-8 bg-transparent text-sm outline-none" defaultValue={t}
                onBlur={(e) => { if (e.target.value && e.target.value !== t) setTimes(times.map((x, k) => (k === i ? e.target.value : x))); }} />
              {times.length > 1 && <button aria-label={`Hapus jam ${t}`} className="px-2 text-slate-400 hover:text-rose-600" onClick={() => setTimes(times.filter((_, k) => k !== i))}><X size={14} /></button>}
            </span>
          ))}
          {times.length < 6 && <button className="flex h-8 items-center gap-1 rounded-lg border border-dashed border-slate-300 px-3 text-xs font-semibold text-slate-600 hover:border-brand-400 hover:text-brand-600" onClick={() => setTimes([...times, "13:00"])}><Plus size={13} />Tambah jam</button>}
        </div>
        <p className="text-xs text-slate-500">Mis. 08:00 dan 13:00 → dua kali sehari. Kalau tidak ada resi baru, kamu tetap dapat pesan singkat.</p>
      </div>
      {a.awb_schedule && tg && !tg.ready && <p className="flex items-start gap-2 rounded-lg bg-amber-50 p-3 text-sm text-amber-800"><AlertTriangle size={15} className="mt-0.5 shrink-0" />Jadwal aktif, tapi Telegram belum siap. Hubungkan bot dulu agar resi bisa terkirim.</p>}
      {note && <p className={`rounded-lg p-2.5 text-sm ${note.ok ? "bg-emerald-50 text-emerald-700" : "bg-rose-50 text-rose-700"}`}>{note.text}</p>}
    </Panel>
  );
}

/** Pengaturan → Otomatisasi Pesanan: auto resi once paid, auto delivery of digital products. */
export default function AutomationSettings() {
  const [a, setA] = useState<Automation | null>(null);
  const [ready, setReady] = useState<{ biteship: boolean; whatsapp: boolean; pickup: boolean; shopee: boolean } | null>(null);
  const [templates, setTemplates] = useState<WaTemplate[] | null>(null);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    api<Record<string, any>>("/user-settings").then((s) => setA({ ...DEFAULTS, ...(s.automation ?? {}) }));
    Promise.all([api<any>("/integrations"), api<any>("/addresses").catch(() => []), api<any>("/marketplace/shops").catch(() => ({ shops: [] }))]).then(([i, addr, m]) => {
      const list: unknown[] = Array.isArray(addr) ? addr : addr?.data ?? [];
      const shops: any[] = m?.shops ?? [];
      setReady({ biteship: !!i.biteship?.connected, whatsapp: !!i.whatsapp_cloud?.connected, pickup: list.length > 0, shopee: shops.some((s) => s.status !== "disconnected" && !s.is_demo) });
      if (i.whatsapp_cloud?.connected) api<{ data: WaTemplate[] }>("/whatsapp/templates").then((r) => setTemplates(r.data)).catch(() => setTemplates([]));
      else setTemplates([]);
    });
  }, []);

  const save = async (next: Automation) => {
    setA(next); setSaving(true); setMsg(null);
    try { await api("/user-settings", { method: "PUT", json: { key: "automation", value: next } }); setMsg({ ok: true, text: "Tersimpan." }); }
    catch (e) { setMsg({ ok: false, text: e instanceof ApiError ? e.message : "Gagal menyimpan" }); }
    finally { setSaving(false); }
  };
  // Templates usable for the access message: approved, text only, at most 3 variables ({{1}} nama, {{2}} link, {{3}} produk).
  const usable = (templates ?? []).filter((t) => t.status === "APPROVED" && t.supported && t.variables >= 2 && t.variables <= 3);
  const tplKey = a?.digital_wa_template ? `${a.digital_wa_template.name}|${a.digital_wa_template.language}` : "";

  const Warn = ({ children }: { children: React.ReactNode }) => <p className="flex items-start gap-2 rounded-lg bg-amber-50 p-3 text-sm text-amber-800"><AlertTriangle size={15} className="mt-0.5 shrink-0" /><span>{children}</span></p>;

  return (
    <div className="max-w-3xl space-y-5">
      <PageHead title="Otomatisasi Pesanan" tutorial={false} crumbs={[["Pengaturan"], ["Otomatisasi Pesanan"]]} />
      <p className="-mt-2 text-sm text-slate-500">Pesanan web dan manual diproses sendiri setelah lunas: resi terbit otomatis untuk produk fisik, dan produk digital langsung dikirim ke pembeli. Pesanan Shopee bisa diatur pengirimannya otomatis di bawah.</p>
      {msg && <p className={`rounded-lg p-2.5 text-sm ${msg.ok ? "bg-emerald-50 text-emerald-700" : "bg-rose-50 text-rose-700"}`}>{msg.text}</p>}
      {!a || !ready ? <p className="flex items-center gap-2 text-sm text-slate-500"><Loader2 size={16} className="animate-spin" />Memuat…</p> : (
        <>
          <Panel className="space-y-4 p-5">
            <div className="flex items-start gap-3">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-600"><Truck size={20} /></span>
              <div className="flex-1"><b className="text-slate-800">Resi otomatis (produk fisik)</b>
                <p className="text-sm text-slate-500">Begitu pesanan lunas, Pesanin memesan kurir di Biteship dan nomor resi asli langsung terbit. Kurir menjemput di alamat pickup-mu.</p></div>
              <Toggle checked={a.auto_ship} onChange={(v) => save({ ...a, auto_ship: v })} />
            </div>
            {a.auto_ship && (
              <label className="flex items-center justify-between gap-3 rounded-lg bg-slate-50 p-3 text-sm">
                <span><b className="block text-slate-700">Pesanan COD juga langsung dikirim</b><span className="text-xs text-slate-500">Jika mati, pesanan COD menunggu kamu kirim manual (bisa dicek dulu agar terhindar dari pesanan iseng).</span></span>
                <Toggle checked={a.auto_ship_cod} onChange={(v) => save({ ...a, auto_ship_cod: v })} />
              </label>
            )}
            {a.auto_ship && !ready.biteship && <Warn>Biteship belum terhubung. <Link href="/settings/integrations" className="font-semibold underline">Hubungkan di Integrasi</Link> agar resi bisa terbit.</Warn>}
            {a.auto_ship && !ready.pickup && <Warn>Alamat pickup belum diisi. <Link href="/settings/addresses" className="font-semibold underline">Tambah alamat</Link>.</Warn>}
            {a.auto_ship && ready.biteship && ready.pickup && <p className="flex items-center gap-1.5 text-xs text-emerald-700"><CheckCircle2 size={14} />Siap. Pesanan lunas diproses dalam ±30 detik. Jika gagal (mis. alamat pembeli tidak lengkap) dicoba 3 kali, lalu kamu diberi notifikasi.</p>}
          </Panel>

          <Panel className="space-y-4 p-5">
            <div className="flex items-start gap-3">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-orange-50 text-orange-600"><Truck size={20} /></span>
              <div className="flex-1"><b className="text-slate-800">Atur pengiriman Shopee otomatis</b>
                <p className="text-sm text-slate-500">Setiap pesanan Shopee yang siap kirim diatur pengirimannya sendiri di background (±30 detik), tanpa perlu membuka web. Pesanan Advance Fulfilment dilewati karena dikirim langsung oleh Shopee.</p></div>
              <Toggle checked={a.auto_ship_shopee} onChange={(v) => save({ ...a, auto_ship_shopee: v })} />
            </div>
            {a.auto_ship_shopee && (
              <label className="flex flex-wrap items-center justify-between gap-3 rounded-lg bg-slate-50 p-3 text-sm">
                <span><b className="block text-slate-700">Metode kirim</b><span className="text-xs text-slate-500">Otomatis memilih yang tersedia untuk ekspedisi pesanan (utamakan jemput kurir).</span></span>
                <Select className="input w-56 bg-white" value={a.auto_ship_shopee_method} onChange={(e) => save({ ...a, auto_ship_shopee_method: e.target.value as Automation["auto_ship_shopee_method"] })}>
                  <option value="auto">Otomatis (utamakan jemput)</option>
                  <option value="pickup">Jemput kurir (pickup)</option>
                  <option value="dropoff">Antar ke counter (drop-off)</option>
                </Select>
              </label>
            )}
            {a.auto_ship_shopee && !ready.shopee && <Warn>Belum ada toko Shopee terhubung. <Link href="/marketplace/shops" className="font-semibold underline">Hubungkan toko</Link>.</Warn>}
            {a.auto_ship_shopee && ready.shopee && <p className="flex items-center gap-1.5 text-xs text-emerald-700"><CheckCircle2 size={14} />Siap. Alamat pickup & slot waktu dipilih otomatis dari Shopee. Jika gagal (mis. alamat pickup belum diatur di Seller Centre) dicoba 3 kali, lalu kamu diberi notifikasi.</p>}
          </Panel>

          <TelegramAwbPanel a={a} save={save} />

          <Panel className="space-y-4 p-5">
            <div className="flex items-start gap-3">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-violet-50 text-violet-600"><FileDown size={20} /></span>
              <div className="flex-1"><b className="text-slate-800">Kirim produk digital otomatis</b>
                <p className="text-sm text-slate-500">Selalu aktif. Begitu lunas, pembeli mendapat link akses pribadi ke link/file yang kamu isi di produk, lalu pesanan ditandai selesai. Link juga muncul di halaman pembayaran.</p></div>
            </div>
            <label className="flex items-center justify-between gap-3 rounded-lg bg-slate-50 p-3 text-sm">
              <span><b className="block text-slate-700">Kirim lewat email</b><span className="text-xs text-slate-500">Ke email yang diisi pembeli saat checkout.</span></span>
              <Toggle checked={a.digital_email} onChange={(v) => save({ ...a, digital_email: v })} />
            </label>
            <div className="space-y-2 rounded-lg bg-slate-50 p-3 text-sm">
              <b className="block text-slate-700">Kirim lewat WhatsApp</b>
              <span className="block text-xs text-slate-500">WhatsApp mewajibkan template yang disetujui Meta. Pakai template dengan variabel <b>{"{{1}}"} nama pembeli</b>, <b>{"{{2}}"} link akses</b>, dan (opsional) <b>{"{{3}}"} nama produk</b>.</span>
              {!ready.whatsapp ? <Warn>WhatsApp belum terhubung. <Link href="/settings/integrations#whatsapp" className="font-semibold underline">Hubungkan WhatsApp</Link>.</Warn> : templates === null ? <p className="text-xs text-slate-400">Memuat template…</p> : (
                <>
                  <Select className="input bg-white" value={tplKey} onChange={(e) => {
                    const t = usable.find((x) => `${x.name}|${x.language}` === e.target.value);
                    save({ ...a, digital_wa_template: t ? { name: t.name, language: t.language, variables: t.variables } : null });
                  }}>
                    <option value="">Jangan kirim lewat WhatsApp</option>
                    {usable.map((t) => <option key={`${t.name}|${t.language}`} value={`${t.name}|${t.language}`}>{t.name} ({t.language})</option>)}
                  </Select>
                  {!usable.length && <p className="text-xs text-slate-500">Belum ada template yang cocok. <Link href="/broadcast/templates" className="font-semibold text-brand-600">Buat template</Link> kategori Utilitas, mis. “Halo {"{{1}}"}, terima kasih! Akses produkmu di sini: {"{{2}}"}”.</p>}
                </>
              )}
            </div>
          </Panel>
          {saving && <p className="text-xs text-slate-400">Menyimpan…</p>}
        </>
      )}
    </div>
  );
}
