"use client";

import {
  AlertTriangle,
  ArrowLeft,
  Check,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Copy,
  Download,
  ExternalLink,
  Film,
  Images,
  LayoutTemplate,
  MapPin,
  Monitor,
  MonitorDown,
  Package,
  Pencil,
  Play,
  Scale,
  Settings,
  Smartphone,
  Zap,
} from "lucide-react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { use, useEffect, useMemo, useState } from "react";
import { PageHead, Panel } from "@/components/kit";
import { BlockView } from "@/components/landing/BlockRenderer";
import { LandingPageBuilder } from "@/components/landing/LandingPageBuilder";
import { Field, MoneyInput } from "@/components/ui";
import { ApiError, rupiah } from "@/lib/api";
import { LandingPage } from "@/lib/landing";
import {
  AdoptedDropshipProduct,
  DROPSHIP_PAYMENT_OPTIONS,
  DropshipPaymentMethod,
  DropshipperProfile,
  DropshipProduct,
  fetchSellerDropshipProduct,
  getTemplateHeadline,
  lpTemplateToLandingPage,
  makeDropshipCheckoutPreview,
  downloadSlidesZip,
  isVideoFile,
  useDropshipShipping,
  normalizePaymentMethods,
  saveDropshipAdoptionApi,
  slugify,
  syncPricingInBlocks,
} from "@/lib/dropship";

