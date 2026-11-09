"use client";
import { CheckCircle2, Info, MessageCircle, QrCode, Smartphone, X } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { Dialog, PageHead, Panel } from "@/components/kit";

function SupportArt() {
  return (
    <svg viewBox="0 0 320 220" className="h-full w-full" aria-hidden>
      <rect x="0" y="0" width="140" height="70" fill="#a6e3ec" />
      <rect x="150" y="10" width="90" height="190" rx="18" fill="#1f2a44" /><rect x="158" y="24" width="74" height="166" rx="12" fill="#f56a1b" />
      <circle cx="195" cy="100" r="22" fill="#25d366" /><path d="M186 100a9 9 0 1 1 4 7.5l-5 1.5 1.5-4.5A9 9 0 0 1 186 100z" fill="#fff" />
      <path d="M140 90 l28 -12 -10 18z" fill="#c7d0f5" /><circle cx="122" cy="120" r="10" fill="#7b83e8" />
      <path d="M100 120 H150" stroke="#7b83e8" strokeDasharray="4 4" />
      <rect x="20" y="130" width="110" height="80" rx="8" fill="#e9837e" /><rect x="10" y="150" width="30" height="60" rx="6" fill="#dc6f6a" />
      <circle cx="80" cy="96" r="22" fill="#f2b9a0" /><path d="M58 92 q22-34 44 0 q-8-22-22-22 q-16 0-22 22z" fill="#2c3e8f" />
      <rect x="56" y="118" width="50" height="60" rx="14" fill="#e05510" /><rect x="72" y="150" width="70" height="40" rx="4" fill="#c7d6f5" />
    </svg>
  );
}

