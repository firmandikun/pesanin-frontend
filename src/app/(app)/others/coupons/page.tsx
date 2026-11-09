"use client";
import { BadgePercent, Copy, Pencil, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { rupiah } from "@/lib/api";
import { Dialog, EmptyState, PageHead, Pager, Panel, PrimaryBtn, SearchBox, Toggle, useResource } from "@/components/kit";
import { askConfirm } from "@/components/Dialogs";

const KINDS: [string, string, string, string][] = [
  ["product", "Jumlah potongan produk (Diskon produk)", "Diskon produk atau koleksi produk tertentu.", "📦"],
  ["order", "Jumlah potongan pesanan (Diskon pesanan)", "Diskon jumlah total pesanan.", "🧾"],
  ["shipping", "Jumlah potongan ongkos kirim (Diskon Pengiriman)", "Diskon pengiriman ekspedisi", "🚚"],
];
const KIND_LABEL: Record<string, string> = { product: "Diskon produk", order: "Diskon pesanan", shipping: "Diskon pengiriman" };
const TABS = [["", "Semua"], ["active", "Aktif"], ["scheduled", "Dijadwalkan"], ["expired", "Kedaluwarsa"], ["disabled", "Dinonaktifkan"]];

export default function Coupons() {
  const router = useRouter();
  const [q, setQ] = useState("");
  const [state, setState] = useState("");
  const res = useResource<any>("coupons", { search: q, ...(state ? { state } : {}) });
  const [choose, setChoose] = useState(false);
  return (
    <div className="space-y-5">
      <PageHead title="Kupon" />
      <Panel>
        <div className="flex items-center justify-between gap-3 p-4"><SearchBox value={q} onChange={setQ} placeholder="Cari Kupon" /><PrimaryBtn onClick={() => setChoose(true)}>Tambahkan Kupon Baru</PrimaryBtn></div>
        <div className="mx-4 grid grid-cols-5 rounded-lg bg-slate-50 p-1 text-sm">
          {TABS.map(([k, l]) => <button key={k} onClick={() => setState(k)} className={`rounded-md py-2 ${state === k ? "bg-white font-medium text-slate-800" : "text-slate-500"}`}>{l}</button>)}
        </div>
        <div className="mt-3 overflow-x-auto">
          <table className="w-full text-sm">
            <thead><tr className="border-y border-slate-100 text-left text-[13px] text-slate-500">{["Kupon", "Jenis", "Nilai", "Pembayaran", "Dipakai", "Periode", "Aktif", ""].map((h) => <th key={h} className="px-4 py-3 font-medium">{h}</th>)}</tr></thead>
            <tbody>{res.rows.map((c) => (
              <tr key={c.id} className="border-b border-slate-100">
                <td className="px-4 py-3">{c.method === "code" ? <span className="flex items-center gap-1.5 font-mono font-semibold text-slate-800">{c.code}<button onClick={() => navigator.clipboard?.writeText(c.code)} className="text-slate-400" aria-label="Salin"><Copy size={13} /></button></span> : <span className="font-medium text-slate-800">Diskon otomatis</span>}</td>
                <td className="px-4">{KIND_LABEL[c.kind]}</td><td className="px-4 font-semibold">{c.value_type === "percent" ? `${c.value}%` : rupiah(c.value)}</td>
                <td className="px-4">{c.payment_type === "all" ? "COD & Non-COD" : c.payment_type === "cod" ? "COD" : "Non-COD"}</td>
                <td className="px-4">{c.used_count}{c.max_uses ? ` / ${c.max_uses}` : ""}</td>
                <td className="whitespace-nowrap px-4 text-xs text-slate-600">{c.starts_at ? new Date(c.starts_at).toLocaleDateString("id-ID") : "-"} → {c.ends_at ? new Date(c.ends_at).toLocaleDateString("id-ID") : "∞"}</td>
                <td className="px-4"><Toggle checked={c.is_active} onChange={(v) => res.update(c.id, { is_active: v })} /></td>
                <td className="px-4"><span className="flex gap-3 text-slate-500"><button onClick={() => router.push(`/others/coupons/new?id=${c.id}&kind=${c.kind}`)} aria-label="Edit"><Pencil size={15} /></button><button onClick={async () => (await askConfirm("Hapus kupon?")) && res.remove(c.id)} className="hover:text-rose-600" aria-label="Hapus"><Trash2 size={15} /></button></span></td>
              </tr>
            ))}</tbody>
          </table>
          {res.data && !res.rows.length && <EmptyState text="Riwayat Kupon Masih Kosong" variant="coupon" />}
        </div>
        <Pager page={res.page} last={res.data?.last_page ?? 1} onPage={res.setPage} total={res.data?.total} perPage={res.perPage} onPerPage={res.setPerPage} />
      </Panel>
      {choose && (
        <Dialog title="Pilih jenis diskon" icon={BadgePercent} onClose={() => setChoose(false)} width="max-w-3xl">
          <div className="grid gap-4 md:grid-cols-3">
            {KINDS.map(([k, t, d, e]) => (
              <button key={k} onClick={() => router.push(`/others/coupons/new?kind=${k}`)} className="flex flex-col items-center gap-2 rounded-xl border border-slate-200 p-5 text-center hover:border-brand-600">
                <span className="flex h-14 w-14 items-center justify-center rounded-full bg-sky-100 text-2xl">{e}</span>
                <b className="text-sm text-slate-800">{t}</b><span className="text-sm text-slate-500">{d}</span>
              </button>
            ))}
          </div>
        </Dialog>
      )}
    </div>
  );
}
