import {
  ArrowRight, BarChart3, Bell, CheckCircle2, ChevronDown, CreditCard,
  LayoutTemplate, Link2, MessageCircle, PackageCheck, RefreshCcw,
  ShieldCheck, ShoppingBag, Sparkles, Tag, Truck, Users, Zap,
  Globe, TrendingUp, Rocket, Star, Award, Boxes,
} from "lucide-react";
import Link from "next/link";
import { Logo, LogoMark, Wordmark } from "@/components/Logo";
import { Pricing } from "@/components/marketing/Pricing";

const NAV = [["Fitur", "#fitur"], ["Cara Kerja", "#cara-kerja"], ["Integrasi", "#integrasi"], ["Harga", "#harga"], ["FAQ", "#faq"]] as const;

const STEPS = [
  [ShoppingBag, "Buat produk", "Isi nama, harga, variasi, dan berat. Form checkout langsung jadi tanpa coding satu baris pun."],
  [Link2, "Bagikan link", "Tempel link di bio, iklan, atau landing page. Pembeli isi alamat, ongkir muncul otomatis dari 7+ kurir."],
  [PackageCheck, "Kelola & kirim", "Pesanan masuk rapi di dashboard, follow up WhatsApp sekali klik, cetak label & input resi massal."],
] as const;

const FEATURES = [
  {
    icon: Truck, title: "Ongkir otomatis 7+ kurir",
    desc: "Tarif JNE, SiCepat, J&T, SPX, SAP dihitung real-time dari gudangmu. Diskon atau subsidi ongkir per produk.",
    color: "bg-sky-500", badge: "Shipping",
  },
  {
    icon: CreditCard, title: "E-Payment Midtrans",
    desc: "QRIS, GoPay, ShopeePay, OVO, Virtual Account, Mandiri Bill — semua aktif tanpa konfigurasi tambahan.",
    color: "bg-violet-500", badge: "Payment",
  },
  {
    icon: MessageCircle, title: "Chat & Follow Up WhatsApp",
    desc: "Template dari Welcome sampai resi kirim. Rotator CS dengan jadwal shift. Satu klik pesan terisi otomatis.",
    color: "bg-emerald-500", badge: "Chat",
  },
  {
    icon: LayoutTemplate, title: "Landing Page Builder",
    desc: "Halaman jualan drag-and-drop dengan form checkout tertanam. Siap dipasang iklan Meta & TikTok.",
    color: "bg-orange-500", badge: "Builder",
  },
  {
    icon: RefreshCcw, title: "Abandoned Checkout",
    desc: "Calon pembeli yang belum selesai order tetap tercatat. Follow up otomatis via WhatsApp bisa diaktifkan.",
    color: "bg-rose-500", badge: "Automation",
  },
  {
    icon: TrendingUp, title: "Market Research",
    desc: "Google Trends & data Shopee Affiliate langsung di dashboard. Riset produk laris tanpa buka tab baru.",
    color: "bg-amber-500", badge: "Research",
  },
  {
    icon: Tag, title: "Kupon & Order Bump",
    desc: "Tawarkan produk tambahan saat checkout dan kupon diskon. Rata-rata nilai order naik 20–35%.",
    color: "bg-pink-500", badge: "Sales",
  },
  {
    icon: BarChart3, title: "Laporan & Pixel Tracking",
    desc: "Penjualan per hari, kota, kurir, dan UTM. Pixel Meta, TikTok, Google terpasang dalam hitungan menit.",
    color: "bg-indigo-500", badge: "Analytics",
  },
  {
    icon: Globe, title: "Custom Domain",
    desc: "Arahkan domain-mu ke Pesanin, SSL dipasang otomatis. Tokomu tampil profesional di domainmu sendiri.",
    color: "bg-teal-500", badge: "Domain",
  },
  {
    icon: Users, title: "Affiliate & Referral",
    desc: "Aktifkan program afiliasi untuk produk-mu. Lacak referral, komisi, dan payout langsung dari dashboard.",
    color: "bg-cyan-500", badge: "Affiliate",
  },
  {
    icon: Boxes, title: "Variasi & Stok Produk",
    desc: "Kelola ukuran, warna, dan variasi lain. Stok terpotong otomatis setiap ada pesanan masuk.",
    color: "bg-lime-600", badge: "Inventory",
  },
  {
    icon: Bell, title: "Notifikasi Push & WA",
    desc: "Notifikasi pesanan baru langsung ke HP-mu via Push Notification dan WhatsApp tanpa reload dashboard.",
    color: "bg-brand-600", badge: "Notif",
  },
] as const;

