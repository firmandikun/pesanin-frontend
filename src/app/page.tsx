import {
  ArrowRight, Bell, CheckCircle2, ChevronDown, MessageCircle, TrendingUp,
} from "lucide-react";
import Link from "next/link";
import { ShopeeMark } from "@/components/ChannelBadge";
import { Logo, LogoMark, Wordmark } from "@/components/Logo";
import { Pricing } from "@/components/marketing/Pricing";

const NAV = [["Fitur", "#fitur"], ["Cara Kerja", "#cara-kerja"], ["Harga", "#harga"]] as const;

const FAQ = [
  ["Bisa ganti paket kapan saja?", "Bisa. Upgrade langsung aktif dan sisa masa paket lama dihitung proporsional. Downgrade berlaku di periode tagihan berikutnya."],
  ["Bagaimana kalau kuota pesanan habis?", "Form tetap menerima pesanan, kami hanya mengingatkan untuk upgrade. Pesanan pembeli tidak akan ditolak."],
  ["Apakah Pesanin memotong uang penjualan saya?", "Tidak. Pembayaran transfer langsung masuk ke rekeningmu. Untuk e-payment, hanya ada biaya dari mitra payment gateway."],
  ["Bisa pakai domain sendiri?", "Bisa mulai paket Starter. Arahkan DNS domainmu ke Pesanin, SSL dipasang otomatis."],
  ["Metode pembayaran langganan apa saja?", "Transfer bank, virtual account, QRIS, dan e-wallet. Faktur dikirim ke email setiap periode tagihan."],
  ["Apakah ada COD?", "Ya! COD tersedia via Biteship. Biaya COD dihitung otomatis dan bisa dibebankan ke pembeli atau ditanggung penjual."],
] as const;

// Cara Kerja 3 langkah mudah ala FinKami
const STEPS = [
  {
    step: "01",
    title: "Buat Produk & Hubungkan Toko",
    desc: "Input produk, variasi, dan harga. Atau hubungkan toko Shopee Anda untuk tarik produk dan pesanan secara otomatis.",
  },
  {
    step: "02",
    title: "Sebar Link & Terima Pesanan",
    desc: "Tempel link checkout di bio sosial media, landing page, atau iklan. Pembeli checkout, ongkir otomatis dihitung 7+ kurir.",
  },
  {
    step: "03",
    title: "Pantau Profit & Kirim Otomatis",
    desc: "Data penjualan, HPP, omzet, dan resi kurir terupdate otomatis di dashboard. Follow up pembeli langsung via WhatsApp.",
  },
];

/* ─── Mockup atoms ─────────────────────────────────────── */

function CheckoutMockup() {
  return (
    <div className="relative mx-auto w-full max-w-[420px]">
      <div className="rounded-[24px] bg-white p-5 shadow-2xl shadow-navy/8 ring-1 ring-slate-100/80">
        <div className="flex items-center gap-3">
          <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-amber-50 text-2xl">🍋</span>
          <div className="flex-1">
            <p className="font-bold text-navy">Toner Lemon Brightening</p>
            <p className="text-sm text-slate-500">100 ml · <s>Rp189.000</s> <b className="text-brand-600">Rp149.000</b></p>
          </div>
        </div>
        <div className="mt-4 space-y-2">
          {["Nama lengkap · Rina Kartika", "No. WhatsApp · 0812 3456 7890", "Kecamatan · Coblong, Kota Bandung"].map((l) => (
            <div key={l} className="rounded-xl border border-slate-100 bg-slate-50 px-3 py-2.5 text-sm font-medium text-navy">{l}</div>
          ))}
        </div>
        <div className="mt-3 grid grid-cols-2 gap-2 text-sm">
          <div className="rounded-xl border-2 border-brand-500 bg-brand-50 px-3 py-2"><b className="block text-navy">JNE REG</b><span className="text-slate-500">Rp12.000 · 2-3 hari</span></div>
          <div className="rounded-xl border border-slate-200 px-3 py-2"><b className="block text-navy">SiCepat</b><span className="text-slate-500">Rp11.000 · 2-4 hari</span></div>
        </div>
        <div className="mt-3 flex items-center justify-between border-t border-dashed border-slate-200 pt-3">
          <span className="text-sm text-slate-500">Total</span>
          <span className="text-xl font-extrabold text-navy">Rp161.000</span>
        </div>
        <div className="mt-3 flex h-11 items-center justify-center rounded-xl bg-brand-500 text-sm font-bold text-white">Pesan Sekarang</div>
      </div>
      {/* Floating pill */}
      <div className="absolute -right-10 -top-6 hidden animate-[float_6s_ease-in-out_infinite] rounded-2xl bg-navy px-4 py-2.5 text-xs font-semibold text-white shadow-xl sm:block">
        <div className="flex items-center gap-2"><Bell size={14} /><span>Pesanan baru · Rina · Rp161k</span></div>
      </div>
      <div className="absolute -bottom-5 -left-10 hidden animate-[float_7s_ease-in-out_1.5s_infinite] rounded-2xl bg-white px-4 py-2.5 text-xs font-semibold text-navy shadow-xl ring-1 ring-slate-100 sm:block">
        <div className="flex items-center gap-2"><span className="h-2 w-2 rounded-full bg-emerald-400" />Ongkir dihitung otomatis</div>
      </div>
    </div>
  );
}

