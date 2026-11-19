"use client";

import {
  Boxes,
  Check,
  CheckCircle2,
  Copy,
  ExternalLink,
  Film,
  Images,
  LayoutTemplate,
  Lock,
  MapPin,
  MonitorDown,
  Package,
  PackageCheck,
  Pencil,
  Plus,
  Search,
  ShieldCheck,
  Trash2,
  UserPlus,
  Zap,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { askConfirm, showAlert } from "@/components/Dialogs";
import { PageHead, Panel } from "@/components/kit";
import { Select } from "@/components/Select";
import { Field, Modal } from "@/components/ui";
import { ApiError, rupiah } from "@/lib/api";
import {
  AdoptedDropshipProduct,
  DROPSHIP_CATEGORIES,
  DropshipperProfile,
  DropshipProduct,
  deleteDropshipAdoptionApi,
  fetchSellerDropship,
  saveDropshipperProfileApi,
} from "@/lib/dropship";

const SOCIAL_CHANNELS = ["TikTok", "Instagram", "Facebook Ads", "WhatsApp", "YouTube Shorts"];

export default function DropshipCatalogPage() {
  const router = useRouter();
  const [enabled, setEnabled] = useState(true);
  const [loading, setLoading] = useState(true);
  const [products, setProducts] = useState<DropshipProduct[]>([]);
  const [profile, setProfile] = useState<DropshipperProfile | null>(null);
  const [adopted, setAdopted] = useState<AdoptedDropshipProduct[]>([]);

  const [tab, setTab] = useState<"catalog" | "mine">("catalog");
  const [productType, setProductType] = useState<"" | "physical" | "digital">("");
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("");
  const [sort, setSort] = useState<"popular" | "margin" | "cheapest">("popular");

  // Registration modal
  const [regOpen, setRegOpen] = useState(false);
  const [regSaving, setRegSaving] = useState(false);
  const [regForm, setRegForm] = useState<DropshipperProfile>({
    registered: false,
    brand_name: "",
    whatsapp: "",
    bank_name: "BCA",
    bank_account: "",
    bank_holder: "",
    channels: ["TikTok", "Instagram"],
  });
  const [agreed, setAgreed] = useState(true);
  const [regErr, setRegErr] = useState("");
  const [copiedId, setCopiedId] = useState<number | null>(null);

  useEffect(() => {
    setLoading(true);
    fetchSellerDropship()
      .then((res) => {
        setEnabled(res.enabled !== false);
        setProducts(res.products ?? []);
        setProfile(res.profile);
        setRegForm(res.profile);
        setAdopted(res.adoptions ?? []);
      })
      .catch((e) => showAlert(e instanceof ApiError ? e.message : "Gagal memuat katalog dropship."))
      .finally(() => setLoading(false));
  }, []);

  const adoptedByProductId = useMemo(() => {
    const map = new Map<number, AdoptedDropshipProduct>();
    for (const a of adopted) map.set(a.dropship_product_id, a);
    return map;
  }, [adopted]);

  const typeCounts = useMemo(
    () => ({
      all: products.length,
      physical: products.filter((p) => p.product_type === "physical").length,
      digital: products.filter((p) => p.product_type === "digital").length,
    }),
    [products],
  );

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    const list = products.filter((p) => {
      if (productType && p.product_type !== productType) return false;
      if (category && p.category !== category) return false;
      if (q && !`${p.name} ${p.category} ${p.sku} ${p.description}`.toLowerCase().includes(q)) return false;
      return true;
    });
    if (sort === "margin") {
      return [...list].sort((a, b) => b.suggested_price - b.wholesale_price - (a.suggested_price - a.wholesale_price));
    }
    if (sort === "cheapest") {
      return [...list].sort((a, b) => a.wholesale_price - b.wholesale_price);
    }
    return [...list].sort((a, b) => (b.featured ? 1 : 0) - (a.featured ? 1 : 0) || b.sold_30d - a.sold_30d);
  }, [products, productType, search, category, sort]);

  const submitRegistration = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!regForm.brand_name.trim() || !regForm.whatsapp.trim()) {
      setRegErr("Nama brand/toko media sosial dan nomor WhatsApp aktif wajib diisi.");
      return;
    }
    if (!agreed) {
      setRegErr("Silakan centang persetujuan ketentuan dropshipper khusus media sosial.");
      return;
    }
    setRegErr("");
    setRegSaving(true);
    try {
      const res = await saveDropshipperProfileApi({
        brand_name: regForm.brand_name.trim(),
        whatsapp: regForm.whatsapp.trim(),
        bank_name: regForm.bank_name || "BCA",
        bank_account: regForm.bank_account || "",
        bank_holder: regForm.bank_holder || "",
        channels: regForm.channels ?? ["TikTok", "Instagram"],
      });
      setProfile(res.profile);
      setRegForm(res.profile);
      setRegOpen(false);
    } catch (err) {
      setRegErr(err instanceof ApiError ? err.message : "Gagal menyimpan profil dropshipper.");
    } finally {
      setRegSaving(false);
    }
  };

  const removeAdopted = async (item: AdoptedDropshipProduct) => {
    if (await askConfirm(`Hapus "${item.custom_name}" dari daftar Produk Dropship Media Sosial Anda?`, { title: "Hapus produk dropship?" })) {
      try {
        await deleteDropshipAdoptionApi(item.id);
        setAdopted((prev) => prev.filter((x) => x.id !== item.id));
      } catch (err) {
        showAlert(err instanceof ApiError ? err.message : "Gagal menghapus produk dropship.");
      }
    }
  };

  const copyLink = (item: AdoptedDropshipProduct) => {
    const url = `${window.location.origin}/p/${item.slug}`;
    navigator.clipboard?.writeText(url).catch(() => {});
    setCopiedId(item.id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const isRegistered = !!profile?.registered;

  if (loading) {
    return <p className="py-24 text-center text-sm text-slate-400">Memuat katalog Dropship Pesanin…</p>;
  }

  if (!enabled) {
    return (
      <Panel className="py-16 text-center space-y-3">
        <p className="text-base font-bold text-navy">Fitur Dropship Pesanin sedang dinonaktifkan</p>
        <p className="text-xs text-slate-500">Hubungi admin platform untuk mengaktifkan kembali menu Dropship Pesanin.</p>
        <Link href="/dashboard" className="inline-flex text-xs font-semibold text-brand-600 hover:underline">
          ← Kembali ke Dashboard
        </Link>
      </Panel>
    );
  }

  return (
    <div className="space-y-5">
      <PageHead
        title="Dropship Pesanin"
        tutorial={false}
        crumbs={[["Produk", "/products"], ["Dropship Pesanin"]]}
      >
        {isRegistered ? (
          <button
            type="button"
            onClick={() => {
              if (profile) setRegForm(profile);
              setRegOpen(true);
            }}
            className="flex h-10 items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 text-sm font-semibold text-navy hover:bg-slate-50"
          >
            <Pencil size={15} /> Profil Dropshipper
          </button>
        ) : (
          <button
            type="button"
            onClick={() => setRegOpen(true)}
            className="flex h-10 items-center gap-2 rounded-lg bg-brand-600 px-5 text-sm font-semibold text-white hover:opacity-95"
          >
            <UserPlus size={15} /> Daftar Dropshipper Gratis
          </button>
        )}
      </PageHead>

      {/* Main Tabs: Katalog Produk vs Produk Dropship Saya */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => setTab("catalog")}
            className={`inline-flex h-10 items-center gap-2 rounded-lg px-4 text-sm font-semibold transition ${
              tab === "catalog" ? "bg-navy text-white" : "bg-white text-slate-600 hover:bg-slate-50"
            }`}
          >
            <Boxes size={15} /> Katalog Produk Dropship ({products.length})
          </button>
          <button
            type="button"
            onClick={() => setTab("mine")}
            className={`inline-flex h-10 items-center gap-2 rounded-lg px-4 text-sm font-semibold transition ${
              tab === "mine" ? "bg-navy text-white" : "bg-white text-slate-600 hover:bg-slate-50"
            }`}
          >
            <PackageCheck size={15} /> Produk Dropship Saya ({adopted.length})
          </button>
        </div>

        <Link
          href="/products"
          className="text-xs font-semibold text-brand-600 hover:underline"
        >
          ← Kembali ke Semua Produk Media Sosial
        </Link>
      </div>

      {/* TAB 1: KATALOG PRODUK DROPSHIP */}
      {tab === "catalog" && (
        <div className="space-y-4">
          {/* Search & Filter Bar */}
          <Panel className="p-4 space-y-3">
            <div className="flex flex-wrap items-center gap-3">
              {/* Product Type Filter: Semua / Fisik / Digital */}
              <div className="inline-flex rounded-lg border border-slate-200 bg-slate-50 p-1">
                {(
                  [
                    ["", "Semua", null, typeCounts.all],
                    ["physical", "Produk Fisik", Package, typeCounts.physical],
                    ["digital", "Produk Digital", MonitorDown, typeCounts.digital],
                  ] as const
                ).map(([val, label, Icon, cnt]) => (
                  <button
                    key={val}
                    type="button"
                    onClick={() => {
                      setProductType(val);
                      setCategory("");
                    }}
                    className={`inline-flex h-8 items-center gap-1.5 rounded-md px-3 text-xs font-semibold transition ${
                      productType === val
                        ? "bg-white text-navy shadow-sm"
                        : "text-slate-600 hover:text-navy"
                    }`}
                  >
                    {Icon && <Icon size={13} />}
                    <span>{label}</span>
                    <span className="text-[11px] text-slate-400">({cnt})</span>
                  </button>
                ))}
              </div>

              <div className="relative min-w-[220px] flex-1">
                <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  className="input h-10 pl-9"
                  placeholder="Cari produk fisik atau digital (blender, serum, canva, kelas)…"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>
              <Select className="input h-10 w-48" value={sort} onChange={(e) => setSort(e.target.value as typeof sort)}>
                <option value="popular">Urutkan: Terlaris</option>
                <option value="margin">Urutkan: Margin Tertinggi</option>
                <option value="cheapest">Urutkan: Modal Termurah</option>
              </Select>
            </div>
            <div className="flex flex-wrap items-center gap-1.5">
              <button
                type="button"
                onClick={() => setCategory("")}
                className={`rounded-full px-3 py-1 text-xs font-semibold transition ${
                  category === "" ? "bg-navy text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                }`}
              >
                Semua Kategori
              </button>
              {DROPSHIP_CATEGORIES.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setCategory(c)}
                  className={`rounded-full px-3 py-1 text-xs font-semibold transition ${
                    category === c ? "bg-navy text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                  }`}
                >
                  {c}
                </button>
              ))}
            </div>
          </Panel>

          {/* Product Grid */}
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {filtered.map((p) => {
              const estProfit = p.suggested_price - p.wholesale_price;
              const marginPct = p.suggested_price ? Math.round((estProfit / p.suggested_price) * 100) : 0;
              const alreadyAdopted = adoptedByProductId.get(p.id);
              return (
                <Panel key={p.id} className="group flex flex-col overflow-hidden transition hover:-translate-y-0.5">
                  {/* Product Cover */}
                  <div className="relative aspect-[4/3] overflow-hidden bg-slate-100">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={p.images[0]}
                      alt={p.name}
                      className="h-full w-full object-cover transition duration-300 group-hover:scale-105"
                    />
                    <div className="absolute left-3 top-3 flex flex-wrap gap-1.5">
                      <span
                        className={`inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[10px] font-bold shadow-sm ${
                          p.product_type === "digital"
                            ? "bg-slate-900/90 text-white"
                            : "bg-white/95 text-navy"
                        }`}
                      >
                        {p.product_type === "digital" ? <MonitorDown size={10} /> : <Package size={10} />}
                        {p.product_type === "digital" ? "Produk Digital" : "Produk Fisik"}
                      </span>
                      <span className="rounded-md bg-white/95 px-2 py-0.5 text-[10px] font-semibold text-slate-700 shadow-sm">
                        {p.category}
                      </span>
                    </div>
                    {alreadyAdopted && (
                      <span className="absolute right-3 top-3 inline-flex items-center gap-1 rounded-md bg-emerald-600 px-2 py-0.5 text-[10px] font-bold text-white shadow">
                        <Check size={11} /> Sudah Ditambahkan
                      </span>
                    )}
                    <div className="absolute bottom-2.5 left-3 right-3 flex items-center justify-between text-[11px] font-semibold text-white">
                      {p.product_type === "digital" ? (
                        <span className="inline-flex items-center gap-1 rounded-md bg-slate-900/75 px-2 py-0.5 backdrop-blur-sm">
                          <Zap size={11} /> Kirim Otomatis · Tanpa Stok
                        </span>
                      ) : (
                        <>
                          <span className="inline-flex items-center gap-1 rounded-md bg-slate-900/75 px-2 py-0.5 backdrop-blur-sm">
                            <MapPin size={11} /> {p.warehouse_city}
                          </span>
                          <span className="rounded-md bg-slate-900/75 px-2 py-0.5 backdrop-blur-sm">
                            Stok {p.stock}
                          </span>
                        </>
                      )}
                    </div>
                  </div>

                  {/* Body */}
                  <div className="flex flex-1 flex-col p-4">
                    <Link
                      href={`/dropship/${p.id}`}
                      className="line-clamp-2 text-sm font-bold leading-snug text-navy hover:text-brand-600"
                    >
                      {p.name}
                    </Link>

                    {/* Pricing Box */}
                    <div className="mt-3 rounded-xl border border-slate-100 bg-slate-50/80 p-3 space-y-1.5">
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-slate-500">Harga Modal</span>
                        <b className="text-slate-800">{rupiah(p.wholesale_price)}</b>
                      </div>
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-slate-500">Saran Harga Jual</span>
                        <b className="text-brand-600">{rupiah(p.suggested_price)}</b>
                      </div>
                      <div className="flex items-center justify-between border-t border-slate-200/70 pt-1.5 text-xs">
                        <span className="font-semibold text-emerald-700">Estimasi Profit</span>
                        <span className="rounded bg-emerald-100 px-1.5 py-0.5 font-extrabold text-emerald-700">
                          +{rupiah(estProfit)} ({marginPct}%)
                        </span>
                      </div>
                    </div>

                    {/* Ready-to-Use Content Badges */}
                    <div className="mt-3 flex flex-wrap gap-1.5 text-[11px] font-semibold">
                      <span className="inline-flex items-center gap-1 rounded-md bg-violet-50 px-2 py-0.5 text-violet-700">
                        <Film size={11} /> {p.videos.length} Video
                      </span>
                      <span className="inline-flex items-center gap-1 rounded-md bg-sky-50 px-2 py-0.5 text-sky-700">
                        <Images size={11} /> {p.slides.length} Slide Feed
                      </span>
                      <span className="inline-flex items-center gap-1 rounded-md bg-emerald-50 px-2 py-0.5 text-emerald-700">
                        <LayoutTemplate size={11} /> {p.lp_templates.length} LP
                      </span>
                    </div>

                    {/* Actions */}
                    <div className="mt-4 flex gap-2 pt-1">
                      <Link
                        href={`/dropship/${p.id}`}
                        className="flex h-9 flex-1 items-center justify-center rounded-lg border border-slate-200 bg-white px-3 text-xs font-semibold text-navy hover:bg-slate-50"
                      >
                        Lihat Konten
                      </Link>
                      {isRegistered ? (
                        <button
                          type="button"
                          onClick={() => router.push(`/dropship/${p.id}?tab=lp`)}
                          className={`flex h-9 flex-1 items-center justify-center gap-1 rounded-lg px-3 text-xs font-semibold text-white transition ${
                            alreadyAdopted ? "bg-emerald-600 hover:bg-emerald-700" : "bg-brand-600 hover:opacity-95"
                          }`}
                        >
                          {alreadyAdopted ? (
                            <>
                              <Pencil size={12} /> Edit LP
                            </>
                          ) : (
                            <>
                              <Plus size={13} /> Tambahkan
                            </>
                          )}
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={() => setRegOpen(true)}
                          className="flex h-9 flex-1 items-center justify-center gap-1 rounded-lg bg-navy px-3 text-xs font-semibold text-white hover:bg-slate-800"
                        >
                          <Lock size={12} /> Daftar dulu
                        </button>
                      )}
                    </div>
                  </div>
                </Panel>
              );
            })}
          </div>

          {filtered.length === 0 && (
            <Panel className="py-16 text-center text-sm text-slate-500">
              Tidak ada produk dropship yang cocok dengan pencarian Anda.
            </Panel>
          )}
        </div>
      )}

      {/* TAB 2: PRODUK DROPSHIP SAYA */}
      {tab === "mine" && (
        <Panel className="overflow-hidden">
          {adopted.length === 0 ? (
            <div className="py-16 text-center space-y-3 px-4">
              <PackageCheck size={36} className="mx-auto text-slate-300" />
              <p className="text-base font-bold text-navy">Belum ada produk dropship yang ditambahkan</p>
              <p className="mx-auto max-w-md text-xs text-slate-500">
                Pilih produk dari Katalog Dropship Pesanin, sesuaikan harga jual dan template Landing Page-nya, lalu tambahkan ke toko Media Sosial Anda.
              </p>
              <button
                type="button"
                onClick={() => setTab("catalog")}
                className="inline-flex h-10 items-center gap-2 rounded-lg bg-brand-600 px-5 text-sm font-semibold text-white"
              >
                <Boxes size={15} /> Jelajahi Katalog Dropship
              </button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[920px] text-sm">
                <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
                  <tr>
                    <th className="px-4 py-3 font-semibold">Produk Media Sosial Anda</th>
                    <th className="px-4 py-3 font-semibold">Modal → Harga Jual</th>
                    <th className="px-4 py-3 font-semibold">Profit / Pcs</th>
                    <th className="px-4 py-3 font-semibold">Landing Page</th>
                    <th className="px-4 py-3 font-semibold">Konten Promosi</th>
                    <th className="px-4 py-3 font-semibold text-right">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {adopted.map((item) => {
                    const src = products.find((p) => p.id === item.dropship_product_id);
                    const modal = src?.wholesale_price ?? 0;
                    const profit = item.selling_price - modal;
                    const tpl = src?.lp_templates.find((t) => t.id === item.selected_lp_id);
                    return (
                      <tr key={item.id} className="align-middle hover:bg-slate-50/60">
                        <td className="px-4 py-3.5">
                          <div className="flex items-center gap-3">
                            {src?.images[0] && (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img
                                src={src.images[0]}
                                alt={item.custom_name}
                                className="h-12 w-12 shrink-0 rounded-xl border border-slate-200/70 object-cover"
                              />
                            )}
                            <div className="min-w-0 max-w-[260px]">
                              <b className="block truncate text-navy">{item.custom_name}</b>
                              <span className="mt-0.5 inline-flex items-center gap-1 rounded bg-emerald-50 px-1.5 py-0.5 text-[10px] font-bold text-emerald-700">
                                Aktif · Khusus Media Sosial
                              </span>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3.5 whitespace-nowrap text-xs">
                          <span className="block text-slate-500">Modal: {rupiah(modal)}</span>
                          <b className="text-navy">Jual: {rupiah(item.selling_price)}</b>
                        </td>
                        <td className="px-4 py-3.5 whitespace-nowrap">
                          <span className="rounded-md bg-emerald-50 px-2 py-1 text-xs font-bold text-emerald-700">
                            +{rupiah(profit)}
                          </span>
                        </td>
                        <td className="px-4 py-3.5 text-xs">
                          <p className="font-semibold text-slate-800">{item.lp_page?.title || tpl?.name || "Landing Page"}</p>
                          <div className="mt-0.5 flex items-center gap-1.5">
                            <a
                              href={`/p/${item.slug}`}
                              target="_blank"
                              className="inline-flex items-center gap-1 font-mono text-[11px] text-brand-600 hover:underline"
                            >
                              /p/{item.slug}
                              <ExternalLink size={10} />
                            </a>
                            <button
                              type="button"
                              onClick={() => copyLink(item)}
                              className="text-slate-400 hover:text-brand-600"
                              title="Salin link"
                            >
                              {copiedId === item.id ? <Check size={12} className="text-emerald-600" /> : <Copy size={12} />}
                            </button>
                          </div>
                        </td>
                        <td className="px-4 py-3.5 whitespace-nowrap">
                          <Link
                            href={`/dropship/${item.dropship_product_id}?tab=videos`}
                            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                          >
                            <Film size={12} className="text-violet-600" /> Ambil Video &amp; Slide
                            <ExternalLink size={11} className="text-slate-400" />
                          </Link>
                        </td>
                        <td className="px-4 py-3.5 text-right whitespace-nowrap">
                          <div className="inline-flex items-center gap-1.5">
                            <Link
                              href={`/dropship/${item.dropship_product_id}?tab=lp&builder=1`}
                              className="inline-flex h-8 items-center gap-1 rounded-lg bg-navy px-3 text-xs font-semibold text-white hover:bg-slate-800"
                            >
                              <Pencil size={12} /> Edit with Builder
                            </Link>
                            <button
                              type="button"
                              onClick={() => removeAdopted(item)}
                              className="rounded-lg p-2 text-rose-500 hover:bg-rose-50"
                              title="Hapus"
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>
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

      {/* MODAL PENDAFTARAN DROPSHIPPER PESANIN */}
      <Modal
        open={regOpen}
        onClose={() => setRegOpen(false)}
        title={isRegistered ? "Profil Dropshipper Pesanin" : "Daftar Dropshipper Pesanin"}
        icon={ShieldCheck}
        wide
      >
        <form onSubmit={submitRegistration} className="space-y-4">
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-3.5 text-xs leading-relaxed text-slate-700">
            <b className="text-navy">Ketentuan Dropshipper Pesanin:</b> Semua produk di katalog ini disediakan khusus untuk jualan melalui{" "}
            <b className="text-navy">Media Sosial (Landing Page, TikTok, Instagram, FB Ads, WhatsApp)</b> dan <b className="text-navy">bukan untuk di-upload ke Marketplace</b> agar margin seluruh dropshipper tetap terjaga sehat.
          </div>

          {regErr && (
            <div className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-xs font-semibold text-rose-700">
              {regErr}
            </div>
          )}

          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Nama Brand / Toko Media Sosial *" hint="Akan tampil di header Landing Page & label resi pengiriman.">
              <input
                className="input"
                placeholder="Contoh: GlowHouse Official / DapurPraktis.id"
                value={regForm.brand_name}
                onChange={(e) => setRegForm({ ...regForm, brand_name: e.target.value })}
              />
            </Field>
            <Field label="Nomor WhatsApp CS Aktif *" hint="Digunakan untuk tombol konsultasi WA di Landing Page.">
              <input
                className="input"
                placeholder="0812xxxxxxxx"
                value={regForm.whatsapp}
                onChange={(e) => setRegForm({ ...regForm, whatsapp: e.target.value })}
              />
            </Field>
          </div>

          <div>
            <label className="label">Channel Jualan Media Sosial Utama</label>
            <div className="flex flex-wrap gap-2">
              {SOCIAL_CHANNELS.map((ch) => {
                const on = regForm.channels.includes(ch);
                return (
                  <button
                    key={ch}
                    type="button"
                    onClick={() =>
                      setRegForm({
                        ...regForm,
                        channels: on ? regForm.channels.filter((x) => x !== ch) : [...regForm.channels, ch],
                      })
                    }
                    className={`rounded-full px-3 py-1.5 text-xs font-semibold transition ${
                      on ? "bg-brand-600 text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                    }`}
                  >
                    {ch}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="grid gap-3 rounded-xl border border-slate-200/80 bg-slate-50/70 p-4 sm:grid-cols-3">
            <Field label="Bank Pencairan Profit">
              <Select
                className="input h-9 text-xs"
                value={regForm.bank_name}
                onChange={(e) => setRegForm({ ...regForm, bank_name: e.target.value })}
              >
                {["BCA", "BRI", "Mandiri", "BNI", "BSI", "SeaBank", "Jago"].map((b) => (
                  <option key={b} value={b}>
                    {b}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Nomor Rekening">
              <input
                className="input h-9 text-xs font-mono"
                placeholder="1234567890"
                value={regForm.bank_account}
                onChange={(e) => setRegForm({ ...regForm, bank_account: e.target.value })}
              />
            </Field>
            <Field label="Atas Nama">
              <input
                className="input h-9 text-xs"
                placeholder="Nama Pemilik Rekening"
                value={regForm.bank_holder}
                onChange={(e) => setRegForm({ ...regForm, bank_holder: e.target.value })}
              />
            </Field>
          </div>

          <label className="flex cursor-pointer items-start gap-2.5 text-xs text-slate-600">
            <input
              type="checkbox"
              className="mt-0.5 h-4 w-4 rounded"
              checked={agreed}
              onChange={(e) => setAgreed(e.target.checked)}
            />
            <span>
              Saya setuju memasarkan produk katalog Dropship Pesanin <b>khusus melalui Media Sosial &amp; Landing Page</b> (tidak meng-upload ke Shopee/Tokopedia/Lazada) serta mematuhi batas harga jual minimum.
            </span>
          </label>

          <div className="flex justify-end gap-2 border-t border-slate-100 pt-4">
            <button
              type="button"
              onClick={() => setRegOpen(false)}
              className="h-10 rounded-lg border border-slate-200 px-4 text-sm font-semibold text-slate-600 hover:bg-slate-50"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={regSaving}
              className="flex h-10 items-center gap-2 rounded-lg bg-brand-600 px-5 text-sm font-semibold text-white hover:opacity-95 disabled:opacity-50"
            >
              <CheckCircle2 size={16} />
              {regSaving
                ? "Menyimpan…"
                : isRegistered
                  ? "Simpan Profil Dropshipper"
                  : "Aktifkan Akun Dropshipper"}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
