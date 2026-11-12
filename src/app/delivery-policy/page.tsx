import { Truck } from "lucide-react";
import { LegalLayout } from "@/components/marketing/LegalLayout";

export const metadata = {
  title: "Kebijakan Pengiriman · Pesanin",
  description: "Informasi dan ketentuan pengiriman paket dan pesanan di platform Pesanin.",
};

export default function DeliveryPolicyPage() {
  return (
    <LegalLayout
      icon={<Truck size={32} />}
      title="Kebijakan Pengiriman"
      subtitle="PT Pesanin Solusi Digital"
      updatedAt="10 November 2026"
      version="Versi delivery-2026-11"
    >
      <p className="text-base text-slate-700 leading-relaxed">
        Kebijakan Pengiriman ini mengatur mekanisme kalkulasi ongkos kirim, integrasi kurir logistik, layanan Cash on Delivery (COD), serta pelacakan resi pesanan yang diproses melalui sistem Pesanin.
      </p>

      <div>
        <h2 className="text-xl font-bold text-navy">1. Mitra Ekspedisi Logistik</h2>
        <p className="mt-3">
          Pesanin terintegrasi dengan agregator kurir terkemuka di Indonesia (Biteship dan RajaOngkir) yang mendukung lebih dari 7 kurir nasional, antara lain:
        </p>
        <ul className="mt-2 list-disc space-y-1 pl-5">
          <li>JNE Express (REG, YES, JTR)</li>
          <li>SiCepat Ekspres (SIUNT, BEST, GOKIL)</li>
          <li>J&amp;T Express (EZ, J&amp;T Super)</li>
          <li>Shopee Xpress (SPX Standard &amp; Instant)</li>
          <li>Anteraja (Reguler, Next Day, Cargo)</li>
          <li>POS Indonesia (Kilat Khusus)</li>
          <li>SAP Express &amp; Ninja Xpress</li>
        </ul>
      </div>

      <div>
        <h2 className="text-xl font-bold text-navy">2. Perhitungan Ongkos Kirim Real-Time</h2>
        <p className="mt-3">
          Tarif ongkos kirim dihitung secara akurat dan transparan langsung saat pembeli memasukkan alamat (provinsi, kota, kecamatan). Perhitungan memperhitungkan berat volumetrik paket serta lokasi titik gudang pengirim yang ditentukan oleh penjual.
        </p>
      </div>

      <div>
        <h2 className="text-xl font-bold text-navy">3. Ketentuan Layanan COD (Cash on Delivery)</h2>
        <p className="mt-3">
          Bagi penjual yang mengaktifkan metode pembayaran COD, penagihan uang pembayaran dilakukan oleh petugas kurir mitra saat paket diserahkan kepada pembeli. Biaya administrasi COD dihitung secara otomatis dan dana hasil penagihan COD diteruskan sesuai ketentuan pencairan kurir mitra.
        </p>
      </div>

      <div>
        <h2 className="text-xl font-bold text-navy">4. Nomor Resi dan Pelacakan Pesanan</h2>
        <p className="mt-3">
          Penjual dapat menginput nomor resi secara manual, input massal, atau memanfaatkan fitur cetak label otomatis. Pembeli akan menerima notifikasi pengiriman pesanan beserta nomor resi melalui pesan WhatsApp otomatis.
        </p>
      </div>

      <div>
        <h2 className="text-xl font-bold text-navy">5. Tanggung Jawab atas Keterlambatan dan Kerusakan</h2>
        <p className="mt-3">
          Proses fisik pengangkutan dan pengantaran paket dilakukan sepenuhnya oleh kurir ekspedisi mitra. Apabila terjadi keterlambatan atau kerusakan dalam perjalanan akibat kelalaian operasional kurir, proses klaim ganti rugi mengikuti standar operasional asuransi ekspedisi bersangkutan.
        </p>
      </div>
    </LegalLayout>
  );
}
