import { FileText } from "lucide-react";
import { LegalLayout } from "@/components/marketing/LegalLayout";

export const metadata = {
  title: "Ketentuan Layanan · Pesanin",
  description: "Syarat dan ketentuan penggunaan platform Pesanin.",
};

export default function TermsOfServicePage() {
  return (
    <LegalLayout
      icon={<FileText size={32} />}
      title="Ketentuan Layanan"
      subtitle="PT Pesanin Solusi Digital"
      updatedAt="10 November 2026"
      version="Versi terms-2026-11"
    >
      <p className="text-base text-slate-700 leading-relaxed">
        Selamat datang di Pesanin. Ketentuan Layanan ini mengatur hak dan kewajiban antara Anda sebagai pengguna (&quot;Penjual&quot;, &quot;Pengguna&quot;, atau &quot;Anda&quot;) dan PT Pesanin Solusi Digital (&quot;Pesanin&quot;, &quot;kami&quot;) terkait pemanfaatan aplikasi web dan platform kami.
      </p>

      <div>
        <h2 className="text-xl font-bold text-navy">1. Penerimaan Ketentuan</h2>
        <p className="mt-3">
          Dengan mendaftar, mengakses, atau menggunakan layanan Pesanin, Anda menyatakan bahwa Anda telah cakap secara hukum, telah membaca, memahami, dan menyetujui seluruh ketentuan dalam perjanjian ini. Jika Anda tidak menyetujui salah satu pasal, Anda dipersilakan untuk menghentikan penggunaan layanan.
        </p>
      </div>

      <div>
        <h2 className="text-xl font-bold text-navy">2. Pendaftaran dan Keamanan Akun</h2>
        <ul className="mt-3 list-disc space-y-2 pl-5">
          <li>Anda wajib mengisi informasi yang valid dan dapat diverifikasi saat melakukan pendaftaran.</li>
          <li>Kerahasiaan akun, kata sandi, dan token integrasi sepenuhnya merupakan tanggung jawab Anda.</li>
          <li>Pesanin berhak menonaktifkan akun yang terindikasi disalahgunakan, memuat data palsu, atau melanggar hukum.</li>
        </ul>
      </div>

      <div>
        <h2 className="text-xl font-bold text-navy">3. Batasan Konten dan Produk yang Dilarang</h2>
        <p className="mt-3">
          Anda dilarang keras menggunakan form checkout atau fitur toko Pesanin untuk menjual barang/jasa yang dilarang oleh peraturan perundang-undangan di Republik Indonesia, antara lain:
        </p>
        <ul className="mt-3 list-disc space-y-1 pl-5">
          <li>Narkotika, psikotropika, dan zat adiktif ilegal.</li>
          <li>Senjata api, bahan peledak, atau senjata tajam tanpa izin resmi.</li>
          <li>Produk farmasi atau kosmetik tanpa izin edar BPOM yang diwajibkan.</li>
          <li>Konten pornografi atau materi yang melanggar kesusilaan.</li>
          <li>Barang tiruan/palsu yang melanggar Hak Kekayaan Intelektual (HAKI).</li>
        </ul>
      </div>

      <div>
        <h2 className="text-xl font-bold text-navy">4. Paket Langganan dan Kebijakan Tagihan</h2>
        <p className="mt-3">
          Pesanin menyediakan paket Starter, Pro, dan Enterprise. Penagihan dilakukan di muka untuk periode bulanan atau tahunan. Pesanin tidak memotong persentase komisi dari uang penjualan produk Anda pada transaksi transfer bank langsung.
        </p>
      </div>

      <div>
        <h2 className="text-xl font-bold text-navy">5. Integrasi API Kurir dan Marketplace</h2>
        <p className="mt-3">
          Koneksi ke Shopee, TikTok Shop, kurir logistik (Biteship/RajaOngkir), dan Payment Gateway (Midtrans) berjalan di atas protokol API pihak ketiga. Pesanin berusaha semaksimal mungkin menjaga keandalan auto-sync 30 detik, namun tidak bertanggung jawab atas downtime tak terduga dari server mitra pihak ketiga tersebut.
        </p>
      </div>

      <div>
        <h2 className="text-xl font-bold text-navy">6. Pembatasan Tanggung Jawab</h2>
        <p className="mt-3">
          Pesanin bertindak sebagai penyedia infrastruktur teknologi checkout dan order management. Tanggung jawab atas mutu fisik produk, ketersediaan pengiriman barang, garansi, serta kepatuhan perpajakan penjualan ada pada masing-masing penjual.
        </p>
      </div>
    </LegalLayout>
  );
}
