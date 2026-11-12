import { Cookie } from "lucide-react";
import { LegalLayout } from "@/components/marketing/LegalLayout";

export const metadata = {
  title: "Kebijakan Cookie · Pesanin",
  description: "Informasi mengenai penggunaan cookie dan teknologi pelacakan di platform Pesanin.",
};

export default function CookiePolicyPage() {
  return (
    <LegalLayout
      icon={<Cookie size={32} />}
      title="Kebijakan Cookie"
      subtitle="PT Pesanin Solusi Digital"
      updatedAt="10 November 2026"
      version="Versi cookie-2026-11"
    >
      <p className="text-base text-slate-700 leading-relaxed">
        Kebijakan Cookie ini menjelaskan bagaimana PT Pesanin Solusi Digital menggunakan cookie dan teknologi pelacakan serupa di platform web Pesanin untuk mengenali Anda saat mengunjungi layanan kami.
      </p>

      <div>
        <h2 className="text-xl font-bold text-navy">Apa Itu Cookie?</h2>
        <p className="mt-3">
          Cookie adalah file teks kecil yang ditempatkan di komputer atau perangkat seluler Anda ketika Anda mengunjungi sebuah situs web. Cookie banyak digunakan oleh pemilik situs web untuk membuat situs web mereka bekerja lebih efisien, serta untuk memberikan informasi pelaporan.
        </p>
      </div>

      <div>
        <h2 className="text-xl font-bold text-navy">Kategori Cookie yang Kami Gunakan</h2>
        <ul className="mt-3 list-disc space-y-3 pl-5">
          <li>
            <b>Cookie Esensial (Wajib):</b> Cookie yang mutlak diperlukan agar Anda dapat bernavigasi di situs web kami dan menggunakan fitur-fiturnya, seperti mengakses dashboard yang aman, menjaga sesi login admin toko, serta memproses form checkout pesanan.
          </li>
          <li>
            <b>Cookie Fungsional & Kustomisasi:</b> Memungkinkan situs web mengingat pilihan yang Anda buat (seperti nama toko yang aktif, filter status pesanan yang sedang dipilih) dan memberikan fitur yang disesuaikan.
          </li>
          <li>
            <b>Cookie Piksel Iklan Milik Penjual:</b> Ketika Anda mengaktifkan tracking Meta Pixel, TikTok Pixel, atau Google Tag di dashboard Pesanin, skrip piksel tersebut menempatkan cookie pada browser pembeli untuk membantu Anda mengukur efektivitas iklan dan ROAS penjualan.
          </li>
          <li>
            <b>Cookie Analitik Sistem:</b> Membantu tim teknis kami menganalisis pola lalu lintas pengunjung situs untuk mendeteksi latensi, memperbaiki bug, dan meningkatkan kecepatan pemuatan checkout.
          </li>
        </ul>
      </div>

      <div>
        <h2 className="text-xl font-bold text-navy">Bagaimana Cara Mengontrol Cookie?</h2>
        <p className="mt-3">
          Anda berhak memutuskan apakah akan menerima atau menolak cookie. Anda dapat mengatur atau mengubah kontrol peramban web Anda untuk menerima atau menolak cookie kapan saja. Harap diperhatikan bahwa jika Anda menolak cookie esensial, akses Anda ke dashboard admin dan form checkout mungkin terganggu.
        </p>
      </div>

      <div>
        <h2 className="text-xl font-bold text-navy">Pembaruan Kebijakan Cookie</h2>
        <p className="mt-3">
          Kami dapat memperbarui Kebijakan Cookie ini dari waktu ke waktu untuk mencerminkan, misalnya, perubahan pada cookie yang kami gunakan atau karena alasan operasional, hukum, atau peraturan lainnya.
        </p>
      </div>
    </LegalLayout>
  );
}
