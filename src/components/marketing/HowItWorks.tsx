"use client";

import { useState } from "react";
import {
  CheckCircle2, Copy, FileSpreadsheet, FileText, Globe, MessageCircle, RefreshCcw, Store, TrendingUp, Truck,
} from "lucide-react";
import { ShopeeMark } from "@/components/ChannelBadge";

/* ─── Small marks ─────────────────────────────────────── */

function TikTokMark({ size = 16 }: { size?: number }) {
  return (
    <span className="flex shrink-0 items-center justify-center rounded-[5px] bg-slate-900 text-white" style={{ width: size, height: size }}>
      <svg width={size * 0.62} height={size * 0.62} viewBox="0 0 24 24" fill="currentColor" aria-hidden>
        <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64c.29 0 .57.04.84.11V9.41a6.33 6.33 0 0 0-.84-.05A6.34 6.34 0 0 0 3 15.7a6.34 6.34 0 0 0 10.82 4.48 6.3 6.3 0 0 0 1.86-4.51v-6.6a8.16 8.16 0 0 0 4.77 1.52v-3.4a4.85 4.85 0 0 1-.86-.5z" />
      </svg>
    </span>
  );
}

const Card = ({ children, className = "" }: { children: React.ReactNode; className?: string }) => (
  <div className={`rounded-xl border border-slate-100/80 bg-white p-3 shadow-[0_1px_3px_rgba(0,0,0,0.03)] ${className}`}>{children}</div>
);

/* ─── Mockups: Medsos & Website ──────────────────────── */

function MockLinkCheckout() {
  return (
    <div className="space-y-2.5">
      <Card className="flex items-center gap-3">
        <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-amber-50 text-lg">🍋</span>
        <div className="flex-1">
          <p className="text-xs font-bold text-navy">Toner Lemon Brightening</p>
          <p className="text-[11px] text-slate-500">3 variasi · <b className="text-brand-600">Rp149.000</b></p>
        </div>
        <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-semibold text-emerald-700">Aktif</span>
      </Card>
      <Card>
        <p className="text-[11px] font-semibold text-slate-500">Link checkout</p>
        <div className="mt-1.5 flex items-center justify-between rounded-lg bg-slate-50 px-2.5 py-2">
          <span className="text-xs font-semibold text-navy">pesanin.id/c/toner-lemon</span>
          <Copy size={13} className="text-brand-500" />
        </div>
      </Card>
      <Card>
        <p className="text-[11px] font-semibold text-slate-500">Bagikan ke</p>
        <div className="mt-2 flex flex-wrap gap-1.5">
          {[
            ["Instagram", "bg-pink-50 text-pink-600"],
            ["TikTok", "bg-slate-100 text-slate-800"],
            ["WhatsApp", "bg-emerald-50 text-emerald-700"],
            ["Facebook Ads", "bg-blue-50 text-blue-600"],
            ["Landing Page", "bg-brand-50 text-brand-700"],
          ].map(([l, c]) => (
            <span key={l} className={`rounded-full px-2.5 py-1 text-[10px] font-semibold ${c}`}>{l}</span>
          ))}
        </div>
      </Card>
    </div>
  );
}

function MockCheckoutOngkir() {
  return (
    <div className="space-y-2.5">
      <Card>
        <div className="flex items-center justify-between">
          <p className="text-[11px] font-semibold text-slate-500">Pilih kurir · Kec. Coblong, Bandung</p>
          <Truck size={13} className="text-slate-400" />
        </div>
        <div className="mt-2 space-y-1.5">
          {[
            ["JNE REG", "1–2 hari", "Rp11.000", true],
            ["SiCepat", "1–2 hari", "Rp10.000", false],
            ["J&T Express", "2–3 hari", "Rp12.000", false],
          ].map(([k, e, p, on]) => (
            <div key={k as string} className={`flex items-center justify-between rounded-lg border px-2.5 py-1.5 ${on ? "border-brand-300 bg-brand-50/60" : "border-slate-100"}`}>
              <div>
                <p className="text-xs font-bold text-navy">{k}</p>
                <p className="text-[10px] text-slate-400">{e}</p>
              </div>
              <span className="text-xs font-bold text-navy">{p}</span>
            </div>
          ))}
        </div>
      </Card>
      <Card>
        <p className="text-[11px] font-semibold text-slate-500">Metode pembayaran</p>
        <div className="mt-2 grid grid-cols-3 gap-1.5 text-center text-[10px] font-semibold">
          <span className="rounded-lg border border-brand-300 bg-brand-50 py-1.5 text-brand-700">COD</span>
          <span className="rounded-lg border border-slate-100 py-1.5 text-slate-600">Transfer</span>
          <span className="rounded-lg border border-slate-100 py-1.5 text-slate-600">QRIS / VA</span>
        </div>
      </Card>
      <div className="rounded-xl bg-brand-500 py-2.5 text-center text-xs font-bold text-white shadow-sm">Pesan Sekarang · Rp160.000</div>
    </div>
  );
}

