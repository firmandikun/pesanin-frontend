import { ShieldCheck } from "lucide-react";
import { LegalLayout } from "@/components/marketing/LegalLayout";

export const metadata = {
  title: "Kebijakan Privasi · Pesanin",
  description: "Kebijakan Privasi layanan platform Pesanin.",
};

export default function PrivacyPolicyPage() {
  return (
    <LegalLayout
      icon={<ShieldCheck size={32} />}
      title="Kebijakan Privasi"
      subtitle="PT Pesanin Solusi Digital"
      updatedAt="10 November 2026"
      version="Versi privacy-2026-11"
    >
      <p className="text-base text-slate-700 leading-relaxed">
        Selamat datang di Pesanin. Kebijakan Privasi ini menjelaskan bagaimana PT Pesanin Solusi Digital (&quot;Pesanin&quot;, &quot;kami&quot;, &quot;kita&quot;) mengumpulkan, menggunakan, mengungkapkan, dan melindungi informasi Anda ketika menggunakan aplikasi web dan layanan kami.
      </p>

      <p className="text-base text-slate-700 leading-relaxed">
        Dengan mengakses atau menggunakan Pesanin, Anda mengakui bahwa Anda telah membaca, memahami, dan menyetujui Kebijakan Privasi ini. Jika Anda tidak setuju dengan kebijakan ini, harap tidak menggunakan layanan kami.
      </p>

      <div>
        <h2 className="text-xl font-bold text-navy">Kedudukan Kami Berdasarkan UU PDP</h2>
        <p className="mt-3">
          Kebijakan ini disusun dengan mengacu pada Undang-Undang Nomor 27 Tahun 2022 tentang Pelindungan Data Pribadi (&quot;UU PDP&quot;). Dalam hal penyediaan layanan manajemen pesanan dan form checkout bagi pembeli Anda, Pesanin bertindak sebagai <b>Pengendali Data Pribadi</b> untuk data akun penjual Anda, dan sebagai <b>Prosesor Data Pribadi</b> atas instruksi Anda dalam memproses data transaksi pembeli.
        </p>
      </div>

      <div>
        <h2 className="text-xl font-bold text-navy">Informasi yang Kami Kumpulkan</h2>
        <p className="mt-3">Kami mengumpulkan beberapa kategori data saat Anda menggunakan Pesanin:</p>
        <ul className="mt-3 list-disc space-y-2 pl-5">
          <li>
            <b>Informasi Akun Penjual:</b> Nama lengkap, alamat email, nomor telepon/WhatsApp, nama toko/bisnis, dan kata sandi terenkripsi.
          </li>
          <li>
            <b>Data Transaksi & Pesanan:</b> Nama pembeli, nomor telepon WhatsApp, alamat pengiriman (provinsi, kota, kecamatan, kodepos), metode pembayaran, bukti transfer, dan status pesanan.
          </li>
          <li>
            <b>Data Otorisasi Toko Marketplace:</b> Token otorisasi API resmi saat Anda menghubungkan toko Shopee atau TikTok Shop. Kami tidak pernah meminta atau menyimpan username dan kata sandi akun marketplace Anda.
          </li>
          <li>
            <b>Data Integrasi Pihak Ketiga:</b> Kunci API Midtrans, Biteship, atau RajaOngkir yang Anda konfigurasi di dashboard untuk memproses pembayaran dan ongkir otomatis.
          </li>
          <li>
            <b>Data Perangkat & Penggunaan:</b> Alamat IP, jenis peramban, log akses, dan data performa teknis untuk menjaga keamanan sistem dari aktivitas mencurigakan.
          </li>
        </ul>
      </div>

      <div>
        <h2 className="text-xl font-bold text-navy">Tujuan Pemrosesan Data Pribadi</h2>
        <p className="mt-3">Kami memproses data pribadi Anda semata-mata untuk tujuan yang sah, antara lain:</p>
        <ul className="mt-3 list-disc space-y-2 pl-5">
          <li>Menyediakan layanan form checkout yang cepat, responsif, dan siap terima pesanan.</li>
          <li>Menghitung tarif ongkos kirim real-time dan menerbitkan resi pengiriman via kurir mitra resmi.</li>
          <li>Menyinkronkan stok produk dan pesanan dari toko Shopee / TikTok Shop ke satu dashboard terpusat.</li>
          <li>Mengirimkan notifikasi tagihan, pembaruan status pesanan, dan pesan konfirmasi WhatsApp atas permintaan Anda.</li>
          <li>Menghitung analitik omzet, HPP produk, dan laporan laba rugi secara akurat.</li>
        </ul>
      </div>

      <div>
        <h2 className="text-xl font-bold text-navy">Penyimpanan dan Keamanan Data</h2>
        <p className="mt-3">
          Seluruh data sensitif, termasuk token otorisasi API dan kredensial integrasi, disimpan menggunakan standar enkripsi industri. Akses terhadap basis data dibatasi secara ketat hanya untuk personel yang berwenang demi pemeliharaan dan keandalan sistem.
        </p>
      </div>

      <div>
        <h2 className="text-xl font-bold text-navy">Hak Anda sebagai Subjek Data</h2>
        <p className="mt-3">
          Sesuai ketentuan UU PDP, Anda memiliki hak untuk mengakses, memperbaiki, memperbarui, menarik persetujuan, atau meminta penghapusan akun serta data pribadi Anda dari sistem kami kapan pun melalui menu pengaturan akun atau menghubungi tim kami.
        </p>
      </div>

      <div>
        <h2 className="text-xl font-bold text-navy">Kontak dan Konsultasi</h2>
        <p className="mt-3">
          Jika Anda memiliki pertanyaan, klarifikasi, atau permintaan terkait data pribadi Anda, silakan hubungi kami melalui WhatsApp resmi kami atau email ke <span className="font-semibold text-navy">support@pesanin.id</span>.
        </p>
      </div>
    </LegalLayout>
  );
}
