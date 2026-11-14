"use client";
import { AlertTriangle, CheckCircle2, FileDown, Loader2, Truck } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { PageHead, Panel, Toggle } from "@/components/kit";
import { Select } from "@/components/Select";
import { api, ApiError } from "@/lib/api";
import { WaTemplate } from "@/lib/broadcast";

type Automation = { auto_ship: boolean; auto_ship_cod: boolean; auto_ship_shopee: boolean; auto_ship_shopee_method: "auto" | "pickup" | "dropoff"; digital_email: boolean; digital_wa_template: { name: string; language: string; variables: number } | null };
const DEFAULTS: Automation = { auto_ship: false, auto_ship_cod: false, auto_ship_shopee: false, auto_ship_shopee_method: "auto", digital_email: true, digital_wa_template: null };

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
