"use client";
import { AlertTriangle, CheckCircle2, FileDown, MessageCircleMore, Loader2, Plus, Send, Truck, X } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { PageHead, Panel, Toggle } from "@/components/kit";
import { Select } from "@/components/Select";
import { api, ApiError } from "@/lib/api";
import { WaTemplate } from "@/lib/broadcast";
import { useAuth } from "@/lib/auth";
import { TelegramConnect, type TelegramState } from "@/components/TelegramConnect";

/** One scheduled send: the time (WIB) and which labels — only unprinted ones, or every ready label. */
type AwbSlot = { time: string; scope: "new" | "all" };
type Automation = { auto_ship: boolean; auto_ship_cod: boolean; auto_ship_shopee: boolean; auto_ship_shopee_method: "auto" | "pickup" | "dropoff"; awb_schedule: boolean; awb_times: string[]; awb_slots: AwbSlot[] | null; digital_email: boolean; digital_wa_template: { name: string; language: string; variables: number } | null;
  cod_confirm: boolean; cod_confirm_template: { name: string; language: string; variables: number } | null; cod_confirm_level: "all" | "medium" | "high"; cod_confirm_hours: number };
const DEFAULTS: Automation = { auto_ship: false, auto_ship_cod: false, auto_ship_shopee: false, auto_ship_shopee_method: "auto", awb_schedule: false, awb_times: ["08:00"], awb_slots: null, digital_email: true, digital_wa_template: null,
  cod_confirm: false, cod_confirm_template: null, cod_confirm_level: "all", cod_confirm_hours: 12 };

/** Scheduled Shopee AWB PDF → the seller's own Telegram bot (the same connection as Pengaturan → Notifikasi). */
function TelegramAwbPanel({ a, save }: { a: Automation; save: (next: Automation) => void }) {
  const [tg, setTg] = useState<TelegramState | null>(null);
  const [busy, setBusy] = useState("");
  const [note, setNote] = useState<{ ok: boolean; text: string } | null>(null);

  const run = async (key: string, fn: () => Promise<string | void>) => {
    setBusy(key); setNote(null);
    try { const t = await fn(); if (t) setNote({ ok: true, text: t }); }
    catch (e) { setNote({ ok: false, text: e instanceof ApiError ? e.message : "Gagal" }); }
    finally { setBusy(""); }
  };
  // Older settings only had a list of times; those mean "only unprinted labels".
  const slots: AwbSlot[] = a.awb_slots?.length ? a.awb_slots : (a.awb_times?.length ? a.awb_times : ["08:00"]).map((time) => ({ time, scope: "new" as const }));
  const setSlots = (next: AwbSlot[]) => {
    const clean = [...new Map(next.filter((s) => s.time).map((s) => [s.time, s])).values()].sort((x, y) => x.time.localeCompare(y.time));
    save({ ...a, awb_slots: clean, awb_times: clean.map((s) => s.time) });
  };
  const nextFree = () => ["08:00", "13:00", "16:00", "19:00", "10:00", "21:00"].find((t) => !slots.some((s) => s.time === t)) ?? "12:00";
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

      <TelegramConnect onChange={setTg} />
      {tg?.ready && (
        <div className="flex flex-wrap gap-2">
          <button className={btn} disabled={!!busy} onClick={() => run("now", async () => { await api("/telegram/send-awb", { method: "POST", json: { scope: "new" } }); return "Sedang menyiapkan resi yang belum tercetak… PDF masuk ke Telegram dalam 1–2 menit."; })}>{spin("now")}Kirim resi yang belum tercetak</button>
          <button className={btn} disabled={!!busy} onClick={() => run("all", async () => { await api("/telegram/send-awb", { method: "POST", json: { scope: "all" } }); return "Sedang menyiapkan semua resi siap cetak… PDF masuk ke Telegram dalam 1–2 menit."; })}>{spin("all")}Kirim semua resi</button>
        </div>
      )}

      <div className="space-y-2 rounded-lg bg-slate-50 p-3 text-sm">
        <b className="block text-slate-700">Jadwal kirim setiap hari (WIB) · {slots.length}× sehari</b>
        <div className="space-y-2">
          {slots.map((s, i) => (
            <div key={`${s.time}-${i}`} className="flex flex-wrap items-center gap-2">
              <input type="time" step={60} aria-label={`Jam kirim ${i + 1}`} className="h-9 rounded-lg border border-slate-200 bg-white px-2 text-sm outline-none focus:border-brand-400" defaultValue={s.time}
                onBlur={(e) => { if (e.target.value && e.target.value !== s.time) setSlots(slots.map((x, k) => (k === i ? { ...x, time: e.target.value } : x))); }} />
              <Select className="input h-9 w-64 bg-white" aria-label={`Resi yang dikirim jam ${s.time}`} value={s.scope}
                onChange={(e) => setSlots(slots.map((x, k) => (k === i ? { ...x, scope: e.target.value as AwbSlot["scope"] } : x)))}>
                <option value="new">Hanya yang belum tercetak</option>
                <option value="all">Semua resi siap cetak</option>
              </Select>
              {slots.length > 1 && <button aria-label={`Hapus jam ${s.time}`} className="flex h-9 w-9 items-center justify-center rounded-lg text-slate-400 hover:bg-white hover:text-rose-600" onClick={() => setSlots(slots.filter((_, k) => k !== i))}><X size={15} /></button>}
            </div>
          ))}
          {slots.length < 6 && <button className="flex h-8 items-center gap-1 rounded-lg border border-dashed border-slate-300 px-3 text-xs font-semibold text-slate-600 hover:border-brand-400 hover:text-brand-600" onClick={() => setSlots([...slots, { time: nextFree(), scope: "new" }])}><Plus size={13} />Tambah jam</button>}
        </div>
        <p className="text-xs text-slate-500"><b>Hanya yang belum tercetak</b>: resi yang belum pernah dicetak atau dikirim. <b>Semua resi siap cetak</b>: semua resi yang masih menunggu pickup, termasuk yang sudah pernah dicetak (cocok untuk cetak ulang pagi hari). Kalau tidak ada resi, kamu tetap dapat pesan singkat.</p>
      </div>
      {a.awb_schedule && tg && !tg.ready && <p className="flex items-start gap-2 rounded-lg bg-amber-50 p-3 text-sm text-amber-800"><AlertTriangle size={15} className="mt-0.5 shrink-0" />Jadwal aktif, tapi Telegram belum siap. Hubungkan bot dulu agar resi bisa terkirim.</p>}
      {note && <p className={`rounded-lg p-2.5 text-sm ${note.ok ? "bg-emerald-50 text-emerald-700" : "bg-rose-50 text-rose-700"}`}>{note.text}</p>}
    </Panel>
  );
}