export default function DropshipProductDetail({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const searchParams = useSearchParams();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [product, setProduct] = useState<DropshipProduct | null>(null);
  const [profile, setProfile] = useState<DropshipperProfile | null>(null);
  const [existingAdopted, setExistingAdopted] = useState<AdoptedDropshipProduct | null>(null);

  const initialTab = (searchParams.get("tab") as "overview" | "videos" | "slides" | "lp") || "overview";
  const [tab, setTab] = useState<"overview" | "videos" | "slides" | "lp">(initialTab);
  const [activeImg, setActiveImg] = useState(0);
  const [slideIndexes, setSlideIndexes] = useState<Record<string, number>>({});
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [toast, setToast] = useState("");
  const [zipping, setZipping] = useState("");
  const [previewDevice, setPreviewDevice] = useState<"mobile" | "desktop">("mobile");
  const [builderTab, setBuilderTab] = useState<"home" | "settings" | null>(
    searchParams.get("builder") === "1" ? "home" : null,
  );

  // Store & Landing Page draft state (native Pesanin LandingPage)
  const [customName, setCustomName] = useState("");
  const [sellingPrice, setSellingPrice] = useState(0);
  const [comparePrice, setComparePrice] = useState(0);
  const [slug, setSlug] = useState("");
  const [selectedLpId, setSelectedLpId] = useState("");
  const [paymentMethods, setPaymentMethods] = useState<DropshipPaymentMethod[]>(["bank_transfer", "epayment"]);
  const [lpPage, setLpPage] = useState<LandingPage | null>(null);

  useEffect(() => {
    setLoading(true);
    fetchSellerDropshipProduct(id)
      .then((res) => {
        const found = res.product;
        const prof = res.profile;
        const match = res.adoption;

        setProduct(found);
        setProfile(prof);
        setExistingAdopted(match);

        if (found) {
          if (match && match.lp_page?.blocks) {
            setCustomName(match.custom_name);
            setSellingPrice(match.selling_price);
            setComparePrice(match.compare_price);
            setSlug(match.slug);
            setSelectedLpId(match.selected_lp_id || found.lp_templates[0]?.id || "");
            setPaymentMethods(normalizePaymentMethods(match.payment_methods));
            setLpPage(structuredClone(match.lp_page));
          } else {
            const firstLp = found.lp_templates[0];
            const nextSlug = slugify(found.name);
            setCustomName(found.name);
            setSellingPrice(found.suggested_price);
            setComparePrice(found.compare_price);
            setSlug(nextSlug);
            setSelectedLpId(firstLp?.id ?? "");
            setPaymentMethods(normalizePaymentMethods(found.payment_methods));
            if (firstLp) {
              setLpPage(
                lpTemplateToLandingPage(firstLp, found, {
                  title: found.name,
                  slug: nextSlug,
                  whatsapp: prof.whatsapp || "",
                  sellingPrice: found.suggested_price,
                  comparePrice: found.compare_price,
                }),
              );
            }
          }
        }
      })
      .catch(() => setProduct(null))
      .finally(() => setLoading(false));
  }, [id]);

  const shipping = useDropshipShipping(product?.warehouse_region_id, product?.weight_gram, product?.product_type === "digital");
  const previewCtx = useMemo(() => {
    if (!product) return { checkout: {}, products: [] };
    return makeDropshipCheckoutPreview(product, {
      shipping,
      customName: customName || product.name,
      sellingPrice: sellingPrice || product.suggested_price,
      comparePrice: comparePrice || product.compare_price,
      brandName: profile?.brand_name || "Brand Media Sosial Anda",
      paymentMethods,
      productId: existingAdopted?.product_id ?? undefined,
    });
  }, [product, customName, sellingPrice, comparePrice, profile?.brand_name, paymentMethods, existingAdopted?.product_id, shipping]);

  if (loading) {
    return <p className="py-24 text-center text-sm text-slate-400">Memuat detail produk dropship…</p>;
  }

  if (!product) {
    return (
      <Panel className="py-20 text-center space-y-3">
        <p className="text-sm font-semibold text-slate-600">Produk dropship tidak ditemukan.</p>
        <Link href="/dropship" className="inline-flex text-sm font-semibold text-brand-600 hover:underline">
          ← Kembali ke Katalog Dropship
        </Link>
      </Panel>
    );
  }

  const estProfit = sellingPrice - product.wholesale_price;
  const marginPct = sellingPrice > 0 ? Math.round((estProfit / sellingPrice) * 100) : 0;
  const belowMin = sellingPrice < product.min_price;

  const togglePaymentMethod = (method: DropshipPaymentMethod) => {
    const exists = paymentMethods.includes(method);
    if (exists && paymentMethods.length === 1) return;
    setPaymentMethods(exists ? paymentMethods.filter((m) => m !== method) : [...paymentMethods, method]);
  };

  const selectTemplate = (tplId: string) => {
    const tpl = product.lp_templates.find((t) => t.id === tplId);
    if (!tpl) return;
    setSelectedLpId(tpl.id);
    setLpPage(
      lpTemplateToLandingPage(tpl, product, {
        title: customName || product.name,
        slug: slug || slugify(customName || product.name),
        whatsapp: lpPage?.settings?.whatsapp || profile?.whatsapp || "",
        sellingPrice,
        comparePrice,
        productId: existingAdopted?.product_id ?? undefined,
      }),
    );
  };

  const updateSellingPrice = (val: number) => {
    setSellingPrice(val);
    setLpPage((prev) =>
      prev ? { ...prev, blocks: syncPricingInBlocks(prev.blocks, val, comparePrice) } : prev,
    );
  };

  const updateComparePrice = (val: number) => {
    setComparePrice(val);
    setLpPage((prev) =>
      prev ? { ...prev, blocks: syncPricingInBlocks(prev.blocks, sellingPrice, val) } : prev,
    );
  };

  const copyText = (key: string, text: string) => {
    navigator.clipboard?.writeText(text).catch(() => {});
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(""), 3500);
  };

  const saveToMyProducts = async (overridePage?: LandingPage) => {
    if (!profile?.registered) {
      router.push("/dropship");
      return;
    }
    if (belowMin) {
      showToast(`Harga jual minimal untuk produk ini adalah ${rupiah(product.min_price)}.`);
      return;
    }
    const finalPage: LandingPage =
      overridePage ??
      lpPage ??
      (product.lp_templates[0]
        ? lpTemplateToLandingPage(product.lp_templates[0], product, {
            title: customName || product.name,
            slug: slugify(slug || customName || product.name),
            sellingPrice,
            comparePrice,
          })
        : {
            id: 900001,
            title: customName || product.name,
            slug: slugify(slug || customName || product.name),
            status: "published",
            template: "blank",
            views: 0,
            updated_at: new Date().toISOString(),
            theme: { primary: "#e05510", background: "#ffffff", width: "narrow" },
            seo: {},
            settings: { whatsapp: profile.whatsapp || "" },
            blocks: [],
          });

    const finalSlug = slugify(finalPage.slug || slug || customName || product.name);
    const normalizedPage: LandingPage = {
      ...finalPage,
      title: finalPage.title || customName || product.name,
      slug: finalSlug,
      updated_at: new Date().toISOString(),
    };

    setSaving(true);
    try {
      const wasExisting = !!existingAdopted;
      const res = await saveDropshipAdoptionApi({
        dropship_product_id: product.id,
        custom_name: customName.trim() || product.name,
        selling_price: sellingPrice,
        compare_price: comparePrice,
        slug: finalSlug,
        selected_lp_id: selectedLpId || product.lp_templates[0]?.id || "",
        payment_methods: normalizePaymentMethods(paymentMethods),
        lp_page: normalizedPage,
      });
      setExistingAdopted(res.adoption);
      if (res.adoption.lp_page) setLpPage(res.adoption.lp_page);
      setSlug(res.adoption.slug);
      showToast(
        wasExisting
          ? "Perubahan harga, metode pembayaran & Landing Page berhasil disimpan ke database!"
          : "Produk & Landing Page berhasil ditambahkan dan aktif di /p/" + res.adoption.slug,
      );
      return res.adoption.lp_page ?? normalizedPage;
    } catch (e) {
      showToast(e instanceof ApiError ? e.message : "Gagal menyimpan produk dropship.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-5">
      <PageHead
        title={product.name}
        tutorial={false}
        crumbs={[
          ["Produk", "/products"],
          ["Dropship Pesanin", "/dropship"],
          [product.category],
        ]}
      >
        <Link
          href="/dropship"
          className="flex h-10 items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 text-sm font-semibold text-navy hover:bg-slate-50"
        >
          <ArrowLeft size={15} /> Katalog
        </Link>
        <button
          type="button"
          onClick={() => setTab("lp")}
          className="flex h-10 items-center gap-2 rounded-lg bg-brand-600 px-5 text-sm font-semibold text-white hover:opacity-95"
        >
          <LayoutTemplate size={15} />
          {existingAdopted ? "Edit Landing Page Saya" : "Pilih LP & Tambahkan ke Medsos"}
        </button>
      </PageHead>

      {toast && (
        <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-800">
          <span className="flex items-center gap-2">
            <CheckCircle2 size={16} /> {toast}
          </span>
          <Link href="/dropship" className="text-xs font-bold text-emerald-700 underline">
            Lihat Produk Dropship Saya →
          </Link>
        </div>
      )}

      {!profile?.registered && (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs text-amber-900">
          <span className="flex items-center gap-2 font-medium">
            <AlertTriangle size={16} className="shrink-0 text-amber-600" />
            Anda belum mendaftar sebagai <b>Dropshipper Pesanin</b>. Anda tetap bisa melihat seluruh aset konten &amp; preview LP di bawah, lalu daftar gratis untuk menambahkan produk ini.
          </span>
          <Link
            href="/dropship"
            className="rounded-lg bg-amber-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-amber-700"
          >
            Daftar Dropshipper
          </Link>
        </div>
      )}

      {/* Top Product Overview + Interactive Profit Calculator */}
      <Panel className="p-5">
        <div className="grid gap-6 lg:grid-cols-[340px_1fr]">
          {/* Gallery */}
          <div className="space-y-3">
            <div className="overflow-hidden rounded-2xl border border-slate-200/80 bg-slate-50">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={product.images[activeImg] || product.images[0]}
                alt={product.name}
                className="aspect-square w-full object-cover"
              />
            </div>
            {product.images.length > 1 && (
              <div className="flex gap-2 overflow-x-auto">
                {product.images.map((img, i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => setActiveImg(i)}
                    className={`h-16 w-16 shrink-0 overflow-hidden rounded-xl border-2 transition ${
                      activeImg === i ? "border-brand-600" : "border-slate-200 opacity-75 hover:opacity-100"
                    }`}
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={img} alt="" className="h-full w-full object-cover" />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Info & Profit Calculator */}
          <div className="flex flex-col justify-between space-y-5">
            <div className="space-y-3">
              <div className="flex flex-wrap items-center gap-2 text-xs">
                <span className="inline-flex items-center gap-1 rounded-md bg-slate-900 px-2 py-0.5 font-bold text-white">
                  {product.product_type === "digital" ? <MonitorDown size={11} /> : <Package size={11} />}
                  {product.product_type === "digital" ? "Produk Digital" : "Produk Fisik"}
                </span>
                <span className="rounded-md bg-slate-100 px-2 py-0.5 font-semibold text-slate-700">
                  {product.category}
                </span>
                <span className="rounded-md bg-slate-100 px-2 py-0.5 font-mono text-slate-600">
                  {product.sku}
                </span>
                {product.product_type === "digital" ? (
                  <>
                    <span className="inline-flex items-center gap-1 font-semibold text-emerald-700">
                      <Zap size={13} /> Kirim Otomatis via WA &amp; Email
                    </span>
                    {product.digital_format && (
                      <span className="text-slate-500">Format: <b className="text-slate-700">{product.digital_format}</b></span>
                    )}
                    {product.digital_license && (
                      <span className="text-slate-500">Lisensi: <b className="text-slate-700">{product.digital_license}</b></span>
                    )}
                  </>
                ) : (
                  <>
                    <span className="inline-flex items-center gap-1 text-slate-500">
                      <MapPin size={13} /> Kirim dari <b>{product.warehouse_city}</b>
                    </span>
                    <span className="inline-flex items-center gap-1 text-slate-500">
                      <Scale size={13} /> {product.weight_gram} gr
                    </span>
                    <span className="inline-flex items-center gap-1 text-emerald-700 font-semibold">
                      Stok {product.stock.toLocaleString("id-ID")} pcs
                    </span>
                  </>
                )}
              </div>

              <p className="text-sm leading-relaxed text-slate-600">{product.description}</p>

              {/* Asset pills */}
              <div className="flex flex-wrap gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setTab("videos")}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-violet-50 px-3 py-1.5 text-xs font-bold text-violet-700 hover:bg-violet-100"
                >
                  <Film size={14} /> {product.videos.length} Konten Video Siap Pakai
                </button>
                <button
                  type="button"
                  onClick={() => setTab("slides")}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-sky-50 px-3 py-1.5 text-xs font-bold text-sky-700 hover:bg-sky-100"
                >
                  <Images size={14} /> {product.slides.length} Paket Slide &amp; Feed
                </button>
                <button
                  type="button"
                  onClick={() => setTab("lp")}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-50 px-3 py-1.5 text-xs font-bold text-emerald-700 hover:bg-emerald-100"
                >
                  <LayoutTemplate size={14} /> {product.lp_templates.length} Pilihan Landing Page (Bisa Diedit)
                </button>
              </div>
            </div>

            {/* Interactive Profit Calculator */}
            <div className="rounded-2xl border border-slate-200/80 bg-slate-50/70 p-4 space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <b className="text-xs uppercase tracking-wider text-slate-600">Simulasi Harga Jual &amp; Profit Anda</b>
                <span className="text-xs text-slate-500">
                  Batas harga minimal: <b className="text-navy">{rupiah(product.min_price)}</b>
                </span>
              </div>
              <div className="grid gap-3 sm:grid-cols-3 items-center">
                <div className="rounded-xl bg-white p-3 border border-slate-200/70">
                  <p className="text-[11px] text-slate-500">Harga Modal Dropship</p>
                  <p className="mt-0.5 text-lg font-extrabold text-navy">{rupiah(product.wholesale_price)}</p>
                </div>
                <div className="rounded-xl bg-white p-3 border border-brand-200">
                  <p className="mb-1 text-[11px] font-semibold text-brand-700">Atur Harga Jual Anda</p>
                  <MoneyInput value={sellingPrice} onChange={(v) => updateSellingPrice(v ?? 0)} />
                </div>
                <div
                  className={`rounded-xl p-3 border ${
                    belowMin
                      ? "border-rose-200 bg-rose-50 text-rose-700"
                      : "border-emerald-200 bg-emerald-50 text-emerald-700"
                  }`}
                >
                  <p className="text-[11px] font-semibold">Estimasi Profit / Pcs</p>
                  <p className="mt-0.5 text-lg font-black">
                    {estProfit >= 0 ? "+" : ""}
                    {rupiah(estProfit)} <span className="text-xs font-bold">({marginPct}%)</span>
                  </p>
                </div>
              </div>
              {belowMin && (
                <p className="text-xs font-semibold text-rose-600">
                  Harga jual tidak boleh di bawah batas minimum {rupiah(product.min_price)}.
                </p>
              )}
            </div>
          </div>
        </div>
      </Panel>

      {/* Content & LP Studio Tabs */}
      <div className="flex flex-wrap gap-2">
        {(
          [
            ["overview", "Ringkasan & Varian", Package, null],
            ["videos", "Konten Video", Film, product.videos.length],
            ["slides", "Konten Slide & Feed", Images, product.slides.length],
            ["lp", "Pilih & Edit Landing Page", LayoutTemplate, product.lp_templates.length],
          ] as const
        ).map(([key, label, Icon, count]) => (
          <button
            key={key}
            type="button"
            onClick={() => setTab(key)}
            className={`inline-flex h-10 items-center gap-2 rounded-lg px-4 text-sm font-semibold transition ${
              tab === key ? "bg-navy text-white shadow-sm" : "bg-white text-slate-600 hover:bg-slate-50"
            }`}
          >
            <Icon size={15} />
            <span>{label}</span>
            {count !== null && (
              <span className={`rounded-full px-1.5 py-0.5 text-[10px] font-bold ${tab === key ? "bg-white/20 text-white" : "bg-slate-100 text-slate-600"}`}>
                {count}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* TAB 1: RINGKASAN & VARIAN */}
      {tab === "overview" && (
        <div className="grid gap-5 lg:grid-cols-2">
          <Panel className="p-5 space-y-3">
            <h3 className="text-base font-bold text-navy">Daftar Varian &amp; Harga Modal</h3>
            <div className="divide-y divide-slate-100">
              {product.variants.map((v) => (
                <div key={v.id} className="flex items-center justify-between py-3 text-sm">
                  <div>
                    <b className="text-navy">{v.name}</b>
                    <span className="block font-mono text-xs text-slate-400">{v.sku}</span>
                  </div>
                  <div className="text-right">
                    <b className="text-navy">{rupiah(v.wholesale_price)}</b>
                    <span className="block text-xs text-emerald-600">Stok {v.stock} pcs</span>
                  </div>
                </div>
              ))}
            </div>
          </Panel>

          <Panel className="p-5 space-y-3">
            <h3 className="text-base font-bold text-navy">Alur Kerja Dropship Media Sosial</h3>
            <ol className="space-y-3 text-xs text-slate-600">
              {[
                ["1. Pilih & Edit Landing Page", "Buka tab 'Pilih & Edit Landing Page', pilih template terbaik, sesuaikan harga jual, teks, warna, & nomor WA Anda, lalu klik Tambahkan."],
                ["2. Unduh Konten Video & Slide Feed", "Ambil materi video Reels/TikTok, slide carousel, hook, dan caption yang sudah disediakan admin Pesanin untuk iklan atau posting organik."],
                ["3. Pesanan Masuk ke Pesanan Media Sosial", "Setiap order dari Landing Page otomatis tercatat di menu Pesanan Media Sosial (bukan marketplace)."],
                ["4. Pembeli Bayar, Gudang Pesanin Packing & Kirim", "Kami kirim paket atas nama brand Anda. Selisih harga jual dikurangi modal langsung jadi profit bersih Anda!"],
              ].map(([title, desc]) => (
                <li key={title} className="rounded-xl bg-slate-50/80 p-3">
                  <b className="block text-navy">{title}</b>
                  <p className="mt-0.5 leading-relaxed">{desc}</p>
                </li>
              ))}
            </ol>
          </Panel>
        </div>
      )}

      {/* TAB 2: KONTEN VIDEO */}
      {tab === "videos" && (
        <div className="grid gap-4 lg:grid-cols-2 xl:grid-cols-3">
          {product.videos.map((v) => (
            <Panel key={v.id} className="flex flex-col overflow-hidden">
              <div className="relative aspect-[16/10] bg-slate-900 overflow-hidden">
                {isVideoFile(v.video_url) ? (
                  <video src={v.video_url} poster={v.thumbnail || undefined} controls playsInline preload="metadata" className="h-full w-full object-contain" />
                ) : (
                  <>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    {v.thumbnail && <img src={v.thumbnail} alt={v.title} className="h-full w-full object-cover opacity-90" />}
                    <span className="absolute inset-0 flex items-center justify-center">
                      <span className="flex h-12 w-12 items-center justify-center rounded-full bg-white/90 text-navy shadow-lg">
                        <Play size={20} fill="currentColor" />
                      </span>
                    </span>
                  </>
                )}
                <span className="absolute left-3 top-3 rounded-md bg-slate-900/75 px-2 py-0.5 text-[10px] font-bold text-white">
                  {v.format}
                </span>
                <span className="absolute bottom-3 right-3 rounded-md bg-slate-900/75 px-2 py-0.5 text-[10px] font-bold text-white">
                  {v.duration}
                </span>
              </div>
              <div className="flex flex-1 flex-col p-4 space-y-3">
                <div>
                  <h4 className="font-bold text-navy">{v.title}</h4>
                  <div className="mt-1.5 flex flex-wrap gap-1">
                    {v.platforms.map((pl) => (
                      <span key={pl} className="rounded bg-violet-50 px-1.5 py-0.5 text-[10px] font-semibold text-violet-700">
                        {pl}
                      </span>
                    ))}
                  </div>
                </div>
                <div className="rounded-xl bg-amber-50/70 border border-amber-100 p-2.5 text-xs">
                  <b className="block text-[10px] uppercase tracking-wider text-amber-800">Hook 3 Detik Pertama</b>
                  <p className="mt-0.5 text-slate-700">&ldquo;{v.hook}&rdquo;</p>
                </div>
                <div className="flex-1 rounded-xl bg-slate-50 p-2.5 text-xs text-slate-600 whitespace-pre-line">
                  <b className="block text-[10px] uppercase tracking-wider text-slate-400 mb-1">Script / Alur Video</b>
                  {v.script}
                </div>
                <div className="flex gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => copyText(v.id, `${v.hook}\n\n${v.script}`)}
                    className="flex h-9 flex-1 items-center justify-center gap-1.5 rounded-lg border border-slate-200 bg-white text-xs font-semibold text-navy hover:bg-slate-50"
                  >
                    {copiedKey === v.id ? <Check size={13} className="text-emerald-600" /> : <Copy size={13} />}
                    {copiedKey === v.id ? "Script Disalin!" : "Salin Script"}
                  </button>
                  {v.video_url ? (
                    <a
                      href={v.video_url}
                      download
                      target="_blank"
                      rel="noreferrer"
                      className="flex h-9 flex-1 items-center justify-center gap-1.5 rounded-lg bg-navy text-xs font-semibold text-white hover:bg-slate-800"
                    >
                      <Download size={13} /> {isVideoFile(v.video_url) ? "Unduh Video" : "Buka Link Video"}
                    </a>
                  ) : (
                    <span className="flex h-9 flex-1 items-center justify-center rounded-lg bg-slate-100 text-xs font-semibold text-slate-400">Video belum tersedia</span>
                  )}
                </div>
              </div>
            </Panel>
          ))}
        </div>
      )}

      {/* TAB 3: KONTEN SLIDE & FEED */}
      {tab === "slides" && (
        <div className="space-y-4">
          {product.slides.map((pack) => {
            const curSlide = slideIndexes[pack.id] ?? 0;
            const totalSlides = pack.slides.length;
            const activeSlide = pack.slides[curSlide] ?? pack.slides[0];
            return (
              <Panel key={pack.id} className="p-5">
                <div className="grid gap-6 lg:grid-cols-[320px_1fr]">
                  {/* Interactive Carousel Preview */}
                  <div className="space-y-2.5">
                    <div className="relative overflow-hidden rounded-2xl border border-slate-200 bg-slate-50">
                      {activeSlide && (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={activeSlide.image} alt={activeSlide.label} className="aspect-square w-full object-cover" />
                      )}
                      {totalSlides > 1 && (
                        <>
                          <button
                            type="button"
                            onClick={() =>
                              setSlideIndexes({
                                ...slideIndexes,
                                [pack.id]: (curSlide - 1 + totalSlides) % totalSlides,
                              })
                            }
                            className="absolute left-2 top-1/2 -translate-y-1/2 flex h-8 w-8 items-center justify-center rounded-full bg-white/90 text-navy shadow hover:bg-white"
                          >
                            <ChevronLeft size={16} />
                          </button>
                          <button
                            type="button"
                            onClick={() =>
                              setSlideIndexes({
                                ...slideIndexes,
                                [pack.id]: (curSlide + 1) % totalSlides,
                              })
                            }
                            className="absolute right-2 top-1/2 -translate-y-1/2 flex h-8 w-8 items-center justify-center rounded-full bg-white/90 text-navy shadow hover:bg-white"
                          >
                            <ChevronRight size={16} />
                          </button>
                          <span className="absolute bottom-2.5 right-2.5 rounded-full bg-slate-900/75 px-2.5 py-0.5 text-[10px] font-bold text-white">
                            {curSlide + 1} / {totalSlides}
                          </span>
                        </>
                      )}
                    </div>
                    <div className="flex gap-1.5 overflow-x-auto">
                      {pack.slides.map((s, idx) => (
                        <button
                          key={s.id}
                          type="button"
                          onClick={() => setSlideIndexes({ ...slideIndexes, [pack.id]: idx })}
                          className={`h-14 w-14 shrink-0 overflow-hidden rounded-lg border-2 ${
                            curSlide === idx ? "border-brand-600" : "border-slate-200 opacity-70"
                          }`}
                        >
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img src={s.image} alt={s.label} className="h-full w-full object-cover" />
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Caption & Download */}
                  <div className="flex flex-col justify-between space-y-4">
                    <div className="space-y-3">
                      <div className="flex flex-wrap items-center gap-2">
                        <h4 className="text-base font-bold text-navy">{pack.title}</h4>
                        <span className="rounded bg-sky-50 px-2 py-0.5 text-[11px] font-bold text-sky-700">
                          {pack.format} · {totalSlides} Gambar
                        </span>
                      </div>
                      <div className="rounded-xl border border-slate-200/80 bg-slate-50/80 p-3.5 text-xs leading-relaxed text-slate-700 whitespace-pre-line">
                        {pack.copywriting}
                      </div>
                      <p className="font-mono text-xs text-brand-600">{pack.hashtags}</p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={() => copyText(pack.id, `${pack.copywriting}\n\n${pack.hashtags}`)}
                        className="flex h-10 items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 text-xs font-semibold text-navy hover:bg-slate-50"
                      >
                        {copiedKey === pack.id ? <Check size={14} className="text-emerald-600" /> : <Copy size={14} />}
                        {copiedKey === pack.id ? "Caption & Hashtag Disalin!" : "Salin Caption & Hashtag"}
                      </button>
                      <button
                        type="button"
                        disabled={zipping === pack.id || !totalSlides}
                        onClick={async () => {
                          setZipping(pack.id);
                          try {
                            await downloadSlidesZip(product.id, pack.id);
                          } catch (e) {
                            showToast(e instanceof Error ? e.message : "Gagal mengunduh slide.");
                          } finally {
                            setZipping("");
                          }
                        }}
                        className="flex h-10 items-center gap-2 rounded-lg bg-navy px-4 text-xs font-semibold text-white hover:bg-slate-800 disabled:opacity-60"
                      >
                        <Download size={14} /> {zipping === pack.id ? "Menyiapkan ZIP…" : `Unduh Semua Slide (${totalSlides})`}
                      </button>
                    </div>
                  </div>
                </div>
              </Panel>
            );
          })}
        </div>
      )}

      {/* TAB 4: PILIH & EDIT LANDING PAGE (EXISTING PESANIN PAGE BUILDER UI) */}
      {tab === "lp" && (
        <div className="space-y-5">
          {/* Step 1: Template Chooser */}
          <Panel className="p-5 space-y-3">
            <div>
              <h3 className="text-sm font-bold text-navy">1. Pilih Template Landing Page dari Admin Pesanin</h3>
              <p className="text-xs text-slate-500">
                Pilih template siap pakai di bawah, atur harga jual toko Anda, lalu klik <b>Edit with Builder</b> untuk mengubah komponen landing page dengan Pesanin Page Builder.
              </p>
            </div>
            <div className="grid gap-3 sm:grid-cols-3">
              {product.lp_templates.map((tpl) => {
                const active = selectedLpId === tpl.id;
                const headline = getTemplateHeadline(tpl.blocks);
                return (
                  <button
                    key={tpl.id}
                    type="button"
                    onClick={() => selectTemplate(tpl.id)}
                    className={`flex flex-col text-left rounded-xl border p-4 transition ${
                      active
                        ? "border-navy bg-slate-50 ring-1 ring-navy"
                        : "border-slate-200 bg-white hover:border-slate-300"
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2 w-full">
                      <span className="flex items-center gap-1.5">
                        <span
                          className="h-3 w-3 rounded-full"
                          style={{ backgroundColor: tpl.theme?.primary || "#e05510" }}
                        />
                        <span className="rounded border border-slate-200 bg-white px-1.5 py-0.5 text-[10px] font-semibold text-slate-600">
                          {tpl.badge}
                        </span>
                      </span>
                      <span className="text-[11px] font-semibold text-slate-500">{tpl.blocks.length} blok</span>
                    </div>
                    <b className="mt-2 text-xs text-navy">{tpl.name}</b>
                    {headline && <p className="mt-1 line-clamp-2 text-[11px] text-slate-500">{headline}</p>}
                  </button>
                );
              })}
            </div>
          </Panel>

          {/* Step 2: Store Pricing + Open Existing Page Builder + Live BlockView Preview */}
          <div className="grid gap-5 xl:grid-cols-[1fr_440px] items-start">
            <Panel className="p-5 space-y-5">
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-3">
                <div>
                  <h3 className="text-sm font-bold text-navy">2. Pengaturan Produk &amp; Landing Page Anda</h3>
                  <p className="text-xs text-slate-500">
                    Gunakan Pesanin Page Builder untuk mengedit teks, gambar, video, testimoni, warna, WhatsApp, dan Pixel iklan.
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setBuilderTab("settings")}
                    className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                  >
                    <Settings size={14} /> Page Settings
                  </button>
                  <button
                    type="button"
                    onClick={() => setBuilderTab("home")}
                    className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-navy px-4 text-xs font-semibold text-white hover:bg-slate-800"
                  >
                    <Pencil size={13} /> Edit with Builder
                  </button>
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Nama Produk di Toko Anda">
                  <input
                    className="input"
                    value={customName}
                    onChange={(e) => {
                      const val = e.target.value;
                      setCustomName(val);
                      setLpPage((prev) => (prev ? { ...prev, title: val || prev.title } : prev));
                    }}
                  />
                </Field>
                <Field label="Slug Link Landing Page">
                  <div className="flex items-center">
                    <span className="inline-flex h-10 items-center rounded-l-lg border border-r-0 border-slate-200 bg-slate-50 px-2.5 text-xs text-slate-400">
                      /p/
                    </span>
                    <input
                      className="input rounded-l-none font-mono text-xs"
                      value={slug}
                      onChange={(e) => {
                        const s = slugify(e.target.value);
                        setSlug(s);
                        setLpPage((prev) => (prev ? { ...prev, slug: s } : prev));
                      }}
                    />
                  </div>
                </Field>
                <Field label={`Harga Jual Anda (Min ${rupiah(product.min_price)})`}>
                  <MoneyInput value={sellingPrice} onChange={(v) => updateSellingPrice(v ?? 0)} />
                </Field>
                <Field label="Harga Coret (Normal)">
                  <MoneyInput value={comparePrice} onChange={(v) => updateComparePrice(v ?? 0)} />
                </Field>
              </div>

              {/* Metode Pembayaran (dropship: tanpa COD) */}
              <div className="space-y-2.5 rounded-xl border border-slate-200 bg-slate-50/50 p-4">
                <div>
                  <p className="text-xs font-bold text-navy">Metode Pembayaran</p>
                  <p className="text-[11px] text-slate-500">
                    Produk dropship <b>tidak bisa COD</b>: pembeli bayar dulu lewat transfer bank atau E-Payment (Midtrans) sebelum gudang Pesanin mengirim paket.
                  </p>
                </div>

                <div className="grid gap-2 sm:grid-cols-2">
                  {DROPSHIP_PAYMENT_OPTIONS.map((opt) => {
                    const checked = paymentMethods.includes(opt.key);
                    return (
                      <label
                        key={opt.key}
                        className={`flex cursor-pointer items-start gap-2 rounded-xl border p-3 text-xs transition ${
                          checked ? "border-navy bg-white ring-1 ring-navy" : "border-slate-200 bg-white hover:border-slate-300"
                        }`}
                      >
                        <input
                          type="checkbox"
                          className="mt-0.5 h-4 w-4 rounded"
                          checked={checked}
                          onChange={() => togglePaymentMethod(opt.key)}
                        />
                        <span className="min-w-0">
                          <span className="inline-block rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-bold text-slate-600">
                            {opt.group}
                          </span>
                          <b className="mt-1 block text-xs leading-snug text-navy">{opt.label}</b>
                        </span>
                      </label>
                    );
                  })}
                </div>
              </div>

              {/* Active Page Builder Summary */}
              {lpPage && (
                <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-4 space-y-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <p className="text-xs font-bold text-navy">{lpPage.title}</p>
                      <p className="text-[11px] text-slate-500">
                        {lpPage.blocks.length} komponen aktif · Canvas {lpPage.theme?.width === "wide" ? "Wide" : "Default"}
                        {lpPage.settings?.whatsapp ? ` · WA ${lpPage.settings.whatsapp}` : ""}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      {existingAdopted && (
                        <a
                          href={`/p/${existingAdopted.slug}`}
                          target="_blank"
                          className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 text-xs font-semibold text-brand-600 hover:bg-slate-50"
                        >
                          <ExternalLink size={13} /> Buka Halaman Live
                        </a>
                      )}
                      <button
                        type="button"
                        onClick={() => setBuilderTab("home")}
                        className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3.5 text-xs font-semibold text-navy hover:bg-slate-50"
                      >
                        <LayoutTemplate size={14} /> Buka Page Builder
                      </button>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {lpPage.blocks.map((b) => (
                      <span
                        key={b.id}
                        className="rounded-md border border-slate-200 bg-white px-2 py-0.5 text-[11px] font-medium capitalize text-slate-600"
                      >
                        {b.type}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Final Save CTA */}
              <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 pt-4">
                <div className="text-xs">
                  <span className="text-slate-500">Profit Anda per pesanan: </span>
                  <b className={estProfit > 0 ? "text-emerald-600 text-sm" : "text-rose-600 text-sm"}>
                    +{rupiah(estProfit)} ({marginPct}%)
                  </b>
                </div>
                <button
                  type="button"
                  disabled={saving}
                  onClick={() => saveToMyProducts()}
                  className="flex h-11 items-center gap-2 rounded-xl bg-brand-600 px-6 text-sm font-bold text-white shadow-sm hover:opacity-95 disabled:opacity-50"
                >
                  <CheckCircle2 size={17} />
                  {saving
                    ? "Menyimpan ke Database…"
                    : existingAdopted
                      ? "Simpan Perubahan Produk & LP"
                      : "Tambahkan ke Produk Media Sosial Saya"}
                </button>
              </div>
            </Panel>

            {/* Right: Live Preview using Existing BlockView */}
            <Panel className="p-4 space-y-3 xl:sticky xl:top-20">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <p className="text-xs font-bold text-navy">Live Preview Landing Page</p>
                  <p className="font-mono text-[11px] text-slate-400">/p/{slug || "produk-dropship"}</p>
                </div>
                <div className="flex items-center gap-1.5">
                  <div className="inline-flex rounded-lg border border-slate-200 bg-white p-0.5">
                    <button
                      type="button"
                      onClick={() => setPreviewDevice("mobile")}
                      className={`flex items-center gap-1 rounded-md px-2 py-1 text-[11px] font-semibold ${
                        previewDevice === "mobile" ? "bg-slate-900 text-white" : "text-slate-500"
                      }`}
                    >
                      <Smartphone size={12} /> HP
                    </button>
                    <button
                      type="button"
                      onClick={() => setPreviewDevice("desktop")}
                      className={`flex items-center gap-1 rounded-md px-2 py-1 text-[11px] font-semibold ${
                        previewDevice === "desktop" ? "bg-slate-900 text-white" : "text-slate-500"
                      }`}
                    >
                      <Monitor size={12} /> Web
                    </button>
                  </div>
                  <button
                    type="button"
                    onClick={() => setBuilderTab("home")}
                    className="inline-flex h-7 items-center gap-1 rounded-lg bg-brand-600 px-2.5 text-[11px] font-semibold text-white"
                  >
                    <Pencil size={11} /> Edit
                  </button>
                </div>
              </div>

              <div className="flex justify-center rounded-xl border border-slate-200 bg-slate-100/80 p-3">
                <div
                  className={`max-h-[620px] w-full overflow-y-auto rounded-xl border border-slate-200 shadow-sm ${
                    previewDevice === "mobile" ? "max-w-[360px]" : "max-w-full"
                  }`}
                  style={{ background: lpPage?.theme?.background ?? "#ffffff" }}
                >
                  <div className="space-y-4 px-4 py-6 text-slate-700 [&_a]:pointer-events-none">
                    {(lpPage?.blocks ?? []).map((b) => (
                      <BlockView
                        key={b.id}
                        block={b}
                        color={lpPage?.theme?.primary || "#e05510"}
                        checkout={previewCtx.checkout}
                        whatsapp={lpPage?.settings?.whatsapp || profile?.whatsapp}
                        preview
                      />
                    ))}
                  </div>
                </div>
              </div>
            </Panel>
          </div>
        </div>
      )}

      {/* Existing Fullscreen Pesanin Page Builder */}
      {builderTab !== null && lpPage && (
        <div className="fixed inset-0 z-50">
          <LandingPageBuilder
            key={`${selectedLpId}-${builderTab}`}
            initialPage={lpPage}
            products={previewCtx.products}
            initialCheckout={previewCtx.checkout}
            backLabel="Kembali ke Produk Dropship"
            subtitle="Page Builder"
            initialTab={builderTab}
            onBack={() => setBuilderTab(null)}
            previewHref={existingAdopted ? `/p/${existingAdopted.slug}?preview=1` : undefined}
            onSave={async (savedPage) => {
              setLpPage(savedPage);
              setSlug(savedPage.slug);
              if (savedPage.title) setCustomName(savedPage.title);
              if (profile?.registered && !belowMin) {
                const persisted = await saveToMyProducts(savedPage);
                if (persisted) return persisted;
              }
              return savedPage;
            }}
          />
        </div>
      )}
    </div>
  );
}
