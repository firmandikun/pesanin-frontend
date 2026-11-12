import {
  ArrowRight, BarChart3, Bell, CalendarCheck, CheckCircle2, ChevronDown, Coins, FileDown, FileSpreadsheet,
  Globe, Inbox, Link2, Megaphone, MessageCircle, PackageCheck, Receipt, Send, ShieldCheck, Store, Tag, Truck, Users, Wallet,
} from "lucide-react";
import Link from "next/link";
import { BrandIcon, type Brand } from "@/components/BrandIcon";
import { ShopeeMark } from "@/components/ChannelBadge";
import { LogoMark } from "@/components/Logo";
import { AdsMockup, CheckoutMockup, HeroDashboard, IncomeMockup, InboxMockup, ProfitMockup, ReportMockup } from "@/components/marketing/Mockups";
import { HowItWorks } from "@/components/marketing/HowItWorks";
import { Pricing } from "@/components/marketing/Pricing";
import { SitePage } from "@/components/marketing/SiteChrome";
import { waLink } from "@/lib/site";

const FAQ: [string, string][] = [
  ["Apa itu Pesanin dan cara kerjanya?", "Pesanin adalah dashboard untuk seller online: pesanan dari Shopee, checkout web, dan input manual masuk ke satu tempat. Pesanin membaca penghasilan Shopee per pesanan, menghitung HPP, biaya iklan, dan pengeluaran, lalu menampilkan laba bersih yang sebenarnya. Untuk jualan di media sosial, Pesanin juga menyediakan link checkout dan landing page dengan ongkir otomatis dan COD."],
  ["Platform apa saja yang didukung?", "Shopee terhubung resmi lewat Shopee Open Platform (pesanan, produk, stok, chat, dan Shopee Ads). Untuk penjualan di Instagram, TikTok, Facebook, dan WhatsApp, kamu memakai link checkout/landing page Pesanin. WhatsApp Business (Cloud API) terhubung untuk inbox dan broadcast, Meta Ads untuk laporan iklan, dan Biteship untuk pengiriman. TikTok Shop dan Lazada sedang kami siapkan."],
  ["Apakah potongan Shopee terbaca otomatis?", "Ya. Pesanin mengambil rincian penghasilan tiap pesanan langsung dari API Shopee: biaya admin, biaya layanan, biaya pemrosesan pesanan Rp1.250, ongkir aktual dan subsidinya, komisi AMS, pajak, sampai ongkir retur. Sebelum dana cair angkanya ditandai \"Estimasi\", dan otomatis diperbarui menjadi final begitu Shopee melepas dana."],
  ["Bagaimana cara menghitung HPP dan laba bersih?", "Isi HPP (modal) per produk atau per SKU sekali saja, termasuk massal. Laba bersih = omzet − potongan marketplace − HPP − biaya iklan (Shopee Ads sudah termasuk PPN 11%) − biaya operasional. Pesanan batal tidak dihitung, retur dicatat sebagai kerugian."],
  ["Bisakah input pengeluaran manual atau transaksi di luar marketplace?", "Bisa. Menu Pengeluaran untuk gaji, sewa, packing, pembelian stok, dan aset. Pesanan dari luar marketplace bisa masuk lewat checkout web atau dicatat manual, lalu ikut terhitung di laporan."],
  ["Apakah data saya aman?", "Koneksi ke Shopee dan Meta memakai login resmi (OAuth), Pesanin tidak pernah meminta password tokomu. Token disimpan terenkripsi, akses tim bisa dibatasi per peran, dan kamu bisa memutus koneksi kapan saja."],
  ["Bisakah mengelola lebih dari satu toko?", "Bisa. Hubungkan beberapa toko Shopee sekaligus. Setiap toko punya ruang kerja sendiri (ringkasan, pesanan, produk, keuangan, iklan), dan dashboard utama menggabungkan semuanya."],
  ["Bisakah tim saya ikut memakai Pesanin?", "Bisa. Tambahkan anggota tim dengan peran berbeda (admin, CS, gudang, advertiser) dan login masing-masing, tanpa membagikan akun pemilik."],
  ["Apakah bisa dipakai di HP atau tablet?", "Bisa. Pesanin berjalan di browser HP, tablet, maupun laptop, dan bisa dipasang ke layar utama HP seperti aplikasi untuk notifikasi pesanan baru."],
  ["Apa bedanya Pesanin dengan aplikasi lain?", "Pesanin menggabungkan dua hal yang biasanya terpisah: alat jualan (checkout, landing page, ongkir, COD, resi otomatis, inbox WhatsApp, broadcast) dan analitik keuangan marketplace (penghasilan per pesanan, HPP, iklan, laba rugi, arus kas). Jadi kamu tidak perlu dua langganan."],
  ["Bagaimana proses berlangganan?", "Daftar gratis, coba fiturnya, lalu pilih paket saat siap. Pembayaran lewat transfer bank, virtual account, QRIS, atau e-wallet, dengan faktur ke email setiap periode."],
  ["Bisa ganti paket kapan saja?", "Bisa. Upgrade langsung aktif dan sisa masa paket lama dihitung proporsional. Downgrade berlaku di periode tagihan berikutnya."],
  ["Bagaimana kalau kuota pesanan habis?", "Pesanan tetap masuk dan tidak ada yang ditolak. Kami hanya mengingatkan untuk upgrade paket."],
  ["Apakah data tetap tersimpan kalau berhenti berlangganan?", "Ya. Riwayat pesanan dan laporanmu tetap tersimpan, dan langsung bisa dipakai lagi saat kamu melanjutkan paket."],
  ["Bagaimana cara mendapatkan bantuan?", "Chat tim kami lewat WhatsApp, baca Tutorial di menu atas, atau jadwalkan demo gratis untuk dipandu langsung."],
];

