"use client";
import { CheckCircle2, Clock, Download, ExternalLink, Loader2, MessageCircle } from "lucide-react";
import { use, useEffect, useState } from "react";
import { api, API_URL } from "@/lib/api";

type D = {
  store_name: string; product: string; image: string | null; customer_name: string | null; code: string; paid: boolean; whatsapp: string | null;
  content: { url: string | null; has_file: boolean; file_name: string | null; instructions: string | null } | null;
};

/** Buyer's private access page for a paid digital product (link sent by WhatsApp / email). */
export default function DigitalAccess({ params }: { params: Promise<{ token: string }> }) {
  const { token } = use(params);
  const [d, setD] = useState<D | null>(null);
  const [missing, setMissing] = useState(false);
  useEffect(() => { api<D>(`/public/digital/${encodeURIComponent(token)}`).then(setD).catch(() => setMissing(true)); }, [token]);

  if (missing) return <main className="flex min-h-screen items-center justify-center bg-slate-50 p-4 text-slate-500">Link akses tidak ditemukan.</main>;
  if (!d) return <main className="flex min-h-screen items-center justify-center gap-2 bg-slate-50 text-slate-500"><Loader2 size={18} className="animate-spin" />Memuat…</main>;
  const wa = d.whatsapp ? `https://wa.me/${d.whatsapp.replace(/\D/g, "").replace(/^0/, "62")}?text=${encodeURIComponent(`Halo, saya butuh bantuan untuk pesanan ${d.code}`)}` : null;

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-10">
      <div className="mx-auto max-w-lg space-y-5 rounded-2xl bg-white p-6 shadow-sm">
        <p className="text-center text-sm font-semibold text-slate-500">{d.store_name}</p>
        <div className="flex items-center gap-4">
          {d.image ? <img src={d.image} alt="" className="h-16 w-16 rounded-xl object-cover" /> : <span className="h-16 w-16 rounded-xl bg-slate-100" />}
          <div><h1 className="text-xl font-bold text-slate-800">{d.product}</h1><p className="text-sm text-slate-500">Pesanan {d.code}{d.customer_name && ` · ${d.customer_name}`}</p></div>
        </div>
        {!d.paid || !d.content ? (
          <p className="flex items-start gap-2 rounded-xl bg-amber-50 p-4 text-sm text-amber-800"><Clock size={18} className="mt-0.5 shrink-0" />Pembayaran belum kami terima. Halaman ini akan berisi produkmu setelah pembayaran lunas.</p>
        ) : (
          <>
            <p className="flex items-center gap-2 rounded-xl bg-emerald-50 p-3 text-sm text-emerald-800"><CheckCircle2 size={18} />Pembayaran lunas. Terima kasih!</p>
            <div className="space-y-3">
              {d.content.url && <a href={d.content.url} target="_blank" rel="noreferrer" className="flex h-12 items-center justify-center gap-2 rounded-xl bg-[#1f2a44] font-semibold text-white"><ExternalLink size={18} />Buka produk</a>}
              {d.content.has_file && <a href={`${API_URL}/public/digital/${encodeURIComponent(token)}/file`} className="flex h-12 items-center justify-center gap-2 rounded-xl bg-orange-600 font-semibold text-white"><Download size={18} />Unduh {d.content.file_name ?? "file"}</a>}
              {!d.content.url && !d.content.has_file && <p className="text-sm text-slate-500">Penjual akan mengirimkan produkmu. Hubungi penjual jika belum menerima.</p>}
            </div>
            {d.content.instructions && <div className="whitespace-pre-wrap rounded-xl bg-slate-50 p-4 text-sm text-slate-700">{d.content.instructions}</div>}
            <p className="text-xs text-slate-400">Simpan halaman ini. Link ini khusus untukmu, jangan dibagikan.</p>
          </>
        )}
        {wa && <a href={wa} target="_blank" rel="noreferrer" className="flex items-center justify-center gap-2 text-sm font-semibold text-emerald-700"><MessageCircle size={16} />Butuh bantuan? Chat penjual</a>}
      </div>
    </main>
  );
}
