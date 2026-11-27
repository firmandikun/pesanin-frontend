"use client";

import Link from "next/link";
import { Menu, X } from "lucide-react";
import { useEffect, useState } from "react";
import { WaLink } from "@/components/marketing/Contact";
import { loadSiteConfig } from "@/lib/site";
import { CATALOG, YEARLY_DISCOUNT, type Track } from "@/lib/plans";

/* Landing page (Figma "Pesanin" → Beranda, node 1:4193). Interactive pieces only; layout lives in app/page.tsx. */

import { WRAP, Wordmark } from "@/components/home/shared";

const INK = "text-[#1a1f2e]";
const MUTED = "text-[#878787]";

const NAV: [string, string][] = [["Fitur", "#fitur"], ["Harga", "#harga"], ["Resource", "/tutorials"]];

/** Top announcement bar + navbar (nodes 1:4194, 1:4198). */
export function HomeHeader() {
  const [open, setOpen] = useState(false);
  return (
    <header className="relative z-20">
      <div className="flex items-center justify-center bg-[linear-gradient(to_left,rgba(255,214,166,0.6)_1.91%,rgba(255,154,134,0.8)_97.4%)] px-4 py-[8px] text-[12px] leading-[18px] tracking-[0.028px] sm:text-[14px]">
        <p className={INK}>Integrasi resmi shopee open platform</p>
        <span className="w-[21px] text-center text-[#fe551b]" aria-hidden>•</span>
        <p className={INK}>Sinkron 30 detik</p>
      </div>
      <div className={`${WRAP} flex h-[60px] items-center justify-between py-[10px]`}>
        <Link href="/" aria-label="Pesanin"><Wordmark /></Link>
        <nav className="hidden items-center gap-[22px] md:flex">
          {NAV.map(([l, h]) => <Link key={l} href={h} className={`text-[16px] leading-[21px] ${INK} transition hover:text-[#fe551b]`}>{l}</Link>)}
        </nav>
        <div className="flex items-center gap-[16px]">
          <Link href="/login" className={`hidden text-[16px] leading-[21px] ${INK} transition hover:text-[#fe551b] md:block`}>Masuk</Link>
          <Link href="/register" className="flex h-[40px] w-[123px] items-center justify-center rounded-[32px] bg-[#fe551b] text-[14px] leading-[24px] tracking-[0.028px] text-white transition hover:bg-[#e64a14]">Coba Gratis</Link>
          <button type="button" onClick={() => setOpen((v) => !v)} aria-label="Menu" className={`flex h-10 w-10 items-center justify-center rounded-full ${INK} md:hidden`}>
            {open ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>
      </div>
      {open && (
        <nav className="absolute inset-x-0 top-full border-y border-[#efeeed] bg-white px-4 pb-4 pt-2 shadow-lg md:hidden">
          {[...NAV, ["Masuk", "/login"] as [string, string]].map(([l, h]) => (
            <Link key={l} href={h} onClick={() => setOpen(false)} className={`block rounded-xl px-3 py-3 text-[16px] ${INK} hover:bg-[#fafafa]`}>{l}</Link>
          ))}
        </nav>
      )}
    </header>
  );
}

/** "Jadwalkan Demo" (WhatsApp) — kept as a client link so the contact number comes from the platform settings. */
export function DemoLink({ className, children }: { className?: string; children: React.ReactNode }) {
  return <WaLink text="Halo tim Pesanin, saya mau jadwalkan demo" target="_blank" rel="noopener noreferrer" className={className}>{children}</WaLink>;
}

/* ───────────── Segmentasi solusi (node 1:4251) ───────────── */

type SegCard = { title: string; desc: string; img: React.ReactNode };
const shot = (src: string, cls: string, imgCls = "absolute inset-0 size-full object-cover") => (
  <div className={`absolute overflow-hidden rounded-[8px] ${cls}`}>
    {/* eslint-disable-next-line @next/next/no-img-element */}
    <img src={src} alt="" loading="lazy" className={`pointer-events-none max-w-none ${imgCls}`} />
  </div>
);
const centered = "left-1/2 -translate-x-1/2";

const SEGMENTS: { id: string; label: string; cards: SegCard[] }[] = [
  {
    id: "shopee", label: "Jualan di Shopee", cards: [
      { title: "Baca 20+ Potongan Otomatis", desc: "Tarik rincian dana estimasi hingga sudah cair langsung dari API resmi Shopee tiap 30 detik.",
        img: shot("/landing/seg-potongan.png", `${centered} top-[4px] h-[338px] w-[314px] border border-[#efeeed]`, "absolute left-[-5.12%] top-[-4.14%] h-[104.14%] w-[109.28%]") },
      { title: "Laba Bersih per SKU", desc: "Input HPP massal sekali saja, profit bersih tiap pesanan dan tiap varian langsung terhitung otomatis.",
        img: shot("/landing/seg-hpp.png", `${centered} top-[4px] h-[356.2px] w-[314px] border border-[#efeeed]`, "absolute left-[-4.42%] top-[-1.87%] h-[105.85%] w-[108.93%]") },
      { title: "Profit Setelah Iklan (+PPN)", desc: "Sinkronisasi biaya Shopee Ads harian lengkap dengan PPN agar tahu produk mana yang benar-benar cuan.",
        img: shot("/landing/seg-iklan.png", `${centered} top-[4px] h-[366px] w-[314px] border border-[#efeeed]`, "absolute left-[-5.22%] top-[-2.66%] h-[104.36%] w-[114.53%]") },
    ],
  },
  {
    id: "sosmed", label: "Jualan di Sosmed", cards: [
      { title: "Checkout COD & QRIS Otomatis", desc: "Landing page dengan domain sendiri, ongkir 7+ kurir, COD, dan pembayaran QRIS/VA tanpa rekap manual.",
        img: <>{shot("/landing/cap-domain.png", "left-[31px] top-[5px] h-[65px] w-[335px] shadow-[0_1px_4px_rgba(12,12,13,0.1),0_1px_4px_rgba(12,12,13,0.05)]", "absolute left-[-3.36%] top-[-18.46%] h-[135.38%] w-[103.43%]")}
          {shot("/landing/cap-custom-domain.png", "left-[58px] top-[90px] h-[96px] w-[319px] shadow-[0_1px_4px_rgba(12,12,13,0.1),0_1px_4px_rgba(12,12,13,0.05)]", "absolute left-[-4.8%] top-[-13.27%] h-[236.28%] w-[109.87%]")}</> },
      { title: "Laba Setelah Meta Ads", desc: "Biaya Meta Ads terhubung ke laporan, jadi kamu tahu kampanye mana yang benar-benar menghasilkan profit.",
        img: <>{shot("/landing/cap-ads.png", "left-[20px] top-[5px] h-[85px] w-[819px]", "absolute left-[-1.2%] top-[-9.17%] h-[109.17%] w-[101.2%]")}
          {shot("/landing/cap-ads.png", "left-[-233px] top-[106px] h-[81px] w-[786px]", "absolute left-[-1.2%] top-[-9.17%] h-[109.17%] w-[101.2%]")}</> },
      { title: "Inbox WhatsApp & CRM", desc: "Balas chat WhatsApp Business dari satu layar, beri label pelanggan, dan bagi chat ke tim CS.",
        img: shot("/landing/cap-chat.png", "left-[20px] top-[5px] h-[331px] w-[1037px]") },
    ],
  },
  {
    id: "keduanya", label: "Keduanya", cards: [
      { title: "Laba Rugi Lintas Kanal", desc: "Shopee, checkout web, dan WhatsApp masuk ke satu laporan laba bersih per periode.",
        img: shot("/landing/cap-laba.png", "left-[19px] top-[4px] h-[349px] w-[777px]") },
      { title: "Satu Inbox untuk Semua Chat", desc: "Chat Shopee dan WhatsApp Business dalam satu layar, lengkap dengan riwayat pesanan.",
        img: shot("/landing/cap-chat.png", "left-[20px] top-[5px] h-[331px] w-[1037px]") },
      { title: "Peringatan Otomatis", desc: "Pantau perubahan status dana dan deteksi dini produk rugi atau HPP kosong.",
        img: shot("/landing/cap-otomasi.png", "left-[11px] top-[5px] h-[277px] w-[759px]") },
    ],
  },
];

export function SegmentTabs() {
  const [active, setActive] = useState(SEGMENTS[0].id);
  const seg = SEGMENTS.find((s) => s.id === active)!;
  return (
    <>
      <div className="flex max-w-full gap-[8px] overflow-x-auto rounded-[100px] bg-white p-[4px]" role="tablist">
        {SEGMENTS.map((s) => (
          <button key={s.id} type="button" role="tab" aria-selected={s.id === active} onClick={() => setActive(s.id)}
            className={`shrink-0 whitespace-nowrap rounded-[100px] p-[10px] text-center text-[16px] leading-[21px] transition ${s.id === active ? "bg-[#fe551b] px-[12px] font-semibold text-white" : "w-[150px] text-[#1d2127] hover:bg-[#fafafa]"}`}>
            {s.label}
          </button>
        ))}
      </div>
      <div className="grid w-full gap-[20px] md:grid-cols-2 lg:grid-cols-3 lg:gap-[20.5px]">
        {seg.cards.map((c) => (
          <div key={c.title} className="flex h-[417px] flex-col overflow-clip rounded-[16px] bg-white">
            <div className="flex flex-col gap-[16px] p-[20px]">
              <p className="text-[18px] font-semibold leading-[23px] text-[#1d2127]">{c.title}</p>
              <p className="min-h-[36px] text-[14px] leading-[18px] text-[#1e1e1d]">{c.desc}</p>
            </div>
            <div className="relative flex-1">{c.img}</div>
          </div>
        ))}
      </div>
    </>
  );
}

/* ───────────── Paket & harga (node 1:4359) ───────────── */

const fmt = (n: number) => "Rp " + Math.round(n).toLocaleString("id-ID");
const TRACK_LABEL: Record<Track, string> = { marketplace: "Seller Shopee", social: "Sosial Media & Web" };

/** Copy per plan as written in the design (marketplace) and in the price list (social). */
const PLAN_COPY: Record<Track, Record<string, { desc: string; features: (orders: string) => string[]; note: [string, string] }>> = {
  marketplace: {
    gratis: { desc: "Untuk menguji akurasi potongan & laba bersih pertama.", features: (o) => [`Maks. ${o} order/bln`, "1 Toko Shopee", "Baca 20+ potongan & HPP dasar"], note: ["Selamanya", "Tanpa kartu kredit"] },
    starter: { desc: "Untuk solo seller aktif yang ingin berhenti rekap manual.", features: (o) => [`Maks. ${o} order/bln`, "2 Toko Shopee", "HPP massal & profit per SKU", "Pantau Shopee Ads (+PPN)", "Ekspor Excel & PDF"], note: ["Ditagih bulanan", "Bebas berhenti kapan saja"] },
    bisnis: { desc: "Pilihan utama UMKM bertumbuh dengan tim operasional.", features: (o) => [`Maks. ${o} order/bln`, "5 Toko Shopee", "5 Anggota Tim (RBAC)", "Pencatatan Pengeluaran & Arus Kas", "Inbox Chat Shopee"], note: ["Selamanya", "Paling ideal untuk scale"] },
    pro: { desc: "Untuk seller volume tinggi dengan banyak toko & anggota tim.", features: (o) => [`Maks. ${o} order/bln`, "15 Toko Shopee", "20 Anggota Tim", "Riset Produk & Prioritas Sinkronisasi", "Grup Support VIP"], note: ["Ditagih bulanan", "Kapasitas tinggi"] },
  },
  social: Object.fromEntries(CATALOG.social.map((p) => [p.id, {
    desc: `Untuk ${p.tagline.charAt(0).toLowerCase()}${p.tagline.slice(1)}.`,
    features: (o: string) => [`Maks. ${o} order/bln`, ...p.features],
    note: (p.monthly === 0 ? ["Selamanya", "Tanpa kartu kredit"] : p.highlight ? ["Selamanya", "Paling ideal untuk scale"] : ["Ditagih bulanan", "Bebas berhenti kapan saja"]) as [string, string],
  }])),
};

function Check() {
  // eslint-disable-next-line @next/next/no-img-element
  return <img src="/landing/ic-check.svg" alt="" width={16} height={16} className="size-[16px] shrink-0" />;
}

export function PricingPlans() {
  const [track, setTrack] = useState<Track>("marketplace");
  const [yearly, setYearly] = useState(false);
  const [catalog, setCatalog] = useState(CATALOG);
  const [discount, setDiscount] = useState(YEARLY_DISCOUNT);
  useEffect(() => {
    loadSiteConfig().then((s) => {
      if (!s?.pricing) return;
      setDiscount(s.pricing.yearly_discount);
      setCatalog((cur) => Object.fromEntries((Object.keys(cur) as Track[]).map((t) => [t, cur[t].map((p) => {
        const live = s.pricing!.catalog[t]?.find((x) => x.id === p.id);
        return live ? { ...p, name: live.name, monthly: live.monthly, orders: live.limits.orders ?? null } : p;
      })])) as typeof CATALOG);
    });
  }, []);
  const perMonth = (m: number) => (yearly ? Math.floor((m * (100 - discount)) / 100 / 1000) * 1000 : m);

  return (
    <>
      <div className="flex flex-wrap items-start justify-center gap-[12px] sm:gap-[20px]">
        <div className="flex gap-[8px] rounded-[100px] bg-white p-[4px]" role="tablist">
          {(Object.keys(TRACK_LABEL) as Track[]).map((t) => (
            <button key={t} type="button" role="tab" aria-selected={t === track} onClick={() => setTrack(t)}
              className={`whitespace-nowrap rounded-[100px] p-[10px] text-center text-[16px] leading-[21px] transition ${t === track ? "bg-[#fe551b] font-semibold text-white" : "w-[150px] text-[#1d2127] hover:bg-[#fafafa]"}`}>
              {TRACK_LABEL[t]}
            </button>
          ))}
        </div>
        <div className="flex items-center rounded-[100px] bg-white p-[4px]">
          <button type="button" onClick={() => setYearly(false)} className={`w-[110px] p-[10px] text-center text-[16px] leading-[21px] sm:w-[150px] ${INK} ${!yearly ? "font-medium" : ""}`}>Bulanan</button>
          <button type="button" role="switch" aria-checked={yearly} aria-label="Tagih tahunan" onClick={() => setYearly((v) => !v)}
            className="relative h-[20px] w-[36px] shrink-0 rounded-[100px] bg-[#fe551b]">
            <span className={`absolute top-[2px] size-[16px] rounded-[100px] bg-white shadow-[0_2px_4px_rgba(39,39,39,0.1)] transition-all ${yearly ? "left-[18px]" : "left-[2px]"}`} />
          </button>
          <button type="button" onClick={() => setYearly(true)} className="flex items-baseline gap-[4px] p-[10px]">
            <span className={`text-center text-[16px] leading-[21px] ${INK} ${yearly ? "font-medium" : ""}`}>Tahunan</span>
            <span className="rounded-[20px] bg-[rgba(254,85,27,0.1)] px-[8px] py-[4px] text-[10px] font-medium leading-[13px] text-[#fe551b]">Hemat {discount}%</span>
          </button>
        </div>
      </div>

      <div className="grid w-full items-start gap-[24px] sm:grid-cols-2 xl:grid-cols-4">
        {catalog[track].map((p) => {
          const copy = PLAN_COPY[track][p.id];
          const free = p.monthly === 0;
          const hl = !!p.highlight;
          const note: [string, string] = yearly && !free ? ["Ditagih tahunan", `${fmt(perMonth(p.monthly) * 12)}/tahun`] : copy.note;
          return (
            <div key={p.id} className={`flex flex-col overflow-clip rounded-[16px] bg-white ${p.id === "pro" ? "" : "self-stretch"} ${hl ? "shadow-[inset_0_0_0_1px_#fe551b]" : ""}`}>
              <div className="flex flex-col gap-[16px] p-[20px]">
                <div className="flex min-h-[21px] items-center justify-between">
                  <p className={`text-[16px] font-semibold leading-[21px] ${INK}`}>{p.name}</p>
                  {hl && <span className="rounded-[20px] bg-[#fe551b] px-[8px] py-[6px] text-[12px] font-medium leading-[16px] tracking-[0.24px] text-white">Terpopuler</span>}
                </div>
                <p className={`text-[12px] leading-[16px] ${MUTED}`}>{copy.desc}</p>
              </div>
              <div className="flex flex-1 flex-col gap-[12px] p-[20px]">
                <div className="flex items-center gap-[12px]">
                  <p className={`text-[14px] font-medium leading-[18px] ${INK}`}>TERMASUK</p>
                  <span className="h-px flex-1 bg-[#ededed]" />
                </div>
                {copy.features((p.orders ?? 0).toLocaleString("id-ID")).map((f) => (
                  <div key={f} className="flex items-start gap-[8px]">
                    <Check />
                    <p className={`flex-1 text-[14px] leading-[18px] ${INK}`}>{f}</p>
                  </div>
                ))}
              </div>
              <div className="flex flex-col justify-center p-[20px]">
                <div className="flex items-center gap-[8px]">
                  <p className={`whitespace-nowrap text-[32px] font-bold leading-[42px] sm:leading-[47px] sm:text-[36px] ${INK}`}>{fmt(perMonth(p.monthly))}</p>
                  <p className={`whitespace-nowrap text-[12px] leading-[16px] ${MUTED}`}>/ bulan</p>
                </div>
                <p className={`flex whitespace-nowrap text-[12px] leading-[16px] ${MUTED}`}>{note[0]}<span className="w-[18px] text-center" aria-hidden>•</span>{note[1]}</p>
              </div>
              <div className="px-[20px] pb-[20px]">
                <Link href={`/register?track=${track}&plan=${p.id}${yearly && !free ? "&billing=yearly" : ""}`}
                  className={`flex h-[42px] w-full items-center justify-center rounded-[20px] border border-[#efeeed] px-[16px] text-[14px] font-medium leading-[18px] transition ${hl ? "bg-[#fe551b] text-white hover:bg-[#e64a14]" : `bg-[#fafafa] ${INK} hover:bg-[#f1f0ef]`}`}>
                  {free ? "Mulai Gratis" : "Coba Gratis 7 Hari"}
                </Link>
              </div>
            </div>
          );
        })}
      </div>
    </>
  );
}

/* ───────────── FAQ (node 1:4579) ───────────── */

const FAQ: [string, React.ReactNode][] = [
  ["Apakah potongan shopee benar-benar terbaca otomatis?", "Ya. Pesanin mengambil rincian penghasilan tiap pesanan langsung dari API resmi Shopee: biaya admin, layanan, pemrosesan pesanan, ongkir aktual dan subsidinya, komisi AMS, pajak, sampai ongkir retur. Sebelum dana cair angkanya ditandai \"Estimasi\" dan otomatis diperbarui saat dana dilepas."],
  ["Bagaimana jika saya hanya jualan di Meta ads? atau whatsapp tanpa shopee", <>Pilih <b className="font-bold">Jalur 2: Social &amp; Web</b> yang fokus pada landing page builder, checkout COD/QRIS otomatis RajaOngkir, tracking pixel, dan laporan laba bersih setelah iklan. Anda tidak perlu membayar fitur marketplace yang tidak terpakai.</>],
  ["Apakah data toko dan akun shopee saya aman?", "Koneksi ke Shopee dan Meta memakai login resmi (OAuth), Pesanin tidak pernah meminta password tokomu. Token disimpan terenkripsi, akses tim bisa dibatasi per peran, dan koneksi bisa diputus kapan saja."],
  ["Bagaimana cara mengisi HPP jika produk saya ada ratusan SKU?", "Isi HPP per produk atau per SKU secara massal sekali saja langsung dari tabel produk, tanpa Excel. Setelah itu laba tiap pesanan dan tiap varian terhitung otomatis."],
  ["Apa yang terjadi jika kuota pesanan bulanan saya habis?", "Pesanan tetap masuk dan tidak ada yang ditolak. Kami hanya mengingatkan untuk upgrade paket."],
  ["Bisa pindah dari tagihan bulanan ke tahunan nanti?", "Bisa. Ganti ke tagihan tahunan kapan saja dari menu Langganan; sisa masa paket bulananmu dihitung proporsional."],
];

export function Faq() {
  const [open, setOpen] = useState<number | null>(1);
  return (
    <div className="flex w-full max-w-[800px] flex-col gap-[20px]">
      {FAQ.map(([q, a], i) => {
        const on = open === i;
        return (
          <button key={q} type="button" onClick={() => setOpen(on ? null : i)} aria-expanded={on}
            className={`flex w-full items-center gap-[16px] rounded-[16px] p-[20px] text-left transition ${on ? "border border-[#ededed] bg-white shadow-[0_12px_16px_-4px_rgba(48,48,48,0.08),0_4px_6px_-2px_rgba(48,48,48,0.03)]" : "bg-[#fafafa] hover:bg-[#f4f4f4]"}`}>
            <span className={`flex flex-1 flex-col gap-[16px] ${INK}`}>
              <span className="text-[18px] font-medium leading-[23px]">{q}</span>
              {on && <span className="text-[16px] leading-[21px]">{a}</span>}
            </span>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={on ? "/landing/ic-minus.svg" : "/landing/ic-plus.svg"} alt="" width={24} height={24} className="size-[24px] shrink-0" />
          </button>
        );
      })}
    </div>
  );
}