const INTEGRATIONS = [
  { name: "Midtrans", desc: "E-Payment", bg: "bg-blue-600", emoji: "💳" },
  { name: "Biteship", desc: "Kurir & COD", bg: "bg-sky-500", emoji: "📦" },
  { name: "RajaOngkir", desc: "Tarif Ongkir", bg: "bg-orange-500", emoji: "🚚" },
  { name: "WhatsApp", desc: "Chat & Notifikasi", bg: "bg-emerald-500", emoji: "💬" },
  { name: "Shopee", desc: "Market Research", bg: "bg-orange-600", emoji: "🛍️" },
  { name: "Meta Pixel", desc: "Tracking Iklan", bg: "bg-blue-500", emoji: "🎯" },
  { name: "TikTok Pixel", desc: "Tracking TikTok", bg: "bg-slate-900", emoji: "📱" },
  { name: "Google Ads", desc: "Konversi Google", bg: "bg-red-500", emoji: "🔍" },
] as const;

const STATS = [
  ["10.000+", "Seller aktif"],
  ["Rp 50M+", "Transaksi diproses"],
  ["500K+", "Pesanan berhasil"],
  ["99.9%", "Uptime sistem"],
] as const;

const FAQ = [
  ["Apakah benar ada paket gratis?", "Ya. Paket Gratis bisa dipakai selamanya untuk 3 produk dan 100 pesanan per bulan, tanpa kartu kredit."],
  ["Bisa ganti paket kapan saja?", "Bisa. Upgrade langsung aktif dan sisa masa paket lama dihitung proporsional. Downgrade berlaku di periode tagihan berikutnya."],
  ["Bagaimana kalau kuota pesanan habis?", "Form tetap menerima pesanan, kami hanya mengingatkan untuk upgrade. Pesanan pembeli tidak akan ditolak."],
  ["Apakah Pesanin memotong uang penjualan saya?", "Tidak. Pembayaran transfer langsung masuk ke rekeningmu. Untuk e-payment, hanya ada biaya dari mitra payment gateway."],
  ["Bisa pakai domain sendiri?", "Bisa mulai paket Starter. Arahkan DNS domainmu ke Pesanin, SSL dipasang otomatis."],
  ["Metode pembayaran langganan apa saja?", "Transfer bank, virtual account, QRIS, dan e-wallet. Faktur dikirim ke email setiap periode tagihan."],
  ["Apakah ada COD?", "Ya! COD tersedia via Biteship. Biaya COD dihitung otomatis dan bisa dibebankan ke pembeli atau ditanggung penjual."],
] as const;