function MockOrdersWa() {
  return (
    <div className="space-y-2.5">
      <Card>
        <div className="flex items-center justify-between">
          <p className="text-[11px] font-bold text-navy">Pesanan Masuk</p>
          <span className="text-[10px] text-slate-400">Hari ini</span>
        </div>
        <div className="mt-2 space-y-1.5">
          {[
            ["Rina S.", "Toner Lemon ×2", "Baru", "bg-blue-50 text-blue-700"],
            ["Andi P.", "Serum Glow ×1", "Dikemas", "bg-amber-50 text-amber-700"],
            ["Dewi K.", "Paket Hemat ×1", "Dikirim", "bg-emerald-50 text-emerald-700"],
          ].map(([n, p, s, c]) => (
            <div key={n} className="flex items-center justify-between rounded-lg bg-slate-50 px-2.5 py-1.5">
              <div>
                <p className="text-xs font-bold text-navy">{n}</p>
                <p className="text-[10px] text-slate-400">{p}</p>
              </div>
              <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${c}`}>{s}</span>
            </div>
          ))}
        </div>
      </Card>
      <Card className="bg-[#e7f8ee]">
        <div className="flex items-center gap-1.5 text-[11px] font-bold text-emerald-700">
          <MessageCircle size={13} /> Follow up WhatsApp
        </div>
        <p className="mt-1.5 rounded-lg bg-white px-2.5 py-2 text-[11px] leading-relaxed text-slate-600">
          Halo Kak <b>Dewi</b>, pesanan <b>Paket Hemat</b> sudah dikirim ya 🙏 No. resi JNE: <b>JN0123456789</b>
        </p>
      </Card>
    </div>
  );
}

/* ─── Mockups: Marketplace ───────────────────────────── */

function MockConnectStores() {
  return (
    <div className="space-y-2.5">
      {[
        { n: "Fashion Store Official", s: "Shopee · Auto-sync aktif", icon: <ShopeeMark size={22} /> },
        { n: "Beauty Care Store", s: "Shopee · Auto-sync aktif", icon: <ShopeeMark size={22} /> },
        { n: "TikTok Shop", s: "Integrasi segera hadir", icon: <TikTokMark size={22} />, soon: true },
      ].map((x) => (
        <Card key={x.n} className={`flex items-center gap-2.5 ${"soon" in x ? "opacity-70" : ""}`}>
          {x.icon}
          <div className="flex-1">
            <p className="text-xs font-bold text-navy">{x.n}</p>
            <p className="text-[10px] text-slate-400">{x.s}</p>
          </div>
          {"soon" in x
            ? <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-semibold text-slate-500">Segera</span>
            : <span className="flex items-center gap-1 text-[10px] font-semibold text-emerald-600"><span className="h-1.5 w-1.5 rounded-full bg-emerald-500" /> Terhubung</span>}
        </Card>
      ))}
      <Card className="bg-slate-50/80">
        <div className="flex items-center justify-between">
          <p className="text-[11px] font-bold text-navy">Statistik Sinkronisasi</p>
          <RefreshCcw size={12} className="text-slate-400" />
        </div>
        <div className="mt-2 grid grid-cols-2 text-center">
          <div><p className="text-sm font-extrabold text-navy">8.642</p><p className="text-[10px] text-slate-400">Pesanan</p></div>
          <div><p className="text-sm font-extrabold text-emerald-600">Rp156,8jt</p><p className="text-[10px] text-slate-400">Omzet</p></div>
        </div>
      </Card>
    </div>
  );
}

function MockAnalytics() {
  const bars: [number, number][] = [[45, 18], [60, 24], [52, 20], [75, 31], [66, 27], [88, 36], [80, 33]];
  return (
    <div className="space-y-2.5">
      <div className="grid grid-cols-2 gap-2.5">
        <Card><p className="text-[10px] text-slate-500">Total Omzet</p><p className="text-sm font-extrabold text-navy">Rp45,2jt</p><p className="flex items-center gap-1 text-[10px] font-semibold text-emerald-600"><TrendingUp size={10} /> +12,5%</p></Card>
        <Card><p className="text-[10px] text-slate-500">Laba Bersih</p><p className="text-sm font-extrabold text-navy">Rp18,8jt</p><p className="text-[10px] font-semibold text-emerald-600">Margin 41,6%</p></Card>
      </div>
      <Card>
        <div className="flex items-center justify-between"><p className="text-[11px] font-bold text-navy">Tren Omzet Harian</p><span className="text-[10px] text-slate-400">7 hari terakhir</span></div>
        <div className="mt-2 flex h-16 items-end gap-1.5">
          {bars.map(([o, l], i) => <div key={i} className="flex h-full flex-1 items-end gap-0.5"><div className="flex-1 rounded-t bg-brand-400" style={{ height: `${o}%` }} /><div className="flex-1 rounded-t bg-emerald-400" style={{ height: `${l}%` }} /></div>)}
        </div>
        <div className="mt-1.5 flex justify-center gap-3 text-[10px] text-slate-500"><span className="flex items-center gap-1"><i className="h-1.5 w-1.5 rounded-full bg-brand-400" />Omzet</span><span className="flex items-center gap-1"><i className="h-1.5 w-1.5 rounded-full bg-emerald-400" />Laba</span></div>
      </Card>
      <Card>
        <p className="text-[11px] font-bold text-navy">Performa per Toko</p>
        {[["Fashion Store Official", 65], ["Beauty Care Store", 35]].map(([n, v]) => (
          <div key={n as string} className="mt-1.5 flex items-center gap-2 text-[10px]"><ShopeeMark size={12} /><span className="w-28 truncate text-slate-600">{n}</span><div className="h-1.5 flex-1 rounded-full bg-slate-100"><div className="h-full rounded-full bg-brand-500" style={{ width: `${v}%` }} /></div><b className="text-navy">{v}%</b></div>
        ))}
      </Card>
    </div>
  );
}

function MockReportExport() {
  return (
    <div className="space-y-2.5">
      <Card>
        <div className="flex items-center justify-between"><p className="text-[11px] font-bold text-navy">Laporan Laba Rugi · November</p><span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-semibold text-emerald-700">Sudah cair</span></div>
        <div className="mt-2 space-y-1.5">
          <div className="flex justify-between rounded-lg border-l-2 border-emerald-500 bg-slate-50 px-2.5 py-1.5 text-[11px]"><span className="text-slate-500">Pendapatan</span><b className="text-navy">Rp53.420.000</b></div>
          <div className="flex justify-between rounded-lg border-l-2 border-rose-500 bg-slate-50 px-2.5 py-1.5 text-[11px]"><span className="text-slate-500">Potongan, HPP, iklan & biaya</span><b className="text-rose-600">−Rp30.450.000</b></div>
          <div className="flex justify-between rounded-lg bg-brand-500 px-2.5 py-2 text-white"><span className="text-[11px] font-semibold">Laba Bersih</span><span className="text-xs font-extrabold">Rp22.970.000 · 43%</span></div>
        </div>
      </Card>
      <Card>
        <p className="text-[11px] font-bold text-navy">Ekspor Laporan</p>
        <div className="mt-2 grid grid-cols-2 gap-2">
          <span className="flex items-center justify-center gap-1.5 rounded-lg border border-emerald-200 bg-emerald-50 py-2 text-[11px] font-semibold text-emerald-700"><FileSpreadsheet size={13} />Excel</span>
          <span className="flex items-center justify-center gap-1.5 rounded-lg border border-rose-200 bg-rose-50 py-2 text-[11px] font-semibold text-rose-700"><FileText size={13} />PDF</span>
        </div>
      </Card>
    </div>
  );
}

/* ─── Data ────────────────────────────────────────────── */

type Flow = "marketplace" | "social";
type Step = { title: string; desc: string; bullets: string[]; mockup: React.ReactNode };

const FLOWS: Record<Flow, { tab: string; icon: typeof Globe; subtitle: string; steps: Step[] }> = {
  marketplace: {
    tab: "Marketplace",
    icon: Store,
    subtitle: "Untuk toko Shopee: pesanan, potongan, dan laba terhitung otomatis dari API resmi.",
    steps: [
      {
        title: "Hubungkan Toko Marketplace",
        desc: "Login ke Shopee lewat Pesanin (otorisasi resmi). Pesanan, produk, stok, chat, dan biaya iklan langsung tersinkron, tanpa cek manual lagi.",
        bullets: ["Integrasi API resmi Shopee, multi toko", "Pesanan & penghasilan sinkron tiap 30 detik", "Shopee Ads tersinkron harian (+PPN)"],
        mockup: <MockConnectStores />,
      },
      {
        title: "Input HPP & Lihat Analitik",
        desc: "Isi modal per produk atau SKU sekali. Pesanin membaca potongan Shopee per pesanan dan menampilkan laba bersih, tren, dan performa tiap toko.",
        bullets: ["Input HPP per produk/SKU, massal", "Rincian potongan: admin, layanan, Rp1.250, ongkir", "Omzet, laba, margin & ROAS real-time"],
        mockup: <MockAnalytics />,
      },
      {
        title: "Lacak Penghasilan & Ekspor Laporan",
        desc: "Pantau dana estimasi sampai sudah cair, catat pengeluaran, lalu ekspor laporan laba rugi dan arus kas untuk pembukuan.",
        bullets: ["Status Estimasi → Sudah cair otomatis", "Laba rugi, arus kas & pengeluaran", "Ekspor Excel & cetak PDF"],
        mockup: <MockReportExport />,
      },
    ],
  },
  social: {
    tab: "Media Sosial",
    icon: Globe,
    subtitle: "Untuk jualan lewat Instagram, TikTok, WhatsApp, Facebook, iklan, atau landing page sendiri.",
    steps: [
      {
        title: "Buat Produk & Link Checkout",
        desc: "Input produk, variasi, dan harga, form checkout langsung jadi. Tempel link di bio IG/TikTok, WhatsApp, iklan, atau landing page.",
        bullets: ["Link checkout & landing page builder", "Variasi, kupon & order bump", "Pixel Meta, TikTok & Google"],
        mockup: <MockLinkCheckout />,
      },
      {
        title: "Pembeli Checkout Sendiri",
        desc: "Pembeli isi alamat, ongkir dari 7+ kurir muncul otomatis. Bayar COD, transfer, QRIS, atau virtual account tanpa perlu chat tanya ongkir.",
        bullets: ["Ongkir JNE, J&T, SiCepat, SPX & lainnya", "COD, transfer & e-payment", "Data pembeli lama terisi otomatis"],
        mockup: <MockCheckoutOngkir />,
      },
      {
        title: "Proses Pesanan & Follow Up",
        desc: "Pesanan lunas langsung dipesankan kurir dan resi terbit sendiri. Kirim update ke pembeli lewat WhatsApp dan pantau laba di laporan yang sama.",
        bullets: ["Resi Biteship otomatis saat lunas", "Inbox & template WhatsApp", "Produk digital terkirim otomatis"],
        mockup: <MockOrdersWa />,
      },
    ],
  },
};

/* ─── Section ─────────────────────────────────────────── */

export function HowItWorks() {
  const [flow, setFlow] = useState<Flow>("marketplace");
  const current = FLOWS[flow];

  return (
    <div>
      <div className="mx-auto max-w-2xl text-center">
        <h2 className="text-3xl font-extrabold tracking-tight text-navy md:text-[42px]">Cara Kerja <span className="text-brand-500">Pesanin</span></h2>
        <p className="mt-4 text-lg text-slate-600">3 langkah sederhana, untuk jualan di marketplace maupun media sosial.</p>
        <div role="tablist" className="mt-8 inline-flex rounded-2xl border border-slate-200/80 bg-white p-1.5 shadow-sm">
          {(Object.keys(FLOWS) as Flow[]).map((k) => {
            const Icon = FLOWS[k].icon;
            const active = flow === k;
            return (
              <button key={k} type="button" role="tab" aria-selected={active} onClick={() => setFlow(k)}
                className={`flex items-center gap-2 rounded-xl px-5 py-2.5 text-sm font-bold transition ${active ? "bg-brand-500 text-white shadow-sm shadow-brand-500/25" : "text-slate-600 hover:bg-slate-50 hover:text-navy"}`}>
                <Icon size={16} />{FLOWS[k].tab}
              </button>
            );
          })}
        </div>
        <p className="mt-3 text-sm text-slate-500">{current.subtitle}</p>
      </div>

      <div key={flow} className="mt-12 grid grid-cols-1 gap-6 md:grid-cols-3">
        {current.steps.map((s, i) => (
          <div key={s.title} className="flex flex-col overflow-hidden rounded-3xl border border-slate-200/80 bg-white shadow-sm transition hover:-translate-y-1 hover:shadow-lg">
            <div className="border-b border-slate-100 bg-slate-50/70 p-5">{s.mockup}</div>
            <div className="flex flex-1 flex-col p-6">
              <span className="text-xs font-bold uppercase tracking-wide text-brand-600">Langkah {i + 1}</span>
              <h3 className="mt-1.5 text-xl font-bold text-navy">{s.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-slate-600">{s.desc}</p>
              <ul className="mt-auto space-y-2 pt-5 text-sm">
                {s.bullets.map((b) => <li key={b} className="flex items-start gap-2 text-slate-700"><CheckCircle2 size={16} className="mt-0.5 shrink-0 text-emerald-500" />{b}</li>)}
              </ul>
            </div>
          </div>
        ))}
      </div>

      <p className="mt-8 flex items-center justify-center gap-2 text-center text-sm text-slate-500">
        <CheckCircle2 size={16} className="text-emerald-500" />
        Bisa dipakai keduanya sekaligus: pesanan marketplace & media sosial tampil di satu dashboard dan satu laporan laba.
      </p>
    </div>
  );
}
