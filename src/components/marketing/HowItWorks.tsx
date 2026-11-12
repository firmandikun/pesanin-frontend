"use client";

import { useState } from "react";
import {
  CheckCircle2, Copy, Globe, MessageCircle, Package, RefreshCcw, Store, TrendingUp, Truck,
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
        { n: "TikTok Shop Beauty", s: "TikTok Shop · Auto-sync aktif", icon: <TikTokMark size={22} /> },
      ].map((x) => (
        <Card key={x.n} className="flex items-center gap-2.5">
          {x.icon}
          <div className="flex-1">
            <p className="text-xs font-bold text-navy">{x.n}</p>
            <p className="text-[10px] text-slate-400">{x.s}</p>
          </div>
          <span className="flex items-center gap-1 text-[10px] font-semibold text-emerald-600">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" /> Terhubung
          </span>
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

function MockSyncStock() {
  return (
    <div className="space-y-2.5">
      <Card>
        <div className="flex items-center justify-between">
          <p className="text-[11px] font-bold text-navy">Produk & Stok</p>
          <span className="flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-semibold text-emerald-700">
            <RefreshCcw size={10} /> Sync 30 detik
          </span>
        </div>
        <div className="mt-2 space-y-1.5">
          {[
            ["Kaos Oversize Hitam", "SKU-KO-01", 124],
            ["Kemeja Linen Putih", "SKU-KL-02", 38],
            ["Celana Cargo Army", "SKU-CC-03", 7],
          ].map(([n, sku, st]) => (
            <div key={n as string} className="flex items-center justify-between rounded-lg bg-slate-50 px-2.5 py-1.5">
              <div className="flex items-center gap-2">
                <Package size={14} className="text-slate-400" />
                <div>
                  <p className="text-xs font-bold text-navy">{n}</p>
                  <p className="text-[10px] text-slate-400">{sku}</p>
                </div>
              </div>
              <span className={`text-xs font-bold ${(st as number) < 10 ? "text-rose-600" : "text-navy"}`}>{st} pcs</span>
            </div>
          ))}
        </div>
      </Card>
      <Card>
        <p className="text-[11px] font-bold text-navy">Pesanan baru tersinkron</p>
        <div className="mt-2 flex items-center justify-between rounded-lg border border-slate-100 px-2.5 py-1.5">
          <div className="flex items-center gap-2">
            <ShopeeMark size={16} />
            <span className="text-xs font-semibold text-navy">#2411SHP0921</span>
          </div>
          <span className="text-[10px] font-semibold text-blue-700">Perlu dikirim</span>
        </div>
        <div className="mt-1.5 flex items-center justify-between rounded-lg border border-slate-100 px-2.5 py-1.5">
          <div className="flex items-center gap-2">
            <TikTokMark size={16} />
            <span className="text-xs font-semibold text-navy">#5781TTS0412</span>
          </div>
          <span className="text-[10px] font-semibold text-blue-700">Perlu dikirim</span>
        </div>
      </Card>
    </div>
  );
}

function MockProfit() {
  return (
    <div className="space-y-2.5">
      <div className="grid grid-cols-2 gap-2.5">
        <Card>
          <p className="text-[10px] text-slate-500">Total Omzet</p>
          <p className="text-sm font-extrabold text-navy">Rp45,2jt</p>
          <p className="flex items-center gap-1 text-[10px] font-semibold text-emerald-600"><TrendingUp size={10} /> +12,5%</p>
        </Card>
        <Card>
          <p className="text-[10px] text-slate-500">Laba Bersih</p>
          <p className="text-sm font-extrabold text-navy">Rp18,8jt</p>
          <p className="text-[10px] font-semibold text-emerald-600">Margin 41,6%</p>
        </Card>
      </div>
      <Card>
        <p className="text-[11px] font-bold text-navy">Rincian Laba</p>
        <div className="mt-2 space-y-1.5 text-[11px]">
          {[
            ["Pendapatan", "Rp45.200.000", "text-navy"],
            ["HPP produk", "−Rp19.800.000", "text-rose-600"],
            ["Biaya admin marketplace", "−Rp3.950.000", "text-rose-600"],
            ["Biaya iklan (Ads)", "−Rp2.650.000", "text-rose-600"],
          ].map(([l, v, c]) => (
            <div key={l} className="flex items-center justify-between">
              <span className="text-slate-500">{l}</span>
              <span className={`font-semibold ${c}`}>{v}</span>
            </div>
          ))}
        </div>
        <div className="mt-2.5 flex items-center justify-between rounded-lg bg-brand-500 px-2.5 py-2 text-white">
          <span className="text-[11px] font-semibold">Laba Bersih</span>
          <span className="text-xs font-extrabold">Rp18.800.000</span>
        </div>
      </Card>
    </div>
  );
}

/* ─── Data ────────────────────────────────────────────── */

type Flow = "direct" | "marketplace";

const FLOWS: Record<Flow, {
  tab: string;
  icon: typeof Globe;
  subtitle: string;
  steps: { title: string; desc: string; mockup: React.ReactNode }[];
}> = {
  direct: {
    tab: "Jualan di Medsos & Website",
    icon: Globe,
    subtitle: "Untuk seller yang jualan lewat Instagram, TikTok, WhatsApp, iklan, atau landing page sendiri.",
    steps: [
      {
        title: "Buat Produk & Link Checkout",
        desc: "Input produk, variasi, dan harga — form checkout langsung jadi. Tempel link di bio IG/TikTok, WhatsApp, iklan, atau landing page builder.",
        mockup: <MockLinkCheckout />,
      },
      {
        title: "Pembeli Checkout Sendiri",
        desc: "Pembeli isi alamat, ongkir 7+ kurir muncul otomatis. Bayar via COD, transfer, QRIS, atau virtual account — tanpa perlu chat tanya ongkir.",
        mockup: <MockCheckoutOngkir />,
      },
      {
        title: "Kelola Pesanan & Follow Up WA",
        desc: "Pesanan masuk rapi di dashboard. Input resi massal, kirim notifikasi & follow up WhatsApp sekali klik, pantau omzet dan pixel iklan.",
        mockup: <MockOrdersWa />,
      },
    ],
  },
  marketplace: {
    tab: "Jualan di Marketplace",
    icon: Store,
    subtitle: "Untuk seller yang punya toko di Shopee & TikTok Shop dan ingin semua data terpusat otomatis.",
    steps: [
      {
        title: "Hubungkan Toko Marketplace",
        desc: "Hubungkan satu atau banyak toko Shopee & TikTok Shop lewat otorisasi resmi. Tidak perlu input ulang data — semua tersinkron otomatis.",
        mockup: <MockConnectStores />,
      },
      {
        title: "Sync Produk, Stok & Pesanan",
        desc: "Pesanan baru ditarik tiap 30 detik. Kelola listing, variasi, dan stok dari satu dashboard — publish produk massal ke semua toko.",
        mockup: <MockSyncStock />,
      },
      {
        title: "Input HPP & Pantau Laba Bersih",
        desc: "Masukkan modal per SKU, Pesanin menghitung laba bersih riil setelah dipotong biaya admin marketplace dan biaya iklan Shopee Ads.",
        mockup: <MockProfit />,
      },
    ],
  },
};

/* ─── Section ─────────────────────────────────────────── */

export function HowItWorks() {
  const [flow, setFlow] = useState<Flow>("direct");
  const current = FLOWS[flow];

  return (
    <div>
      <div className="mx-auto max-w-2xl text-center">
        <span className="inline-block rounded-full bg-brand-100 px-3 py-1 text-xs font-bold text-brand-700">Cara Kerja</span>
        <h2 className="mt-4 text-3xl font-extrabold tracking-tight text-navy md:text-[40px]">
          Cara Kerja <span className="text-brand-500">Pesanin</span>
        </h2>
        <p className="mt-4 text-lg text-slate-600">
          Jualan di medsos, website, atau marketplace? Pilih alurmu — siap terima pesanan dalam 3 langkah.
        </p>

        <div role="tablist" className="mt-8 inline-flex rounded-2xl border border-slate-200/80 bg-white p-1.5 shadow-[0_1px_3px_rgba(0,0,0,0.03)]">
          {(Object.keys(FLOWS) as Flow[]).map((k) => {
            const Icon = FLOWS[k].icon;
            const active = flow === k;
            return (
              <button
                key={k}
                type="button"
                role="tab"
                aria-selected={active}
                onClick={() => setFlow(k)}
                className={`flex items-center gap-2 rounded-xl px-4 py-2.5 text-xs font-bold transition sm:px-5 sm:text-sm ${
                  active ? "bg-brand-500 text-white shadow-sm shadow-brand-500/25" : "text-slate-600 hover:bg-slate-50 hover:text-navy"
                }`}
              >
                <Icon size={16} /> {FLOWS[k].tab}
              </button>
            );
          })}
        </div>
        <p className="mt-3 text-sm text-slate-500">{current.subtitle}</p>
      </div>

      <div key={flow} className="mt-12 grid grid-cols-1 gap-6 md:grid-cols-3">
        {current.steps.map((s, i) => (
          <div
            key={s.title}
            className="flex flex-col overflow-hidden rounded-3xl border border-slate-100/90 bg-white shadow-[0_2px_8px_-2px_rgba(0,0,0,0.04),0_1px_3px_-1px_rgba(0,0,0,0.02)] transition hover:-translate-y-1 hover:border-slate-200 hover:shadow-[0_8px_16px_-4px_rgba(0,0,0,0.06)]"
          >
            <div className="border-b border-slate-100/80 bg-slate-50/70 p-5">{s.mockup}</div>
            <div className="flex flex-1 flex-col p-6">
              <span className="flex h-8 w-8 items-center justify-center rounded-full bg-brand-100 text-sm font-extrabold text-brand-600">
                {i + 1}
              </span>
              <h3 className="mt-3 text-xl font-bold text-navy">{s.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-slate-600">{s.desc}</p>
            </div>
          </div>
        ))}
      </div>

      <p className="mt-8 flex items-center justify-center gap-2 text-center text-sm text-slate-500">
        <CheckCircle2 size={16} className="text-emerald-500" />
        Bisa dipakai keduanya sekaligus — pesanan medsos, website & marketplace tampil dalam satu dashboard.
      </p>
    </div>
  );
}