function HeroMockup() {
  return (
    <div className="relative mx-auto w-full max-w-[460px]">
      {/* Checkout card */}
      <div className="rounded-[28px] bg-white p-5 shadow-2xl shadow-navy/10 ring-1 ring-slate-100">
        <div className="flex items-center gap-3">
          <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-amber-50 text-2xl">🍋</span>
          <div className="flex-1">
            <p className="font-bold text-navy">Toner Lemon Brightening</p>
            <p className="text-sm text-slate-500">100 ml · <s>Rp189.000</s> <b className="text-brand-600">Rp149.000</b></p>
          </div>
        </div>
        <div className="mt-4 space-y-2.5">
          {["Nama lengkap", "No. WhatsApp"].map((l, i) => (
            <div key={l} className="rounded-xl border border-slate-200 px-3 py-2.5 text-sm">
              <span className="block text-[11px] text-slate-400">{l}</span>
              <span className="font-medium text-navy">{i ? "0812 3456 7890" : "Rina Kartika"}</span>
            </div>
          ))}
          <div className="rounded-xl border border-slate-200 px-3 py-2.5 text-sm">
            <span className="block text-[11px] text-slate-400">Kecamatan</span>
            <span className="font-medium text-navy">Coblong, Kota Bandung</span>
          </div>
        </div>
        <div className="mt-4 grid grid-cols-2 gap-2 text-sm">
          <div className="rounded-xl border-2 border-brand-500 bg-brand-50 px-3 py-2"><b className="block text-navy">JNE REG</b><span className="text-slate-500">Rp12.000 · 2-3 hari</span></div>
          <div className="rounded-xl border border-slate-200 px-3 py-2"><b className="block text-navy">SiCepat</b><span className="text-slate-500">Rp11.000 · 2-4 hari</span></div>
        </div>
        <div className="mt-4 flex items-center justify-between border-t border-dashed border-slate-200 pt-4">
          <span className="text-sm text-slate-500">Total</span>
          <span className="text-xl font-extrabold text-navy">Rp161.000</span>
        </div>
        <div className="mt-3 flex h-11 items-center justify-center rounded-xl bg-brand-500 text-sm font-bold text-white">Pesan Sekarang</div>
      </div>

      {/* Floating notifications */}
      <div className="absolute -left-16 top-[44%] hidden w-56 animate-[float_6s_ease-in-out_infinite] rounded-2xl bg-white p-3 shadow-xl ring-1 ring-slate-100 sm:block">
        <div className="flex items-center gap-2.5">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-100 text-emerald-600"><Bell size={17} /></span>
          <div className="text-xs"><b className="block text-sm text-navy">Pesanan baru!</b><span className="text-slate-500">Rina · Rp161.000</span></div>
        </div>
      </div>
      <div className="absolute -right-14 -top-7 hidden w-60 animate-[float_7s_ease-in-out_1s_infinite] rounded-2xl bg-navy p-3 text-white shadow-xl sm:block">
        <div className="flex items-center gap-2.5">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#25d366] text-white"><MessageCircle size={17} /></span>
          <div className="text-xs"><b className="block text-sm">Follow up terkirim</b><span className="text-navy-200">&quot;Halo kak Rina, pesanan…&quot;</span></div>
        </div>
      </div>

      {/* Stats badge */}
      <div className="absolute -bottom-6 left-1/2 hidden w-52 -translate-x-1/2 animate-[float_8s_ease-in-out_2s_infinite] rounded-2xl bg-white p-3 shadow-xl ring-1 ring-slate-100 sm:block">
        <div className="flex items-center gap-2.5">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand-100 text-brand-600"><TrendingUp size={17} /></span>
          <div className="text-xs"><b className="block text-sm text-navy">Penjualan naik!</b><span className="text-slate-500">+42% bulan ini 🚀</span></div>
        </div>
      </div>
    </div>
  );
}

