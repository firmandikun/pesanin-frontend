"use client";
import { Check, Loader2, Megaphone, MessageCircle, Repeat, Settings2 } from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { PageHead, Panel } from "@/components/kit";
import { api, ApiError, rupiah } from "@/lib/api";

type Row = { phone: string; name: string; last_order_at: string; days_since: number; orders: number; spent: number; products: string[]; product_slug: string | null; message: string };
type Data = { settings: { days: number; message: string }; default_message: string; customers: Row[] };

/**
 * Pelanggan → Waktunya Beli Lagi: web/social buyers one buying cycle after their last order who have not ordered
 * again. One tap opens WhatsApp with a ready message; the customer then leaves the list until they buy again.
 */
export default function ReorderPage() {
  const [d, setD] = useState<Data | null>(null);
  const [err, setErr] = useState("");
  const [edit, setEdit] = useState(false);
  const [days, setDays] = useState("30");
  const [message, setMessage] = useState("");
  const [saving, setSaving] = useState(false);
  const [sent, setSent] = useState<string[]>([]);

  const load = useCallback(() => {
    api<Data>("/customers/reorder").then((r) => { setD(r); setDays(String(r.settings.days)); setMessage(r.settings.message); })
      .catch((e) => setErr(e instanceof ApiError ? e.message : "Gagal memuat data."));
  }, []);
  useEffect(() => { load(); }, [load]);

  const remind = (r: Row) => {
    window.open(`https://wa.me/${r.phone}?text=${encodeURIComponent(r.message)}`, "_blank", "noopener");
    setSent((s) => [...s, r.phone]);
    api("/customers/reorder/contacted", { method: "POST", json: { phone: r.phone, name: r.name } }).catch(() => {});
  };
  const save = async () => {
    setSaving(true); setErr("");
    try { await api("/customers/reorder/settings", { method: "PUT", json: { days: Number(days), message } }); setEdit(false); setSent([]); load(); }
    catch (e) { setErr(e instanceof ApiError ? e.message : "Gagal menyimpan."); }
    finally { setSaving(false); }
  };
  const since = (n: number) => (n >= 60 ? `${Math.round(n / 30)} bulan lalu` : `${n} hari lalu`);
  const rows = d?.customers ?? [];

  return (
    <div className="space-y-5">
      <PageHead title="Waktunya Beli Lagi" tutorial={false} crumbs={[["Chat"], ["Pelanggan", "/customers"], ["Waktunya Beli Lagi"]]} />

      <Panel className="flex flex-wrap items-start gap-3 p-5">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600"><Repeat size={20} /></span>
        <div className="min-w-0 flex-1 text-sm text-slate-600">
          <p>Pembeli dari checkout web, pesanan manual, dan WhatsApp yang pesanan terakhirnya sudah <b>{d?.settings.days ?? 30} hari</b> lalu dan belum pesan lagi. Pembeli lama jauh lebih murah diajak belanja lagi daripada mencari pembeli baru lewat iklan.</p>
          <p className="mt-1 text-xs text-slate-500">Klik <b>Ingatkan via WA</b>: WhatsApp terbuka dengan pesan siap kirim, lalu pelanggan itu hilang dari daftar sampai ia belanja lagi. Pembeli Shopee tidak termasuk (Shopee melarang menghubungi di luar chat Shopee).</p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => setEdit((v) => !v)} className="flex h-9 items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 text-sm font-semibold text-navy hover:bg-slate-50"><Settings2 size={15} />Atur</button>
          {rows.length > 0 && <Link href="/broadcast?audience=reorder" className="flex h-9 items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 text-sm font-semibold text-navy hover:bg-slate-50"><Megaphone size={15} />Broadcast ke semua</Link>}
        </div>
        {edit && (
          <div className="w-full space-y-3 rounded-xl bg-slate-50 p-4 text-sm">
            <label className="flex flex-wrap items-center gap-2"><span className="font-medium text-slate-700">Ingatkan setelah</span>
              <input type="number" min={7} max={180} className="input h-9 w-20 bg-white" value={days} onChange={(e) => setDays(e.target.value)} />
              <span className="text-slate-600">hari sejak pembelian terakhir</span>
              <span className="text-xs text-slate-400">(sesuaikan dengan kapan produkmu biasanya habis, mis. serum 30 hari, pakan 14 hari)</span></label>
            <label className="block"><span className="mb-1 block font-medium text-slate-700">Pesan WhatsApp</span>
              <textarea className="input min-h-32 bg-white py-2" value={message} onChange={(e) => setMessage(e.target.value)} />
              <span className="mt-1 block text-xs text-slate-500">Variabel: <code>{"{nama}"}</code> <code>{"{produk}"}</code> <code>{"{toko}"}</code> <code>{"{link}"}</code> (link halaman pesan produk). <button type="button" className="font-semibold text-brand-600" onClick={() => setMessage(d?.default_message ?? "")}>Pakai pesan bawaan</button></span></label>
            <div className="flex justify-end gap-2">
              <button onClick={() => setEdit(false)} className="h-9 rounded-lg border border-slate-200 bg-white px-4 font-semibold text-slate-600">Batal</button>
              <button onClick={save} disabled={saving} className="flex h-9 items-center gap-1.5 rounded-lg bg-brand-600 px-4 font-semibold text-white disabled:opacity-50">{saving && <Loader2 size={14} className="animate-spin" />}Simpan</button>
            </div>
          </div>
        )}
      </Panel>

      {err && <p className="rounded-lg bg-rose-50 p-3 text-sm text-rose-700">{err}</p>}

      <Panel>
        <div className="border-b border-slate-100 px-5 py-3 text-sm text-slate-600">{d ? <><b className="text-navy">{rows.length - sent.length}</b> pelanggan perlu diingatkan</> : "Memuat…"}</div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[720px] text-sm">
            <thead className="text-left text-xs uppercase tracking-wide text-slate-500"><tr className="border-b border-slate-100">
              <th className="px-5 py-2.5 font-semibold">Pelanggan</th><th className="px-3 font-semibold">Terakhir beli</th><th className="px-3 font-semibold">Produk</th><th className="px-3 font-semibold">Riwayat</th><th className="px-3" />
            </tr></thead>
            <tbody className="divide-y divide-slate-100">
              {rows.map((r) => {
                const done = sent.includes(r.phone);
                return (
                  <tr key={r.phone} className={done ? "opacity-50" : ""}>
                    <td className="px-5 py-3"><b className="block font-medium text-navy">{r.name}</b><span className="text-xs text-slate-400">+{r.phone}</span></td>
                    <td className="px-3 text-slate-600">{since(r.days_since)}</td>
                    <td className="max-w-[240px] px-3"><span className="block truncate text-slate-700" title={r.products.join(", ")}>{r.products.join(", ") || "-"}</span></td>
                    <td className="px-3 text-slate-600">{r.orders}× · {rupiah(r.spent)}</td>
                    <td className="px-3 text-right">
                      {done ? <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-600"><Check size={14} />Diingatkan</span>
                        : <button onClick={() => remind(r)} title={r.message} className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-700 hover:bg-emerald-100"><MessageCircle size={13} />Ingatkan via WA</button>}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {d && !rows.length && <p className="py-10 text-center text-sm text-slate-500">Belum ada pelanggan yang waktunya beli lagi. Daftar ini terisi otomatis dari pesanan web, manual, dan WhatsApp.</p>}
        </div>
      </Panel>
    </div>
  );
}