type FeatureProps = { id?: string; tag: string; icon: React.ElementType; title: string; desc: string; bullets: string[]; mockup: React.ReactNode; flip?: boolean };

function Feature({ id, tag, icon: Icon, title, desc, bullets, mockup, flip }: FeatureProps) {
  return (
    <div id={id} className={`mx-auto grid max-w-7xl scroll-mt-20 items-center gap-12 px-4 py-16 md:py-24 lg:grid-cols-2 [&>*]:min-w-0 ${flip ? "lg:[&>:first-child]:order-last" : ""}`}>
      <div>
        <span className="inline-flex items-center gap-1.5 rounded-full bg-brand-100 px-3 py-1 text-xs font-bold text-brand-700"><Icon size={13} />{tag}</span>
        <h3 className="mt-4 text-3xl font-extrabold leading-tight tracking-tight text-navy md:text-[34px]">{title}</h3>
        <p className="mt-4 text-lg leading-relaxed text-slate-600">{desc}</p>
        <ul className="mt-6 space-y-3">
          {bullets.map((b) => <li key={b} className="flex items-start gap-3 text-slate-700"><CheckCircle2 size={18} className="mt-0.5 shrink-0 text-emerald-500" /><span>{b}</span></li>)}
        </ul>
      </div>
      <div>{mockup}</div>
    </div>
  );
}