function DashboardMockup() {
  return (
    <div className="rounded-[20px] bg-white p-5 shadow-xl shadow-navy/8 ring-1 ring-slate-100">
      <div className="mb-4 flex items-center justify-between">
        <span className="text-sm font-bold text-navy">Dashboard Pesanan</span>
        <span className="rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-semibold text-emerald-700">Live</span>
      </div>
      {[
        { name: "Rina Kartika", product: "Toner Lemon", status: "Dikemas", amount: "Rp161.000", dot: "bg-amber-400" },
        { name: "Budi Santoso", product: "Serum Vitamin C", status: "Dikirim", amount: "Rp220.000", dot: "bg-sky-400" },
        { name: "Dewi Lestari", product: "Masker Clay", status: "Selesai", amount: "Rp95.000", dot: "bg-emerald-400" },
        { name: "Agus Prayogo", product: "Toner Lemon", status: "Baru", amount: "Rp149.000", dot: "bg-brand-400" },
      ].map((o) => (
        <div key={o.name} className="flex items-center gap-3 border-t border-slate-100 py-3">
          <span className={`h-2.5 w-2.5 shrink-0 rounded-full ${o.dot}`} />
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold text-navy">{o.name}</p>
            <p className="truncate text-xs text-slate-500">{o.product}</p>
          </div>
          <span className="shrink-0 rounded-full border border-slate-200 px-2.5 py-0.5 text-xs text-slate-600">{o.status}</span>
          <span className="shrink-0 text-sm font-bold text-navy">{o.amount}</span>
        </div>
      ))}
      <div className="mt-2 flex gap-2">
        <div className="flex-1 rounded-xl bg-slate-50 px-3 py-2.5 text-center">
          <p className="text-xs text-slate-500">Hari ini</p>
          <p className="mt-0.5 text-lg font-extrabold text-navy">24</p>
          <p className="text-xs text-slate-500">pesanan</p>
        </div>
        <div className="flex-1 rounded-xl bg-brand-50 px-3 py-2.5 text-center">
          <p className="text-xs text-slate-500">Omzet</p>
          <p className="mt-0.5 text-lg font-extrabold text-brand-600">Rp3,8 jt</p>
          <p className="text-xs text-slate-500">hari ini</p>
        </div>
        <div className="flex-1 rounded-xl bg-slate-50 px-3 py-2.5 text-center">
          <p className="text-xs text-slate-500">Konversi</p>
          <p className="mt-0.5 text-lg font-extrabold text-navy">68%</p>
          <p className="text-xs text-slate-500">rate</p>
        </div>
      </div>
    </div>
  );
}

function WaMockup() {
  return (
    <div className="rounded-[20px] bg-white p-5 shadow-xl shadow-navy/8 ring-1 ring-slate-100">
      <div className="mb-4 flex items-center gap-2.5">
        <span className="flex h-9 w-9 items-center justify-center rounded-full bg-[#25d366] text-white"><MessageCircle size={18} /></span>
        <div>
          <p className="text-sm font-bold text-navy">WhatsApp Template</p>
          <p className="text-xs text-slate-500">Follow up otomatis</p>
        </div>
      </div>
      {[
        { label: "Welcome", msg: "Halo kak Rina! Pesananmu sudah kami terima ya. Mohon tunggu konfirmasi 🙏" },
        { label: "Resi kirim", msg: "Paket kak Rina sudah dikirim via JNE REG. Resi: JX1234567890 📦" },
        { label: "Follow up", msg: "Halo kak, bagaimana produknya? Yuk review dan dapatkan diskon 10% 🌟" },
      ].map((t) => (
        <div key={t.label} className="mt-3 rounded-xl border border-slate-100 bg-slate-50 p-3">
          <span className="mb-1.5 inline-block rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-bold text-emerald-700">{t.label}</span>
          <p className="text-sm leading-relaxed text-slate-700">{t.msg}</p>
        </div>
      ))}
      <div className="mt-3 flex h-9 items-center justify-center rounded-xl bg-[#25d366] text-sm font-bold text-white">Kirim Template</div>
    </div>
  );
}

