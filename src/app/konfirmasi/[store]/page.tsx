"use client";
import { CheckCircle2, Upload } from "lucide-react";
import { DatePicker } from "@/components/DatePicker";
import { use, useEffect, useState } from "react";
import { API_URL } from "@/lib/api";
import { BankLogo } from "@/components/product-editor/Step2Panels";

export default function ConfirmPage({ params }: { params: Promise<{ store: string }> }) {
  const { store } = use(params);
  const [d, setD] = useState<any>(null);
  const [f, setF] = useState({ order_code: "", account_name: "", bank: "", amount: "", transfer_date: new Date().toISOString().slice(0, 10) });
  const [file, setFile] = useState<File | null>(null);
  const [err, setErr] = useState("");
  const [done, setDone] = useState(false);
  const [busy, setBusy] = useState(false);
  useEffect(() => { fetch(`${API_URL}/public/confirm/${store}`, { headers: { Accept: "application/json" } }).then((r) => r.json()).then(setD); }, [store]);
  const page = { title: "Konfirmasi Pembayaran", description: "Sudah transfer? Isi form di bawah ini agar pesananmu segera kami proses.", button: "Kirim Konfirmasi", show_banks: true, ...(d?.page ?? {}) };

  async function submit(e: React.FormEvent) {
    e.preventDefault(); setBusy(true); setErr("");
    const fd = new FormData();
    Object.entries(f).forEach(([k, v]) => fd.append(k, k === "amount" ? v.replace(/\D/g, "") : v));
    if (file) fd.append("proof", file);
    const r = await fetch(`${API_URL}/public/confirm/${store}`, { method: "POST", body: fd, headers: { Accept: "application/json" } });
    const j = await r.json(); setBusy(false);
    if (!r.ok) return setErr(Object.values(j.errors ?? {})[0]?.toString() ?? j.message);
    setDone(true);
  }

  if (!d) return <div className="flex min-h-screen items-center justify-center text-slate-400">Memuat…</div>;
  return (
    <div className="min-h-screen bg-[#f5f6fa] px-4 py-10">
      <div className="mx-auto max-w-lg space-y-5 rounded-2xl bg-white p-6">
        <div className="text-center"><div className="text-sm font-semibold text-brand-600">{d.store_name}</div><h1 className="text-2xl font-bold text-slate-800">{page.title}</h1><p className="mt-1 text-sm text-slate-600">{page.description}</p></div>
        {page.show_banks && d.banks?.length > 0 && (
          <div className="space-y-2">{d.banks.map((b: any) => <div key={b.number} className="flex items-center gap-3 rounded-lg border border-slate-200 p-3 text-sm"><BankLogo bank={b.bank} /><span><b>{b.holder}</b><br />{b.number} • {b.bank}</span></div>)}</div>
        )}
        {done ? (
          <div className="flex flex-col items-center gap-2 py-6 text-center"><CheckCircle2 size={48} className="text-emerald-500" /><b>Konfirmasi terkirim!</b><p className="text-sm text-slate-600">Penjual akan memeriksa pembayaranmu dan memproses pesanan.</p></div>
        ) : (
          <form onSubmit={submit} className="space-y-3">
            {([["order_code", "ID Pesanan", "mis. FK261105ABCDE"], ["account_name", "Nama Pemilik Rekening", ""], ["bank", "Bank Pengirim", "mis. BCA"], ["amount", "Nominal Transfer", "mis. 58607"]] as const).map(([k, l, ph]) => (
              <div key={k}><label className="mb-1 block text-sm font-medium text-slate-700">{l}</label><input required={k !== "bank"} className="input" placeholder={ph} value={(f as any)[k]} onChange={(e) => setF({ ...f, [k]: e.target.value })} /></div>
            ))}
            <div><label className="mb-1 block text-sm font-medium text-slate-700">Tanggal Transfer</label><DatePicker value={f.transfer_date} maxDate={new Date()} onChange={(v) => setF({ ...f, transfer_date: v })} /></div>
            <label className="flex cursor-pointer items-center justify-center gap-2 rounded-lg border border-dashed border-slate-300 py-5 text-sm text-slate-600"><Upload size={16} />{file ? file.name : "Unggah Bukti Transfer (opsional)"}<input type="file" accept="image/*" hidden onChange={(e) => setFile(e.target.files?.[0] ?? null)} /></label>
            {err && <p className="text-sm text-rose-600">{err}</p>}
            <button disabled={busy} className="h-11 w-full rounded-lg bg-brand-600 font-semibold text-white disabled:opacity-50">{busy ? "Mengirim…" : page.button}</button>
          </form>
        )}
      </div>
    </div>
  );
}