const ALL_FEATURES: [React.ElementType, string, string][] = [
  [Store, "Multi toko Shopee", "Pesanan, produk, stok & chat tersinkron tiap 30 detik"],
  [Receipt, "Penghasilan per pesanan", "Rincian 20+ jenis potongan langsung dari API Shopee"],
  [Coins, "HPP per produk & SKU", "Isi massal, laba tiap pesanan langsung terhitung"],
  [Wallet, "Pengeluaran", "Operasional, pembelian stok, aset & arus kas"],
  [Megaphone, "Shopee Ads & Meta Ads", "Biaya iklan +PPN, ROAS per kampanye & produk"],
  [FileSpreadsheet, "Laba rugi & arus kas", "Ekspor Excel & PDF, siap untuk pembukuan"],
  [Link2, "Link checkout", "Ongkir otomatis 7+ kurir, COD, transfer & e-payment"],
  [Globe, "Landing page builder", "Block editor, domain sendiri, pixel Meta/TikTok/Google"],
  [Truck, "Resi otomatis", "Lunas → kurir Biteship dipesan, resi asli terbit"],
  [FileDown, "Produk digital otomatis", "Link akses terkirim via WhatsApp & email setelah bayar"],
  [Inbox, "Inbox + CRM", "Chat WhatsApp & Shopee, label, catatan, riwayat pelanggan"],
  [Send, "Broadcast WhatsApp", "Kirim template resmi Meta ke ribuan kontak"],
  [Users, "Anggota tim & peran", "Login terpisah untuk admin, CS, gudang & advertiser"],
  [Tag, "Kupon & order bump", "Diskon, gratis ongkir & tambahan produk di checkout"],
  [PackageCheck, "Pesanan & pengiriman", "Atur pengiriman Shopee, cetak label massal, lacak paket"],
  [BarChart3, "Riset produk & pasar", "Produk naik/turun, stok menipis, tren pencarian"],
];