function LandingMockup() {
  return (
    <div className="overflow-hidden rounded-[20px] bg-navy shadow-xl shadow-navy/20 ring-1 ring-white/5">
      <div className="bg-white/5 px-4 py-2 text-xs text-navy-200">pesanin.id/p/toner-lemon-promo</div>
      <div className="p-5">
        <div className="mb-4 rounded-2xl bg-white/8 p-4">
          <p className="text-xs font-semibold text-brand-400">PROMO TERBATAS</p>
          <p className="mt-1 text-lg font-extrabold text-white leading-tight">Toner Lemon Brightening<br/><span className="text-brand-400">Diskon 20% hari ini!</span></p>
          <p className="mt-2 text-xs text-navy-200">Cocok untuk semua jenis kulit · 100 ml</p>
        </div>
        <div className="space-y-2">
          {["Block: Judul & Gambar", "Block: Deskripsi produk", "Block: Testimoni pelanggan", "Block: Form checkout tertanam"].map((b, i) => (
            <div key={b} className={`flex items-center gap-2 rounded-xl px-3 py-2 text-xs font-medium ${i === 3 ? "bg-brand-500 text-white" : "bg-white/8 text-navy-200"}`}>
              <span className={`h-1.5 w-1.5 rounded-full ${i === 3 ? "bg-white" : "bg-white/30"}`} />
              {b}
            </div>
          ))}
        </div>
        <div className="mt-3 flex items-center gap-2">
          <div className="flex-1 rounded-xl bg-brand-500 py-2 text-center text-xs font-bold text-white">Pesan Sekarang</div>
        </div>
      </div>
    </div>
  );
}