export default function FollowUpOtomatis() {
  const [banner, setBanner] = useState(true);
  const [alertBar, setAlertBar] = useState(true);
  const [connect, setConnect] = useState(false);

  return (
    <div className="space-y-4">
      <PageHead title="Follow Up Otomatis" />
      {banner && (
        <div className="flex flex-wrap items-center gap-4 rounded-xl bg-brand-600 p-5 text-white">
          <span className="flex h-11 w-11 items-center justify-center rounded-full bg-white text-[#25d366]"><MessageCircle size={24} /></span>
          <div className="flex-1">
            <div className="text-lg font-bold">Beralih ke WhatsApp Official Meta.</div>
            <p className="text-sm opacity-90">Nikmati pengiriman notifikasi yang lebih stabil melalui channel resmi Meta. Tanpa perlu khawatir nomor bisnis mudah terkena banned.</p>
            <div className="mt-2 flex flex-wrap gap-2 text-xs">{["Lebih Stabil", "Resmi dari Meta", "Lebih Aman"].map((t) => <span key={t} className="flex items-center gap-1 rounded-full bg-white/15 px-2.5 py-0.5">✓ {t}</span>)}</div>
          </div>
          <Link href="/settings/whatsapp-official" className="rounded-lg bg-white px-4 py-2 text-sm font-semibold text-brand-600">Hubungkan Sekarang</Link>
          <button onClick={() => setBanner(false)} className="rounded-full bg-white/15 p-1" aria-label="Tutup"><X size={14} /></button>
        </div>
      )}
      {alertBar && (
        <div className="flex items-center gap-3 rounded-lg border border-brand-600 bg-brand-50 px-4 py-2.5 text-sm text-slate-700">
          <Info size={18} className="text-brand-600" />
          <span className="flex-1">Untuk menerima notifikasi saat <b>koneksi WA-mu terputus</b>, silakan aktifkan fitur notifikasi di menu <b>Pengaturan Notifikasi</b>. <Link href="/settings/notifications" className="font-semibold text-brand-600 underline">Klik disini</Link></span>
          <button onClick={() => setAlertBar(false)} aria-label="Tutup"><X size={18} /></button>
        </div>
      )}
      <Panel className="grid items-center overflow-hidden md:grid-cols-[1fr_1fr]">
        <div className="h-72"><SupportArt /></div>
        <div className="space-y-3 p-6">
          <h2 className="flex items-center gap-2 text-lg font-bold text-slate-800">WhatsApp Notifications <span className="rounded bg-rose-500 px-1.5 text-[10px] font-semibold text-white">Gratis</span></h2>
          <p className="text-sm text-slate-600">Hubungkan WhatsApp-mu agar bisa otomatis mengirim pesan ke penerima dari saat pesanan masuk hingga pesanan selesai. Di bawah ini adalah manfaat yang kamu dapatkan</p>
          <ul className="space-y-2 text-sm text-slate-700">
            {["Kirim Pesan Secara Real time notifikasi", "Bisa Kirim Follow up otomatis & manual di order Kamu", "Dapat terhubung lebih dari 1 nomor WA", "Setiap CS bisa terhubung WhatsApp Notifikasi"].map((t) => (
              <li key={t} className="flex items-center gap-2"><CheckCircle2 size={18} className="fill-emerald-500 text-white" />{t}</li>
            ))}
          </ul>
          <button onClick={() => setConnect(true)} className="rounded-lg bg-brand-600 px-8 py-2.5 text-sm font-semibold text-white">Hubungkan</button>
        </div>
      </Panel>
      {connect && (
        <Dialog title="Add WhatsApp Number" icon={MessageCircle} onClose={() => setConnect(false)} width="max-w-3xl">
          <div className="space-y-4">
            <div className="rounded-lg border border-brand-600/40 bg-brand-50 px-4 py-3 text-sm text-slate-700">Scan dengan WhatsApp agar kamu dapat mengirimkan pesan secara otomatis ke penerima pada saat paket mulai dijemput, terkirim, hingga ketika terdapat kendala pengantaran.</div>
            <div className="grid gap-5 md:grid-cols-[260px_1fr]">
              <div className="space-y-3">
                <div className="flex aspect-square flex-col items-center justify-center gap-2 rounded-lg border border-slate-200 bg-slate-50 p-4 text-center text-xs text-slate-500">
                  <QrCode size={64} className="text-slate-300" />Kode QR muncul setelah server WhatsApp gateway dihubungkan.
                </div>
                <button disabled className="h-10 w-full rounded-lg border border-brand-600 text-sm font-medium text-brand-600 opacity-50">Minta Kode QR Baru</button>
              </div>
              <div className="text-sm text-slate-700">
                <p className="mb-3 font-semibold">Untuk memulai mengirimkan notifikasi ke penerima secara otomatis, kamu dapat scan QR dengan WhatsApp kamu.</p>
                <ol className="list-decimal space-y-1.5 pl-5">
                  <li>Fitur ini menggunakan API WhatsApp tidak resmi</li>
                  <li>Kamu setuju untuk tidak menggunakan layanan ini untuk spam dan mengirimkan pesan massal</li>
                  <li>Kami berhak memblokir akses kamu ke layanan WhatsApp ini jika terjadi pelanggaran</li>
                  <li>Layanan ini seharusnya hanya digunakan untuk notifikasi transaksi</li>
                  <li>Jika sesi tidak aktif selama lebih dari 2 hari, maka koneksi akan secara otomatis diputus oleh sistem.</li>
                </ol>
              </div>
            </div>
            <div className="flex items-start gap-3 rounded-lg bg-brand-50 p-4 text-sm"><Smartphone size={20} className="text-brand-600" /><span><b>Pro tips:</b> Direkomendasikan agar menyambungkan dengan nomor WhatsApp yang terpisah, sehingga kamu dapat mengecek balasan pesan dari penerima dengan mudah.</span></div>
            <p className="text-xs text-amber-700">Catatan: integrasi WhatsApp gateway belum dipasang di server ini. Follow up tetap bisa dikirim manual lewat tombol WhatsApp di daftar order.</p>
          </div>
        </Dialog>
      )}
    </div>
  );
}
