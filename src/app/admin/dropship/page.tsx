"use client";

import {
  Boxes,
  Copy,
  Eye,
  Film,
  Images,
  LayoutTemplate,
  MapPin,
  MonitorDown,
  Package,
  Pencil,
  Plus,
  Search,
  Send,
  Trash2,
  Users,
  Zap,
} from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { askConfirm, showAlert } from "@/components/Dialogs";
import { Panel } from "@/components/kit";
import { Select } from "@/components/Select";
import { ApiError, rupiah } from "@/lib/api";
import {
  AdminDropshipStats,
  DROPSHIP_CATEGORIES,
  DropshipProduct,
  deleteAdminDropshipProduct,
  duplicateAdminDropshipProduct,
  fetchAdminDropshipProducts,
  updateAdminDropshipProduct,
} from "@/lib/dropship";

export default function AdminDropshipCatalog() {
  const [products, setProducts] = useState<DropshipProduct[]>([]);
  const [stats, setStats] = useState<AdminDropshipStats>({
    total: 0,
    active: 0,
    physical: 0,
    digital: 0,
    assets: 0,
    lps: 0,
    adopters: 0,
  });
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [productType, setProductType] = useState<"" | "physical" | "digital">("");
  const [category, setCategory] = useState("");
  const [status, setStatus] = useState<"" | "active" | "draft">("");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetchAdminDropshipProducts({
        search: search.trim() || undefined,
        product_type: productType || undefined,
        category: category || undefined,
        status: status || undefined,
      });
      setProducts(res.products);
      setStats(res.stats);
    } catch (e) {
      showAlert(e instanceof ApiError ? e.message : "Gagal memuat katalog produk dropship.", "Gagal memuat");
    } finally {
      setLoading(false);
    }
  }, [search, productType, category, status]);

  useEffect(() => {
    const t = setTimeout(load, 200);
    return () => clearTimeout(t);
  }, [load]);

  const toggleStatus = async (p: DropshipProduct) => {
    try {
      await updateAdminDropshipProduct(p.id, {
        ...p,
        status: p.status === "active" ? "draft" : "active",
      });
      load();
    } catch (e) {
      showAlert(e instanceof ApiError ? e.message : "Gagal memperbarui status produk.");
    }
  };

  const duplicate = async (p: DropshipProduct) => {
    try {
      await duplicateAdminDropshipProduct(p.id);
      load();
    } catch (e) {
      showAlert(e instanceof ApiError ? e.message : "Gagal menduplikat produk.");
    }
  };

  const remove = async (p: DropshipProduct) => {
    if (
      await askConfirm(
        `Hapus "${p.name}" dari katalog dropship Pesanin? Konten video, slide, dan template LP produk ini akan ikut dihapus.`,
        { title: "Hapus produk dropship?" },
      )
    ) {
      try {
        await deleteAdminDropshipProduct(p.id);
        load();
      } catch (e) {
        showAlert(e instanceof ApiError ? e.message : "Gagal menghapus produk.");
      }
    }
  };

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <div className="inline-flex items-center gap-1.5 rounded-md border border-slate-200 bg-slate-50 px-2.5 py-0.5 text-[11px] font-semibold text-slate-600">
            <Boxes size={12} /> Katalog Dropship Media Sosial (Fisik &amp; Digital)
          </div>
          <h1 className="mt-1.5 text-2xl font-extrabold text-slate-900">Produk Dropship Pesanin</h1>
          <p className="text-sm text-slate-500">
            Sediakan produk fisik maupun produk digital siap jual lengkap dengan aset video, slide feed, dan pilihan template landing page untuk dropshipper.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Link
            href="/dropship"
            target="_blank"
            className="flex h-10 items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 hover:bg-slate-50"
          >
            <Eye size={15} /> Preview Tampilan User
          </Link>
          <Link
            href="/admin/dropship/new"
            className="flex h-10 items-center gap-2 rounded-lg bg-brand-600 px-4 text-sm font-semibold text-white hover:opacity-95"
          >
            <Plus size={16} /> Tambah Produk Dropship
          </Link>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {[
          { label: "Total Produk Katalog", value: stats.total, sub: `${stats.physical} fisik · ${stats.digital} digital (${stats.active} tayang)`, icon: Boxes },
          { label: "Aset Video & Slide", value: stats.assets, sub: "Siap posting TikTok/IG/Ads", icon: Film },
          { label: "Template Landing Page", value: stats.lps, sub: "Bisa diedit user Pesanin", icon: LayoutTemplate },
          { label: "Total Adopsi Dropshipper", value: stats.adopters, sub: "Seller menjual di medsos", icon: Users },
        ].map((c) => (
          <Panel key={c.label} className="flex items-center gap-3.5 p-4">
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-slate-200 bg-slate-50 text-slate-700">
              <c.icon size={20} />
            </span>
            <div>
              <p className="text-xs text-slate-500">{c.label}</p>
              <p className="text-2xl font-extrabold text-slate-900">{c.value.toLocaleString("id-ID")}</p>
              <p className="text-[11px] text-slate-400">{c.sub}</p>
            </div>
          </Panel>
        ))}
      </div>

      {/* Filter & List */}
      <Panel className="overflow-hidden">
        <div className="flex flex-wrap items-center gap-2 border-b border-slate-100 p-4">
          <div className="relative min-w-[240px] flex-1">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              className="input h-10 pl-9"
              placeholder="Cari nama produk, SKU, format digital, atau kota gudang…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <Select
            className="input h-10 w-40"
            value={productType}
            onChange={(e) => setProductType(e.target.value as "" | "physical" | "digital")}
          >
            <option value="">Semua tipe</option>
            <option value="physical">Produk Fisik</option>
            <option value="digital">Produk Digital</option>
          </Select>
          <Select className="input h-10 w-48" value={category} onChange={(e) => setCategory(e.target.value)}>
            <option value="">Semua kategori</option>
            {DROPSHIP_CATEGORIES.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </Select>
          {(
            [
              ["", "Semua"],
              ["active", "Tayang"],
              ["draft", "Draf"],
            ] as const
          ).map(([v, l]) => (
            <button
              key={v}
              onClick={() => setStatus(v)}
              className={`h-10 rounded-lg border px-3.5 text-sm font-medium transition ${
                status === v
                  ? "border-slate-900 bg-slate-900 text-white"
                  : "border-slate-200 bg-white text-slate-600 hover:border-slate-300"
              }`}
            >
              {l}
            </button>
          ))}
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[960px] text-sm">
            <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-4 py-3 font-semibold">Produk</th>
                <th className="px-4 py-3 font-semibold">Modal → Saran Jual</th>
                <th className="px-4 py-3 font-semibold">Estimasi Margin</th>
                <th className="px-4 py-3 font-semibold">Stok &amp; Pengiriman</th>
                <th className="px-4 py-3 font-semibold">Kelengkapan Aset</th>
                <th className="px-4 py-3 font-semibold">Status</th>
                <th className="px-4 py-3 font-semibold text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {products.map((p) => {
                const estProfit = p.suggested_price - p.wholesale_price;
                const marginPct = p.suggested_price ? Math.round((estProfit / p.suggested_price) * 100) : 0;
                const hasReg = (p.payment_methods ?? []).some((m) => m === "bank_transfer" || m === "epayment");
                return (
                  <tr key={p.id} className="align-middle hover:bg-slate-50/70">
                    <td className="px-4 py-3.5">
                      <div className="flex items-center gap-3">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={p.images[0] || "/images/dropship/blender-portable.jpg"}
                          alt={p.name}
                          className="h-14 w-14 shrink-0 rounded-xl border border-slate-200/60 object-cover"
                        />
                        <div className="min-w-0 max-w-[290px]">
                          <Link
                            href={`/admin/dropship/${p.id}`}
                            className="block truncate font-bold text-slate-900 hover:text-brand-600"
                          >
                            {p.name}
                          </Link>
                          <div className="mt-1 flex flex-wrap items-center gap-1.5 text-[11px] text-slate-500">
                            <span
                              className={`inline-flex items-center gap-1 rounded px-1.5 py-0.5 font-semibold ${
                                p.product_type === "digital"
                                  ? "border border-slate-200 bg-slate-900 text-white"
                                  : "border border-slate-200 bg-white text-slate-700"
                              }`}
                            >
                              {p.product_type === "digital" ? (
                                <>
                                  <MonitorDown size={10} /> Digital
                                </>
                              ) : (
                                <>
                                  <Package size={10} /> Fisik
                                </>
                              )}
                            </span>
                            <span className="rounded bg-slate-100 px-1.5 py-0.5 font-mono font-semibold text-slate-600">
                              {p.sku}
                            </span>
                            <span className="rounded bg-slate-100 px-1.5 py-0.5 font-medium text-slate-600">
                              {p.category}
                            </span>
                            <span>· {p.adopters_count} dropshipper</span>
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3.5 whitespace-nowrap">
                      <p className="text-xs text-slate-500">
                        Modal: <b className="text-slate-800">{rupiah(p.wholesale_price)}</b>
                      </p>
                      <p className="text-xs text-slate-500">
                        Saran: <b className="text-brand-600">{rupiah(p.suggested_price)}</b>
                      </p>
                    </td>
                    <td className="px-4 py-3.5 whitespace-nowrap">
                      <span className="inline-flex items-center rounded-md bg-emerald-50 px-2 py-1 text-xs font-bold text-emerald-700">
                        +{rupiah(estProfit)} ({marginPct}%)
                      </span>
                    </td>
                    <td className="px-4 py-3.5 whitespace-nowrap text-xs">
                      {p.product_type === "digital" ? (
                        <div>
                          <b className="inline-flex items-center gap-1 text-slate-800">
                            <Zap size={12} className="text-amber-500" /> Kirim Otomatis
                          </b>
                          <span className="block max-w-[180px] truncate text-slate-400">
                            {p.digital_format || "Akses Digital Instan"}
                          </span>
                        </div>
                      ) : (
                        <>
                          <b className="block text-slate-800">{p.stock.toLocaleString("id-ID")} pcs</b>
                          <span className="inline-flex items-center gap-1 text-slate-400">
                            <MapPin size={11} /> {p.warehouse_city}
                          </span>
                        </>
                      )}
                      <div className="mt-1 flex gap-1 text-[10px] font-semibold">
                        {hasReg && <span className="rounded bg-slate-100 px-1.5 py-0.5 text-slate-600">Reguler</span>}
                      </div>
                    </td>
                    <td className="px-4 py-3.5">
                      <div className="flex flex-wrap gap-1.5 text-[11px] font-semibold">
                        <span
                          className={`inline-flex items-center gap-1 rounded-md px-2 py-0.5 ${
                            p.videos.length > 0 ? "bg-violet-50 text-violet-700" : "bg-rose-50 text-rose-600"
                          }`}
                        >
                          <Film size={11} /> {p.videos.length} Video
                        </span>
                        <span
                          className={`inline-flex items-center gap-1 rounded-md px-2 py-0.5 ${
                            p.slides.length > 0 ? "bg-sky-50 text-sky-700" : "bg-rose-50 text-rose-600"
                          }`}
                        >
                          <Images size={11} /> {p.slides.length} Slide
                        </span>
                        <span
                          className={`inline-flex items-center gap-1 rounded-md px-2 py-0.5 ${
                            p.lp_templates.length > 0 ? "bg-emerald-50 text-emerald-700" : "bg-rose-50 text-rose-600"
                          }`}
                        >
                          <LayoutTemplate size={11} /> {p.lp_templates.length} LP
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-3.5 whitespace-nowrap">
                      <span
                        className={`inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-xs font-semibold ${
                          p.status === "active"
                            ? "bg-emerald-50 text-emerald-700"
                            : "bg-slate-100 text-slate-600"
                        }`}
                      >
                        <span
                          className={`h-1.5 w-1.5 rounded-full ${
                            p.status === "active" ? "bg-emerald-500" : "bg-slate-400"
                          }`}
                        />
                        {p.status === "active" ? "Tayang" : "Draf"}
                      </span>
                    </td>
                    <td className="px-4 py-3.5 text-right whitespace-nowrap">
                      <div className="inline-flex items-center gap-1">
                        {p.status === "draft" && (
                          <button
                            onClick={() => toggleStatus(p)}
                            className="rounded-lg p-2 text-emerald-600 hover:bg-emerald-50"
                            title="Tayangkan ke katalog dropshipper"
                          >
                            <Send size={15} />
                          </button>
                        )}
                        <Link
                          href={`/admin/dropship/${p.id}`}
                          className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 hover:text-slate-900"
                          title="Edit produk & konten"
                        >
                          <Pencil size={15} />
                        </Link>
                        <button
                          onClick={() => duplicate(p)}
                          className="rounded-lg p-2 text-slate-500 hover:bg-slate-100"
                          title="Duplikat"
                        >
                          <Copy size={15} />
                        </button>
                        <button
                          onClick={() => remove(p)}
                          className="rounded-lg p-2 text-rose-500 hover:bg-rose-50"
                          title="Hapus"
                        >
                          <Trash2 size={15} />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {loading && <div className="py-14 text-center text-sm text-slate-400">Memuat katalog produk dropship…</div>}
          {!loading && products.length === 0 && (
            <div className="py-16 text-center text-sm text-slate-500">
              Tidak ada produk dropship yang cocok.{" "}
              <Link href="/admin/dropship/new" className="font-semibold text-brand-600 hover:underline">
                Tambah produk baru
              </Link>
              .
            </div>
          )}
        </div>
      </Panel>
    </div>
  );
}