export default function Home() {
  return (
    <SitePage>
      {/* HERO */}
      <section className="relative overflow-hidden border-b border-slate-100 bg-[#fbfaf8]">
        <div className="pointer-events-none absolute inset-0"><div className="absolute left-1/2 top-0 h-[520px] w-[760px] -translate-x-1/2 rounded-full bg-brand-100/50 blur-3xl" /></div>
        <div className="relative mx-auto grid max-w-7xl items-center gap-14 px-4 pb-20 pt-14 lg:grid-cols-[1.05fr_1fr] [&>*]:min-w-0">
          <div>
            <div className="inline-flex flex-wrap items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-600">
              <ShopeeMark size={16} /> Integrasi resmi Shopee Open Platform · sinkron real-time
            </div>
            <h1 className="mt-6 text-[34px] font-extrabold leading-[1.1] tracking-[-0.03em] text-navy sm:text-[44px] md:text-[56px]">
              Kelola pesanan & <span className="text-brand-500">laba bersih</span> jualan online dalam satu dashboard
            </h1>
            <p className="mt-5 max-w-xl text-lg leading-relaxed text-slate-600">
              Pesanan Shopee, checkout web, dan chat WhatsApp jadi satu. Pesanin membaca potongan Shopee per pesanan, menghitung HPP, iklan, dan pengeluaran, jadi kamu tahu untung yang sebenarnya, setiap hari.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link href="/register" className="flex h-12 items-center gap-2 rounded-xl bg-brand-500 px-7 font-bold text-white shadow-lg shadow-brand-500/25 transition hover:-translate-y-0.5 hover:bg-brand-600">Coba Gratis Sekarang <ArrowRight size={18} /></Link>
              <a href={waLink("Halo tim Pesanin, saya mau jadwalkan demo")} target="_blank" rel="noopener noreferrer" className="flex h-12 items-center gap-2 rounded-xl border border-slate-200 bg-white px-6 font-semibold text-navy transition hover:border-slate-300 hover:bg-slate-50"><CalendarCheck size={18} />Jadwalkan Demo</a>
            </div>
            <p className="mt-4 text-sm text-slate-500">Daftar gratis · Tanpa kartu kredit · Siap dalam 5 menit</p>
            <div className="mt-8 grid max-w-lg grid-cols-3 gap-4 border-t border-slate-200 pt-6">
              {[["30 detik", "interval sinkron pesanan"], ["20+", "jenis potongan Shopee terbaca"], ["7+ kurir", "ongkir & COD otomatis"]].map(([v, l]) => (
                <div key={l}><p className="text-2xl font-extrabold tracking-tight text-navy">{v}</p><p className="text-xs leading-snug text-slate-500">{l}</p></div>
              ))}
            </div>
          </div>
          <HeroDashboard />
        </div>
      </section>

      {/* INTEGRATIONS */}
      <section className="border-b border-slate-100 bg-white py-12">
        <div className="mx-auto max-w-7xl px-4">
          <p className="text-center text-sm font-semibold text-slate-500">Terhubung dengan layanan yang sudah kamu pakai</p>
          <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
            {([["shopee", "Shopee"], ["whatsapp", "WhatsApp Business"], ["meta", "Meta Ads"], ["instagram", "Instagram"], ["tiktok", "TikTok Shop (segera)"], ["biteship", "Biteship"], ["midtrans", "Midtrans"]] as [Brand, string][]).map(([b, label]) => (
              <span key={b} className="flex h-12 items-center gap-2.5 rounded-xl border border-slate-200 bg-white px-4 text-sm font-semibold text-navy shadow-sm">
                {b === "shopee" ? <ShopeeMark size={24} /> : <BrandIcon name={b} size={24} />}{label}
              </span>
            ))}
          </div>
          <p className="mt-8 text-center text-xs font-semibold uppercase tracking-wide text-slate-400">Ongkir & resi otomatis</p>
          <div className="mt-4 flex flex-wrap items-center justify-center gap-2.5">
            {([["jne", "JNE"], ["jnt", "J&T Express"], ["sicepat", "SiCepat"], ["spx", "SPX Express"], ["anteraja", "AnterAja"], ["pos", "POS Indonesia"], ["sap", "SAP Express"]] as [Brand, string][]).map(([b, label]) => (
              <span key={b} className="flex h-10 items-center gap-2 rounded-lg bg-slate-50 px-3 text-xs font-semibold text-slate-600 ring-1 ring-slate-100"><BrandIcon name={b} size={20} className="rounded" />{label}</span>
            ))}
          </div>
        </div>
      </section>

      {/* FEATURES */}
      <section id="fitur" className="scroll-mt-16">
        <div className="mx-auto max-w-3xl px-4 pt-20 text-center">
          <span className="inline-block rounded-full bg-brand-100 px-3 py-1 text-xs font-bold text-brand-700">Fitur Unggulan</span>
          <h2 className="mt-4 text-3xl font-extrabold tracking-tight text-navy md:text-[42px]">Dari pesanan masuk sampai laporan laba, otomatis</h2>
          <p className="mt-4 text-lg text-slate-600">Tidak perlu lagi rekap manual di Excel atau cocokkan saldo Shopee satu per satu.</p>
        </div>
        <div className="divide-y divide-slate-100">
          <Feature tag="Penghasilan Marketplace" icon={Receipt} title="Potongan Shopee tiap pesanan terbaca otomatis"
            desc="Pesanin mengambil data penghasilan pesanan langsung dari API resmi Shopee, jadi kamu tahu berapa uang yang benar-benar masuk dari tiap pesanan."
            bullets={["Biaya admin, layanan, pemrosesan pesanan Rp1.250, komisi AMS, dan pajak", "Ongkir aktual, subsidi ongkir Shopee, ongkir retur & pengembalian dana", "Status Estimasi → Sudah cair, diperbarui otomatis saat dana dilepas", "Pesanan batal tidak dihitung, retur dicatat sebagai kerugian"]}
            mockup={<IncomeMockup />} />
          <div className="bg-[#fbfaf8]">
            <Feature tag="Dashboard Laba" icon={Coins} flip title="Omzet, HPP, potongan, iklan, dan laba bersih dalam satu layar"
              desc="Isi HPP per produk atau SKU sekali, catat pengeluaran operasional, dan lihat alur dari omzet menjadi laba bersih setiap hari."
              bullets={["Profit funnel per toko dan gabungan semua channel", "HPP per produk/SKU, input massal tanpa Excel", "Pengeluaran: operasional, pembelian stok, aset & pembiayaan", "Peringatan HPP kosong, produk rugi, dan retur"]}
              mockup={<ProfitMockup />} />
          </div>
          <Feature tag="Marketing & Iklan" icon={Megaphone} title="Tahu iklan mana yang benar-benar untung"
            desc="Biaya Shopee Ads tersinkron otomatis tiap hari (sudah termasuk PPN 11%), laporan Meta Ads terhubung, dan biaya iklan lain bisa dicatat manual."
            bullets={["ROAS per kampanye dan per produk", "Saldo iklan Shopee terpantau langsung dari dashboard", "Laba setelah iklan, bukan sekadar omzet iklan", "Atribusi UTM untuk penjualan dari Instagram, TikTok & Meta Ads"]}
            mockup={<AdsMockup />} />
          <div className="bg-[#fbfaf8]">
            <Feature tag="Laporan Keuangan" icon={FileSpreadsheet} flip title="Laporan laba rugi & arus kas tanpa rekap manual"
              desc="Laporan per toko atau gabungan siap dipakai untuk evaluasi bisnis dan pembukuan. Ekspor transaksi lengkap dengan kolom per jenis potongan."
              bullets={["Laba rugi dan arus kas per periode", "Ekspor Excel (kolom per jenis biaya) dan cetak PDF", "Transaksi per pesanan dengan filter status, tanggal & pencarian", "Pagination hingga 1.000 baris per halaman"]}
              mockup={<ReportMockup />} />
          </div>
          <Feature tag="Checkout & Landing Page" icon={Link2} title="Jualan di media sosial dengan checkout yang rapi"
            desc="Bagikan link checkout atau landing page ke Instagram, TikTok, WhatsApp, dan iklan. Ongkir muncul otomatis, pembeli bisa COD, dan resi terbit sendiri setelah lunas."
            bullets={["Tarif real-time JNE, J&T, SiCepat, SPX, AnterAja, POS, SAP", "COD, transfer bank, dan e-payment (QRIS, VA, e-wallet)", "Resi Biteship otomatis saat lunas; produk digital terkirim otomatis", "Landing page builder dengan domain sendiri & pixel iklan"]}
            mockup={<CheckoutMockup />} />
          <div className="bg-[#fbfaf8]">
            <Feature tag="Inbox, CRM & Broadcast" icon={MessageCircle} flip title="Semua chat pelanggan di satu inbox"
              desc="Balas chat WhatsApp Business dan Shopee dari satu tempat, beri label pelanggan, dan kirim broadcast dengan template resmi Meta."
              bullets={["Inbox WhatsApp & Shopee dengan label, catatan, dan riwayat pesanan", "Balasan cepat dan pembagian chat ke anggota tim", "Broadcast WhatsApp ke segmen pelanggan", "Notifikasi pesanan baru ke HP dan WhatsApp"]}
              mockup={<InboxMockup />} />
          </div>
        </div>

        {/* ALL FEATURES */}
        <div className="border-t border-slate-100 bg-white py-20">
          <div className="mx-auto max-w-7xl px-4">
            <div className="mx-auto max-w-2xl text-center">
              <h2 className="text-3xl font-extrabold tracking-tight text-navy md:text-[36px]">Semua fitur dalam satu langganan</h2>
              <p className="mt-3 text-slate-600">Alat jualan dan analitik keuangan yang biasanya butuh beberapa aplikasi berbeda.</p>
            </div>
            <div className="mt-10 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {ALL_FEATURES.map(([Icon, t, d]) => (
                <div key={t} className="rounded-2xl border border-slate-200 bg-white p-5 transition hover:-translate-y-0.5 hover:border-brand-200 hover:shadow-md">
                  <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-50 text-brand-600"><Icon size={20} /></span>
                  <h3 className="mt-3 font-bold text-navy">{t}</h3>
                  <p className="mt-1 text-sm leading-relaxed text-slate-500">{d}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* CARA KERJA */}
      <section id="cara-kerja" className="scroll-mt-16 border-t border-slate-100 bg-[#fbfaf8] py-24">
        <div className="mx-auto max-w-7xl px-4"><HowItWorks /></div>
      </section>

      {/* HARGA */}
      <section id="harga" className="scroll-mt-16 border-t border-slate-100 bg-white py-24">
        <div className="mx-auto max-w-7xl px-4">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="text-3xl font-extrabold tracking-tight text-navy md:text-[42px]">Pilih Paket yang <span className="text-brand-500">Tepat</span></h2>
            <p className="mt-4 text-lg text-slate-600">Pilih paket sesuai volume pesanan bisnismu. Semua paket termasuk integrasi Shopee, analitik laba, dan checkout dengan ongkir otomatis & COD.</p>
          </div>
          <div className="mt-12"><Pricing /></div>
        </div>
      </section>

      {/* FAQ */}
      <section id="faq" className="scroll-mt-16 border-t border-slate-100 bg-[#fbfaf8] py-24">
        <div className="mx-auto max-w-3xl px-4">
          <div className="mb-10 text-center">
            <span className="inline-block rounded-full bg-brand-100 px-3 py-1 text-xs font-bold text-brand-700">FAQ</span>
            <h2 className="mt-4 text-3xl font-extrabold tracking-tight text-navy md:text-[40px]">Pertanyaan yang sering diajukan</h2>
          </div>
          <div className="space-y-2">
            {FAQ.map(([q, a]) => (
              <details key={q} className="group rounded-2xl border border-slate-200 bg-white px-6 py-1 transition hover:border-slate-300">
                <summary className="flex cursor-pointer list-none items-center justify-between gap-4 py-4 font-semibold text-navy">{q}<ChevronDown size={18} className="shrink-0 text-slate-400 transition-transform duration-300 group-open:rotate-180" /></summary>
                <p className="pb-5 leading-relaxed text-slate-600">{a}</p>
              </details>
            ))}
          </div>
          <p className="mt-6 text-center text-sm text-slate-500">Masih ada pertanyaan? <a href={waLink()} target="_blank" rel="noopener noreferrer" className="font-semibold text-brand-600">Chat tim kami</a> atau baca <Link href="/tutorials" className="font-semibold text-brand-600">Tutorial</Link>.</p>
        </div>
      </section>

      {/* CTA */}
      <section className="bg-gradient-to-br from-brand-500 to-brand-700 py-24">
        <div className="mx-auto max-w-2xl px-4 text-center">
          <LogoMark size={44} className="mx-auto" />
          <h2 className="mx-auto mt-6 text-3xl font-extrabold tracking-tight text-white md:text-[44px] md:leading-tight">Berhenti menebak untung. Mulai lihat angkanya.</h2>
          <p className="mt-4 text-lg text-white/85">Hubungkan tokomu hari ini dan lihat laba bersih per pesanan dalam hitungan menit.</p>
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <Link href="/register" className="inline-flex h-12 items-center gap-2 rounded-xl bg-white px-8 font-bold text-brand-600 shadow-lg transition hover:-translate-y-0.5">Coba Gratis Sekarang <ArrowRight size={18} /></Link>
            <a href={waLink("Halo tim Pesanin, saya mau jadwalkan demo")} target="_blank" rel="noopener noreferrer" className="inline-flex h-12 items-center gap-2 rounded-xl bg-white/15 px-7 font-semibold text-white transition hover:bg-white/25"><CalendarCheck size={18} />Jadwalkan Demo</a>
          </div>
          <p className="mt-5 flex items-center justify-center gap-2 text-sm text-white/80"><ShieldCheck size={16} />Login resmi Shopee & Meta · data terenkripsi · <Bell size={14} />notifikasi real-time</p>
        </div>
      </section>
    </SitePage>
  );
}