/** Pengaturan → Otomatisasi Pesanan: auto resi once paid, auto delivery of digital products. */
export default function AutomationSettings() {
  // Only the automations of the store's track (both with the add-on).
  const { user } = useAuth();
  const showMp = !!user?.plan_addon || user?.plan_track !== "social";
  const showSocial = !!user?.plan_addon || user?.plan_track !== "marketplace";
  const [a, setA] = useState<Automation | null>(null);
  const [ready, setReady] = useState<{ delivery: boolean; whatsapp: boolean; pickup: boolean; shopee: boolean } | null>(null);
  const [templates, setTemplates] = useState<WaTemplate[] | null>(null);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    api<Record<string, any>>("/user-settings").then((s) => setA({ ...DEFAULTS, ...(s.automation ?? {}) }));
    Promise.all([api<any>("/integrations"), api<any>("/addresses").catch(() => []), api<any>("/marketplace/shops").catch(() => ({ shops: [] }))]).then(([i, addr, m]) => {
      const list: unknown[] = Array.isArray(addr) ? addr : addr?.data ?? [];
      const shops: any[] = m?.shops ?? [];
      setReady({ delivery: !!(i.kiriminaja ?? i.rajaongkir)?.settings?.delivery?.enabled, whatsapp: !!i.whatsapp_cloud?.connected, pickup: list.length > 0, shopee: shops.some((s) => s.status !== "disconnected" && !s.is_demo) });
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
  // Konfirmasi COD: approved templates with up to 4 variables (nama, no. pesanan, produk, total).
  const codUsable = (templates ?? []).filter((t) => t.status === "APPROVED" && t.supported && t.variables >= 1 && t.variables <= 4);
  const tplKey = a?.digital_wa_template ? `${a.digital_wa_template.name}|${a.digital_wa_template.language}` : "";

  const Warn = ({ children }: { children: React.ReactNode }) => <p className="flex items-start gap-2 rounded-lg bg-amber-50 p-3 text-sm text-amber-800"><AlertTriangle size={15} className="mt-0.5 shrink-0" /><span>{children}</span></p>;

  return (
    <div className="max-w-3xl space-y-5">
      <PageHead title="Otomatisasi Pesanan" tutorial={false} crumbs={[["Pengaturan"], ["Otomatisasi Pesanan"]]} />
      <p className="-mt-2 text-sm text-slate-500">{showSocial && showMp ? "Pesanan web dan manual diproses sendiri setelah lunas (resi otomatis & produk digital), dan pesanan Shopee bisa diatur pengirimannya otomatis." : showMp ? "Pesanan Shopee diatur pengirimannya otomatis dan resinya bisa dikirim ke Telegram sesuai jadwal." : "Pesanan web dan manual diproses sendiri setelah lunas: kurir dipesan lewat KiriminAja dan resi asli terbit untuk produk fisik, produk digital langsung dikirim ke pembeli."}</p>
      {msg && <p className={`rounded-lg p-2.5 text-sm ${msg.ok ? "bg-emerald-50 text-emerald-700" : "bg-rose-50 text-rose-700"}`}>{msg.text}</p>}
      {!a || !ready ? <p className="flex items-center gap-2 text-sm text-slate-500"><Loader2 size={16} className="animate-spin" />Memuat…</p> : (
        <>
          {showSocial && (
          <Panel className="space-y-4 p-5">
            <div className="flex items-start gap-3">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-600"><Truck size={20} /></span>
              <div className="flex-1"><b className="text-slate-800">Resi otomatis (produk fisik)</b>
                <p className="text-sm text-slate-500">Begitu pesanan lunas, Pesanin memesan kurir lewat KiriminAja dan resi asli langsung terbit. Kurir menjemput di alamat pickup-mu. Pesanan dropship dilewati karena dikirim gudang Pesanin.</p></div>
              <Toggle checked={a.auto_ship} onChange={(v) => save({ ...a, auto_ship: v })} />
            </div>
            {a.auto_ship && (
              <label className="flex items-center justify-between gap-3 rounded-lg bg-slate-50 p-3 text-sm">
                <span><b className="block text-slate-700">Pesanan COD juga langsung dikirim</b><span className="text-xs text-slate-500">Jika mati, pesanan COD menunggu kamu pesan kurir manual (bisa dicek dulu agar terhindar dari pesanan iseng).</span></span>
                <Toggle checked={a.auto_ship_cod} onChange={(v) => save({ ...a, auto_ship_cod: v })} />
              </label>
            )}
            {a.auto_ship && !ready.delivery && <Warn>Layanan pesan kurir Pesanin sedang belum aktif, resi belum bisa terbit otomatis. Sementara isi resi manual di Pesanan.</Warn>}
            {a.auto_ship && !ready.pickup && <Warn>Alamat pickup belum diisi. <Link href="/settings/addresses" className="font-semibold underline">Tambah alamat</Link>.</Warn>}
            {a.auto_ship && ready.delivery && ready.pickup && <p className="flex items-center gap-1.5 text-xs text-emerald-700"><CheckCircle2 size={14} />Siap. Pesanan lunas diproses dalam ±30 detik. Jika gagal dicoba 3 kali, lalu kamu diberi notifikasi.</p>}
          </Panel>
          )}

          {showSocial && (
          <Panel className="space-y-4 p-5">
            <div className="flex items-start gap-3">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600"><MessageCircleMore size={20} /></span>
              <div className="flex-1"><b className="text-slate-800">Konfirmasi COD otomatis via WhatsApp</b>
                <p className="text-sm text-slate-500">Setiap pesanan COD baru, pembeli dikirimi WhatsApp &quot;balas YA untuk konfirmasi&quot;. Paket ditahan (resi otomatis menunggu) sampai pembeli membalas YA. Kalau pembeli membalas BATAL atau tidak membalas, kamu dan CS diberi notifikasi. Mengurangi paket COD yang ditolak (RTS).</p></div>
              <Toggle checked={a.cod_confirm} onChange={(v) => save({ ...a, cod_confirm: v })} />
            </div>
            {a.cod_confirm && (
              <>
                <div className="space-y-2 rounded-lg bg-slate-50 p-3 text-sm">
                  <b className="block text-slate-700">Template WhatsApp</b>
                  <span className="block text-xs text-slate-500">Variabel: <b>{"{{1}}"} nama</b>, <b>{"{{2}}"} no. pesanan</b>, <b>{"{{3}}"} produk</b>, <b>{"{{4}}"} total</b> (pakai sebagian juga boleh). Tambahkan tombol balasan cepat <b>&quot;Ya, kirim&quot;</b> dan <b>&quot;Batalkan&quot;</b> agar pembeli tinggal tekan.</span>
                  {!ready.whatsapp ? <Warn>WhatsApp belum terhubung. <Link href="/settings/whatsapp" className="font-semibold underline">Hubungkan WhatsApp</Link>.</Warn> : templates === null ? <p className="text-xs text-slate-400">Memuat template…</p> : (
                    <>
                      <Select className="input bg-white" value={a.cod_confirm_template ? `${a.cod_confirm_template.name}|${a.cod_confirm_template.language}` : ""} onChange={(e) => {
                        const t = codUsable.find((x) => `${x.name}|${x.language}` === e.target.value);
                        save({ ...a, cod_confirm_template: t ? { name: t.name, language: t.language, variables: t.variables } : null });
                      }}>
                        <option value="">Pilih template</option>
                        {codUsable.map((t) => <option key={`${t.name}|${t.language}`} value={`${t.name}|${t.language}`}>{t.name} ({t.language})</option>)}
                      </Select>
                      {!codUsable.length && <p className="text-xs text-slate-500">Belum ada template yang cocok. <Link href="/broadcast/templates" className="font-semibold text-brand-600">Buat template</Link> kategori Utilitas, mis. “Halo {"{{1}}"}, pesanan {"{{2}}"} ({"{{3}}"}) total {"{{4}}"} dibayar saat paket tiba (COD). Balas YA untuk kami kirim, atau BATAL jika tidak jadi.”</p>}
                    </>
                  )}
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  <label className="block rounded-lg bg-slate-50 p-3 text-sm"><b className="mb-1 block text-slate-700">Kirim ke</b>
                    <Select className="input w-full bg-white" value={a.cod_confirm_level} onChange={(e) => save({ ...a, cod_confirm_level: e.target.value as Automation["cod_confirm_level"] })}>
                      <option value="all">Semua pesanan COD</option><option value="medium">Risiko COD sedang & tinggi</option><option value="high">Hanya risiko COD tinggi</option>
                    </Select>
                    <span className="mt-1 block text-xs text-slate-500">Pelanggan setia (risiko rendah) bisa dilewati agar tidak terganggu.</span></label>
                  <label className="block rounded-lg bg-slate-50 p-3 text-sm"><b className="mb-1 block text-slate-700">Tandai &quot;tidak membalas&quot; setelah</b>
                    <Select className="input w-full bg-white" value={String(a.cod_confirm_hours)} onChange={(e) => save({ ...a, cod_confirm_hours: Number(e.target.value) })}>
                      {[2, 6, 12, 24, 48].map((h) => <option key={h} value={h}>{h} jam</option>)}
                    </Select>
                    <span className="mt-1 block text-xs text-slate-500">Lalu kamu dapat notifikasi untuk menelepon pembeli.</span></label>
                </div>
                {ready.whatsapp && a.cod_confirm_template && <p className="flex items-center gap-1.5 text-xs text-emerald-700"><CheckCircle2 size={14} />Aktif. Pesanan COD baru dikirimi konfirmasi dalam ±30 detik; status terlihat di menu Pesanan dan bisa diubah manual oleh CS.</p>}
                {!a.cod_confirm_template && ready.whatsapp && <Warn>Pilih template dulu. Selama belum ada template, pesanan COD tidak ditahan.</Warn>}
              </>
            )}
          </Panel>
          )}

          {showMp && (
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
          )}

          {showMp && <TelegramAwbPanel a={a} save={save} />}

          {showSocial && (
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
              {!ready.whatsapp ? <Warn>WhatsApp belum terhubung. <Link href="/settings/whatsapp" className="font-semibold underline">Hubungkan WhatsApp</Link>.</Warn> : templates === null ? <p className="text-xs text-slate-400">Memuat template…</p> : (
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
          )}
          {saving && <p className="text-xs text-slate-400">Menyimpan…</p>}
        </>
      )}
    </div>
  );
}