function ConnectedChannelsMockup() {
  return (
    <div className="relative mx-auto w-full max-w-[500px]">
      {/* Browser window wrapper with 3 colored dots */}
      <div className="overflow-hidden rounded-[24px] border border-slate-200/80 bg-white shadow-2xl shadow-navy/8">
        {/* Browser header */}
        <div className="flex items-center gap-1.5 border-b border-slate-100 bg-slate-50/80 px-4 py-3">
          <span className="h-2.5 w-2.5 rounded-full bg-rose-400" />
          <span className="h-2.5 w-2.5 rounded-full bg-amber-400" />
          <span className="h-2.5 w-2.5 rounded-full bg-emerald-400" />
          <span className="ml-2 text-xs font-semibold text-slate-500">Toko Terhubung</span>
        </div>

        <div className="p-5">
          {/* List of integrated marketplace shops */}
          <div className="space-y-3">
            {[
              {
                name: "Fashion Store Official",
                sub: "Terakhir sync: 2 menit lalu",
                status: "Terhubung",
                dot: "bg-emerald-500",
                badgeBg: "bg-emerald-50 text-emerald-700",
                icon: (
                  <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#fff1ee] text-[#ee4d2d]">
                    <ShopeeMark size={20} />
                  </span>
                ),
              },
              {
                name: "Beauty Care Store",
                sub: "Terakhir sync: 5 menit lalu",
                status: "Terhubung",
                dot: "bg-emerald-500",
                badgeBg: "bg-emerald-50 text-emerald-700",
                icon: (
                  <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#fff1ee] text-[#ee4d2d]">
                    <ShopeeMark size={20} />
                  </span>
                ),
              },
              {
                name: "Electronics ID Official",
                sub: "Auto-sync stok & pesanan aktif",
                status: "Terhubung",
                dot: "bg-emerald-500",
                badgeBg: "bg-emerald-50 text-emerald-700",
                icon: (
                  <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-100 text-slate-800">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64c.29 0 .57.04.84.11V9.41a6.33 6.33 0 0 0-.84-.05A6.34 6.34 0 0 0 3 15.7a6.34 6.34 0 0 0 10.82 4.48 6.3 6.3 0 0 0 1.86-4.51v-6.6a8.16 8.16 0 0 0 4.77 1.52v-3.4a4.85 4.85 0 0 1-.86-.5z"/>
                    </svg>
                  </span>
                ),
              },
            ].map((s) => (
              <div
                key={s.name}
                className="flex items-center justify-between rounded-2xl border border-slate-100 bg-white p-3.5 shadow-sm transition hover:border-slate-200"
              >
                <div className="flex items-center gap-3">
                  {s.icon}
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-bold text-navy">{s.name}</p>
                      <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold ${s.badgeBg}`}>
                        <span className={`h-1.5 w-1.5 rounded-full ${s.dot}`} />
                        {s.status}
                      </span>
                    </div>
                    <p className="text-xs text-slate-400">{s.sub}</p>
                  </div>
                </div>
                <div className="flex h-6 w-6 items-center justify-center rounded-full bg-emerald-50 text-emerald-600">
                  <CheckCircle2 size={16} />
                </div>
              </div>
            ))}
          </div>

          {/* Sync summary stats card */}
          <div className="mt-5 rounded-2xl border border-slate-100 bg-slate-50/70 p-4">
            <div className="mb-3 flex items-center justify-between">
              <span className="text-xs font-bold text-navy">Statistik Sinkronisasi</span>
              <span className="text-xs text-slate-400">Auto-sync 30 detik</span>
            </div>
            <div className="grid grid-cols-3 gap-2 text-center">
              <div>
                <p className="text-[11px] text-slate-500">Pesanan Masuk</p>
                <p className="mt-0.5 text-base font-extrabold text-navy">8.642</p>
                <p className="text-[10px] text-emerald-600">Otomatis sync</p>
              </div>
              <div className="border-x border-slate-200/80">
                <p className="text-[11px] text-slate-500">Omzet Marketplace</p>
                <p className="mt-0.5 text-base font-extrabold text-brand-600">Rp 156,8 jt</p>
                <p className="text-[10px] text-slate-400">Bulan ini</p>
              </div>
              <div>
                <p className="text-[11px] text-slate-500">HPP & Modal</p>
                <p className="mt-0.5 text-base font-extrabold text-navy">Rp 89,2 jt</p>
                <p className="text-[10px] text-slate-400">Laba bersih Rp67,6jt</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function AnalyticsMockup() {
  return (
    <div className="rounded-[20px] bg-white p-5 shadow-xl shadow-navy/8 ring-1 ring-slate-100">
      <div className="mb-4 flex items-center justify-between">
        <span className="text-sm font-bold text-navy">Laporan Penjualan</span>
        <span className="text-xs text-slate-400">30 hari terakhir</span>
      </div>
      <div className="grid grid-cols-3 gap-2 mb-4">
        {[["Omzet", "Rp 24,8 jt", "text-navy"], ["Pesanan", "342", "text-navy"], ["Konversi", "71%", "text-emerald-600"]].map(([l, v, cls]) => (
          <div key={l} className="rounded-xl bg-slate-50 px-3 py-3 text-center">
            <p className="text-[10px] text-slate-500">{l}</p>
            <p className={`mt-0.5 text-base font-extrabold ${cls}`}>{v}</p>
          </div>
        ))}
      </div>
      {/* Bar chart */}
      <div className="flex items-end gap-1 h-16">
        {[40, 65, 50, 80, 55, 90, 70, 85, 60, 95, 75, 88, 65, 100].map((h, i) => (
          <div key={i} className="flex-1 rounded-t-sm" style={{ height: `${h}%`, background: i === 13 ? "#f56a1b" : "#e2e8f0" }} />
        ))}
      </div>
      <div className="mt-3 space-y-2">
        {[["Kota terbaik", "Bandung · 92 pesanan"], ["Kurir favorit", "JNE · 48%"], ["Produk top", "Toner Lemon · 124x"]].map(([l, v]) => (
          <div key={l} className="flex items-center justify-between text-xs">
            <span className="text-slate-500">{l}</span>
            <span className="font-semibold text-navy">{v}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ─── Feature sections ─────────────────────────────────── */

type FeatureSectionProps = {
  tag: string;
  title: string;
  desc: string;
  bullets: string[];
  mockup: React.ReactNode;
  flip?: boolean;
};

function FeatureSection({ tag, title, desc, bullets, mockup, flip }: FeatureSectionProps) {
  return (
    <div className={`mx-auto grid max-w-6xl items-center gap-12 px-4 py-20 md:py-28 lg:grid-cols-2 ${flip ? "lg:[&>:first-child]:order-last" : ""}`}>
      <div>
        <span className="inline-block rounded-full bg-brand-100 px-3 py-1 text-xs font-bold text-brand-700">{tag}</span>
        <h2 className="mt-4 text-3xl font-extrabold leading-tight tracking-tight text-navy md:text-[36px]">{title}</h2>
        <p className="mt-4 text-lg leading-relaxed text-slate-600">{desc}</p>
        <ul className="mt-6 space-y-3">
          {bullets.map((b) => (
            <li key={b} className="flex items-start gap-3 text-slate-700">
              <CheckCircle2 size={18} className="mt-0.5 shrink-0 text-emerald-500" />
              <span>{b}</span>
            </li>
          ))}
        </ul>
      </div>
      <div>{mockup}</div>
    </div>
  );
}

/* ─── Page ─────────────────────────────────────────────── */

export default function Home() {
  return (
    <div className="bg-white text-slate-700">

      {/* NAV */}
      <header className="sticky top-0 z-30 border-b border-slate-100 bg-white/90 backdrop-blur-lg">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4">
          <Link href="/" aria-label="Pesanin"><Logo /></Link>
          <nav className="hidden items-center gap-7 text-sm font-medium text-slate-600 md:flex">
            {NAV.map(([l, h]) => <a key={h} href={h} className="transition hover:text-navy">{l}</a>)}
          </nav>
          <div className="flex items-center gap-2">
            <Link href="/login" className="hidden h-10 items-center rounded-xl px-4 text-sm font-semibold text-slate-700 transition hover:bg-slate-100 sm:flex">Masuk</Link>
            <Link href="/register" className="flex h-10 items-center gap-1.5 rounded-xl bg-brand-500 px-5 text-sm font-bold text-white shadow-sm shadow-brand-500/30 transition hover:bg-brand-600">
              Coba Gratis <ArrowRight size={15} />
            </Link>
          </div>
        </div>
      </header>

      {/* HERO */}
      <section className="relative overflow-hidden border-b border-slate-100 bg-[#fbfaf8]">
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute left-1/2 top-0 h-[500px] w-[700px] -translate-x-1/2 rounded-full bg-brand-100/40 blur-3xl" />
        </div>
        <div className="relative mx-auto grid max-w-6xl items-center gap-14 px-4 pb-20 pt-16 lg:grid-cols-[1fr_1fr]">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-600">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" /> Landing page builder sudah hadir
            </div>
            <h1 className="mt-6 text-[42px] font-extrabold leading-[1.08] tracking-[-0.03em] text-navy md:text-[58px]">
              Checkout rapi,<br />
              <span className="text-brand-500">pesanan terkelola</span>,<br />
              tanpa ribet.
            </h1>
            <p className="mt-5 max-w-lg text-lg leading-relaxed text-slate-600">
              Pesanin adalah platform checkout & manajemen pesanan untuk seller online Indonesia. Ongkir otomatis, COD, e-payment, WhatsApp, dan landing page — semua dalam satu dashboard.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link href="/register" className="flex h-12 items-center gap-2 rounded-xl bg-brand-500 px-7 font-bold text-white shadow-lg shadow-brand-500/25 transition hover:-translate-y-0.5 hover:bg-brand-600">
                Coba Gratis Sekarang <ArrowRight size={18} />
              </Link>
              <Link href="/c/toner-lemon" className="flex h-12 items-center gap-2 rounded-xl border border-slate-200 bg-white px-6 font-semibold text-navy transition hover:border-slate-300 hover:bg-slate-50">
                Lihat Contoh Checkout
              </Link>
            </div>
            <p className="mt-5 text-sm text-slate-500">Tanpa kartu kredit · Siap dalam 5 menit · Paket berbayar mulai Rp49.000/bln</p>
          </div>
          <CheckoutMockup />
        </div>
      </section>

      {/* STATS */}
      <section className="border-b border-slate-100 bg-white">
        <div className="mx-auto grid max-w-6xl grid-cols-2 divide-x divide-y divide-slate-100 md:grid-cols-4 md:divide-y-0">
          {[["10.000+", "Seller aktif"], ["500K+", "Pesanan berhasil"], ["Rp 50M+", "Transaksi diproses"], ["99.9%", "Uptime sistem"]].map(([v, l]) => (
            <div key={l} className="flex flex-col items-center justify-center px-6 py-8 text-center">
              <span className="text-[32px] font-extrabold tracking-tight text-navy">{v}</span>
              <span className="mt-1 text-sm text-slate-500">{l}</span>
            </div>
          ))}
        </div>
      </section>

      {/* FEATURES */}
      <section id="fitur" className="scroll-mt-16 divide-y divide-slate-100">

        <FeatureSection
          tag="Checkout"
          title="Form checkout yang rapi dan cepat — siap pakai tanpa coding"
          desc="Pembeli isi nama, nomor WA, dan kecamatan. Ongkir dari 7+ kurir muncul otomatis. Tidak perlu WA-an dulu buat tanya ongkir."
          bullets={[
            "Tarif real-time JNE, SiCepat, J&T, SPX, SAP, AnterAja, POS",
            "Variasi produk (ukuran, warna) & order bump di checkout",
            "Data pembeli lama terisi otomatis saat order berikutnya",
            "COD tersedia — biaya COD dihitung otomatis",
          ]}
          mockup={<CheckoutMockup />}
        />

        <div className="bg-[#fbfaf8]">
          <FeatureSection
            tag="Dashboard"
            title="Semua pesanan rapi di satu tempat — tidak ada yang terlewat"
            desc="Dari pesanan baru sampai paket terkirim, semua terpantau. Filter, cari, dan kelola order massal tanpa ribet."
            bullets={[
              "Status pesanan real-time: baru, dikemas, dikirim, selesai",
              "Input resi massal — cetak label pengiriman sekaligus",
              "Batalkan, refund, atau buat pesanan manual dari dashboard",
              "Notifikasi push & WhatsApp saat ada pesanan baru",
            ]}
            mockup={<DashboardMockup />}
            flip
          />
        </div>

        <FeatureSection
          tag="WhatsApp"
          title="Follow up pembeli otomatis via WhatsApp — satu klik, terisi sendiri"
          desc="Template pesan dari konfirmasi order, pengiriman resi, sampai follow up review. Kirim ke banyak pembeli sekaligus tanpa ketik ulang."
          bullets={[
            "Template welcome, resi kirim, dan follow up review",
            "WhatsApp Rotator — bagi chat ke beberapa CS dengan jadwal shift",
            "Pesan terisi otomatis: nama, produk, nomor resi, total bayar",
            "Blast pesan ke segmen pembeli tertentu",
          ]}
          mockup={<WaMockup />}
        />

        <div className="bg-[#fbfaf8]">
          <FeatureSection
            tag="Landing Page"
            title="Buat halaman jualan dengan landing page builder — tanpa developer"
            desc="Drag dan drop block konten, pasang form checkout, dan langsung sebar ke iklan. Domain sendiri bisa dipasang."
            bullets={[
              "Block builder: judul, gambar, testimoni, timer, kupon",
              "Form checkout tertanam langsung di landing page",
              "Custom domain dengan SSL otomatis",
              "Siap dipasang Pixel Meta, TikTok, dan Google",
            ]}
            mockup={<LandingMockup />}
            flip
          />
        </div>

        <FeatureSection
          tag="Laporan & Analitik"
          title="Pantau performa penjualan dengan laporan yang mudah dibaca"
          desc="Lihat tren penjualan per hari, kota, kurir, dan UTM. Data pixel iklan terhubung langsung untuk tracking ROAS."
          bullets={[
            "Grafik omzet harian & bulanan dengan breakdown per produk",
            "Laporan kota & kecamatan — tahu di mana pembeli terbanyak",
            "Tracking pixel Meta, TikTok & Google Ads terintegrasi",
            "Market research: tren Google & data Shopee Affiliate",
          ]}
          mockup={<AnalyticsMockup />}
        />

        <div className="bg-[#fbfaf8]">
          <FeatureSection
            tag="Integrasi Marketplace"
            title="Sinkronisasi & Kelola Marketplace Anda"
            desc="Cukup hubungkan toko marketplace Anda seperti Shopee dan TikTok Shop. Data pesanan, produk, sinkronisasi stok, dan biaya iklan (Ads) otomatis terpusat — tidak perlu cross-cek manual lagi!"
            bullets={[
              "Multi-Toko: Kelola banyak toko Shopee & marketplace dalam satu dashboard",
              "Sinkronisasi Pesanan: Tarik pesanan baru tiap 30 detik secara otomatis",
              "Sinkronisasi Produk & Stok: Kelola listing, variasi, dan ubah stok serentak",
              "Manajemen Iklan (Ads): Pantau biaya iklan Shopee Ads dan performa kampanye",
              "Publish Produk Massal: Upload dan terbitkan produk ke toko marketplace",
              "Hitung HPP & Laba Bersih: Masukkan modal per SKU untuk tahu keuntungan riil",
            ]}
            mockup={<ConnectedChannelsMockup />}
            flip
          />
        </div>

      </section>

      {/* CARA KERJA */}
      <section id="cara-kerja" className="scroll-mt-16 border-t border-slate-100 bg-[#fbfaf8] py-24">
        <div className="mx-auto max-w-6xl px-4">
          <div className="mx-auto max-w-2xl text-center">
            <span className="inline-block rounded-full bg-brand-100 px-3 py-1 text-xs font-bold text-brand-700">Cara Kerja</span>
            <h2 className="mt-4 text-3xl font-extrabold tracking-tight text-navy md:text-[40px]">Mulai dalam 3 Langkah Mudah</h2>
            <p className="mt-4 text-lg text-slate-600">Tidak perlu setup rumit atau coding. Siap terima pesanan dalam hitungan menit.</p>
          </div>
          <div className="mt-14 grid grid-cols-1 gap-6 md:grid-cols-3">
            {STEPS.map((s) => (
              <div
                key={s.step}
                className="relative flex flex-col justify-between rounded-3xl border border-slate-200/80 bg-white p-8 shadow-sm transition hover:border-brand-300 hover:shadow-md"
              >
                <div>
                  <span className="text-4xl font-black text-brand-500/20">{s.step}</span>
                  <h3 className="mt-4 text-xl font-bold text-navy">{s.title}</h3>
                  <p className="mt-3 text-sm leading-relaxed text-slate-600">{s.desc}</p>
                </div>
                <div className="mt-6 flex items-center gap-2 text-xs font-semibold text-brand-600">
                  <span>Langkah {s.step}</span>
                  <ArrowRight size={14} />
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* PRICING */}
      <section id="harga" className="scroll-mt-16 border-t border-slate-100 bg-white py-24">
        <div className="mx-auto max-w-6xl px-4">
          <div className="mx-auto max-w-2xl text-center">
            <span className="inline-block rounded-full bg-brand-100 px-3 py-1 text-xs font-bold text-brand-700">Harga</span>
            <h2 className="mt-4 text-3xl font-extrabold tracking-tight text-navy md:text-[40px]">Pilih paket yang sesuai</h2>
            <p className="mt-4 text-lg text-slate-600">Semua paket sudah termasuk ongkir otomatis, COD, dan dashboard pesanan. Tanpa biaya setup.</p>
          </div>
          <div className="mt-12">
            <Pricing />
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="border-t border-slate-100 bg-[#fbfaf8] py-24">
        <div className="mx-auto max-w-3xl px-4">
          <div className="mb-10 text-center">
            <span className="inline-block rounded-full bg-brand-100 px-3 py-1 text-xs font-bold text-brand-700">FAQ</span>
            <h2 className="mt-4 text-3xl font-extrabold tracking-tight text-navy md:text-[40px]">Pertanyaan umum</h2>
          </div>
          <div className="space-y-2">
            {FAQ.map(([q, a]) => (
              <details key={q} className="group rounded-2xl border border-slate-200 bg-white px-6 py-1 transition hover:border-slate-300">
                <summary className="flex cursor-pointer list-none items-center justify-between gap-4 py-4 font-semibold text-navy">
                  {q}<ChevronDown size={18} className="shrink-0 text-slate-400 transition-transform duration-300 group-open:rotate-180" />
                </summary>
                <p className="pb-5 leading-relaxed text-slate-600">{a}</p>
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="border-t border-slate-100 bg-navy py-24">
        <div className="mx-auto max-w-2xl px-4 text-center">
          <LogoMark size={44} className="mx-auto" />
          <h2 className="mx-auto mt-6 text-3xl font-extrabold tracking-tight text-white md:text-[44px] md:leading-tight">
            Siap terima pesanan lebih rapi?
          </h2>
          <p className="mt-4 text-lg text-navy-200">Daftar sekarang, buat produk pertamamu, dan bagikan link checkout hari ini.</p>
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <Link href="/register" className="inline-flex h-12 items-center gap-2 rounded-xl bg-brand-500 px-8 font-bold text-white shadow-lg shadow-brand-500/25 transition hover:-translate-y-0.5 hover:bg-brand-400">
              Mulai Sekarang <ArrowRight size={18} />
            </Link>
            <Link href="/c/toner-lemon" className="inline-flex h-12 items-center gap-2 rounded-xl bg-white/10 px-7 font-semibold text-white transition hover:bg-white/20">
              Lihat Demo Checkout
            </Link>
          </div>
          <p className="mt-5 text-sm text-navy-200">Tanpa kartu kredit · Paket berbayar mulai Rp49.000/bln</p>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="border-t border-white/5 bg-navy">
        <div className="mx-auto grid max-w-6xl gap-10 px-4 py-14 md:grid-cols-[1.5fr_1fr_1fr_1fr]">
          <div>
            <Logo light />
            <p className="mt-4 max-w-xs text-sm leading-relaxed text-navy-200">Platform checkout & manajemen pesanan untuk seller online Indonesia. Ongkir otomatis, COD, e-payment, dan WhatsApp dalam satu dashboard.</p>
          </div>
          {[
            ["Produk", [["Fitur", "#fitur"], ["Cara Kerja", "#cara-kerja"], ["Harga", "#harga"], ["Contoh checkout", "/c/toner-lemon"]]],
            ["Akun", [["Masuk", "/login"], ["Daftar", "/register"]]],
            ["Bantuan", [["FAQ", "#faq"], ["Cara kerja", "#cara-kerja"]]],
          ].map(([h, links]) => (
            <div key={h as string}>
              <h4 className="text-sm font-bold text-white">{h as string}</h4>
              <ul className="mt-4 space-y-2.5 text-sm text-navy-200">
                {(links as string[][]).map(([l, href]) => <li key={l}><Link href={href} className="transition hover:text-white">{l}</Link></li>)}
              </ul>
            </div>
          ))}
        </div>
        <div className="border-t border-white/5 py-5 text-center text-xs text-navy-200">
          © {new Date().getFullYear()} <Wordmark light className="text-xs opacity-70" /> · Terima pesanan rapi, tanpa ribet.
        </div>
      </footer>

      {/* Floating WhatsApp Widget (Bottom Right) */}
      <div className="fixed bottom-6 right-6 z-50 flex items-center gap-3">
        {/* Chat bubble tooltip */}
        <a
          href="https://wa.me/6281234567890?text=Halo%20tim%20Pesanin,%20saya%20mau%20tanya%20tentang%20fitur%20dan%20paket"
          target="_blank"
          rel="noopener noreferrer"
          className="group hidden items-center gap-2 rounded-2xl border border-slate-100 bg-white/95 px-4 py-3 shadow-xl backdrop-blur transition-all duration-200 hover:-translate-y-0.5 hover:shadow-2xl sm:flex"
        >
          <span className="relative flex h-2.5 w-2.5">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
            <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-emerald-500" />
          </span>
          <div className="text-left">
            <p className="text-xs font-bold text-navy group-hover:text-brand-600 transition">Perlu bantuan/konsultasi?</p>
            <p className="text-[11px] text-slate-500">Kontak kami saja!</p>
          </div>
        </a>

        {/* WhatsApp Button with badge */}
        <a
          href="https://wa.me/6281234567890?text=Halo%20tim%20Pesanin,%20saya%20mau%20tanya%20tentang%20fitur%20dan%20paket"
          target="_blank"
          rel="noopener noreferrer"
          aria-label="Hubungi kami via WhatsApp"
          className="group relative flex h-14 w-14 items-center justify-center rounded-full bg-[#25D366] text-white shadow-xl shadow-emerald-500/30 transition-transform duration-200 hover:scale-105 active:scale-95"
        >
          {/* Notification count badge */}
          <span className="absolute -right-0.5 -top-0.5 flex h-5 w-5 items-center justify-center rounded-full bg-rose-500 text-[11px] font-bold text-white shadow ring-2 ring-white">
            1
          </span>
          {/* WhatsApp icon */}
          <svg viewBox="0 0 32 32" fill="currentColor" className="h-7 w-7">
            <path d="M16 2C8.28 2 2 8.28 2 16c0 2.54.68 4.92 1.87 6.98L2 30l7.25-1.83A13.9 13.9 0 0 0 16 30c7.72 0 14-6.28 14-14S23.72 2 16 2zm7.68 19.46c-.32.9-1.85 1.72-2.54 1.83-.65.1-1.49.14-2.4-.15a22.04 22.04 0 0 1-2.17-.82c-3.83-1.65-6.33-5.48-6.52-5.74-.19-.26-1.54-2.05-1.54-3.9 0-1.85.97-2.76 1.32-3.13.35-.36.77-.45 1.03-.45h.73c.24 0 .56-.09.87.66.32.77 1.09 2.65 1.18 2.84.1.2.16.42.04.67-.12.26-.19.42-.36.64-.19.22-.39.5-.56.67-.19.19-.38.39-.16.77.22.36.98 1.62 2.1 2.62 1.45 1.29 2.66 1.68 3.04 1.87.36.19.58.15.8-.09.22-.26.95-1.1 1.2-1.48.26-.36.51-.3.86-.18.36.13 2.25 1.06 2.64 1.26.38.19.64.29.74.45.1.16.1.95-.22 1.85z" />
          </svg>
        </a>
      </div>

    </div>
  );
}
