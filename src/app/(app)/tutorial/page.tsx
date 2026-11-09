import { BookOpen, CreditCard, LayoutTemplate, MessageCircle, Package, ShoppingBag, Truck, Users } from "lucide-react";
import Link from "next/link";

const GUIDES = [
  [Package, "Membuat produk & halaman checkout", "Isi harga, varian, bump, lalu atur formulir di langkah 2 dan halaman sukses di langkah 3.", "/products/new"],
  [Truck, "Mengatur ongkir otomatis", "Tambahkan alamat pickup di My Address. Pembeli akan melihat daftar kurir sesuai kecamatan.", "/settings/addresses"],
  [CreditCard, "Rekening, COD & E-Payment", "Atur rekening di Account Settings dan biaya COD per produk di Metode Pembayaran.", "/settings/account"],
  [ShoppingBag, "Mengelola pesanan", "Tandai Paid, Buat Pesanan (Kirim) untuk menerbitkan resi, dan arsipkan pesanan selesai.", "/orders"],
  [MessageCircle, "Follow up WhatsApp", "Gunakan template Welcome sampai UpSelling langsung dari daftar order.", "/settings/followup"],
  [LayoutTemplate, "Landing page", "Pilih template, tambahkan blok Formulir, publish, lalu pantau laporannya.", "/landing-pages"],
  [Users, "WA Rotator & tim", "Bagi chat ke beberapa CS dengan jadwal shift dan libur terjadwal.", "/whatsapp-rotator"],
  [BookOpen, "Kupon & afiliasi", "Buat kode diskon dan bagikan link ?ref= ke afiliator untuk mencatat komisi.", "/others/coupons"],
] as const;

export default function Tutorial() {
  return (
    <div className="space-y-5">
      <h1 className="text-[34px] font-bold text-slate-800">Tutorial</h1>
      <div className="grid gap-4 md:grid-cols-2">
        {GUIDES.map(([Icon, t, d, href]) => (
          <Link key={t} href={href} className="flex gap-4 surface surface-hover p-5">
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-brand-50 text-brand-600"><Icon size={20} /></span>
            <span><b className="block text-slate-800">{t}</b><span className="text-sm text-slate-600">{d}</span></span>
          </Link>
        ))}
      </div>
    </div>
  );
}
