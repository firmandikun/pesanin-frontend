"use client";

import {
  ArrowLeft,
  Boxes,
  Check,
  Copy,
  Film,
  ImagePlus,
  Images,
  LayoutTemplate,
  Monitor,
  MonitorDown,
  Package,
  Pencil,
  Play,
  Plus,
  PlusCircle,
  Save,
  Send,
  Settings,
  Smartphone,
  Trash2,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { use, useEffect, useMemo, useState } from "react";
import { Panel } from "@/components/kit";
import { BlockView } from "@/components/landing/BlockRenderer";
import { CreatePageModal, CreatePageValues } from "@/components/landing/CreatePageModal";
import { LandingPageBuilder } from "@/components/landing/LandingPageBuilder";
import { Select } from "@/components/Select";
import { Field, MoneyInput, Toggle } from "@/components/ui";
import { ApiError, rupiah } from "@/lib/api";
import {
  DROPSHIP_CATEGORIES,
  DROPSHIP_PAYMENT_OPTIONS,
  DropshipLpTemplate,
  DropshipPaymentMethod,
  DropshipProduct,
  DropshipProductType,
  DropshipSlideAsset,
  DropshipVideoAsset,
  SAMPLE_PRODUCT_IMAGES,
  buildStarterDropshipBlocks,
  createAdminDropshipProduct,
  fetchAdminDropshipProduct,
  getTemplateHeadline,
  lpTemplateToLandingPage,
  makeDropshipCheckoutPreview,
  normalizePaymentMethods,
  updateAdminDropshipProduct,
} from "@/lib/dropship";

const PLATFORMS = ["TikTok", "Instagram Reels", "Instagram Feed", "FB Ads", "WhatsApp Status"];

function blankProduct(): DropshipProduct {
  const defaultImg = SAMPLE_PRODUCT_IMAGES[0];
  const base: DropshipProduct = {
    id: 0,
    sku: `PSN-DS-${String(Math.floor(100 + Math.random() * 899))}`,
    product_type: "physical",
    name: "",
    category: "Rumah Tangga",
    status: "draft",
    description: "",
    images: [defaultImg],
    weight_gram: 300,
    stock: 200,
    warehouse_city: "Jakarta Barat",
    digital_format: "",
    digital_access_url: "",
    digital_license: "Reseller / Hak Jual Kembali",
    wholesale_price: 45000,
    min_price: 89000,
    suggested_price: 119000,
    compare_price: 179000,
    payment_methods: ["cod", "bank_transfer", "epayment"],
    variants: [{ id: "v1", name: "Standar", sku: "PSN-DS-STD", stock: 200, wholesale_price: 45000 }],
    videos: [],
    slides: [],
    lp_templates: [],
    adopters_count: 0,
    sold_30d: 0,
    created_at: new Date().toISOString().slice(0, 10),
  };
  base.lp_templates = [
    {
      id: `lp-${Date.now().toString(36)}`,
      name: "Template Konversi Cepat",
      badge: "Best Converter",
      template_key: "product_fisik",
      conversionRate: "4.5% CVR",
      theme: { primary: "#e05510", background: "#ffffff", width: "narrow" },
      seo: { title: "Template Konversi Cepat", description: "" },
      settings: { floating_whatsapp: true, whatsapp: "", facebook_pixel: "", tiktok_pixel: "" },
      blocks: buildStarterDropshipBlocks("product_fisik", base),
    },
  ];
  return base;
}

export default function AdminDropshipEditor({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const isNew = id === "new";

  const [tab, setTab] = useState<"info" | "videos" | "slides" | "lp">("info");
  const [form, setForm] = useState<DropshipProduct>(blankProduct);
  const [loading, setLoading] = useState(!isNew);
  const [saving, setSaving] = useState(false);
  const [activeLpIdx, setActiveLpIdx] = useState(0);
  const [previewDevice, setPreviewDevice] = useState<"mobile" | "desktop">("mobile");
  const [createLpOpen, setCreateLpOpen] = useState(false);
  const [builderState, setBuilderState] = useState<{ idx: number; tab: "home" | "settings" } | null>(null);
  const [newImgUrl, setNewImgUrl] = useState("");
  const [savedMsg, setSavedMsg] = useState("");
  const [errMsg, setErrMsg] = useState("");

  useEffect(() => {
    if (isNew) {
      setLoading(false);
      return;
    }
    setLoading(true);
    fetchAdminDropshipProduct(id)
      .then((found) => {
        setForm({
          ...found,
          payment_methods: normalizePaymentMethods(found.payment_methods),
        });
      })
      .catch((e) => setErrMsg(e instanceof ApiError ? e.message : "Produk dropship tidak ditemukan."))
      .finally(() => setLoading(false));
  }, [id, isNew]);

  const previewCtx = useMemo(
    () =>
      makeDropshipCheckoutPreview(form, {
        customName: form.name || "Produk Dropship",
        sellingPrice: form.suggested_price || 99000,
        comparePrice: form.compare_price,
        brandName: "Toko Dropshipper Anda",
        paymentMethods: form.payment_methods,
      }),
    [form],
  );

  const estProfit = Math.max(0, (form.suggested_price || 0) - (form.wholesale_price || 0));
  const marginPct = form.suggested_price ? Math.round((estProfit / form.suggested_price) * 100) : 0;

  const togglePaymentMethod = (method: DropshipPaymentMethod) => {
    const cur = normalizePaymentMethods(form.payment_methods);
    const exists = cur.includes(method);
    if (exists && cur.length === 1) return; // keep at least 1 payment method active
    const next = exists ? cur.filter((m) => m !== method) : [...cur, method];
    setForm({ ...form, payment_methods: next });
  };

  const save = async (publishStatus: "active" | "draft") => {
    if (!form.name.trim()) {
      setErrMsg("Nama produk wajib diisi sebelum menyimpan.");
      setTab("info");
      return;
    }
    setErrMsg("");
    setSaving(true);
    try {
      const payload = {
        sku: form.sku,
        product_type: form.product_type,
        name: form.name.trim(),
        category: form.category,
        status: publishStatus,
        featured: !!form.featured,
        description: form.description,
        images: form.images,
        weight_gram: form.weight_gram,
        stock: form.stock,
        warehouse_city: form.warehouse_city,
        digital_format: form.digital_format,
        digital_access_url: form.digital_access_url,
        digital_license: form.digital_license,
        wholesale_price: form.wholesale_price,
        min_price: form.min_price,
        suggested_price: form.suggested_price,
        compare_price: form.compare_price,
        payment_methods: normalizePaymentMethods(form.payment_methods),
        variants: form.variants,
        videos: form.videos,
        slides: form.slides,
        lp_templates: form.lp_templates,
        sold_30d: form.sold_30d,
      };
      const saved = isNew
        ? await createAdminDropshipProduct(payload)
        : await updateAdminDropshipProduct(form.id || id, payload);
      setForm({ ...saved, payment_methods: normalizePaymentMethods(saved.payment_methods) });
      setSavedMsg(
        publishStatus === "active"
          ? "Produk berhasil disimpan ke database & ditayangkan ke katalog dropshipper!"
          : "Draf produk dropship berhasil disimpan ke database.",
      );
      setTimeout(() => setSavedMsg(""), 3500);
      if (isNew) {
        router.replace(`/admin/dropship/${saved.id}`);
      }
    } catch (e) {
      setErrMsg(e instanceof ApiError ? Object.values(e.errors)[0]?.[0] ?? e.message : "Gagal menyimpan produk.");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <p className="py-24 text-center text-sm text-slate-400">Memuat data produk dropship…</p>;
  }

  const isDigital = form.product_type === "digital";

  const switchProductType = (nextType: DropshipProductType) => {
    if (nextType === form.product_type) return;
    const isNowDigital = nextType === "digital";
    const nextDefaultImg = isNowDigital ? SAMPLE_PRODUCT_IMAGES[4] : SAMPLE_PRODUCT_IMAGES[0];
    const shouldSwapImg =
      isNew &&
      form.images.length === 1 &&
      (form.images[0] === SAMPLE_PRODUCT_IMAGES[0] || form.images[0] === SAMPLE_PRODUCT_IMAGES[4]);

    const nextImages = shouldSwapImg ? [nextDefaultImg] : form.images;
    const nextForm: DropshipProduct = {
      ...form,
      product_type: nextType,
      category:
        isNowDigital && form.category === "Rumah Tangga"
          ? "Template & Desain Digital"
          : !isNowDigital && (form.category === "Template & Desain Digital" || form.category === "E-Book & Kelas Online")
            ? "Rumah Tangga"
            : form.category,
      images: nextImages,
      weight_gram: isNowDigital ? 0 : form.weight_gram || 300,
      stock: isNowDigital ? 9999 : form.stock === 9999 ? 200 : form.stock,
      warehouse_city: isNowDigital ? "Kirim Otomatis" : form.warehouse_city === "Kirim Otomatis" ? "Jakarta Barat" : form.warehouse_city,
      digital_format: isNowDigital ? form.digital_format || "Link Canva + File PDF & Video Panduan" : form.digital_format,
      digital_license: isNowDigital ? form.digital_license || "Reseller / Hak Jual Kembali" : form.digital_license,
    };
    if (isNew && nextForm.lp_templates.length === 1) {
      nextForm.lp_templates = [
        {
          ...nextForm.lp_templates[0],
          blocks: buildStarterDropshipBlocks(nextForm.lp_templates[0].template_key || "product_fisik", nextForm),
        },
      ];
    }
    setForm(nextForm);
  };

  /* ── Video helpers ─────────────────────────────────────── */
  const addVideo = () => {
    const idx = form.videos.length + 1;
    const thumb = form.images[0] || SAMPLE_PRODUCT_IMAGES[isDigital ? 4 : 0];
    const item: DropshipVideoAsset = {
      id: `vid-${Date.now().toString(36)}`,
      title: `Konten Video #${idx} — Hook Problem & Demo`,
      format: "9:16 Reels/TikTok",
      duration: "0:30",
      thumbnail: thumb,
      video_url: "",
      hook: "Tulis kalimat pembuka 3 detik pertama yang menghentikan scroll audiens…",
      script: isDigital
        ? "[0-3s] Hook masalah\n[3-15s] Preview isi produk digital\n[15-25s] Manfaat & bonus\n[25-30s] CTA klik link bio — akses kirim otomatis via WA & Email"
        : "[0-3s] Hook masalah\n[3-15s] Demo produk\n[15-25s] Bukti & keunggulan\n[25-30s] CTA klik link bio / bisa COD",
      platforms: ["TikTok", "Instagram Reels", "FB Ads"],
    };
    setForm({ ...form, videos: [...form.videos, item] });
  };

  const updateVideo = (idx: number, patch: Partial<DropshipVideoAsset>) => {
    const videos = form.videos.map((v, i) => (i === idx ? { ...v, ...patch } : v));
    setForm({ ...form, videos });
  };

  const removeVideo = (idx: number) => {
    setForm({ ...form, videos: form.videos.filter((_, i) => i !== idx) });
  };

  /* ── Slide / Feed helpers ──────────────────────────────── */
  const addSlidePack = () => {
    const idx = form.slides.length + 1;
    const fallbackPool = isDigital ? SAMPLE_PRODUCT_IMAGES.slice(4) : SAMPLE_PRODUCT_IMAGES.slice(0, 4);
    const img1 = form.images[0] || fallbackPool[0] || SAMPLE_PRODUCT_IMAGES[0];
    const img2 = form.images[1] || fallbackPool[1] || img1;
    const pack: DropshipSlideAsset = {
      id: `sl-${Date.now().toString(36)}`,
      title: `Paket Carousel / Feed #${idx}`,
      format: "Carousel 4:5",
      slides: [
        { id: `s-${Date.now()}-1`, image: img1, label: "Cover Hook" },
        { id: `s-${Date.now()}-2`, image: img2, label: "CTA & Promo" },
      ],
      copywriting: isDigital
        ? `Mau lebih hemat waktu pakai ${form.name || "produk digital siap pakai"}?\n\n✅ Akses instan kirim otomatis ke WA & Email\n✅ Sekali bayar, akses selamanya\n\nKlik link di bio untuk miliki sekarang! 👇`
        : `Lagi cari ${form.name || "produk praktis"} dengan harga terjangkau?\n\n✅ Kualitas terjamin\n✅ Bisa bayar di tempat (COD)\n\nKlik link di bio untuk pesan sekarang! 👇`,
      hashtags: isDigital ? "#produkdigital #templatecanva #bisnisonline" : "#promohariini #produkviral #codseluruhindonesia",
    };
    setForm({ ...form, slides: [...form.slides, pack] });
  };

  const updateSlidePack = (idx: number, patch: Partial<DropshipSlideAsset>) => {
    const slides = form.slides.map((s, i) => (i === idx ? { ...s, ...patch } : s));
    setForm({ ...form, slides });
  };

  const removeSlidePack = (idx: number) => {
    setForm({ ...form, slides: form.slides.filter((_, i) => i !== idx) });
  };

  /* ── Landing Page Template helpers (existing Page Builder) ── */
  const createLpFromModal = (values: CreatePageValues) => {
    const tpl: DropshipLpTemplate = {
      id: `lp-${Date.now().toString(36)}`,
      name: values.title.trim(),
      badge: "Siap Pakai",
      template_key: values.template,
      conversionRate: "4.5% CVR",
      theme: {
        primary: "#e05510",
        background: "#ffffff",
        width: values.preview === "desktop" ? "wide" : "narrow",
      },
      seo: { title: values.title.trim(), description: form.description || "" },
      settings: { floating_whatsapp: true, whatsapp: "", facebook_pixel: "", tiktok_pixel: "" },
      blocks: buildStarterDropshipBlocks(values.template, form),
    };
    const next = [...form.lp_templates, tpl];
    setForm({ ...form, lp_templates: next });
    const newIdx = next.length - 1;
    setActiveLpIdx(newIdx);
    setCreateLpOpen(false);
    setBuilderState({ idx: newIdx, tab: "home" });
  };

  const duplicateLp = (idx: number) => {
    const src = form.lp_templates[idx];
    if (!src) return;
    const copy: DropshipLpTemplate = {
      ...structuredClone(src),
      id: `lp-${Date.now().toString(36)}`,
      name: `${src.name} (Salinan)`,
    };
    const next = [...form.lp_templates.slice(0, idx + 1), copy, ...form.lp_templates.slice(idx + 1)];
    setForm({ ...form, lp_templates: next });
    setActiveLpIdx(idx + 1);
  };

  const removeLp = (idx: number) => {
    const next = form.lp_templates.filter((_, i) => i !== idx);
    setForm({ ...form, lp_templates: next });
    setActiveLpIdx(Math.max(0, Math.min(activeLpIdx, next.length - 1)));
  };

  const activeLp = form.lp_templates[activeLpIdx] ?? null;
  const builderLp = builderState !== null ? form.lp_templates[builderState.idx] ?? null : null;

  return (
    <div className="space-y-5">
      {/* Sticky Top Action Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Link
            href="/admin/dropship"
            className="flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
          >
            <ArrowLeft size={18} />
          </Link>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-xl font-extrabold text-slate-900">
                {isNew ? "Tambah Produk Dropship" : form.name || "Edit Produk Dropship"}
              </h1>
              <span
                className={`inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[11px] font-bold ${
                  isDigital
                    ? "bg-slate-900 text-white"
                    : "border border-slate-200 bg-white text-slate-700"
                }`}
              >
                {isDigital ? <MonitorDown size={11} /> : <Package size={11} />}
                {isDigital ? "Produk Digital" : "Produk Fisik"}
              </span>
              <span
                className={`rounded-md px-2 py-0.5 text-[11px] font-bold ${
                  form.status === "active" ? "bg-emerald-50 text-emerald-700" : "bg-slate-200 text-slate-600"
                }`}
              >
                {form.status === "active" ? "Tayang" : "Draf"}
              </span>
            </div>
            <p className="text-xs text-slate-500">
              Lengkapi info produk, aset video, slide feed, dan pilihan template landing page siap pakai untuk dropshipper.
            </p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            disabled={saving}
            onClick={() => save("draft")}
            className="flex h-10 items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50"
          >
            <Save size={15} /> {saving ? "Menyimpan…" : "Simpan Draf"}
          </button>
          <button
            type="button"
            disabled={saving}
            onClick={() => save("active")}
            className="flex h-10 items-center gap-2 rounded-lg bg-brand-600 px-5 text-sm font-semibold text-white hover:opacity-95 disabled:opacity-50"
          >
            <Send size={15} /> {saving ? "Menyimpan…" : "Simpan & Tayangkan"}
          </button>
        </div>
      </div>

      {savedMsg && (
        <div className="flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-800">
          <Check size={16} /> {savedMsg}
        </div>
      )}
      {errMsg && (
        <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-700">
          {errMsg}
        </div>
      )}

      {/* 4 Builder Tabs */}
      <Panel className="p-2">
        <div className="grid gap-1.5 sm:grid-cols-4">
          {(
            [
              ["info", "1. Info Produk & Harga", Package, null],
              ["videos", "2. Konten Video", Film, form.videos.length],
              ["slides", "3. Konten Slide & Feed", Images, form.slides.length],
              ["lp", "4. Pilihan Landing Page", LayoutTemplate, form.lp_templates.length],
            ] as const
          ).map(([key, label, Icon, count]) => {
            const active = tab === key;
            return (
              <button
                key={key}
                type="button"
                onClick={() => setTab(key)}
                className={`flex items-center justify-center gap-2 rounded-xl px-3.5 py-2.5 text-sm font-semibold transition ${
                  active ? "bg-slate-900 text-white shadow-sm" : "text-slate-600 hover:bg-slate-100"
                }`}
              >
                <Icon size={16} />
                <span>{label}</span>
                {count !== null && (
                  <span
                    className={`rounded-full px-1.5 py-0.5 text-[10px] font-bold ${
                      active ? "bg-white/20 text-white" : "bg-slate-100 text-slate-600"
                    }`}
                  >
                    {count}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </Panel>

      {/* TAB 1: INFO PRODUK & HARGA */}
      {tab === "info" && (
        <div className="grid gap-5 lg:grid-cols-[1fr_360px]">
          <div className="space-y-5">
            <Panel className="p-5 space-y-4">
              <h2 className="text-base font-bold text-slate-900">Informasi Utama Produk</h2>

              {/* Tipe Produk: Fisik vs Digital */}
              <div className="space-y-1.5">
                <label className="label mb-0">Tipe Produk Dropship *</label>
                <div className="grid gap-3 sm:grid-cols-2">
                  <button
                    type="button"
                    onClick={() => switchProductType("physical")}
                    className={`flex items-start gap-3 rounded-xl border p-3.5 text-left transition ${
                      !isDigital
                        ? "border-slate-900 bg-slate-50/80 ring-1 ring-slate-900"
                        : "border-slate-200 bg-white hover:border-slate-300"
                    }`}
                  >
                    <span
                      className={`mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${
                        !isDigital ? "bg-slate-900 text-white" : "border border-slate-200 bg-slate-50 text-slate-600"
                      }`}
                    >
                      <Package size={17} />
                    </span>
                    <div>
                      <b className="block text-sm text-slate-900">Produk Fisik</b>
                      <p className="mt-0.5 text-xs text-slate-500">
                        Stok di gudang Pesanin, packing atas nama toko dropshipper &amp; support COD.
                      </p>
                    </div>
                  </button>
                  <button
                    type="button"
                    onClick={() => switchProductType("digital")}
                    className={`flex items-start gap-3 rounded-xl border p-3.5 text-left transition ${
                      isDigital
                        ? "border-slate-900 bg-slate-50/80 ring-1 ring-slate-900"
                        : "border-slate-200 bg-white hover:border-slate-300"
                    }`}
                  >
                    <span
                      className={`mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${
                        isDigital ? "bg-slate-900 text-white" : "border border-slate-200 bg-slate-50 text-slate-600"
                      }`}
                    >
                      <MonitorDown size={17} />
                    </span>
                    <div>
                      <b className="block text-sm text-slate-900">Produk Digital</b>
                      <p className="mt-0.5 text-xs text-slate-500">
                        Template, e-book, kelas online, atau file digital — terkirim otomatis via WA &amp; Email.
                      </p>
                    </div>
                  </button>
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="sm:col-span-2">
                  <Field label="Nama Produk Dropship *">
                    <input
                      className="input"
                      placeholder={
                        isDigital
                          ? "Contoh: Bundle 1.500+ Template Canva Feed & Reels Bisnis UMKM"
                          : "Contoh: Blender Portable USB 6 Mata Pisau (Juicer Mini)"
                      }
                      value={form.name}
                      onChange={(e) => setForm({ ...form, name: e.target.value })}
                    />
                  </Field>
                </div>
                <Field label="SKU Induk">
                  <input
                    className="input font-mono"
                    value={form.sku}
                    onChange={(e) => setForm({ ...form, sku: e.target.value })}
                  />
                </Field>
                <Field label="Kategori">
                  <Select
                    className="input"
                    value={form.category}
                    onChange={(e) => setForm({ ...form, category: e.target.value })}
                  >
                    {DROPSHIP_CATEGORIES.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </Select>
                </Field>

                {isDigital ? (
                  <>
                    <Field label="Format File / Akses Produk">
                      <input
                        className="input"
                        placeholder="Link Canva + File PDF & Video Panduan"
                        value={form.digital_format ?? ""}
                        onChange={(e) => setForm({ ...form, digital_format: e.target.value })}
                      />
                    </Field>
                    <Field label="Lisensi Dropshipper">
                      <Select
                        className="input"
                        value={form.digital_license || "Reseller / Hak Jual Kembali"}
                        onChange={(e) => setForm({ ...form, digital_license: e.target.value })}
                      >
                        <option value="Reseller / Hak Jual Kembali">Reseller / Hak Jual Kembali</option>
                        <option value="PLR (Private Label Rights)">PLR (Private Label Rights)</option>
                        <option value="Akses Member Resmi">Akses Member Resmi</option>
                      </Select>
                    </Field>
                    <div className="sm:col-span-2">
                      <Field
                        label="Link File / Portal Akses Produk Digital"
                        hint="Otomatis dikirim ke WhatsApp & Email pembeli setelah pesanan lunas."
                      >
                        <input
                          className="input font-mono text-xs"
                          placeholder="https://member.pesanin.id/akses/nama-produk"
                          value={form.digital_access_url ?? ""}
                          onChange={(e) => setForm({ ...form, digital_access_url: e.target.value })}
                        />
                      </Field>
                    </div>
                  </>
                ) : (
                  <>
                    <Field label="Kota Gudang Pengiriman">
                      <input
                        className="input"
                        placeholder="Jakarta Barat"
                        value={form.warehouse_city}
                        onChange={(e) => setForm({ ...form, warehouse_city: e.target.value })}
                      />
                    </Field>
                    <div className="grid grid-cols-2 gap-3">
                      <Field label="Berat (gram)">
                        <input
                          type="number"
                          className="input"
                          value={form.weight_gram}
                          onChange={(e) => setForm({ ...form, weight_gram: Number(e.target.value) || 0 })}
                        />
                      </Field>
                      <Field label="Stok Gudang">
                        <input
                          type="number"
                          className="input"
                          value={form.stock}
                          onChange={(e) => setForm({ ...form, stock: Number(e.target.value) || 0 })}
                        />
                      </Field>
                    </div>
                  </>
                )}

                <div className="sm:col-span-2">
                  <Field label="Deskripsi & Keunggulan Produk">
                    <textarea
                      rows={4}
                      className="input h-auto py-2.5"
                      placeholder={
                        isDigital
                          ? "Jelaskan isi file/materi, bonus yang didapat, dan alasan produk digital ini mudah dijual di media sosial…"
                          : "Jelaskan spesifikasi, manfaat, dan alasan produk ini laris dijual di media sosial…"
                      }
                      value={form.description}
                      onChange={(e) => setForm({ ...form, description: e.target.value })}
                    />
                  </Field>
                </div>
              </div>
            </Panel>

            {/* Galeri Foto Produk */}
            <Panel className="p-5 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-base font-bold text-slate-900">Foto Produk</h2>
                  <p className="text-xs text-slate-500">Digunakan di katalog dropshipper dan default gambar landing page.</p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                {form.images.map((img, i) => (
                  <div key={i} className="group relative overflow-hidden rounded-xl border border-slate-200 bg-slate-50">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={img} alt="" className="aspect-square w-full object-cover" />
                    {i === 0 && (
                      <span className="absolute left-2 top-2 rounded bg-slate-900/80 px-1.5 py-0.5 text-[10px] font-bold text-white">
                        Utama
                      </span>
                    )}
                    <button
                      type="button"
                      onClick={() => setForm({ ...form, images: form.images.filter((_, idx) => idx !== i) })}
                      className="absolute right-2 top-2 rounded-lg bg-white/90 p-1.5 text-rose-600 opacity-0 shadow transition group-hover:opacity-100"
                      title="Hapus foto"
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                ))}
                <button
                  type="button"
                  onClick={() => {
                    const unused = SAMPLE_PRODUCT_IMAGES.find((img) => !form.images.includes(img));
                    const nextImg = unused || SAMPLE_PRODUCT_IMAGES[form.images.length % SAMPLE_PRODUCT_IMAGES.length];
                    setForm({ ...form, images: [...form.images, nextImg] });
                  }}
                  className="flex aspect-square flex-col items-center justify-center gap-1.5 rounded-xl border-2 border-dashed border-slate-200 text-xs font-semibold text-slate-500 hover:border-brand-400 hover:bg-brand-50/40 hover:text-brand-600"
                >
                  <ImagePlus size={20} />
                  <span>+ Tambah Foto</span>
                </button>
              </div>
              <div className="flex gap-2">
                <input
                  className="input flex-1"
                  placeholder="Atau tempel URL foto produk (https://…)"
                  value={newImgUrl}
                  onChange={(e) => setNewImgUrl(e.target.value)}
                />
                <button
                  type="button"
                  onClick={() => {
                    if (!newImgUrl.trim()) return;
                    setForm({ ...form, images: [...form.images, newImgUrl.trim()] });
                    setNewImgUrl("");
                  }}
                  className="rounded-lg border border-slate-200 bg-white px-4 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                >
                  Tambah URL
                </button>
              </div>
            </Panel>

            {/* Varian Produk */}
            <Panel className="p-5 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-base font-bold text-slate-900">
                    {isDigital ? "Paket / Lisensi Digital" : "Varian Produk"}
                  </h2>
                  <p className="text-xs text-slate-500">
                    {isDigital
                      ? "Opsional jika produk digital memiliki tingkatan paket (misal: Personal, Paket Pro + Bonus)."
                      : "Opsional jika produk punya pilihan warna, ukuran, atau paket bundling."}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() =>
                    setForm({
                      ...form,
                      variants: [
                        ...form.variants,
                        {
                          id: `v-${Date.now().toString(36)}`,
                          name: isDigital ? `Paket ${form.variants.length + 1}` : `Varian ${form.variants.length + 1}`,
                          sku: `${form.sku}-V${form.variants.length + 1}`,
                          stock: isDigital ? 9999 : 100,
                          wholesale_price: form.wholesale_price,
                        },
                      ],
                    })
                  }
                  className="flex h-8 items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                >
                  <Plus size={14} /> {isDigital ? "Tambah Paket" : "Tambah Varian"}
                </button>
              </div>
              <div className="space-y-2.5">
                {form.variants.map((v, idx) => (
                  <div
                    key={v.id}
                    className={`grid gap-2 rounded-xl border border-slate-200/80 bg-slate-50/50 p-3 items-end ${
                      isDigital ? "sm:grid-cols-[1.6fr_1fr_1fr_36px]" : "sm:grid-cols-[1.5fr_1fr_1fr_90px_36px]"
                    }`}
                  >
                    <Field label={isDigital ? "Nama Paket" : "Nama Varian"}>
                      <input
                        className="input h-9 text-xs"
                        value={v.name}
                        onChange={(e) => {
                          const variants = form.variants.map((x, i) => (i === idx ? { ...x, name: e.target.value } : x));
                          setForm({ ...form, variants });
                        }}
                      />
                    </Field>
                    <Field label={isDigital ? "Kode Paket" : "SKU Varian"}>
                      <input
                        className="input h-9 font-mono text-xs"
                        value={v.sku}
                        onChange={(e) => {
                          const variants = form.variants.map((x, i) => (i === idx ? { ...x, sku: e.target.value } : x));
                          setForm({ ...form, variants });
                        }}
                      />
                    </Field>
                    <Field label="Modal (Rp)">
                      <input
                        type="number"
                        className="input h-9 text-xs"
                        value={v.wholesale_price}
                        onChange={(e) => {
                          const variants = form.variants.map((x, i) => (i === idx ? { ...x, wholesale_price: Number(e.target.value) || 0 } : x));
                          setForm({ ...form, variants });
                        }}
                      />
                    </Field>
                    {!isDigital && (
                      <Field label="Stok">
                        <input
                          type="number"
                          className="input h-9 text-xs"
                          value={v.stock}
                          onChange={(e) => {
                            const variants = form.variants.map((x, i) => (i === idx ? { ...x, stock: Number(e.target.value) || 0 } : x));
                            setForm({ ...form, variants });
                          }}
                        />
                      </Field>
                    )}
                    <button
                      type="button"
                      onClick={() => setForm({ ...form, variants: form.variants.filter((_, i) => i !== idx) })}
                      className="flex h-9 w-9 items-center justify-center rounded-lg text-rose-500 hover:bg-rose-50"
                      title={isDigital ? "Hapus paket" : "Hapus varian"}
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>
                ))}
              </div>
            </Panel>
          </div>

          {/* Right Column: Pricing & Profit Calculator */}
          <div className="space-y-5">
            <Panel className="p-5 space-y-4">
              <h2 className="text-base font-bold text-slate-900">Pengaturan Harga Dropship</h2>
              <Field label="Harga Modal Dropshipper *" hint="Harga yang ditagihkan ke dropshipper per pesanan.">
                <MoneyInput value={form.wholesale_price} onChange={(v) => setForm({ ...form, wholesale_price: v ?? 0 })} />
              </Field>
              <Field label="Batas Harga Jual Minimum" hint="Mencegah perang harga antar dropshipper.">
                <MoneyInput value={form.min_price} onChange={(v) => setForm({ ...form, min_price: v ?? 0 })} />
              </Field>
              <Field label="Saran Harga Jual (Media Sosial)" hint="Harga rekomendasi yang tampil default saat user mengadopsi.">
                <MoneyInput value={form.suggested_price} onChange={(v) => setForm({ ...form, suggested_price: v ?? 0 })} />
              </Field>
              <Field label="Harga Coret (Normal)">
                <MoneyInput value={form.compare_price} onChange={(v) => setForm({ ...form, compare_price: v ?? 0 })} />
              </Field>

              <div className="rounded-xl border border-emerald-200 bg-emerald-50/70 p-4 space-y-1.5">
                <p className="text-[11px] font-bold uppercase tracking-wider text-emerald-700">
                  Simulasi Profit Dropshipper
                </p>
                <div className="flex items-baseline justify-between">
                  <span className="text-2xl font-black text-emerald-700">+{rupiah(estProfit)}</span>
                  <span className="rounded-full bg-emerald-600 px-2 py-0.5 text-xs font-bold text-white">
                    Margin {marginPct}%
                  </span>
                </div>
                <p className="text-[11px] text-emerald-800/80">
                  {isDigital
                    ? `Per penjualan di harga saran (${rupiah(form.suggested_price)}). Tanpa biaya stok & ongkir, margin lebih tinggi untuk iklan!`
                    : `Per pcs terjual di harga saran (${rupiah(form.suggested_price)}). Cukup lega untuk budget iklan FB/TikTok Ads!`}
                </p>
              </div>

              <div className="border-t border-slate-100 pt-3 space-y-2.5">
                <p className="text-xs font-bold text-slate-800">Metode Pemesanan (COD / Reguler)</p>
                <p className="text-[11px] text-slate-500">
                  Pilih metode pembayaran yang tersedia di Formulir Pemesanan Landing Page (minimal 1 aktif).
                </p>
                <div className="space-y-2">
                  {DROPSHIP_PAYMENT_OPTIONS.map((opt) => {
                    const checked = (form.payment_methods ?? []).includes(opt.key);
                    return (
                      <label
                        key={opt.key}
                        className={`flex cursor-pointer items-start gap-2.5 rounded-xl border p-2.5 text-xs transition ${
                          checked ? "border-slate-900 bg-slate-50/80" : "border-slate-200 bg-white hover:border-slate-300"
                        }`}
                      >
                        <input
                          type="checkbox"
                          className="mt-0.5 h-4 w-4 rounded"
                          checked={checked}
                          onChange={() => togglePaymentMethod(opt.key)}
                        />
                        <span className="min-w-0 flex-1">
                          <span className="flex items-center gap-1.5">
                            <b className="text-slate-900">{opt.label}</b>
                            <span className="rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-semibold text-slate-600">
                              {opt.group}
                            </span>
                          </span>
                          <span className="mt-0.5 block text-[11px] text-slate-500">{opt.hint}</span>
                        </span>
                      </label>
                    );
                  })}
                </div>
              </div>

              <div className="border-t border-slate-100 pt-3">
                <Toggle
                  checked={!!form.featured}
                  onChange={(v) => setForm({ ...form, featured: v })}
                  label="Tandai Produk Pilihan (Unggulan)"
                  hint="Tampil di urutan teratas katalog dropshipper."
                />
              </div>
            </Panel>

            <Panel className="p-5 space-y-2.5">
              <div className="flex items-center gap-2 text-slate-800 font-bold text-xs">
                <Boxes size={15} className="text-slate-500" /> Khusus Jualan Media Sosial
              </div>
              <p className="text-xs leading-relaxed text-slate-600">
                Produk dropship Pesanin (baik <b className="text-slate-800">Produk Fisik</b> maupun{" "}
                <b className="text-slate-800">Produk Digital</b>) dirancang khusus untuk jualan melalui{" "}
                <b className="text-slate-800">Landing Page, TikTok, Instagram, FB Ads, dan WhatsApp</b> (bukan untuk upload ke Marketplace). Pastikan aset video, slide feed, dan minimal 1 template landing page sudah lengkap sebelum ditayangkan.
              </p>
            </Panel>
          </div>
        </div>
      )}

      {/* TAB 2: KONTEN VIDEO */}
      {tab === "videos" && (
        <div className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-base font-bold text-slate-900">Aset Konten Video (Reels / TikTok / Ads)</h2>
              <p className="text-xs text-slate-500">
                Sediakan variasi video siap unduh lengkap dengan hook 3 detik &amp; script iklan agar dropshipper tinggal posting.
              </p>
            </div>
            <button
              type="button"
              onClick={addVideo}
              className="flex h-10 items-center gap-2 rounded-lg bg-brand-600 px-4 text-sm font-semibold text-white"
            >
              <Plus size={16} /> Tambah Konten Video
            </button>
          </div>

          {form.videos.length === 0 ? (
            <Panel className="py-16 text-center space-y-3">
              <Film size={32} className="mx-auto text-slate-300" />
              <p className="text-sm font-semibold text-slate-700">Belum ada konten video untuk produk ini</p>
              <p className="text-xs text-slate-500">Tambahkan video Reels/TikTok agar dropshipper mudah promosi di media sosial.</p>
              <button
                type="button"
                onClick={addVideo}
                className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-brand-600 px-4 text-xs font-semibold text-white"
              >
                <Plus size={14} /> Tambah Video Pertama
              </button>
            </Panel>
          ) : (
            <div className="grid gap-4 lg:grid-cols-2">
              {form.videos.map((v, idx) => (
                <Panel key={v.id} className="p-5 space-y-4">
                  <div className="flex items-start gap-4">
                    <div className="relative h-28 w-20 shrink-0 overflow-hidden rounded-xl border border-slate-200 bg-slate-900">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={v.thumbnail} alt="" className="h-full w-full object-cover opacity-90" />
                      <span className="absolute inset-0 flex items-center justify-center">
                        <span className="flex h-8 w-8 items-center justify-center rounded-full bg-white/90 text-slate-900 shadow">
                          <Play size={14} fill="currentColor" />
                        </span>
                      </span>
                      <span className="absolute bottom-1 right-1 rounded bg-black/70 px-1 text-[9px] font-bold text-white">
                        {v.duration}
                      </span>
                    </div>
                    <div className="min-w-0 flex-1 space-y-2.5">
                      <div className="flex items-start justify-between gap-2">
                        <input
                          className="input h-9 text-sm font-semibold"
                          placeholder="Judul konten video"
                          value={v.title}
                          onChange={(e) => updateVideo(idx, { title: e.target.value })}
                        />
                        <button
                          type="button"
                          onClick={() => removeVideo(idx)}
                          className="rounded-lg p-2 text-rose-500 hover:bg-rose-50"
                          title="Hapus video"
                        >
                          <Trash2 size={15} />
                        </button>
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <Select
                          className="input h-9 text-xs"
                          value={v.format}
                          onChange={(e) => updateVideo(idx, { format: e.target.value as DropshipVideoAsset["format"] })}
                        >
                          <option value="9:16 Reels/TikTok">9:16 Reels / TikTok</option>
                          <option value="1:1 Feed">1:1 Feed Square</option>
                          <option value="16:9 YouTube">16:9 Landscape</option>
                        </Select>
                        <input
                          className="input h-9 text-xs"
                          placeholder="Durasi (0:30)"
                          value={v.duration}
                          onChange={(e) => updateVideo(idx, { duration: e.target.value })}
                        />
                      </div>
                    </div>
                  </div>

                  <Field label="URL File Video / Link Drive Unduhan">
                    <input
                      className="input h-9 text-xs font-mono"
                      placeholder="https://cdn.pesanin.id/dropship/video-1.mp4"
                      value={v.video_url}
                      onChange={(e) => updateVideo(idx, { video_url: e.target.value })}
                    />
                  </Field>

                  <Field label="Hook 3 Detik Pertama">
                    <input
                      className="input h-9 text-xs"
                      value={v.hook}
                      onChange={(e) => updateVideo(idx, { hook: e.target.value })}
                    />
                  </Field>

                  <Field label="Script / Copywriting Video">
                    <textarea
                      rows={3}
                      className="input h-auto py-2 text-xs"
                      value={v.script}
                      onChange={(e) => updateVideo(idx, { script: e.target.value })}
                    />
                  </Field>

                  <div>
                    <p className="mb-1.5 text-xs font-semibold text-slate-600">Rekomendasi Platform</p>
                    <div className="flex flex-wrap gap-1.5">
                      {PLATFORMS.map((pl) => {
                        const on = v.platforms.includes(pl);
                        return (
                          <button
                            key={pl}
                            type="button"
                            onClick={() =>
                              updateVideo(idx, {
                                platforms: on ? v.platforms.filter((x) => x !== pl) : [...v.platforms, pl],
                              })
                            }
                            className={`rounded-full px-2.5 py-1 text-[11px] font-semibold transition ${
                              on ? "bg-slate-900 text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                            }`}
                          >
                            {pl}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </Panel>
              ))}
            </div>
          )}
        </div>
      )}

      {/* TAB 3: KONTEN SLIDE & FEED */}
      {tab === "slides" && (
        <div className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-base font-bold text-slate-900">Aset Konten Slide Carousel &amp; Feed</h2>
              <p className="text-xs text-slate-500">
                Susun paket gambar slide carousel Instagram/TikTok, poster promo feed, beserta caption dan hashtag siap salin.
              </p>
            </div>
            <button
              type="button"
              onClick={addSlidePack}
              className="flex h-10 items-center gap-2 rounded-lg bg-brand-600 px-4 text-sm font-semibold text-white"
            >
              <Plus size={16} /> Tambah Paket Slide / Feed
            </button>
          </div>

          {form.slides.length === 0 ? (
            <Panel className="py-16 text-center space-y-3">
              <Images size={32} className="mx-auto text-slate-300" />
              <p className="text-sm font-semibold text-slate-700">Belum ada paket slide / feed</p>
              <button
                type="button"
                onClick={addSlidePack}
                className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-brand-600 px-4 text-xs font-semibold text-white"
              >
                <Plus size={14} /> Tambah Paket Slide Pertama
              </button>
            </Panel>
          ) : (
            <div className="space-y-4">
              {form.slides.map((pack, idx) => (
                <Panel key={pack.id} className="p-5 space-y-4">
                  <div className="flex flex-wrap items-center gap-3">
                    <input
                      className="input h-10 flex-1 min-w-[240px] font-semibold"
                      value={pack.title}
                      onChange={(e) => updateSlidePack(idx, { title: e.target.value })}
                    />
                    <Select
                      className="input h-10 w-44 text-xs"
                      value={pack.format}
                      onChange={(e) => updateSlidePack(idx, { format: e.target.value as DropshipSlideAsset["format"] })}
                    >
                      <option value="Carousel 4:5">Carousel 4:5 (IG/TikTok)</option>
                      <option value="Feed 1:1">Feed 1:1 (Poster)</option>
                      <option value="Story 9:16">Story 9:16</option>
                    </Select>
                    <button
                      type="button"
                      onClick={() => removeSlidePack(idx)}
                      className="rounded-lg p-2 text-rose-500 hover:bg-rose-50"
                      title="Hapus paket slide"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>

                  {/* Slide Strip */}
                  <div className="flex gap-3 overflow-x-auto pb-1">
                    {pack.slides.map((sl, sIdx) => (
                      <div key={sl.id} className="w-36 shrink-0 space-y-1.5">
                        <div className="group relative overflow-hidden rounded-xl border border-slate-200">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img src={sl.image} alt={sl.label} className="aspect-square w-full object-cover" />
                          <span className="absolute left-1.5 top-1.5 rounded bg-slate-900/75 px-1.5 py-0.5 text-[10px] font-bold text-white">
                            #{sIdx + 1}
                          </span>
                          <button
                            type="button"
                            onClick={() =>
                              updateSlidePack(idx, {
                                slides: pack.slides.filter((_, i) => i !== sIdx),
                              })
                            }
                            className="absolute right-1.5 top-1.5 rounded bg-white/90 p-1 text-rose-600 opacity-0 shadow transition group-hover:opacity-100"
                          >
                            <Trash2 size={12} />
                          </button>
                        </div>
                        <input
                          className="input h-8 text-[11px]"
                          value={sl.label}
                          onChange={(e) =>
                            updateSlidePack(idx, {
                              slides: pack.slides.map((x, i) => (i === sIdx ? { ...x, label: e.target.value } : x)),
                            })
                          }
                        />
                      </div>
                    ))}
                    <button
                      type="button"
                      onClick={() => {
                        const n = pack.slides.length + 1;
                        const nextSlideImg =
                          form.images[(n - 1) % Math.max(1, form.images.length)] ||
                          SAMPLE_PRODUCT_IMAGES[(n - 1) % SAMPLE_PRODUCT_IMAGES.length];
                        updateSlidePack(idx, {
                          slides: [
                            ...pack.slides,
                            {
                              id: `s-${Date.now().toString(36)}`,
                              image: nextSlideImg,
                              label: `Slide ${n}`,
                            },
                          ],
                        });
                      }}
                      className="flex h-36 w-36 shrink-0 flex-col items-center justify-center gap-1.5 rounded-xl border-2 border-dashed border-slate-200 text-xs font-semibold text-slate-500 hover:border-brand-400 hover:bg-brand-50/40 hover:text-brand-600"
                    >
                      <ImagePlus size={18} />
                      <span>+ Tambah Slide</span>
                    </button>
                  </div>

                  <div className="grid gap-4 lg:grid-cols-2">
                    <Field label="Caption Siap Posting">
                      <textarea
                        rows={4}
                        className="input h-auto py-2 text-xs"
                        value={pack.copywriting}
                        onChange={(e) => updateSlidePack(idx, { copywriting: e.target.value })}
                      />
                    </Field>
                    <Field label="Hashtag Rekomendasi">
                      <textarea
                        rows={4}
                        className="input h-auto py-2 text-xs font-mono text-indigo-700"
                        value={pack.hashtags}
                        onChange={(e) => updateSlidePack(idx, { hashtags: e.target.value })}
                      />
                    </Field>
                  </div>
                </Panel>
              ))}
            </div>
          )}
        </div>
      )}

      {/* TAB 4: PILIHAN TEMPLATE LANDING PAGE (EXISTING PESANIN PAGE BUILDER UI) */}
      {tab === "lp" && (
        <div className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-base font-bold text-slate-900">Pilihan Template Landing Page</h2>
              <p className="text-xs text-slate-500">
                Buat dan edit template landing page menggunakan Pesanin Page Builder. User dropshipper tinggal pilih template lalu sesuaikan langsung di Page Builder.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setCreateLpOpen(true)}
              className="flex h-10 items-center gap-2 rounded-lg bg-brand-600 px-4 text-sm font-semibold text-white hover:opacity-95"
            >
              <PlusCircle size={16} /> Create New Page
            </button>
          </div>

          {form.lp_templates.length === 0 ? (
            <Panel className="py-16 text-center space-y-3">
              <LayoutTemplate size={32} className="mx-auto text-slate-300" />
              <p className="text-sm font-semibold text-slate-700">Belum ada template Landing Page</p>
              <button
                type="button"
                onClick={() => setCreateLpOpen(true)}
                className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-brand-600 px-4 text-xs font-semibold text-white"
              >
                <PlusCircle size={14} /> Create New Page
              </button>
            </Panel>
          ) : (
            <div className="grid gap-5 xl:grid-cols-[1fr_440px] items-start">
              {/* Left: Existing Page List Style Table */}
              <Panel className="overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-slate-100 text-left text-[13px] text-slate-500">
                        <th className="px-4 py-3 font-medium">Page Name</th>
                        <th className="px-3 py-3 font-medium">Label</th>
                        <th className="px-3 py-3 font-medium">Komponen</th>
                        <th className="px-4 py-3 text-right font-medium">Aksi</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {form.lp_templates.map((tpl, idx) => {
                        const selected = idx === activeLpIdx;
                        const hl = getTemplateHeadline(tpl.blocks);
                        return (
                          <tr
                            key={tpl.id}
                            onClick={() => setActiveLpIdx(idx)}
                            className={`cursor-pointer align-middle transition ${selected ? "bg-slate-50" : "hover:bg-slate-50/60"}`}
                          >
                            <td className="px-4 py-3.5">
                              <div className="flex items-start gap-2.5">
                                <span
                                  className="mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full"
                                  style={{ backgroundColor: tpl.theme?.primary || "#e05510" }}
                                />
                                <div className="min-w-0">
                                  <p className="font-semibold text-slate-900">{tpl.name}</p>
                                  {hl && <p className="mt-0.5 line-clamp-1 text-xs text-slate-500">{hl}</p>}
                                  <div className="mt-1.5 flex flex-wrap gap-2.5 text-xs font-medium text-brand-600">
                                    <button
                                      type="button"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        setBuilderState({ idx, tab: "home" });
                                      }}
                                      className="hover:underline"
                                    >
                                      Edit with Builder
                                    </button>
                                    <button
                                      type="button"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        setBuilderState({ idx, tab: "settings" });
                                      }}
                                      className="hover:underline"
                                    >
                                      Settings
                                    </button>
                                    <button
                                      type="button"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        duplicateLp(idx);
                                      }}
                                      className="hover:underline"
                                    >
                                      Duplicate
                                    </button>
                                  </div>
                                </div>
                              </div>
                            </td>
                            <td className="px-3 py-3.5 whitespace-nowrap">
                              <span className="rounded-md border border-slate-200 bg-white px-2 py-0.5 text-xs font-medium text-slate-600">
                                {tpl.badge || "Template"}
                              </span>
                            </td>
                            <td className="px-3 py-3.5 whitespace-nowrap text-xs text-slate-500">
                              {tpl.blocks.length} blok
                            </td>
                            <td className="px-4 py-3.5 text-right whitespace-nowrap">
                              <div className="inline-flex items-center gap-1">
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setBuilderState({ idx, tab: "home" });
                                  }}
                                  className="inline-flex h-8 items-center gap-1.5 rounded-lg bg-slate-900 px-3 text-xs font-semibold text-white hover:bg-slate-800"
                                >
                                  <Pencil size={12} /> Builder
                                </button>
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setBuilderState({ idx, tab: "settings" });
                                  }}
                                  className="inline-flex h-8 items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 text-xs font-medium text-slate-700 hover:bg-slate-50"
                                  title="Page Settings"
                                >
                                  <Settings size={13} />
                                </button>
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    duplicateLp(idx);
                                  }}
                                  className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100"
                                  title="Duplikat"
                                >
                                  <Copy size={14} />
                                </button>
                                {form.lp_templates.length > 1 && (
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      removeLp(idx);
                                    }}
                                    className="rounded-lg p-1.5 text-rose-500 hover:bg-rose-50"
                                    title="Hapus"
                                  >
                                    <Trash2 size={14} />
                                  </button>
                                )}
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </Panel>

              {/* Right: Live Preview using Existing BlockView */}
              {activeLp && (
                <Panel className="p-4 space-y-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="min-w-0">
                      <p className="truncate text-xs font-bold text-slate-900">{activeLp.name}</p>
                      <p className="text-[11px] text-slate-400">Preview blok Pesanin Page Builder</p>
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
                        onClick={() => setBuilderState({ idx: activeLpIdx, tab: "home" })}
                        className="inline-flex h-7 items-center gap-1 rounded-lg bg-brand-600 px-2.5 text-[11px] font-semibold text-white"
                      >
                        <Pencil size={11} /> Edit
                      </button>
                    </div>
                  </div>

                  <div className="flex justify-center rounded-xl border border-slate-200 bg-slate-100/80 p-3">
                    <div
                      className={`max-h-[600px] w-full overflow-y-auto rounded-xl border border-slate-200 shadow-sm ${
                        previewDevice === "mobile" ? "max-w-[360px]" : "max-w-full"
                      }`}
                      style={{ background: activeLp.theme?.background ?? "#ffffff" }}
                    >
                      <div className="space-y-4 px-4 py-6 text-slate-700 [&_a]:pointer-events-none">
                        {activeLp.blocks.map((b) => (
                          <BlockView
                            key={b.id}
                            block={b}
                            color={activeLp.theme?.primary || "#e05510"}
                            checkout={previewCtx.checkout}
                            whatsapp={activeLp.settings?.whatsapp}
                            preview
                          />
                        ))}
                        {activeLp.blocks.length === 0 && (
                          <div className="py-16 text-center text-xs text-slate-400">
                            Halaman kosong. Klik <b>Edit</b> untuk menambah komponen di Page Builder.
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </Panel>
              )}
            </div>
          )}
        </div>
      )}

      {/* Existing Create New Page Modal */}
      {createLpOpen && (
        <CreatePageModal
          defaultTitle={`LP ${form.name || "Produk Dropship"} #${form.lp_templates.length + 1}`}
          defaultTemplate="product_fisik"
          heading="Create New Page"
          submitLabel="Create Page"
          onClose={() => setCreateLpOpen(false)}
          onSubmit={createLpFromModal}
        />
      )}

      {/* Existing Fullscreen Pesanin Page Builder */}
      {builderState !== null && builderLp && (
        <div className="fixed inset-0 z-50">
          <LandingPageBuilder
            key={`${builderLp.id}-${builderState.tab}`}
            initialPage={lpTemplateToLandingPage(builderLp, form)}
            products={previewCtx.products}
            initialCheckout={previewCtx.checkout}
            backLabel="Kembali ke Produk Dropship"
            subtitle="Dropship Template Builder"
            initialTab={builderState.tab}
            onBack={() => setBuilderState(null)}
            onSave={async (savedPage) => {
              const idx = builderState.idx;
              const nextTemplates = form.lp_templates.map((t, i) =>
                i === idx
                  ? {
                      ...t,
                      name: savedPage.title || t.name,
                      badge: savedPage.label ?? t.badge,
                      theme: savedPage.theme ?? t.theme,
                      seo: savedPage.seo ?? t.seo,
                      settings: savedPage.settings ?? t.settings,
                      blocks: savedPage.blocks ?? t.blocks,
                    }
                  : t,
              );
              const nextForm = { ...form, lp_templates: nextTemplates };
              setForm(nextForm);
              if (!isNew && nextForm.id) {
                await updateAdminDropshipProduct(nextForm.id, {
                  ...nextForm,
                  payment_methods: normalizePaymentMethods(nextForm.payment_methods),
                });
              }
              return savedPage;
            }}
          />
        </div>
      )}
    </div>
  );
}
