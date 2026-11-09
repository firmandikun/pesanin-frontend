"use client";
import { CheckCircle2, MessageCircle, Table2 } from "lucide-react";
import { useState } from "react";
import { Dialog, Panel } from "@/components/kit";

export default function WhatsAppOfficial() {
  const [msgs, setMsgs] = useState(50);
  const [open, setOpen] = useState(false);
  const rate = 356.65;
  return (
    <div className="space-y-5">
      <h1 className="text-[34px] font-bold text-slate-800">WhatsApp Business Official</h1>
      <Panel className="grid gap-6 p-6 md:grid-cols-2">
        <div className="space-y-4 md:border-r md:border-slate-100 md:pr-6">
          <div className="flex items-start justify-between gap-3">
            <div><h2 className="font-semibold text-slate-800">WhatsApp Business Official belum terhubung</h2>
              <p className="mt-1 text-sm text-slate-600">Hubungkan WA Business di HP ke Pesanin untuk kirim notifikasi pesanan otomatis via Coexistence resmi Meta.</p></div>
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-emerald-50 text-[#25d366] ring-4 ring-emerald-50"><MessageCircle size={22} /></span>
          </div>
          {[["Aman dari Risiko Banned", "Layanan resmi Meta, sehingga nomor kamu aman digunakan selama mematuhi kebijakan WhatsApp."], ["Tetap aktif di HP", "Bisa gunakan nomor yang sama di aplikasi WhatsApp Business dan Pesanin."]].map(([t, d]) => (
            <div key={t} className="flex gap-3"><CheckCircle2 size={18} className="mt-0.5 shrink-0 fill-emerald-100 text-emerald-600" /><div><div className="text-sm font-semibold text-slate-800">{t}</div><div className="text-xs text-slate-500">{d}</div></div></div>
          ))}
        </div>
        <div className="space-y-3">
          <h2 className="font-semibold text-slate-800">Biaya yang perlu kamu tahu</h2>
          <div className="rounded-lg bg-brand-50/60 p-4 ring-1 ring-brand-100">
            <div className="text-xs text-slate-500">Estimasi biaya Meta</div>
            <div className="text-xl font-bold text-slate-800">Rp{rate.toLocaleString("id-ID")} <span className="text-sm font-normal text-slate-500">/ pesan utility</span></div>
            <p className="mt-1 text-[11px] text-slate-500">Seluruh penagihan biaya pesan dilakukan oleh <b>Meta, bukan Pesanin</b>. Biaya aktual mengikuti tarif dan ketentuan Meta.</p>
          </div>
          <div className="flex items-center gap-3 rounded-lg border border-slate-200 p-3">
            <Table2 size={18} className="text-slate-500" />
            <div className="flex-1"><div className="text-[10px] uppercase text-slate-400">Simulasi pemakaian</div>
              <div className="flex items-center gap-1 text-sm font-semibold"><input type="number" min={1} className="w-16 rounded border border-slate-200 px-1" value={msgs} onChange={(e) => setMsgs(Math.max(1, Number(e.target.value)))} /> Pesan Terkirim <span className="font-normal text-slate-500">(Utility)</span></div></div>
            <div className="text-right"><div className="text-[10px] text-slate-400">Estimasi Harian</div><div className="text-sm font-semibold">Rp{(rate * msgs).toLocaleString("id-ID", { maximumFractionDigits: 2 })} <span className="font-normal text-slate-500">/hari</span></div></div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <a href="/tutorial" className="flex h-10 items-center justify-center rounded-lg border border-brand-600 text-sm font-semibold text-brand-600">Baca Panduan</a>
            <button onClick={() => setOpen(true)} className="h-10 rounded-lg bg-brand-600 text-sm font-semibold text-white">Hubungkan WhatsApp</button>
          </div>
        </div>
      </Panel>
      {open && (
        <Dialog title="Hubungkan WhatsApp Business" icon={MessageCircle} onClose={() => setOpen(false)}>
          <p className="text-sm text-slate-600">Koneksi WhatsApp Business Platform (Coexistence) memerlukan aplikasi Meta yang terdaftar dan token akses dari Meta Business Manager. Integrasi ini belum dipasang di server Pesanin — hubungi admin untuk mengaktifkannya.</p>
        </Dialog>
      )}
    </div>
  );
}