export default function Home() {
  return (
    <div className="bg-[#fbfaf8] text-slate-700">
      {/* NAV */}
      <header className="sticky top-0 z-30 border-b border-slate-200/60 bg-[#fbfaf8]/80 backdrop-blur-lg">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4">
          <Link href="/" aria-label="Pesanin"><Logo /></Link>
          <nav className="hidden items-center gap-7 text-sm font-medium text-slate-600 md:flex">
            {NAV.map(([l, h]) => <a key={h} href={h} className="transition hover:text-navy">{l}</a>)}
          </nav>
          <div className="flex items-center gap-2">
            <Link href="/login" className="hidden h-10 items-center rounded-xl px-4 text-sm font-semibold text-navy transition hover:bg-navy-50 sm:flex">Masuk</Link>
            <Link href="/register" className="flex h-10 items-center gap-1.5 rounded-xl bg-navy px-4 text-sm font-semibold text-white transition hover:bg-navy-700">Daftar Gratis<ArrowRight size={16} /></Link>
          </div>
        </div>
      </header>

      {/* HERO */}
      <section className="relative overflow-hidden">
        {/* Background gradient blobs */}
        <div className="pointer-events-none absolute inset-0 overflow-hidden">
          <div className="absolute -left-32 -top-32 h-96 w-96 rounded-full bg-brand-100/50 blur-3xl" />
          <div className="absolute -right-32 top-10 h-96 w-96 rounded-full bg-sky-100/50 blur-3xl" />
        </div>

        <div className="relative mx-auto grid max-w-6xl items-center gap-14 px-4 pb-24 pt-14 md:pt-24 lg:grid-cols-[1.1fr_1fr]">
          <div>
            <a href="#fitur" className="inline-flex items-center gap-2 rounded-full bg-white py-1 pl-1 pr-3 text-xs font-semibold text-navy ring-1 ring-slate-200">
              <span className="rounded-full bg-brand-500 px-2 py-0.5 text-white">Baru</span>Landing page builder sudah hadir<ArrowRight size={13} />
            </a>
            <h1 className="mt-6 text-[40px] font-extrabold leading-[1.05] tracking-[-0.035em] text-navy md:text-[62px]">
              Terima pesanan<br /><span className="relative whitespace-nowrap text-brand-500">rapi<svg viewBox="0 0 120 12" className="absolute -bottom-2 left-0 w-full" aria-hidden><path d="M2 9c30-6 80-8 116-3" fill="none" stroke="currentColor" strokeWidth="4" strokeLinecap="round" opacity=".35" /></svg></span>, tanpa ribet.
            </h1>
            <p className="mt-6 max-w-xl text-lg leading-relaxed text-slate-600">
              Pesanin mengubah chat &quot;kak, mau order&quot; jadi checkout yang rapi: ongkir otomatis, COD, e-payment Midtrans, follow up WhatsApp, dan landing page dalam satu dashboard.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link href="/register" className="flex h-12 items-center gap-2 rounded-xl bg-brand-500 px-7 font-bold text-white shadow-lg shadow-brand-500/30 transition hover:-translate-y-0.5 hover:bg-brand-600">Mulai Gratis<ArrowRight size={18} /></Link>
              <Link href="/c/toner-lemon" className="flex h-12 items-center gap-2 rounded-xl bg-white px-6 font-semibold text-navy ring-1 ring-slate-200 transition hover:bg-navy-50">Lihat Contoh Checkout</Link>
            </div>
            <div className="mt-7 flex flex-wrap gap-x-6 gap-y-2 text-sm text-slate-500">
              {["Gratis selamanya", "Tanpa kartu kredit", "Siap dalam 5 menit"].map((t) => (
                <span key={t} className="flex items-center gap-1.5"><CheckCircle2 size={16} className="text-emerald-500" />{t}</span>
              ))}
            </div>
          </div>
          <HeroMockup />
        </div>
      </section>

      {/* STATS */}
      <section className="border-y border-slate-200/60 bg-white">
        <div className="mx-auto grid max-w-6xl grid-cols-2 gap-px bg-slate-200/60 md:grid-cols-4">
          {STATS.map(([val, label]) => (
            <div key={label} className="flex flex-col items-center bg-white px-6 py-8 text-center">
              <span className="text-3xl font-extrabold tracking-tight text-navy md:text-[36px]">{val}</span>
              <span className="mt-1 text-sm text-slate-500">{label}</span>
            </div>
          ))}
        </div>
      </section>

      {/* CATEGORY STRIP */}
      <section className="bg-[#fbfaf8]">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-center gap-x-8 gap-y-3 px-4 py-5 text-sm font-semibold text-slate-400">
          <span className="text-slate-500">Cocok untuk jualan</span>
          {["Skincare", "Fashion", "Makanan & minuman", "Herbal", "Produk digital", "Kelas online", "Elektronik"].map((c) => (
            <span key={c} className="rounded-full border border-slate-200 bg-white px-3 py-1 text-xs text-slate-500">{c}</span>
          ))}
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section id="cara-kerja" className="mx-auto max-w-6xl scroll-mt-20 px-4 py-24">
        <p className="text-center text-sm font-bold uppercase tracking-[0.15em] text-brand-600">Cara kerja</p>
        <h2 className="mx-auto mt-3 max-w-2xl text-center text-3xl font-extrabold tracking-tight text-navy md:text-[40px] md:leading-tight">Dari link ke paket terkirim, cuma tiga langkah</h2>
        <div className="mt-14 grid gap-5 md:grid-cols-3">
          {STEPS.map(([Icon, t, d], i) => (
            <div key={t} className="surface surface-hover relative p-7">
              <span className="absolute right-6 top-5 text-5xl font-extrabold text-slate-100">0{i + 1}</span>
              <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-navy text-white"><Icon size={22} /></span>
              <h3 className="mt-5 text-lg font-bold text-navy">{t}</h3>
              <p className="mt-2 leading-relaxed text-slate-600">{d}</p>
            </div>
          ))}
        </div>
      </section>

      {/* FEATURES BENTO */}
      <section id="fitur" className="scroll-mt-16 bg-navy py-24 text-white">
        <div className="mx-auto max-w-6xl px-4">
          <div className="flex flex-col justify-between gap-6 md:flex-row md:items-end">
            <div>
              <p className="text-sm font-bold uppercase tracking-[0.15em] text-brand-400">Fitur</p>
              <h2 className="mt-3 max-w-xl text-3xl font-extrabold tracking-tight md:text-[40px] md:leading-tight">Semua yang dibutuhkan seller online, sudah di sini</h2>
            </div>
            <p className="max-w-sm text-navy-200">Tidak perlu gonta-ganti aplikasi untuk ongkir, rekap order, follow up, dan riset produk.</p>
          </div>
          <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {FEATURES.map(({ icon: Icon, title, desc, color, badge }, i) => (
              <div key={title} className={`group relative rounded-2xl p-6 ring-1 transition duration-200 hover:-translate-y-0.5 ${i === 0 ? "bg-brand-500 ring-brand-400 sm:col-span-2" : "bg-white/[.04] ring-white/10 hover:bg-white/[.07]"}`}>
                <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide ${i === 0 ? "bg-white/20 text-white" : "bg-white/10 text-brand-300"}`}>{badge}</span>
                <span className={`mt-3 flex h-11 w-11 items-center justify-center rounded-xl ${i === 0 ? "bg-white text-brand-600" : `${color} text-white`}`}><Icon size={21} /></span>
                <h3 className="mt-4 font-bold">{title}</h3>
                <p className={`mt-2 text-sm leading-relaxed ${i === 0 ? "text-white/90" : "text-navy-200"}`}>{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* INTEGRATIONS */}
      <section id="integrasi" className="scroll-mt-16 border-b border-slate-200/60 bg-white py-24">
        <div className="mx-auto max-w-6xl px-4">
          <p className="text-center text-sm font-bold uppercase tracking-[0.15em] text-brand-600">Integrasi</p>
          <h2 className="mx-auto mt-3 max-w-2xl text-center text-3xl font-extrabold tracking-tight text-navy md:text-[40px] md:leading-tight">Terhubung dengan layanan terpercaya</h2>
          <p className="mx-auto mt-4 max-w-xl text-center text-slate-600">Semua integrasi sudah dikonfigurasi — kamu cukup masukkan API key dan langsung jalan.</p>
          <div className="mt-14 grid grid-cols-2 gap-4 sm:grid-cols-4">
            {INTEGRATIONS.map(({ name, desc, bg, emoji }) => (
              <div key={name} className="surface surface-hover flex flex-col items-center gap-3 px-4 py-6 text-center">
                <span className={`flex h-14 w-14 items-center justify-center rounded-2xl text-2xl ${bg} shadow-md`}>{emoji}</span>
                <div>
                  <p className="font-bold text-navy">{name}</p>
                  <p className="mt-0.5 text-xs text-slate-500">{desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* BENEFITS */}
      <section className="mx-auto grid max-w-6xl gap-6 px-4 py-20 md:grid-cols-3">
        {[
          [Zap, "Checkout cepat di HP", "Form satu halaman yang ringan, data pembeli lama terisi otomatis saat order lagi."],
          [ShieldCheck, "Uang langsung ke rekeningmu", "Pesanin tidak menahan dana penjualan. Transfer masuk langsung ke rekening toko."],
          [Sparkles, "Tampil profesional", "Domain sendiri, logo toko, dan halaman sukses yang bisa diatur per metode bayar."],
          [Rocket, "Auto-ship & notifikasi", "Pesanan COD otomatis diteruskan ke kurir. Notifikasi WA & Push saat ada order masuk."],
          [Award, "Afiliasi & kupon", "Aktifkan program afiliasi dan kupon diskon untuk mengundang lebih banyak pembeli."],
          [Star, "Dukungan seller lokal", "Dibuat khusus untuk seller Indonesia — bahasa, kurir, bank, dan e-wallet lokal semua ada."],
        ].map(([Icon, t, d]) => {
          const I = Icon as typeof Zap;
          return (
            <div key={t as string} className="flex gap-4">
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-brand-100 text-brand-600"><I size={21} /></span>
              <div><h3 className="font-bold text-navy">{t as string}</h3><p className="mt-1 text-sm leading-relaxed text-slate-600">{d as string}</p></div>
            </div>
          );
        })}
      </section>

      {/* PRICING */}
      <section id="harga" className="scroll-mt-16 border-t border-slate-200/60 bg-[#f6f5f2] py-24">
        <div className="mx-auto max-w-6xl px-4">
          <p className="text-center text-sm font-bold uppercase tracking-[0.15em] text-brand-600">Harga</p>
          <h2 className="mx-auto mt-3 max-w-2xl text-center text-3xl font-extrabold tracking-tight text-navy md:text-[40px] md:leading-tight">Mulai gratis, upgrade saat pesanan makin ramai</h2>
          <p className="mx-auto mb-10 mt-4 max-w-xl text-center text-slate-600">Semua paket sudah termasuk ongkir otomatis, COD, dan dashboard pesanan. Tanpa biaya setup.</p>
          <Pricing />
        </div>
      </section>

      {/* FAQ */}
      <section id="faq" className="mx-auto max-w-3xl scroll-mt-16 px-4 py-24">
        <p className="text-center text-sm font-bold uppercase tracking-[0.15em] text-brand-600">FAQ</p>
        <h2 className="mt-3 text-center text-3xl font-extrabold tracking-tight text-navy md:text-[40px]">Pertanyaan umum</h2>
        <div className="mt-10 space-y-3">
          {FAQ.map(([q, a]) => (
            <details key={q} className="group surface px-6 py-1">
              <summary className="flex cursor-pointer list-none items-center justify-between gap-4 py-4 font-semibold text-navy">
                {q}<ChevronDown size={18} className="shrink-0 text-slate-400 transition-transform duration-300 group-open:rotate-180" />
              </summary>
              <p className="pb-5 leading-relaxed text-slate-600">{a}</p>
            </details>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="mx-auto max-w-6xl px-4 pb-24">
        <div className="relative overflow-hidden rounded-[32px] bg-navy px-6 py-20 text-center text-white md:px-16">
          {/* BG decoration */}
          <div className="pointer-events-none absolute inset-0 overflow-hidden">
            <div className="absolute -left-20 -top-20 h-72 w-72 rounded-full bg-brand-500/20 blur-3xl" />
            <div className="absolute -bottom-20 -right-20 h-72 w-72 rounded-full bg-sky-500/15 blur-3xl" />
          </div>
          <div className="relative">
            <LogoMark size={48} className="mx-auto" />
            <h2 className="mx-auto mt-6 max-w-2xl text-3xl font-extrabold tracking-tight md:text-[44px] md:leading-tight">Pesanan berikutnya, biar Pesanin yang rapikan.</h2>
            <p className="mt-4 text-navy-200">Daftar gratis, buat produk pertamamu, dan bagikan link checkout hari ini.</p>
            <div className="mt-8 flex flex-wrap justify-center gap-3">
              <Link href="/register" className="inline-flex h-12 items-center gap-2 rounded-xl bg-brand-500 px-7 font-bold text-white shadow-lg shadow-brand-500/30 transition hover:-translate-y-0.5 hover:bg-brand-400">Mulai Gratis Sekarang<ArrowRight size={18} /></Link>
              <Link href="/c/toner-lemon" className="inline-flex h-12 items-center gap-2 rounded-xl bg-white/10 px-7 font-semibold text-white transition hover:bg-white/20">Lihat Contoh Checkout</Link>
            </div>
            <div className="mt-6 flex flex-wrap justify-center gap-x-6 gap-y-2 text-sm text-navy-200">
              {["Gratis selamanya", "Tanpa kartu kredit", "Setup dalam 5 menit"].map((t) => (
                <span key={t} className="flex items-center gap-1.5"><CheckCircle2 size={15} className="text-emerald-400" />{t}</span>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="border-t border-slate-200/70 bg-white">
        <div className="mx-auto grid max-w-6xl gap-10 px-4 py-14 md:grid-cols-[1.5fr_1fr_1fr_1fr]">
          <div>
            <Logo />
            <p className="mt-4 max-w-xs text-sm leading-relaxed text-slate-500">Form order, checkout, dan manajemen pesanan untuk seller online Indonesia. Ongkir otomatis, COD, e-payment, dan WA dalam satu dashboard.</p>
            <div className="mt-5 flex gap-2">
              {["Midtrans", "Biteship", "WhatsApp"].map((b) => (
                <span key={b} className="rounded-lg border border-slate-200 px-2.5 py-1 text-[11px] font-semibold text-slate-500">{b}</span>
              ))}
            </div>
          </div>
          {[
            ["Produk", [["Fitur", "#fitur"], ["Integrasi", "#integrasi"], ["Harga", "#harga"], ["Contoh checkout", "/c/toner-lemon"]]],
            ["Akun", [["Masuk", "/login"], ["Daftar gratis", "/register"]]],
            ["Bantuan", [["FAQ", "#faq"], ["Cara kerja", "#cara-kerja"]]],
          ].map(([h, links]) => (
            <div key={h as string}>
              <h4 className="text-sm font-bold text-navy">{h as string}</h4>
              <ul className="mt-4 space-y-2.5 text-sm text-slate-500">
                {(links as string[][]).map(([l, href]) => <li key={l}><Link href={href} className="transition hover:text-brand-600">{l}</Link></li>)}
              </ul>
            </div>
          ))}
        </div>
        <div className="border-t border-slate-100 py-5 text-center text-xs text-slate-400">© {new Date().getFullYear()} <Wordmark className="text-xs" /> · Terima pesanan rapi, tanpa ribet.</div>
      </footer>
    </div>
  );
}
