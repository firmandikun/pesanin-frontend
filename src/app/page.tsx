/* eslint-disable @next/next/no-img-element */
import { Geist } from "next/font/google";
import Link from "next/link";
import { DemoLink, Faq, HomeHeader, PricingPlans, SegmentTabs } from "@/components/home/HomeClient";
import { WRAP, Wordmark } from "@/components/home/shared";
import { WaLink } from "@/components/marketing/Contact";

/* Landing page, sliced from Figma "Pesanin" → Beranda (node 1:4193). Desktop frame is 1440px wide. */

const geist = Geist({ subsets: ["latin"], weight: ["400", "500", "600", "700"] });

const INK = "text-[#1a1f2e]";
const MUTED = "text-[#878787]";
const SHADOW_200 = "shadow-[0_1px_4px_0_rgba(12,12,13,0.1),0_1px_4px_0_rgba(12,12,13,0.05)]";
const SHADOW_300 = "shadow-[0_4px_4px_-1px_rgba(12,12,13,0.1),0_4px_4px_-1px_rgba(12,12,13,0.05)]";

/** Orange pill above a section title. `jakarta` = Plus Jakarta Sans like most labels in the design. */
function Eyebrow({ children, jakarta = true }: { children: React.ReactNode; jakarta?: boolean }) {
  return <span className={`inline-flex items-center justify-center rounded-[20px] bg-[rgba(254,85,27,0.1)] p-[8px] text-[12px] text-[#fe551b] ${jakarta ? "font-sans leading-[15px]" : "leading-[16px]"}`}>{children}</span>;
}

