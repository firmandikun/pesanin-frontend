"use client";
import { BadgePercent, Gift, Layers, Loader2, Plus, RefreshCcw, Star, Ticket, Zap } from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { askConfirm, showAlert } from "@/components/Dialogs";
import { PageHead, Panel } from "@/components/kit";
import { PromoForm, type PromoType } from "@/components/marketplace/PromoForms";
import { Select } from "@/components/Select";
import { api, ApiError } from "@/lib/api";

type Promo = { id: string; name: string; start_time: number | null; end_time: number | null; status: string; detail: string; code?: string | null; usage?: string | null; disabled?: boolean; items?: { item_id: number; name: string | null }[] };

const TABS: { key: PromoType; label: string; icon: typeof Ticket; desc: string }[] = [
  { key: "discount", label: "Promo Toko", icon: BadgePercent, desc: "Harga coret per produk/variasi untuk periode tertentu." },
  { key: "voucher", label: "Voucher", icon: Ticket, desc: "Potongan Rp atau % untuk semua produk atau produk tertentu, dengan min. belanja & kuota." },
  { key: "bundle", label: "Paket Diskon", icon: Layers, desc: "Beli beberapa produk sekaligus lebih murah (diskon %, potongan Rp, atau harga paket)." },
  { key: "addon", label: "Kombo Hemat", icon: Gift, desc: "Pembeli produk utama bisa menambah produk lain dengan harga khusus." },
  { key: "flash", label: "Flash Sale Toko", icon: Zap, desc: "Harga & stok khusus di slot jam yang disediakan Shopee." },
  { key: "top_picks", label: "Produk Unggulan", icon: Star, desc: "4–8 produk pilihan yang tampil di halaman toko." },
];
const STATUS: Record<string, [string, string]> = {
  ongoing: ["Berjalan", "bg-emerald-50 text-emerald-700 ring-emerald-200"], upcoming: ["Akan datang", "bg-sky-50 text-sky-700 ring-sky-200"],
  expired: ["Selesai", "bg-slate-100 text-slate-500 ring-slate-200"], inactive: ["Tidak aktif", "bg-slate-100 text-slate-500 ring-slate-200"], unknown: ["-", "bg-slate-100 text-slate-500 ring-slate-200"],
};
const when = (t: number | null) => (t ? new Date(t * 1000).toLocaleString("id-ID", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" }) : "");

/** Marketplace → Promosi: create and stop Shopee shop promotions without opening Seller Centre. */
export default function Promotions() {
  const [shops, setShops] = useState<{ id: number; shop_name: string; is_demo?: boolean; status?: string }[] | null>(null);
  const [shop, setShop] = useState(0);
  const [tab, setTab] = useState<PromoType>("discount");
  const [rows, setRows] = useState<Promo[] | null>(null);
  const [err, setErr] = useState("");
  const [form, setForm] = useState(false);
  const [busy, setBusy] = useState("");
  const [notice, setNotice] = useState("");
  const [showExpired, setShowExpired] = useState(false);

  useEffect(() => {
    api<{ shops: { id: number; shop_name: string; is_demo: boolean; status: string }[] }>("/marketplace/shops").then((r) => {
      const real = (r.shops ?? []).filter((s) => !s.is_demo && s.status !== "disconnected");
      setShops(real);
      if (real[0]) setShop(real[0].id);
    }).catch(() => setShops([]));
  }, []);

  const load = useCallback(() => {
    if (!shop) return;
    setRows(null); setErr("");
    api<{ promotions: Promo[] }>(`/marketplace/promotions/${tab}?shop_id=${shop}`).then((r) => setRows(r.promotions))
      .catch((e) => { setRows([]); setErr(e instanceof ApiError ? e.message : "Gagal memuat promosi"); });
  }, [shop, tab]);
  useEffect(load, [load]);

  const stop = async (p: Promo) => {
    const remove = p.status === "upcoming" || p.status === "inactive" || tab === "top_picks";
    if (!(await askConfirm(remove ? `Hapus "${p.name}"?` : `Hentikan "${p.name}" sekarang? Promosi yang sudah dihentikan tidak bisa dijalankan lagi.`, { danger: true, confirmLabel: remove ? "Hapus" : "Hentikan" }))) return;
    setBusy(p.id);
    try { await api(`/marketplace/promotions/${tab}/${p.id}/stop`, { method: "POST", json: { shop_id: shop, status: p.status } }); setNotice(remove ? "Promosi dihapus." : "Promosi dihentikan."); load(); }
    catch (e) { showAlert(e instanceof ApiError ? e.message : "Gagal", "Gagal"); } finally { setBusy(""); }
  };
  const toggleTop = async (p: Promo) => {
    setBusy(p.id);
    try { await api(`/marketplace/promotions/top_picks/${p.id}/toggle`, { method: "PUT", json: { shop_id: shop, active: p.status !== "ongoing" } }); load(); }
    catch (e) { showAlert(e instanceof ApiError ? e.message : "Gagal", "Gagal"); } finally { setBusy(""); }
  };

  const t = TABS.find((x) => x.key === tab)!;
  const visible = (rows ?? []).filter((r) => showExpired || r.status !== "expired");
  const expired = (rows ?? []).filter((r) => r.status === "expired").length;

  return (
    <div className="space-y-4">
      <PageHead title="Promosi Toko" tutorial={false} crumbs={[["Marketplace"], ["Promosi"]]}>
        {shops && shops.length > 1 && (
          <Select className="input h-10 w-52 bg-white" value={shop} onChange={(e) => setShop(Number(e.target.value))}>
            {shops.map((s) => <option key={s.id} value={s.id}>{s.shop_name}</option>)}
          </Select>
        )}
        {shop > 0 && <button onClick={() => setForm(true)} className="flex h-10 items-center gap-1.5 rounded-lg bg-[#ee4d2d] px-4 text-sm font-semibold text-white hover:bg-[#d73f22]"><Plus size={16} />{t.label === "Voucher" ? "Buat Voucher" : `Buat ${t.label}`}</button>}
      </PageHead>
      {notice && <p className="rounded-xl bg-emerald-50 p-3 text-sm text-emerald-700">{notice}</p>}

      {shops && !shops.length ? (
        <Panel className="p-10 text-center text-sm text-slate-500">Belum ada toko Shopee yang terhubung. <Link href="/marketplace/shops" className="font-semibold text-[#ee4d2d]">Hubungkan toko</Link></Panel>
      ) : (
        <Panel className="overflow-hidden p-0">
          <div className="flex gap-1 overflow-x-auto border-b border-slate-200/80 px-3">
            {TABS.map((x) => (
              <button key={x.key} onClick={() => { setTab(x.key); setNotice(""); }} className={`relative flex items-center gap-1.5 whitespace-nowrap px-3 py-3.5 text-sm ${tab === x.key ? "font-semibold text-[#ee4d2d]" : "text-slate-600 hover:text-[#ee4d2d]"}`}>
                <x.icon size={15} />{x.label}{tab === x.key && <span className="absolute inset-x-2 bottom-0 h-0.5 rounded-full bg-[#ee4d2d]" />}
              </button>
            ))}
          </div>
          <div className="flex flex-wrap items-center justify-between gap-2 px-5 py-3">
            <p className="text-sm text-slate-500">{t.desc}</p>
            <div className="flex items-center gap-3 text-xs">
              {expired > 0 && <button onClick={() => setShowExpired(!showExpired)} className="font-semibold text-slate-500 hover:text-[#ee4d2d]">{showExpired ? "Sembunyikan yang selesai" : `Tampilkan yang selesai (${expired})`}</button>}
              <button onClick={load} className="flex items-center gap-1 font-semibold text-slate-500 hover:text-[#ee4d2d]"><RefreshCcw size={13} />Muat ulang</button>
            </div>
          </div>
          {err && <p className="mx-5 mb-3 rounded-lg bg-rose-50 p-3 text-sm text-rose-700">{err}</p>}
          {rows === null ? <p className="flex items-center gap-2 px-5 pb-6 text-sm text-slate-400"><Loader2 size={15} className="animate-spin" />Mengambil dari Shopee…</p>
            : !visible.length ? <p className="px-5 pb-10 pt-4 text-center text-sm text-slate-400">Belum ada {t.label.toLowerCase()} yang berjalan atau akan datang.</p>
            : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[760px] text-sm">
                  <thead className="bg-slate-50 text-left text-xs text-slate-500"><tr><th className="px-5 py-2">Nama</th><th className="px-3 py-2">Detail</th><th className="px-3 py-2">Periode</th><th className="px-3 py-2">Status</th><th /></tr></thead>
                  <tbody>
                    {visible.map((p) => {
                      const [label, cls] = STATUS[p.status] ?? STATUS.unknown;
                      return (
                        <tr key={p.id} className="border-t border-slate-100 align-top">
                          <td className="px-5 py-3"><b className="text-navy">{p.name}</b>{p.code && <span className="ml-2 rounded bg-slate-100 px-1.5 py-0.5 font-mono text-xs">{p.code}</span>}</td>
                          <td className="px-3 py-3 text-slate-600">{p.detail}{p.usage && <span className="block text-xs text-slate-400">{p.usage}</span>}
                            {p.items && <span className="block max-w-[320px] truncate text-xs text-slate-400">{p.items.map((i) => i.name ?? i.item_id).join(", ")}</span>}</td>
                          <td className="whitespace-nowrap px-3 py-3 text-xs text-slate-500">{p.start_time ? <>{when(p.start_time)}<br />s/d {when(p.end_time)}</> : "-"}</td>
                          <td className="px-3 py-3"><span className={`whitespace-nowrap rounded-full px-2 py-0.5 text-xs font-semibold ring-1 ${cls}`}>{p.disabled ? "Dinonaktifkan" : label}</span></td>
                          <td className="whitespace-nowrap px-4 py-3 text-right">
                            {busy === p.id ? <Loader2 size={15} className="ml-auto animate-spin text-slate-400" /> : <>
                              {tab === "top_picks" && <button onClick={() => toggleTop(p)} className="mr-3 text-xs font-semibold text-sky-600 hover:underline">{p.status === "ongoing" ? "Nonaktifkan" : "Aktifkan"}</button>}
                              {p.status !== "expired" && !p.disabled && <button onClick={() => stop(p)} className="text-xs font-semibold text-rose-600 hover:underline">{p.status === "upcoming" || p.status === "inactive" || tab === "top_picks" ? "Hapus" : "Hentikan"}</button>}
                            </>}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
        </Panel>
      )}

      {form && shop > 0 && (
        <PromoForm type={tab} shopId={shop} onClose={() => setForm(false)}
          onCreated={(w) => { setForm(false); setNotice(w.length ? `Promosi dibuat, tapi ${w.length} produk ditolak Shopee.` : "Promosi berhasil dibuat di Shopee."); if (w.length) showAlert(w.join("\n"), "Produk ditolak Shopee"); load(); }} />
      )}
    </div>
  );
}