function SectionTitle({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <h2 className={`text-[24px] font-medium leading-[31px] tracking-[0.048px] ${INK} ${className}`}>{children}</h2>;
}

function Cap({ icon, title, desc, children, className = "", wide = false }: { icon: string; title: string; desc: string; children: React.ReactNode; className?: string; wide?: boolean }) {
  return (
    <div className={`flex h-[417px] flex-col overflow-clip rounded-[16px] bg-[#fafafa] ${className}`}>
      <div className="flex flex-col gap-[16px] p-[20px]">
        <div className="flex items-center gap-[8px]">
          <img src={icon} alt="" width={24} height={24} className="size-[24px] shrink-0" />
          <p className="text-[18px] font-semibold leading-[23px] text-[#1d2127]">{title}</p>
        </div>
        <p className={`text-[14px] leading-[18px] text-[#1e1e1d] ${wide ? "" : "min-h-[36px] lg:max-w-[357px]"}`}>{desc}</p>
      </div>
      {/* Screenshots sit 4px below the header, as in the design; positions are relative to this layer. */}
      <div className="relative flex-1">{children}</div>
    </div>
  );
}

function Img({ src, box, img = "absolute inset-0 size-full object-cover" }: { src: string; box: string; img?: string }) {
  return <div className={`absolute overflow-hidden rounded-[8px] ${box}`}><img src={src} alt="" loading="lazy" className={`pointer-events-none max-w-none ${img}`} /></div>;
}

const LOGOS: [string, string, string][] = [
  ["/landing/logo-shopee.png", "Shopee", "h-[24px] w-[75px] object-cover"],
  ["/landing/logo-whatsapp-business.svg", "WhatsApp Business", "h-[24px] w-[168px]"],
  ["/landing/logo-meta.png", "Meta", "h-[22px] w-[85px]"],
  ["/landing/logo-midtrans.png", "Midtrans", "h-[20px] w-[121px] object-cover"],
  ["/landing/logo-rajaongkir.png", "RajaOngkir", "h-[24px] w-[96px] object-cover"],
];

const STATS: [string, string, string, string][] = [
  ["65%", "Lebih hemat", "biaya sistem", "Dibanding biaya langganan sistem omnichannel skala besar yang mencapai puluhan juta."],
  ["30 Detik", "Sinkronisasi", "0tomatis", "Update pesanan, status pencairan dana, dan stok berjalan otomatis tanpa refresh manual."],
  ["100%", "Transparansi", "berbasis API", "Hitungan laba bersih diambil langsung dari rincian resmi transaksi."],
];

export default function Home() {
  return (
    <div className={`${geist.className} min-h-screen overflow-x-clip bg-white leading-[1.3] ${INK}`}>
      <HomeHeader />

      {/* HERO (1:4211) */}
      <section className="relative overflow-hidden">
        <img src="/landing/hero-swoosh.png" alt="" aria-hidden className="pointer-events-none absolute right-0 top-[-50px] z-0 hidden h-[342px] w-[310px] object-cover lg:block" />
        <div className={`${WRAP} relative z-10 flex flex-col gap-[40px] py-[40px] lg:flex-row lg:items-start lg:gap-[80px] lg:py-[80px]`}>
          <div className="flex flex-col justify-center gap-[32px] lg:w-[456px] lg:shrink-0">
            <div className="flex flex-col gap-[24px]">
              <h1 className="text-[32px] font-bold leading-[42px] sm:leading-[52px] tracking-[0.08px] sm:text-[40px]">
                Omzet besar belum tentu untung. Lihat <span className="text-[#fe551b]">laba bersihmu</span> setiap hari.
              </h1>
              <p className="text-[18px] leading-[23px] tracking-[0.036px]">Satukan pesanan Shopee, checkout web, HPP, dan biaya iklan dalam satu dashboard otomatis.</p>
            </div>
            <div className="flex flex-col gap-[12px]">
              <div className="flex flex-wrap items-center gap-[20px]">
                <Link href="/register" className="flex items-center justify-center rounded-[32px] bg-[#fe551b] px-[16px] py-[12px] text-[14px] leading-[24px] tracking-[0.028px] text-white transition hover:bg-[#e64a14]">Coba Gratis Sekarang</Link>
                <DemoLink className={`flex items-center justify-center rounded-[32px] bg-[#efeeed] px-[16px] py-[12px] text-[14px] leading-[24px] tracking-[0.028px] ${INK} transition hover:bg-[#e5e4e3]`}>Jadwalkan Demo</DemoLink>
              </div>
              <p className="flex flex-wrap items-center text-[12px] leading-[18px] tracking-[0.024px]">
                Gratis selamanya hingga 100 orderan/bulan<span className="w-[21px] text-center text-[14px]" aria-hidden>•</span>Tanpa kartu kredit
              </p>
            </div>
          </div>
          <div className="min-w-0 flex-1 rounded-[20px] border border-[#f7f7f7] bg-white p-[11px] shadow-[inset_0_0_12px_rgba(0,0,0,0.025)] max-sm:p-[7px]">
            <div className="rounded-[12px] border border-[#f5f5f5] bg-white p-[3px]">
              <div className="relative aspect-[3360/1573] w-full overflow-hidden rounded-[12px]">
                <img src="/landing/hero-dashboard.png" alt="Dashboard Pesanin" className="absolute left-0 top-[-33.5%] h-[133.5%] w-full max-w-none" />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* SOCIAL PROOF (1:4231) */}
      <section className="border-y border-[#efeeed]">
        <div className={`${WRAP} flex flex-col gap-[24px] py-[32px] lg:flex-row lg:items-center lg:gap-[80px]`}>
          <p className="shrink-0 text-[16px] leading-[21px] tracking-[0.032px]">Terhubung resmi dengan ekosistem jualanmu:</p>
          <div className="flex flex-1 flex-wrap items-center justify-between gap-x-[24px] gap-y-[20px] max-lg:justify-start">
            {LOGOS.map(([src, alt, cls]) => <img key={alt} src={src} alt={alt} className={`shrink-0 ${cls}`} />)}
          </div>
        </div>
      </section>

      {/* SEGMENTASI SOLUSI (1:4251) */}
      <section id="solusi" className="scroll-mt-4 bg-[#fafafa]">
        <div className={`${WRAP} flex flex-col items-start gap-[24px] py-[56px] lg:py-[80px]`}>
          <div className="flex flex-col items-start gap-[16px]">
            <Eyebrow>SEGMENTASI SOLUSI</Eyebrow>
            <SectionTitle className="lg:w-[759px]">Dibangun untuk cara jualanmu hari ini. <span className={MUTED}>Pilih kanal utama jualanmu untuk melihat masalah yang kami bereskan</span></SectionTitle>
          </div>
          <SegmentTabs />
        </div>
      </section>

      {/* KAPABILITAS UTAMA (1:4277) */}
      <section id="fitur" className="scroll-mt-4">
        <div className={`${WRAP} flex flex-col gap-[24px] py-[56px] lg:py-[80px]`}>
          <div className="flex flex-col gap-[16px] lg:flex-row lg:items-center lg:justify-between">
            <div className="flex flex-col items-start gap-[16px]">
              <Eyebrow>KAPABILITAS UTAMA</Eyebrow>
              <SectionTitle className="lg:w-[473px]">Dari pesanan masuk sampai laporan laba, serba otomatis</SectionTitle>
            </div>
            <p className="text-[18px] leading-[23px] tracking-[0.036px] lg:w-[517px] lg:text-right">Lima pilar utama yang menggantikan <br className="hidden lg:block" />tumpukan spreadsheet dan langganan aplikasi terpisah.</p>
          </div>
          <div className="grid gap-[20px] lg:grid-cols-[815fr_397fr]">
            <Cap wide icon="/landing/ic-chart-analysis.svg" title="Analitik laba & potongan otomatis" desc="Membaca potongan Shopee serta menghitung HPP per SKU secara otomatis">
              <Img src="/landing/cap-laba.png" box={`left-[19px] top-[4px] h-[349px] w-[777px] ${SHADOW_300}`} />
            </Cap>
            <Cap icon="/landing/ic-cart-checkout.svg" title="Checkout & Landing Page Builder" desc="Halaman penjualan dengan domain sendiri, tarif ongkir 7+ kurir, COD, serta pembayaran QRIS/VA otomatis">
              <Img src="/landing/cap-domain.png" box={`left-[31px] top-[4px] h-[65px] w-[335px] ${SHADOW_200}`} img="absolute left-[-3.36%] top-[-18.46%] h-[135.38%] w-[103.43%]" />
              <Img src="/landing/cap-custom-domain.png" box={`left-[58px] top-[89px] h-[96px] w-[319px] ${SHADOW_200}`} img="absolute left-[-4.8%] top-[-13.27%] h-[236.28%] w-[109.87%]" />
            </Cap>
          </div>
          <div className="grid gap-[20px] md:grid-cols-2 lg:grid-cols-3 lg:gap-[20.5px]">
            <Cap icon="/landing/ic-ads-click.svg" title="Atribusi Iklan & ROAS Nyata" desc="Sinkronisasi biaya Shopee Ads (+PPN 11%) dan Meta Ads untuk melihat kampanye yang menghasilkan profit">
              <Img src="/landing/cap-ads.png" box="left-[20px] top-[4px] h-[85px] w-[819px]" img="absolute left-[-1.2%] top-[-9.17%] h-[109.17%] w-[101.2%]" />
              <Img src="/landing/cap-ads.png" box="left-[-233px] top-[105px] h-[81px] w-[786px]" img="absolute left-[-1.2%] top-[-9.17%] h-[109.17%] w-[101.2%]" />
              <Img src="/landing/cap-ads.png" box="left-[-402px] top-[202px] h-[81px] w-[786px]" img="absolute left-[-1.2%] top-[-9.17%] h-[109.17%] w-[101.2%]" />
            </Cap>
            <Cap icon="/landing/ic-message.svg" title="Inbox CRM & Kolaborasi Tim" desc="Satukan chat Shopee dan WhatsApp Business dalam satu layar, lengkap">
              <Img src="/landing/cap-chat.png" box={`left-[20.5px] top-[4px] h-[331px] w-[1037px] ${SHADOW_200}`} />
            </Cap>
            <Cap icon="/landing/ic-report-data.svg" title="Otomasi Agentic & Laporan Keuangan" desc="Pantau perubahan status dana, deteksi dini produk rugi/HPP kosong.">
              <Img src="/landing/cap-otomasi.png" box="left-[11px] top-[4px] h-[277px] w-[759px]" />
            </Cap>
          </div>
        </div>
      </section>

      {/* DAMPAK TERUKUR (1:4330) */}
      <section>
        <div className={`${WRAP} flex flex-col gap-[24px] py-[56px] lg:py-[80px]`}>
          <div className="flex flex-col items-start gap-[16px]">
            <Eyebrow jakarta={false}>DAMPAK TERUKUR</Eyebrow>
            <SectionTitle className="lg:w-[473px]">Dipercaya Seller <span className={MUTED}>untuk memangkas biaya operasional sistem</span></SectionTitle>
          </div>
          <div className="grid gap-[24px] md:grid-cols-3">
            {STATS.map(([v, a, b, d]) => (
              <div key={v} className="flex h-[200px] flex-col justify-between rounded-[16px] border border-[#ededed] bg-white p-[20px] lg:h-[265px]">
                <div className="flex items-start gap-[12px] whitespace-nowrap text-[#1d2127]">
                  <p className="text-[36px] font-bold leading-[47px]">{v}</p>
                  <p className="text-[18px] leading-[23px]">{a}<br />{b}</p>
                </div>
                <p className="text-[16px] leading-[21px] text-[#1e1e1d]">{d}</p>
              </div>
            ))}
          </div>
          <figure className="flex min-h-[417px] flex-col items-center justify-center gap-[24px] rounded-[16px] p-[20px] text-center">
            <img src="/landing/testimonial-avatar.png" alt="" width={80} height={80} className="size-[80px] rounded-full" />
            <blockquote className="max-w-[800px] text-[20px] font-medium leading-[26px] sm:leading-[31px] text-[#1d2127] sm:text-[24px]">
              “Sebelumnya kami bayar hingga Rp10 juta/bulan di sistem lama dan masih harus rekap laba bersih di Excel. Pindah ke Pesanin memangkas biaya sistem lebih dari separuh, dan laba per SKU langsung terlihat setiap hari.”
            </blockquote>
            <figcaption className="flex flex-col items-center gap-[4px] text-[16px] leading-[21px] sm:leading-[23px] sm:text-[18px]">
              <span className="font-medium text-[#1d2127]">Operasional lead</span>
              <span className={MUTED}>Brand Retail Multi-Toko · Klien Enterprise Pesanin</span>
            </figcaption>
          </figure>
        </div>
      </section>

      {/* PAKET & HARGA (1:4359) */}
      <section id="harga" className="scroll-mt-4 bg-[#fafafa]">
        <div className={`${WRAP} flex flex-col items-center gap-[24px] py-[56px] lg:py-[80px]`}>
          <div className="flex w-full flex-col gap-[16px] lg:flex-row lg:items-center lg:justify-between">
            <div className="flex flex-col items-start gap-[16px]">
              <Eyebrow>PAKET &amp; HARGA</Eyebrow>
              <SectionTitle className="lg:w-[473px]">Harga simple yang tumbuh bersama bisnismu.</SectionTitle>
            </div>
            <p className="text-[18px] leading-[23px] tracking-[0.036px] lg:w-[517px] lg:text-right">Pilih jalur sesuai cara jualanmu. <br className="hidden lg:block" />Tanpa fitur mubazir, mulai gratis selamanya</p>
          </div>
          <PricingPlans />

          <div className="flex w-full flex-col overflow-clip rounded-[16px] bg-white">
            <div className="flex flex-col items-start gap-[16px] p-[20px]">
              <span className="rounded-[20px] bg-[#fe551b] px-[8px] py-[6px] text-[12px] font-medium leading-[16px] tracking-[0.24px] text-white">SCALE &amp; ENTERPRISE</span>
              <p className="text-[16px] font-semibold leading-[21px]">Scale &amp; Enterprise</p>
              <p className={`text-[12px] leading-[16px] ${MUTED}`}>Untuk big seller, brand, dan agensi dengan <b className={`font-bold ${INK}`}>50.000 – 100.000+</b> order/bulan yang ingin memangkas biaya sistem hingga 65%.</p>
              <div className="flex flex-wrap gap-x-[20px] gap-y-[8px]">
                {["Unlimited Toko & Multi-Gudang", "Otomasi Agentic & Deteksi Anomali Penuh", "Dedicated Account & SLA Prioritas"].map((c) => (
                  <span key={c} className="rounded-[20px] bg-[rgba(254,85,27,0.1)] px-[8px] py-[4px] text-[10px] font-bold leading-[13px] text-[#fe551b]">{c}</span>
                ))}
              </div>
            </div>
            <div className="flex flex-wrap items-center justify-between gap-[12px] px-[20px] pb-[20px]">
              <p className="text-[16px] leading-[21px]">Dapatkan penawaran khusus</p>
              <WaLink text="Halo tim Pesanin, saya tertarik paket Scale & Enterprise" target="_blank" rel="noopener noreferrer"
                className="flex h-[42px] items-center rounded-[20px] border border-[#efeeed] bg-[#fe551b] px-[16px] text-[14px] font-medium leading-[18px] text-white transition hover:bg-[#e64a14]">Hubungi Tim Sales</WaLink>
            </div>
          </div>

          <div className="flex w-full flex-col gap-[8px] tracking-[0.036px]">
            <p className="text-[18px] font-bold leading-[23px]">Perluas sesuai kebutuhanmu.</p>
            <p className="text-[18px] leading-[23px]">Fleksibilitas modul tambahan dan transparansi biaya resmi mitra.</p>
          </div>
          <div className="grid w-full gap-[24px] md:grid-cols-2">
            <div className="flex flex-col gap-[20px] rounded-[16px] border border-[#ededed] bg-white p-[19px]">
              <div className="flex items-center gap-[20px]">
                <p className="text-[18px] font-bold leading-[23px] text-[#1d2127]">Bundling Omnichannel</p>
                <span className="rounded-[20px] bg-[rgba(254,85,27,0.1)] px-[8px] py-[4px] text-[10px] font-medium leading-[13px] text-[#fe551b]">Hemat 30%</span>
              </div>
              <p className="text-[16px] leading-[21px] text-[#1e1e1d]">Gabungkan jalur Shopee dan Social/Web sekaligus dalam satu workspace terpusat untuk laporan Laba Rugi lintas kanal.</p>
            </div>
            <div className="flex flex-col gap-[20px] rounded-[16px] border border-[#ededed] bg-white p-[19px]">
              <p className="text-[18px] font-bold leading-[23px] text-[#1d2127]">Transparansi Biaya Mitra</p>
              <p className="text-[16px] leading-[21px] text-[#1e1e1d]">Harga belum termasuk PPN 11%. Biaya payment gateway (Midtrans) dan ongkir (RajaOngkir) dibayar langsung sesuai tarif resmi mitra tanpa markup.</p>
            </div>
          </div>
        </div>
      </section>

      {/* FAQ (1:4579) */}
      <section id="faq" className="scroll-mt-4">
        <div className={`${WRAP} flex flex-col items-center gap-[24px] py-[56px] lg:py-[80px]`}>
          <h2 className="text-center text-[28px] font-bold leading-[36px] sm:leading-[47px] tracking-[0.072px] sm:text-[36px]">Pertanyaan yang sering diajukan</h2>
          <Faq />
        </div>
      </section>

      {/* CTA (1:4608) */}
      <section className={`${WRAP} py-[40px]`}>
        <div className="relative flex flex-col items-center justify-center gap-[48px] overflow-clip rounded-[24px] px-[20px] py-[48px] sm:p-[48px]">
          <div aria-hidden className="pointer-events-none absolute left-[42.4%] top-[118.77px] size-[215px] rounded-full bg-[rgba(255,214,167,0.4)] blur-[150px]" />
          <div aria-hidden className="pointer-events-none absolute left-[-34px] top-[204.77px] size-[215px] rounded-full bg-[rgba(254,85,27,0.4)] blur-[150px]" />
          <div aria-hidden className="pointer-events-none absolute left-[81.8%] top-[226.77px] size-[215px] rounded-full bg-[rgba(254,85,27,0.4)] blur-[150px]" />
          <div className="relative flex max-w-[800px] flex-col items-center gap-[16px] text-center leading-[1.3]">
            <h2 className="text-[32px] font-bold sm:text-[40px]">Berhenti menebak untung. Lihat angkanya hari ini.</h2>
            <p className="max-w-[542px] text-[16px]">Hubungkan tokomu dalam 5 menit dan temukan laba bersih dari setiap pesanan.</p>
          </div>
          <Link href="/register" className="relative flex h-[47px] items-center justify-center gap-[10px] rounded-[20px] bg-[#fe551b] px-[16px] py-[12px] font-sans text-[14px] font-medium leading-[18px] text-white transition hover:bg-[#e64a14]">
            Coba gratis sekarang <img src="/landing/ic-arrow-right.svg" alt="" width={18} height={18} className="size-[18px]" />
          </Link>
        </div>
      </section>

      {/* FOOTER (1:4621) */}
      <footer className="relative border-t border-[#ededed] bg-white">
        <img src="/landing/footer-bg.png" alt="" aria-hidden className="pointer-events-none absolute inset-0 size-full object-cover" />
        <div className="relative mx-auto flex w-full max-w-[1440px] flex-col gap-[40px] px-4 pt-[56px] sm:px-6 lg:flex-row lg:items-start lg:justify-between lg:px-10 lg:pt-[80px] xl:px-[140px]">
          <div className="flex flex-col items-start gap-[32px]">
            <Link href="/" aria-label="Pesanin"><Wordmark className="h-[43px] w-[183px]" /></Link>
            <p className="max-w-[444px] text-[16px] font-medium leading-[21px]">Pusat kendali pesanan, potongan marketplace, HPP, iklan, dan laba bersih untuk seller online Indonesia.</p>
          </div>
          <div className="grid grid-cols-2 gap-x-[40px] gap-y-[32px] text-[16px] leading-[21px] sm:flex sm:gap-[80px]">
            <div className="flex flex-col items-start gap-[12px]">
              <p className="font-semibold">Platform Overview</p>
              <Link href="#solusi" className="hover:text-[#fe551b]">Masalah &amp; Solusi</Link>
              <Link href="#fitur" className="hover:text-[#fe551b]">5 Kapabilitas</Link>
              <Link href="#harga" className="hover:text-[#fe551b]">Paket &amp; Harga</Link>
            </div>
            <div className="flex flex-col items-start gap-[12px]">
              <p className="font-semibold">Akun</p>
              <Link href="/login" className="hover:text-[#fe551b]">Masuk Dashboard</Link>
              <Link href="/register" className="hover:text-[#fe551b]">Coba Gratis</Link>
              <DemoLink className="hover:text-[#fe551b]">Jadwalkan Demo</DemoLink>
            </div>
            <div className="flex flex-col items-start gap-[12px]">
              <p className="font-semibold">Kontak &amp; Legal</p>
              <a href="mailto:halo@pesaninn.my.id" className="hover:text-[#fe551b]">halo@pesaninn.my.id</a>
              <Link href="/privacy-policy" className="hover:text-[#fe551b]">Kebijakan Privasi</Link>
              <Link href="/terms-of-service" className="hover:text-[#fe551b]">Ketentuan Layanan</Link>
            </div>
          </div>
        </div>
        <div className="relative mt-[40px] flex items-center justify-center bg-[#fe551b] px-4 py-[12px]">
          <p className="text-center text-[11px] leading-[14.67px] text-white">© 2026 pesan in (pesaninn.my.id). Seluruh hak cipta dilindungi.</p>
        </div>
      </footer>
    </div>
  );
}
