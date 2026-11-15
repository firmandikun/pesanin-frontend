"use client";
import { CheckCircle2, ChevronRight, Circle, Film, FolderTree, ImagePlus, Loader2, Megaphone, Plus, RotateCcw, Search, Sparkles, Trash2, X, XCircle } from "lucide-react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useMemo, useRef, useState } from "react";
import { ShopeeMark } from "@/components/ChannelBadge";
import { DateTimePicker } from "@/components/DatePicker";
import { Dialog, PageHead, Panel, Toggle } from "@/components/kit";
import { Select } from "@/components/Select";
import { api, ApiError, rupiah } from "@/lib/api";

type Cat = { id: number; name: string; path: string };
type Attr = { id: number; name: string; mandatory: boolean; input_type: number; validation: number; units: string[]; values: { id: number; name: string }[] };
type Limits = { images_min: number; images_max: number; name_min: number; name_max: number; description_max: number; price_min: number;
  dts_min: number; dts_max: number; dts_normal: number; weight_mandatory: boolean; dimension_mandatory: boolean; gtin_rule: "Mandatory" | "Flexible" | "Optional" | string };
type CatInfo = { attributes: Attr[]; brands: { mandatory: boolean; list: { id: number; name: string }[] }; limits: Limits };
type ShopOpt = { id: number; shop_id: number; name: string; channels: { id: number; name: string }[]; error: string | null };
type Img = { id: string; url: string; name: string };
type VideoUpload = { video_upload_id: string; name: string; size: number };
type Answer = { value_ids: number[]; text: string; unit: string; custom?: boolean };
type Tier = { name: string; options: string[] };
type Model = { index: number[]; price: number; stock: number; sku: string };
type Wholesale = { min: number; max: number; price: number };
type CopySource = {
  source: { shop_id: number; shop_name: string; item_id: number }; name: string; description: string; category: Cat | null; brand_id: number; images: string[];
  attributes: { id: number; value_ids: number[]; text: string; unit: string }[]; price: number; stock: number; sku: string;
  tiers: Tier[]; models: Model[]; wholesale: Wholesale[]; weight: number; dims: { length: string; width: string; height: string };
  condition: "NEW" | "USED"; dangerous: boolean; pre_order: boolean; days_to_ship: number; gtin: string | null;
};
type Result = { state: "wait" | "run" | "ok" | "fail"; message?: string; item_id?: number; status?: string; shopee_status?: string; seller_centre_url?: string; checking?: boolean };
type Live = { item_id: number; status?: string; shopee_status?: string; seller_centre_url?: string };
/** Shopee's item_status in the seller's words, with a tone. */
const SHOPEE_STATUS: Record<string, [string, string]> = {
  NORMAL: ["Tayang di Shopee", "text-emerald-600"], UNLIST: ["Diarsipkan (belum tampil ke pembeli)", "text-amber-600"],
  REVIEWING: ["Sedang diperiksa Shopee", "text-amber-600"], BANNED: ["Diblokir Shopee", "text-rose-600"],
  SHOPEE_DELETE: ["Dihapus Shopee", "text-rose-600"], SELLER_DELETE: ["Dihapus", "text-rose-600"], NOT_FOUND: ["Belum ditemukan di Shopee, cek lagi sebentar", "text-amber-600"],
};
type Prod = { id: number; name: string; description: string | null; price: number; stock: number | null; sku: string | null; weight: number | null; images: string[] | null;
  variants: { name: string; price: number; stock?: number; sku?: string }[] | null; variant_options: { type: string; values: string[] }[] | null };

/** yyyy-mm-dd in the browser's timezone (toISOString would shift WIB midnight back a day). */
const localDay = (ts: number) => { const d = new Date(ts * 1000); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`; };
const MULTI = (a: Attr) => a.input_type === 4 || a.input_type === 5;
const CUSTOM_OK = (a: Attr) => a.input_type === 2 || a.input_type === 3 || a.input_type === 5;
const clean = (n: string) => n.replace(/^Sandbox-|\(Don't modify\)/g, "").trim();

const SECTIONS = [["info", "Informasi Produk"], ["spec", "Spesifikasi"], ["sales", "Informasi Penjualan"], ["ship", "Pengiriman"], ["other", "Lainnya"]] as const;

/** Every combination of the tiers' options, as index arrays: [[0,0],[0,1],[1,0],…]. */
const combos = (tiers: Tier[]): number[][] =>
  tiers.reduce<number[][]>((acc, t) => acc.flatMap((c) => t.options.map((_, i) => [...c, i])), [[]]).filter((c) => c.length === tiers.length);

export default function PublishPage() {
  return <Suspense fallback={null}><Publish /></Suspense>;
}

/** Tambah Produk Baru ke Shopee, bagian-bagiannya mengikuti Seller Centre; bisa ke banyak toko sekaligus. */
function Publish() {
  const sp = useSearchParams();
  const [products, setProducts] = useState<Prod[]>([]);
  const [productId, setProductId] = useState(sp.get("product") ?? "");
  const [name, setName] = useState("");
  const [desc, setDesc] = useState("");
  const [images, setImages] = useState<Img[]>([]);
  const [uploading, setUploading] = useState(false);
  const [video, setVideo] = useState<VideoUpload | null>(null);
  const [videoPreview, setVideoPreview] = useState("");
  const [uploadingVideo, setUploadingVideo] = useState(false);
  const [videoError, setVideoError] = useState("");

  // Informasi Penjualan
  const [price, setPrice] = useState(0);
  const [stock, setStock] = useState(0);
  const [tiers, setTiers] = useState<Tier[]>([]);
  const [models, setModels] = useState<Model[]>([]);
  const [bulk, setBulk] = useState({ price: "", stock: "", sku: "" });
  const [wholesale, setWholesale] = useState<Wholesale[]>([]);

  // Kategori, GTIN & Spesifikasi
  const [cats, setCats] = useState<Cat[] | null>(null);
  const [cat, setCat] = useState<Cat | null>(null);
  const [catOpen, setCatOpen] = useState(false);
  const [recs, setRecs] = useState<Cat[]>([]);
  const [info, setInfo] = useState<CatInfo | null>(null);
  const [answers, setAnswers] = useState<Record<number, Answer>>({});
  const [brandId, setBrandId] = useState(0);
  const [moreAttrs, setMoreAttrs] = useState(false);
  const [gtin, setGtin] = useState("");
  const [noGtin, setNoGtin] = useState(true);

  // Pengiriman
  const [weight, setWeight] = useState(0);
  const [dims, setDims] = useState({ length: "", width: "", height: "" });
  const [dangerous, setDangerous] = useState(false);
  const [offChannels, setOffChannels] = useState<string[]>([]);
  const [preOrder, setPreOrder] = useState(false);
  const [dts, setDts] = useState(7);

  // Lainnya
  const [condition, setCondition] = useState<"NEW" | "USED">("NEW");
  const [schedule, setSchedule] = useState(false);
  const [publishAt, setPublishAt] = useState<string | null>(null);
  const [sku, setSku] = useState("");

  const [shops, setShops] = useState<ShopOpt[] | null>(null);
  const [picked, setPicked] = useState<number[]>([]);
  const [results, setResults] = useState<Record<number, Result>>({});
  const [running, setRunning] = useState(false);
  const router = useRouter();
  // Success modal: every target shop got the product → summary, then back to the product list.
  const [success, setSuccess] = useState<{ shop: string; r: Result }[] | null>(null);
  const [countdown, setCountdown] = useState<number | null>(null);
  useEffect(() => {
    if (countdown === null) return;
    if (countdown <= 0) { router.push("/marketplace/products"); return; }
    const t = setTimeout(() => setCountdown(countdown - 1), 1000);
    return () => clearTimeout(t);
  }, [countdown, router]);
  const [err, setErr] = useState("");
  const [section, setSection] = useState<string>("info");
  const [tried, setTried] = useState(false);

  // "Salin ke toko lain": ?copy_shop=<shop>&copy_item=<item> prefills the form from an existing Shopee product.
  const copyShop = Number(sp.get("copy_shop") || 0);
  const copyItem = Number(sp.get("copy_item") || 0);
  const [copying, setCopying] = useState(!!(copyShop && copyItem));
  const [copyFrom, setCopyFrom] = useState<{ shop_name: string; item_id: number } | null>(null);
  // Brand/attributes/pre-order days wait for the category's attribute list, which resets them when it loads.
  const pendingCopy = useRef<{ brand_id: number; answers: Record<number, Answer>; dts: number } | null>(null);

  useEffect(() => {
    api("/products?per_page=100&type=physical").then((r) => setProducts(r.products.data)).catch(() => {});
    api<Cat[]>("/marketplace/publish/categories").then(setCats).catch((e) => setErr(e instanceof ApiError ? e.message : "Gagal memuat kategori Shopee"));
    // When copying, every shop except the source one is picked.
    api<ShopOpt[]>("/marketplace/publish/shops").then((s) => { setShops(s); setPicked(s.filter((x) => !x.error && x.id !== copyShop).map((x) => x.id)); }).catch(() => setShops([]));
  }, [copyShop]);

  useEffect(() => {
    if (!copyShop || !copyItem) return;
    api<CopySource>(`/marketplace/publish/${copyShop}/items/${copyItem}/source`).then((c) => {
      setCopyFrom({ shop_name: c.source.shop_name, item_id: c.source.item_id });
      setName(c.name); setDesc(c.description); setPrice(c.price); setStock(c.stock); setSku(c.sku ?? "");
      setWeight(c.weight); setDims(c.dims); setCondition(c.condition); setDangerous(c.dangerous); setPreOrder(c.pre_order);
      setWholesale(c.wholesale);
      if (c.gtin) { setGtin(c.gtin); setNoGtin(false); }
      setTiers(c.tiers); setModels(c.tiers.length ? c.models : []);
      pendingCopy.current = {
        brand_id: c.brand_id, dts: c.days_to_ship,
        answers: Object.fromEntries(c.attributes.map((a) => [a.id, { value_ids: a.value_ids, text: a.text ?? "", unit: a.unit ?? "", custom: !a.value_ids.length && !!a.text }])),
      };
      if (c.category) setCat(c.category);
      if (c.images.length) {
        setUploading(true);
        api<Img[]>("/marketplace/publish/images", { method: "POST", json: { urls: c.images } }).then(setImages)
          .catch((e) => setErr(e instanceof ApiError ? e.message : "Foto produk gagal disalin, tambahkan ulang.")).finally(() => setUploading(false));
      }
    }).catch((e) => setErr(e instanceof ApiError ? e.message : "Gagal mengambil produk sumber dari Shopee")).finally(() => setCopying(false));
  }, [copyShop, copyItem]);

  // Prefill from a Pesanin product.
  useEffect(() => {
    const p = products.find((x) => String(x.id) === productId);
    if (!p) return;
    setName(p.name); setDesc(p.description ?? p.name); setPrice(p.price); setStock(p.stock ?? 0); setSku(p.sku ?? ""); setWeight(p.weight || 0);
    const opts = (p.variant_options ?? []).slice(0, 2).filter((o) => o.values?.length);
    if (p.variants?.length && opts.length) {
      const t = opts.map((o) => ({ name: o.type.slice(0, 14), options: o.values.map((v) => v.slice(0, 20)) }));
      setTiers(t);
      setModels(combos(t).map((index) => {
        const label = index.map((ti, k) => t[k].options[ti]);
        const v = p.variants!.find((x) => { const parts = opts.length > 1 ? x.name.split(/\s*[/,]\s*/) : [x.name]; return parts.every((part, k) => part.slice(0, 20) === label[k]); });
        return { index, price: v?.price ?? p.price, stock: v?.stock ?? 0, sku: v?.sku ?? "" };
      }));
    } else { setTiers([]); setModels([]); }
    if (p.images?.length) {
      setUploading(true);
      api<Img[]>("/marketplace/publish/images", { method: "POST", json: { urls: p.images.slice(0, 9) } }).then(setImages).catch(() => setImages([])).finally(() => setUploading(false));
    }
  }, [productId, products]);

  useEffect(() => {
    if (!cat) return setInfo(null);
    setInfo(null); setAnswers({}); setBrandId(0); setMoreAttrs(false);
    api<CatInfo>(`/marketplace/publish/categories/${cat.id}`).then((i) => {
      setInfo(i);
      const pc = pendingCopy.current;
      pendingCopy.current = null;
      // Keep only the copied answers this category still knows; a brand outside its list falls back to "Tidak Ada Merek".
      if (pc) {
        const known = new Set(i.attributes.map((a) => a.id));
        setAnswers(Object.fromEntries(Object.entries(pc.answers).filter(([id]) => known.has(+id))));
        setBrandId(i.brands.list.some((b) => b.id === pc.brand_id) ? pc.brand_id : 0);
      }
      const want = pc?.dts || 7;
      setDts(Math.max(i.limits.dts_min, Math.min(want, i.limits.dts_max)));
    })
      .catch((e) => setErr(e instanceof ApiError ? e.message : "Gagal memuat atribut"));
  }, [cat]);

  // Rekomendasi Kategori from the name (+ cover photo), like Seller Centre.
  const coverId = images[0]?.id;
  useEffect(() => {
    const n = name.trim();
    if (n.length < 5) return setRecs([]);
    const t = setTimeout(() => {
      api<Cat[]>(`/marketplace/publish/recommend?name=${encodeURIComponent(n)}${coverId ? `&image_id=${coverId}` : ""}`).then(setRecs).catch(() => setRecs([]));
    }, 700);
    return () => clearTimeout(t);
  }, [name, coverId]);

  const upload = async (files: FileList | null) => {
    if (!files?.length) return;
    const fd = new FormData();
    [...files].slice(0, 9 - images.length).forEach((f) => fd.append("files[]", f));
    setUploading(true); setErr("");
    try { const added = await api<Img[]>("/marketplace/publish/images", { method: "POST", body: fd }); setImages((i) => [...i, ...added].slice(0, 9)); }
    catch (e) { setErr(e instanceof ApiError ? e.message : "Upload foto gagal"); } finally { setUploading(false); }
  };

  const uploadVideo = async (file: File | null) => {
    if (!file) return;
    if (file.size > 30 * 1024 * 1024) { setVideoError("Ukuran video maksimal 30 MB."); return; }
    const fd = new FormData(); fd.append("file", file);
    setUploadingVideo(true); setVideoError(""); setErr("");
    try {
      const result = await api<VideoUpload>("/marketplace/publish/video", { method: "POST", body: fd });
      if (videoPreview) URL.revokeObjectURL(videoPreview);
      setVideoPreview(URL.createObjectURL(file)); setVideo(result);
    } catch (e) { setVideoError(e instanceof ApiError ? e.message : "Upload video gagal"); }
    finally { setUploadingVideo(false); }
  };

  useEffect(() => () => { if (videoPreview) URL.revokeObjectURL(videoPreview); }, [videoPreview]);

  /* ---------- Variasi ---------- */
  const keyOf = (t: Tier[], index: number[]) => index.map((ti, k) => t[k]?.options[ti]).join("\u0001");
  /** Change the tiers and rebuild the combination table, keeping what was typed for combinations that still exist. */
  const editTiers = (next: Tier[]) => {
    const old = new Map(models.map((m) => [keyOf(tiers, m.index), m]));
    const usable = next.filter((t) => t.options.some((o) => o.trim()));
    const shaped = usable.map((t) => ({ ...t, options: t.options.filter((o) => o.trim()) }));
    setModels(combos(shaped).map((index) => { const prev = old.get(keyOf(shaped, index)); return prev ? { ...prev, index } : { index, price: price || 0, stock: 0, sku: "" }; }));
    setTiers(next);
  };
  const liveTiers = tiers.map((t) => ({ ...t, options: t.options.filter((o) => o.trim()) })).filter((t) => t.options.length);
  const hasVariants = models.length > 0 && liveTiers.length > 0;
  const samePrice = !hasVariants || new Set(models.map((m) => m.price)).size === 1;
  const basePrice = hasVariants ? Math.min(...models.map((m) => m.price)) : price;

  /* ---------- Atribut ---------- */
  const setAns = (id: number, patch: Partial<Answer>) => setAnswers((a) => ({ ...a, [id]: { ...(a[id] ?? { value_ids: [], text: "", unit: "" }), ...patch } }));
  const filled = (a: Attr) => { const x = answers[a.id]; return !!x && (x.value_ids.length > 0 || x.text.trim() !== ""); };
  const mainAttrs = info?.attributes.filter((a) => a.mandatory) ?? [];
  const otherAttrs = info?.attributes.filter((a) => !a.mandatory) ?? [];

  /* ---------- Jasa kirim: every courier of the selected shops, toggled by name ---------- */
  const pickedShops = (shops ?? []).filter((s) => picked.includes(s.id));
  const channelNames = [...new Set(pickedShops.flatMap((s) => s.channels.map((c) => c.name)))];
  const onChannels = channelNames.filter((n) => !offChannels.includes(n));
  const shopsWithoutCourier = pickedShops.filter((s) => !s.channels.some((c) => onChannels.includes(c.name)));

  const lim = info?.limits;
  const gtinRule = lim?.gtin_rule ?? "Optional";
  const gtinValue = noGtin && gtinRule !== "Mandatory" ? "00" : gtin.trim();

  const wholesaleProblem = (() => {
    for (let i = 0; i < wholesale.length; i++) {
      const w = wholesale[i];
      if (w.min < 2) return "Grosir: jumlah minimum mulai dari 2";
      if (w.max < w.min) return "Grosir: jumlah maksimum harus ≥ minimum";
      if (i > 0 && w.min <= wholesale[i - 1].max) return "Grosir: rentang jumlah tidak boleh tumpang tindih";
      if (!w.price || w.price >= basePrice) return "Grosir: harga harus lebih murah dari harga satuan";
      if (i > 0 && w.price >= wholesale[i - 1].price) return "Grosir: harga tingkat berikutnya harus lebih murah";
    }
    return null;
  })();

  // [section, message] — the first one is shown on the save bar, each section shows its own.
  const problems = ([
    ["info", images.length < (lim?.images_min ?? 1) && `Tambahkan minimal ${lim?.images_min ?? 1} foto produk`],
    ["info", !name.trim() && "Nama produk wajib diisi"],
    ["info", lim && name.trim() && (name.length < lim.name_min || name.length > lim.name_max) && `Nama produk ${lim.name_min}–${lim.name_max} karakter`],
    ["info", !cat && "Pilih kategori"],
    ["info", gtinRule === "Mandatory" && !/^\d{8,14}$/.test(gtin.trim()) && "GTIN wajib diisi (8–14 digit)"],
    ["info", !(noGtin && gtinRule !== "Mandatory") && gtin.trim() && !/^\d{8,14}$/.test(gtin.trim()) && "GTIN harus 8–14 digit angka"],
    ["spec", info?.brands.mandatory && brandId === 0 && !info.brands.list.some((b) => b.id === 0) && "Pilih merek"],
    ["spec", mainAttrs.filter((a) => !filled(a)).map((a) => `Isi atribut "${a.name}"`)[0]],
    ["info", !desc.trim() && "Deskripsi wajib diisi"],
    ["info", lim && desc.length > lim.description_max && `Deskripsi maks ${lim.description_max} karakter`],
    ["sales", tiers.some((t) => !t.name.trim()) && "Isi nama variasi"],
    ["sales", hasVariants && models.some((m) => m.price < (lim?.price_min ?? 100)) && "Isi harga semua variasi"],
    ["sales", !hasVariants && price < (lim?.price_min ?? 100) && "Isi harga"],
    ["sales", wholesale.length > 0 && !samePrice && "Harga grosir hanya bisa jika harga semua variasi sama"],
    ["sales", wholesaleProblem],
    ["ship", (lim?.weight_mandatory ?? true) && !(weight > 0) && "Isi berat produk"],
    ["ship", lim?.dimension_mandatory && !(dims.length && dims.width && dims.height) && "Isi ukuran paket"],
    ["ship", pickedShops.length > 0 && shopsWithoutCourier.length > 0 && "Produk tidak dapat disimpan jika tidak ada jasa kirim yang aktif"],
    ["ship", preOrder && lim && (dts < lim.dts_min || dts > lim.dts_max) && `Pre-order ${lim.dts_min}–${lim.dts_max} hari`],
    ["other", schedule && !publishAt && "Pilih jadwal ditampilkan"],
    ["other", !picked.length && "Pilih minimal 1 toko tujuan"],
  ] as [string, string | false | null | undefined][]).filter((p): p is [string, string] => !!p[1]);
  const sectionProblems = (s: string) => problems.filter((p) => p[0] === s).map((p) => p[1]);

  // "Misi" checklist (left column), like Seller Centre's listing-quality tips.
  const mission = [
    ["Tambahkan minimal 3 foto", images.length >= 3],
    ["Nama produk minimal 25 karakter", name.trim().length >= 25],
    ["Deskripsi minimal 100 karakter", desc.trim().length >= 100],
    ["Pilih kategori", !!cat],
    ["Lengkapi atribut utama", !!info && mainAttrs.every(filled)],
    ["Isi berat & ukuran paket", weight > 0 && !!(dims.length && dims.width && dims.height)],
  ] as const;

  const publish = async (status: "NORMAL" | "UNLIST", only?: number[]) => {
    setTried(true);
    if (problems.length) { go(problems[0][0]); return; }
    // Shops that already got this product are skipped, so a second click can't create duplicates.
    const targets = (only ?? picked).filter((id) => results[id]?.state !== "ok");
    if (!targets.length) return;
    setRunning(true); setErr("");
    setResults((r) => ({ ...r, ...Object.fromEntries(targets.map((id) => [id, { state: "wait" }])) }));
    const body = {
      product_id: productId ? Number(productId) : null, name: name.trim(), description: desc.trim(), category_id: cat!.id,
      brand_id: brandId, brand_name: (brandId && info?.brands.list.find((b) => b.id === brandId)?.name) || "NoBrand",
      price: hasVariants ? basePrice : price, stock: hasVariants ? totalStock : stock, sku: sku || null, weight, image_ids: images.map((i) => i.id), video_upload_id: video?.video_upload_id ?? null,
      ...(dims.length && dims.width && dims.height ? { length: +dims.length, width: +dims.width, height: +dims.height } : {}),
      attributes: Object.entries(answers).map(([id, a]) => ({ id: +id, value_ids: a.value_ids, text: a.text, unit: a.unit || null })),
      ...(hasVariants ? { tiers: liveTiers, models: models.map((m) => ({ index: m.index, price: m.price, stock: m.stock, sku: m.sku || null })) } : {}),
      ...(gtinValue ? { gtin: gtinValue } : {}),
      condition, dangerous, pre_order: preOrder, ...(preOrder ? { days_to_ship: dts } : {}),
      wholesale: samePrice ? wholesale : [], channels: onChannels, status,
      ...(schedule && publishAt ? { publish_at: publishAt } : {}),
    };
    const outcome: Record<number, Result> = { ...results };
    for (const id of targets) {
      setResults((r) => ({ ...r, [id]: { state: "run" } }));
      try {
        const r = await api<Live>(`/marketplace/publish/${id}`, { method: "POST", json: body });
        outcome[id] = { state: "ok", ...r };
      } catch (e) {
        outcome[id] = { state: "fail", message: e instanceof ApiError ? e.message : "Gagal" };
      }
      setResults((x) => ({ ...x, [id]: outcome[id] }));
    }
    setRunning(false);
    // All selected shops done → success modal (failures stay on the page so they can be retried).
    if (picked.every((id) => outcome[id]?.state === "ok")) {
      setSuccess(picked.map((id) => ({ shop: shops?.find((x) => x.id === id)?.name ?? "Toko", r: outcome[id] })));
      setCountdown(5);
    }
  };

  const check = async (shopId: number) => {
    const cur = results[shopId];
    if (!cur?.item_id) return;
    setResults((x) => ({ ...x, [shopId]: { ...cur, checking: true } }));
    try {
      const r = await api<Live>(`/marketplace/publish/${shopId}/items/${cur.item_id}`);
      setResults((x) => ({ ...x, [shopId]: { ...x[shopId], ...r, checking: false } }));
    } catch { setResults((x) => ({ ...x, [shopId]: { ...x[shopId], checking: false } })); }
  };

  const refs = useRef<Record<string, HTMLElement | null>>({});
  const go = (id: string) => { setSection(id); refs.current[id]?.scrollIntoView({ behavior: "smooth", block: "start" }); };
  useEffect(() => {
    // The active tab is the last section whose top has passed under the sticky tab bar.
    const onScroll = () => {
      let cur: string = SECTIONS[0][0];
      for (const [id] of SECTIONS) if ((refs.current[id]?.getBoundingClientRect().top ?? Infinity) < 180) cur = id;
      setSection(cur);
    };
    addEventListener("scroll", onScroll, { passive: true });
    return () => removeEventListener("scroll", onScroll);
  }, []);

  const done = Object.values(results).filter((r) => r.state === "ok").length;
  const failed = Object.entries(results).filter(([, r]) => r.state === "fail").map(([id]) => +id);
  const allDone = picked.length > 0 && picked.every((id) => results[id]?.state === "ok");
  const priceLabel = hasVariants ? (samePrice ? rupiah(basePrice) : `${rupiah(basePrice)} - ${rupiah(Math.max(...models.map((m) => m.price)))}`) : rupiah(price);
  const totalStock = hasVariants ? models.reduce((s, m) => s + (m.stock || 0), 0) : stock;

  const attrField = (a: Attr) => {
    const v: Answer = answers[a.id] ?? { value_ids: [], text: "", unit: "" };
    const label = <span className="mb-1 block text-xs font-medium text-slate-600">{a.mandatory && <span className="text-rose-500">* </span>}{a.name}</span>;
    if (MULTI(a)) return (
      <div key={a.id} className="text-sm sm:col-span-2">{label}
        <div className="flex flex-wrap gap-1.5">{a.values.map((o) => {
          const on = v.value_ids.includes(o.id);
          return <button key={o.id} type="button" onClick={() => setAns(a.id, { value_ids: on ? v.value_ids.filter((x) => x !== o.id) : [...v.value_ids, o.id] })} className={`rounded-lg border px-2.5 py-1 text-xs font-medium ${on ? "border-[#ee4d2d] bg-orange-50 text-[#ee4d2d]" : "border-slate-200 text-slate-600"}`}>{o.name}</button>;
        })}</div>
      </div>
    );
    if (a.values.length) return (
      <div key={a.id} className="text-sm">{label}
        <Select className="input h-10" searchable={a.values.length > 8} placeholder="Mohon pilih" value={v.custom ? "custom" : v.value_ids[0] ?? ""} onChange={(e) => e.target.value === "custom" ? setAns(a.id, { value_ids: [], custom: true }) : setAns(a.id, { value_ids: e.target.value ? [+e.target.value] : [], text: "", custom: false })}>
          <option value="">Mohon pilih</option>
          {a.values.map((o) => <option key={o.id} value={o.id}>{o.name}</option>)}
          {CUSTOM_OK(a) && <option value="custom">Lainnya (isi sendiri)…</option>}
        </Select>
        {v.custom && (
          <div className="mt-1.5 flex gap-2"><input className="input h-9" placeholder="Isi nilai" value={v.text} onChange={(e) => setAns(a.id, { text: e.target.value })} />
            {a.units.length > 0 && <Select className="input h-9 w-24" value={v.unit} onChange={(e) => setAns(a.id, { unit: e.target.value })}><option value="">Unit</option>{a.units.map((u) => <option key={u}>{u}</option>)}</Select>}</div>
        )}
      </div>
    );
    return (
      <div key={a.id} className="text-sm">{label}
        {a.validation === 4
          ? <input type="date" className="input h-10" value={v.text ? localDay(+v.text) : ""} onChange={(e) => setAns(a.id, { text: e.target.value ? String(Math.floor(new Date(e.target.value + "T12:00:00").getTime() / 1000)) : "" })} />
          : <div className="flex gap-2"><input type={a.validation === 1 || a.validation === 3 ? "number" : "text"} className="input h-10" placeholder="Masukkan" value={v.text} onChange={(e) => setAns(a.id, { text: e.target.value })} />
            {a.units.length > 0 && <Select className="input h-10 w-24" value={v.unit} onChange={(e) => setAns(a.id, { unit: e.target.value })}><option value="">Unit</option>{a.units.map((u) => <option key={u}>{u}</option>)}</Select>}</div>}
      </div>
    );
  };

  return (
    <div className="space-y-5">
      <PageHead title={copyShop ? "Salin Produk ke Toko Lain" : "Tambah Produk Baru"} tutorial={false} crumbs={[["Marketplace"], ["Produk Shopee", "/marketplace/products"], [copyShop ? "Salin Produk" : "Tambah Produk"]]} />
      {copying && <p className="flex items-center gap-2 rounded-xl bg-orange-50 p-3 text-sm text-orange-800"><Loader2 size={15} className="animate-spin" />Mengambil data produk dari Shopee…</p>}
      {copyFrom && (
        <p className="rounded-xl bg-orange-50 p-3 text-sm text-orange-800">
          Disalin dari <b>{copyFrom.shop_name}</b> (item {copyFrom.item_id}). Periksa lagi isinya, pilih toko tujuan di kanan, lalu simpan. Toko asal tidak dicentang agar tidak dobel.
        </p>
      )}
      {err && <p className="flex items-start justify-between gap-3 rounded-xl bg-rose-50 p-3 text-sm text-rose-700">{err}<button onClick={() => setErr("")} aria-label="Tutup"><X size={15} /></button></p>}

      <div className="grid gap-5 xl:grid-cols-[200px_minmax(0,1fr)] 2xl:grid-cols-[200px_minmax(0,1fr)_300px]">
        {/* Misi */}
        <aside className="hidden xl:block">
          <div className="sticky top-24 space-y-4">
            <Panel className="p-4">
              <p className="mb-1 flex items-center gap-1.5 text-sm font-bold text-navy"><Sparkles size={15} className="text-[#ee4d2d]" />Misi</p>
              <p className="mb-3 text-xs text-slate-500">Lengkapi agar produk mudah ditemukan pembeli.</p>
              <ul className="space-y-2 text-xs">
                {mission.map(([t, ok]) => <li key={t} className={`flex items-start gap-2 ${ok ? "text-slate-400 line-through" : "text-slate-700"}`}>{ok ? <CheckCircle2 size={14} className="mt-px shrink-0 text-emerald-500" /> : <Circle size={14} className="mt-px shrink-0 text-slate-300" />}{t}</li>)}
              </ul>
            </Panel>
            <Panel className="p-2">
              {SECTIONS.map(([id, t]) => {
                const bad = tried && sectionProblems(id).length > 0;
                return <button key={id} onClick={() => go(id)} className={`flex w-full items-center justify-between rounded-lg px-3 py-2 text-left text-sm ${section === id ? "bg-orange-50 font-semibold text-[#ee4d2d]" : "text-slate-600 hover:bg-slate-50"}`}>{t}{bad && <span className="h-1.5 w-1.5 rounded-full bg-rose-500" />}</button>;
              })}
            </Panel>
          </div>
        </aside>

        <div className="min-w-0 space-y-5">
          {/* Tabs */}
          <div className="sticky top-16 z-20 -mx-1 overflow-x-auto rounded-xl border border-slate-100 bg-white/95 px-1 shadow-sm backdrop-blur">
            <div className="flex min-w-max">
              {SECTIONS.map(([id, t]) => <button key={id} onClick={() => go(id)} className={`border-b-2 px-4 py-3 text-sm font-medium transition ${section === id ? "border-[#ee4d2d] text-[#ee4d2d]" : "border-transparent text-slate-600 hover:text-navy"}`}>{t}</button>)}
            </div>
          </div>

          <Section id="info" sref={(el) => { refs.current["info"] = el; }} issues={tried ? sectionProblems("info") : []} title="Informasi Produk">
            <Row label="Ambil dari produk" hint="Opsional: isi otomatis dari produk Pesanin.">
              <Select className="input h-10" searchable value={productId} onChange={(e) => setProductId(e.target.value)}>
                <option value="">— Isi manual —</option>
                {products.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
              </Select>
            </Row>
            <Row label="Media Produk" req hint="Foto wajib. Video opsional dan akan diproses (transcoding) oleh Shopee sebelum produk tayang.">
              <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_220px]">
                <div className="rounded-xl border border-slate-200 bg-slate-50/50 p-3">
                  <div className="mb-3 flex items-center justify-between gap-3"><div><p className="text-sm font-semibold text-slate-700">Foto Produk</p><p className="text-xs text-slate-400">Rasio 1:1 · foto pertama menjadi sampul</p></div><span className="rounded-full bg-white px-2 py-1 text-xs font-semibold text-slate-500 shadow-sm">{images.length}/{lim?.images_max ?? 9}</span></div>
                  <div className="flex flex-wrap gap-2">
                {images.map((im, i) => (
                  <div key={im.id} className="group relative h-24 w-24 overflow-hidden rounded-lg border border-slate-200 bg-slate-100">
                    <img src={im.url} alt="" className="h-full w-full object-cover" />
                    {i === 0 && <span className="absolute inset-x-0 bottom-0 bg-black/55 py-0.5 text-center text-[10px] font-semibold text-white">Foto Sampul</span>}
                    <div className="absolute right-1 top-1 hidden gap-1 group-hover:flex">
                      {i > 0 && <button onClick={() => setImages([im, ...images.filter((x) => x.id !== im.id)])} className="rounded-md bg-white/90 px-1 text-[10px] font-semibold text-navy" title="Jadikan sampul">Sampul</button>}
                      <button onClick={() => setImages(images.filter((x) => x.id !== im.id))} className="rounded-md bg-white/90 p-1 text-rose-600" aria-label="Hapus foto"><Trash2 size={12} /></button>
                    </div>
                  </div>
                ))}
                {images.length < (lim?.images_max ?? 9) && (
                  <label className="flex h-24 w-24 cursor-pointer flex-col items-center justify-center gap-1 rounded-lg border border-dashed border-[#ee4d2d]/60 bg-white text-center text-xs text-[#ee4d2d] hover:bg-orange-50">
                    {uploading ? <Loader2 size={20} className="animate-spin" /> : <ImagePlus size={20} />}{uploading ? "Mengunggah…" : `Tambah Foto (${images.length}/${lim?.images_max ?? 9})`}
                    <input type="file" accept="image/jpeg,image/png" multiple className="hidden" onChange={(e) => { upload(e.target.files); e.target.value = ""; }} />
                  </label>
                )}
                  </div>
                  <p className="mt-2 text-[11px] text-slate-400">JPG/PNG, maksimal 10 MB per foto.</p>
                </div>
                <div className="rounded-xl border border-slate-200 bg-slate-50/50 p-3">
                  <div className="mb-3"><p className="text-sm font-semibold text-slate-700">Video Produk <span className="font-normal text-slate-400">(opsional)</span></p><p className="text-xs text-slate-400">MP4/MOV · maksimal 30 MB</p></div>
                  {video ? (
                    <div className="group relative overflow-hidden rounded-lg border border-slate-200 bg-slate-950">
                      {videoPreview ? <video src={videoPreview} className="aspect-video w-full object-cover" controls preload="metadata" /> : <div className="grid aspect-video place-items-center text-white"><Film size={28} /></div>}
                      <button type="button" onClick={() => { if (videoPreview) URL.revokeObjectURL(videoPreview); setVideoPreview(""); setVideo(null); }} className="absolute right-2 top-2 rounded-md bg-white/90 p-1.5 text-rose-600 shadow" aria-label="Hapus video"><Trash2 size={14} /></button>
                      <div className="bg-white px-2.5 py-2"><p className="truncate text-xs font-medium text-slate-700">{video.name}</p><p className="mt-0.5 flex items-center gap-1 text-[11px] text-emerald-600"><CheckCircle2 size={12} />Upload selesai · diproses Shopee</p></div>
                    </div>
                  ) : (
                    <label className={`flex min-h-32 cursor-pointer flex-col items-center justify-center gap-1.5 rounded-lg border border-dashed border-slate-300 bg-white px-4 text-center transition hover:border-[#ee4d2d] hover:bg-orange-50 ${uploadingVideo ? "pointer-events-none opacity-70" : ""}`}>
                      {uploadingVideo ? <Loader2 size={25} className="animate-spin text-[#ee4d2d]" /> : <span className="grid h-10 w-10 place-items-center rounded-full bg-orange-50 text-[#ee4d2d]"><Film size={20} /></span>}
                      <span className="text-xs font-semibold text-slate-700">{uploadingVideo ? "Mengunggah dan menyelesaikan video…" : "Tambah Video"}</span>
                      <span className="text-[11px] text-slate-400">Video diunggah per bagian lalu ditranscoding</span>
                      <input type="file" accept="video/mp4,video/quicktime" className="hidden" disabled={uploadingVideo} onChange={(e) => { uploadVideo(e.target.files?.[0] ?? null); e.target.value = ""; }} />
                    </label>
                  )}
                  {videoError && <div className="mt-2 rounded-lg border border-rose-100 bg-rose-50 px-2.5 py-2 text-xs leading-relaxed text-rose-700">{videoError}</div>}
                </div>
              </div>
            </Row>
            <Row label="Nama Produk" req>
              <div className="relative"><input className="input h-10 pr-20" placeholder="Nama Merek + Tipe Produk + Fitur Produk (Bahan, Warna, Ukuran, Variasi)" value={name} onChange={(e) => setName(e.target.value)} />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-400">{name.length}/{lim?.name_max ?? 255}</span></div>
            </Row>
            <Row label="Kategori" req>
              {cat ? (
                <div className="flex items-center justify-between gap-3 rounded-xl border border-orange-200 bg-orange-50/60 px-4 py-3 text-sm">
                  <span className="flex min-w-0 items-start gap-2 text-slate-700"><FolderTree size={17} className="mt-0.5 shrink-0 text-[#ee4d2d]" /><span className="font-medium">{cat.path}</span></span>
                  <button type="button" onClick={() => setCatOpen(true)} className="shrink-0 rounded-lg px-2.5 py-1.5 font-semibold text-[#ee4d2d] hover:bg-white">Ubah</button>
                </div>
              ) : (
                <button type="button" disabled={!cats} onClick={() => setCatOpen(true)} className="flex min-h-12 w-full items-center justify-between gap-3 rounded-xl border border-dashed border-slate-300 bg-slate-50/60 px-4 py-3 text-left transition hover:border-[#ee4d2d] hover:bg-orange-50 disabled:cursor-wait disabled:opacity-60">
                  <span className="flex items-center gap-2.5"><span className="grid h-8 w-8 place-items-center rounded-lg bg-white text-[#ee4d2d] shadow-sm"><FolderTree size={17} /></span><span><b className="block text-sm text-slate-700">{cats ? "Pilih kategori produk" : "Memuat kategori…"}</b><span className="text-xs text-slate-400">Telusuri kategori bertingkat atau cari berdasarkan nama</span></span></span>
                  <ChevronRight size={18} className="shrink-0 text-slate-400" />
                </button>
              )}
              {!cat && recs.length > 0 && (
                <div className="mt-3 rounded-lg bg-slate-50 p-3">
                  <p className="mb-2 text-xs font-semibold text-slate-600">Rekomendasi Kategori</p>
                  <div className="space-y-1.5">{recs.map((c) => <Radio key={c.id} on={false} onClick={() => setCat(c)}><span className="text-left">{c.path}</span></Radio>)}</div>
                </div>
              )}
            </Row>
            <Row label="GTIN" req={gtinRule !== "Optional"} hint="Kode barcode 8–14 digit (UPC, EAN, JAN, ISBN). Membantu produk muncul di pencarian.">
              <input className="input h-10" inputMode="numeric" placeholder="Masukkan GTIN" disabled={noGtin && gtinRule !== "Mandatory"} value={noGtin && gtinRule !== "Mandatory" ? "" : gtin} onChange={(e) => setGtin(e.target.value.replace(/\D/g, "").slice(0, 14))} />
              {gtinRule !== "Mandatory" && <label className="mt-2 flex items-center gap-2 text-sm text-slate-600"><input type="checkbox" checked={noGtin} onChange={(e) => setNoGtin(e.target.checked)} />Produk tanpa GTIN</label>}
            </Row>
            <Row label="Deskripsi Produk" req>
              <div className="relative"><textarea className="input min-h-44 py-2" value={desc} onChange={(e) => setDesc(e.target.value)} placeholder="Jelaskan bahan, ukuran, cara pakai, isi paket, dan garansi produk." />
                <span className="absolute bottom-2 right-3 text-xs text-slate-400">{desc.length}/{lim?.description_max ?? 3000}</span></div>
            </Row>
          </Section>

          <Section id="spec" sref={(el) => { refs.current["spec"] = el; }} issues={tried ? sectionProblems("spec") : []} title="Spesifikasi" sub="Lengkapi spesifikasi produk agar mudah ditemukan pembeli.">
            {!cat ? <p className="rounded-lg bg-slate-50 p-4 text-sm text-slate-500">Pilih kategori dulu untuk mengisi spesifikasi.</p>
              : !info ? <p className="flex items-center gap-2 text-sm text-slate-400"><Loader2 size={15} className="animate-spin" />Memuat atribut…</p>
              : <>
                <div>
                  <p className="mb-3 text-sm font-semibold text-navy">Atribut Utama</p>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="text-sm">
                      <span className="mb-1 block text-xs font-medium text-slate-600">{info.brands.mandatory && <span className="text-rose-500">* </span>}Merek</span>
                      <Select className="input h-10" searchable value={brandId} onChange={(e) => setBrandId(+e.target.value)}>
                        {!info.brands.list.some((b) => b.id === 0) && <option value={0}>{info.brands.mandatory ? "Mohon pilih" : "Tidak Ada Merek"}</option>}
                        {info.brands.list.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
                      </Select>
                    </div>
                    {mainAttrs.map(attrField)}
                  </div>
                </div>
                {otherAttrs.length > 0 && (
                  <div className="border-t border-slate-100 pt-4">
                    <p className="mb-3 text-sm font-semibold text-navy">Atribut Lainnya <span className="font-normal text-slate-400">({otherAttrs.filter(filled).length}/{otherAttrs.length})</span></p>
                    <div className="grid gap-4 sm:grid-cols-2">{(moreAttrs ? otherAttrs : otherAttrs.slice(0, 6)).map(attrField)}</div>
                    {otherAttrs.length > 6 && <button onClick={() => setMoreAttrs(!moreAttrs)} className="mt-3 text-sm font-semibold text-[#ee4d2d]">{moreAttrs ? "Tampilkan lebih sedikit" : `Tampilkan ${otherAttrs.length - 6} atribut lainnya`}</button>}
                  </div>
                )}
              </>}
          </Section>

          <Section id="sales" sref={(el) => { refs.current["sales"] = el; }} issues={tried ? sectionProblems("sales") : []} title="Informasi Penjualan">
            <Row label="Variasi">
              {!tiers.length ? (
                <button onClick={() => editTiers([{ name: "", options: [""] }])} className="flex h-10 items-center gap-1.5 rounded-lg border border-dashed border-[#ee4d2d]/60 px-4 text-sm font-medium text-[#ee4d2d] hover:bg-orange-50"><Plus size={15} />Aktifkan Variasi</button>
              ) : (
                <div className="space-y-3">
                  {tiers.map((t, ti) => (
                    <div key={ti} className="rounded-lg bg-slate-50 p-3">
                      <div className="mb-2 flex items-center gap-2">
                        <span className="w-20 shrink-0 text-xs font-medium text-slate-600">Variasi {ti + 1}</span>
                        <input className="input h-9" maxLength={14} placeholder="mis. Warna" value={t.name} onChange={(e) => editTiers(tiers.map((x, j) => j === ti ? { ...x, name: e.target.value } : x))} />
                        <button onClick={() => editTiers(tiers.filter((_, j) => j !== ti))} className="p-1.5 text-slate-400 hover:text-rose-600" aria-label="Hapus variasi"><X size={16} /></button>
                      </div>
                      <div className="flex items-start gap-2">
                        <span className="w-20 shrink-0 pt-2 text-xs font-medium text-slate-600">Opsi</span>
                        <div className="grid flex-1 gap-2 sm:grid-cols-2">
                          {[...t.options, ""].slice(0, 50).map((o, oi) => (
                            <div key={oi} className="flex items-center gap-1">
                              <input className="input h-9" maxLength={20} placeholder={oi === t.options.length ? "Tambah opsi" : "mis. Merah"} value={o}
                                onChange={(e) => { const opts = [...t.options]; opts[oi] = e.target.value; editTiers(tiers.map((x, j) => j === ti ? { ...x, options: opts } : x)); }} />
                              {oi < t.options.length && t.options.length > 1 && <button onClick={() => editTiers(tiers.map((x, j) => j === ti ? { ...x, options: x.options.filter((_, k) => k !== oi) } : x))} className="p-1 text-slate-400 hover:text-rose-600" aria-label="Hapus opsi"><Trash2 size={14} /></button>}
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  ))}
                  {tiers.length < 2 && <button onClick={() => editTiers([...tiers, { name: "", options: [""] }])} className="flex h-9 items-center gap-1.5 rounded-lg border border-dashed border-slate-300 px-3 text-sm text-slate-600 hover:border-[#ee4d2d] hover:text-[#ee4d2d]"><Plus size={14} />Tambah Variasi 2</button>}
                </div>
              )}
            </Row>

            {hasVariants ? (
              <Row label="Daftar Variasi" req>
                <div className="mb-2 flex flex-wrap gap-2">
                  <input type="number" className="input h-9 w-32" placeholder="Harga" value={bulk.price} onChange={(e) => setBulk({ ...bulk, price: e.target.value })} />
                  <input type="number" className="input h-9 w-28" placeholder="Stok" value={bulk.stock} onChange={(e) => setBulk({ ...bulk, stock: e.target.value })} />
                  <input className="input h-9 w-32" placeholder="Kode Variasi" value={bulk.sku} onChange={(e) => setBulk({ ...bulk, sku: e.target.value })} />
                  <button onClick={() => { setModels(models.map((m) => ({ ...m, ...(bulk.price ? { price: +bulk.price } : {}), ...(bulk.stock ? { stock: +bulk.stock } : {}), ...(bulk.sku ? { sku: bulk.sku } : {}) }))); setBulk({ price: "", stock: "", sku: "" }); }}
                    className="h-9 rounded-lg bg-[#ee4d2d] px-4 text-sm font-semibold text-white">Terapkan ke Semua</button>
                </div>
                <div className="overflow-x-auto rounded-lg border border-slate-200">
                  <table className="w-full min-w-[560px] text-sm">
                    <thead className="bg-slate-50 text-left text-xs text-slate-500"><tr>{liveTiers.map((t) => <th key={t.name} className="px-3 py-2">{t.name || "Variasi"}</th>)}<th className="px-3 py-2">* Harga</th><th className="px-3 py-2">* Stok</th><th className="px-3 py-2">Kode Variasi</th></tr></thead>
                    <tbody className="divide-y divide-slate-100">
                      {models.map((m, i) => (
                        <tr key={m.index.join("-")}>
                          {m.index.map((oi, k) => <td key={k} className="px-3 py-2 font-medium text-slate-700">{liveTiers[k]?.options[oi]}</td>)}
                          <td className="px-2 py-1.5"><div className="relative"><span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs text-slate-400">Rp</span><input type="number" className="input h-9 pl-8" value={m.price || ""} onChange={(e) => setModels(models.map((x, j) => j === i ? { ...x, price: +e.target.value } : x))} /></div></td>
                          <td className="px-2 py-1.5"><input type="number" className="input h-9" value={m.stock} onChange={(e) => setModels(models.map((x, j) => j === i ? { ...x, stock: +e.target.value } : x))} /></td>
                          <td className="px-2 py-1.5"><input className="input h-9" value={m.sku} onChange={(e) => setModels(models.map((x, j) => j === i ? { ...x, sku: e.target.value } : x))} /></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </Row>
            ) : (
              <>
                <Row label="Harga" req><div className="relative max-w-xs"><span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-slate-400">Rp</span><input type="number" className="input h-10 pl-9" placeholder="Masukkan" value={price || ""} onChange={(e) => setPrice(+e.target.value)} /></div></Row>
                <Row label="Stok" req><input type="number" className="input h-10 max-w-xs" value={stock} onChange={(e) => setStock(+e.target.value)} /></Row>
              </>
            )}

            <Row label="Grosir" hint={!samePrice ? "Harga grosir hanya bisa dipakai jika harga semua variasi sama." : "Harga lebih murah untuk pembelian dalam jumlah banyak."}>
              {wholesale.length > 0 && (
                <div className="mb-2 space-y-2">
                  {wholesale.map((w, i) => (
                    <div key={i} className="flex flex-wrap items-center gap-2 text-sm">
                      <span className="w-16 text-xs text-slate-500">Tingkat {i + 1}</span>
                      <input type="number" className="input h-9 w-24" placeholder="Min" value={w.min || ""} onChange={(e) => setWholesale(wholesale.map((x, j) => j === i ? { ...x, min: +e.target.value } : x))} />
                      <span className="text-slate-400">–</span>
                      <input type="number" className="input h-9 w-24" placeholder="Maks" value={w.max || ""} onChange={(e) => setWholesale(wholesale.map((x, j) => j === i ? { ...x, max: +e.target.value } : x))} />
                      <div className="relative"><span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs text-slate-400">Rp</span><input type="number" className="input h-9 w-36 pl-8" placeholder="Harga satuan" value={w.price || ""} onChange={(e) => setWholesale(wholesale.map((x, j) => j === i ? { ...x, price: +e.target.value } : x))} /></div>
                      <button onClick={() => setWholesale(wholesale.filter((_, j) => j !== i))} className="p-1 text-slate-400 hover:text-rose-600" aria-label="Hapus tingkat"><Trash2 size={14} /></button>
                    </div>
                  ))}
                </div>
              )}
              {wholesale.length < 5 && <button disabled={!samePrice} onClick={() => { const last = wholesale[wholesale.length - 1]; setWholesale([...wholesale, { min: last ? last.max + 1 : 2, max: last ? last.max + 10 : 10, price: 0 }]); }}
                className="flex h-9 items-center gap-1.5 rounded-lg border border-dashed border-slate-300 px-3 text-sm text-slate-600 hover:border-[#ee4d2d] hover:text-[#ee4d2d] disabled:opacity-50"><Plus size={14} />Tambah Harga Grosir</button>}
            </Row>
          </Section>

          <Section id="ship" sref={(el) => { refs.current["ship"] = el; }} issues={tried ? sectionProblems("ship") : []} title="Pengiriman">
            <Row label="Berat" req><div className="relative max-w-xs"><input type="number" className="input h-10 pr-10" placeholder="Masukkan berat" value={weight || ""} onChange={(e) => setWeight(+e.target.value)} /><span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-slate-400">gr</span></div></Row>
            <Row label="Ukuran Paket" req={lim?.dimension_mandatory} hint="Ukuran setelah dikemas, untuk menghitung ongkir volumetrik.">
              <div className="grid max-w-md grid-cols-3 gap-2">
                {([["width", "L (Lebar)"], ["length", "P (Panjang)"], ["height", "T (Tinggi)"]] as const).map(([k, l]) => (
                  <div key={k} className="relative"><input type="number" className="input h-10 pr-9" placeholder={l} value={dims[k]} onChange={(e) => setDims({ ...dims, [k]: e.target.value })} /><span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-400">cm</span></div>
                ))}
              </div>
            </Row>
            <Row label="Produk Berbahaya" req>
              <div className="flex flex-wrap gap-x-6 gap-y-2 pt-2">
                <Radio on={!dangerous} onClick={() => setDangerous(false)}>Tidak</Radio>
                <Radio on={dangerous} onClick={() => setDangerous(true)}>Mengandung baterai/magnet/cairan/bahan mudah terbakar</Radio>
              </div>
            </Row>
            <Row label="Ongkos Kirim" req>
              {!pickedShops.length ? <p className="pt-2 text-sm text-slate-400">Pilih toko tujuan untuk melihat jasa kirim.</p>
                : !channelNames.length ? <p className="pt-2 text-sm text-rose-600">Belum ada jasa kirim aktif di toko terpilih. Aktifkan di Seller Centre → Pengaturan Pengiriman.</p>
                : (
                  <div className="divide-y divide-slate-100 rounded-lg border border-slate-200">
                    {channelNames.map((n) => {
                      const on = !offChannels.includes(n);
                      const owners = pickedShops.filter((s) => s.channels.some((c) => c.name === n));
                      return (
                        <div key={n} className="flex items-center justify-between gap-3 px-4 py-3">
                          <div className="min-w-0"><p className="text-sm font-medium text-slate-700">{clean(n)}</p>
                            {pickedShops.length > 1 && <p className="truncate text-xs text-slate-400">{owners.length === pickedShops.length ? "Semua toko terpilih" : owners.map((s) => s.name).join(", ")}</p>}</div>
                          <Toggle checked={on} onChange={(v) => setOffChannels(v ? offChannels.filter((x) => x !== n) : [...offChannels, n])} />
                        </div>
                      );
                    })}
                  </div>
                )}
              <p className="mt-1.5 text-xs text-slate-400">Produk tidak dapat disimpan jika tidak ada jasa kirim yang aktif.{shopsWithoutCourier.length > 0 && pickedShops.length > 1 && <span className="text-rose-600"> Tanpa jasa kirim: {shopsWithoutCourier.map((s) => s.name).join(", ")}.</span>}</p>
            </Row>
            <Row label="Pre-Order">
              <div className="flex gap-6 pt-2">
                <Radio on={!preOrder} onClick={() => setPreOrder(false)}>Tidak</Radio>
                <Radio on={preOrder} onClick={() => setPreOrder(true)}>Ya</Radio>
              </div>
              <p className="mt-1 text-xs text-slate-400">{preOrder ? "" : `Kirimkan produk dalam ${lim?.dts_normal ?? 2} hari (tidak termasuk hari Sabtu, Minggu, libur nasional dan non-operasional jasa kirim).`}</p>
              {preOrder && (
                <div className="mt-2 flex items-center gap-2 text-sm text-slate-600">Saya butuh waktu
                  <input type="number" className="input h-9 w-20" min={lim?.dts_min} max={lim?.dts_max} value={dts} onChange={(e) => setDts(+e.target.value)} />
                  hari untuk mengirim <span className="text-xs text-slate-400">({lim?.dts_min ?? 5}–{lim?.dts_max ?? 15} hari)</span></div>
              )}
            </Row>
          </Section>

          <Section id="other" sref={(el) => { refs.current["other"] = el; }} issues={tried ? sectionProblems("other") : []} title="Lainnya">
            <Row label="Kondisi">
              <Select className="input h-10 max-w-xs" value={condition} onChange={(e) => setCondition(e.target.value as "NEW" | "USED")}>
                <option value="NEW">Baru</option><option value="USED">Bekas</option>
              </Select>
            </Row>
            <Row label="Jadwal Ditampilkan" hint="Produk disimpan dulu (diarsipkan) lalu tampil otomatis pada waktu ini. Minimal 1 jam, maksimal 90 hari dari sekarang.">
              <div className="flex flex-wrap items-center gap-3 pt-1">
                <Toggle checked={schedule} onChange={setSchedule} />
                {schedule && <DateTimePicker className="w-full max-w-md" value={publishAt} onChange={setPublishAt} />}
              </div>
            </Row>
            <Row label="SKU Induk"><input className="input h-10 max-w-md" placeholder="Masukkan SKU induk" value={sku} onChange={(e) => setSku(e.target.value)} /></Row>
            <Row label="Promosi">
              <div className="flex items-start gap-3 rounded-lg bg-slate-50 p-3 text-sm text-slate-600">
                <Megaphone size={18} className="mt-0.5 shrink-0 text-[#ee4d2d]" />
                <p>Iklankan produk setelah tayang supaya cepat laku. Atur di <Link href="/marketplace/ads" className="font-semibold text-[#ee4d2d]">Marketplace → Iklan</Link>.</p>
              </div>
            </Row>
          </Section>
        </div>

        {/* Preview + Toko tujuan */}
        <aside className="space-y-5 xl:col-start-2 2xl:col-start-auto">
          <div className="space-y-5 2xl:sticky 2xl:top-24">
            <Panel className="p-4">
              <p className="mb-3 text-sm font-bold text-navy">Preview</p>
              <div className="mx-auto max-w-[260px] overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
                <div className="aspect-square bg-slate-100">{images[0] ? <img src={images[0].url} alt="" className="h-full w-full object-cover" /> : <div className="grid h-full place-items-center text-slate-300"><ImagePlus size={36} /></div>}</div>
                {images.length > 1 && <div className="flex gap-1 overflow-x-auto p-1.5">{images.slice(1, 6).map((im) => <img key={im.id} src={im.url} alt="" className="h-10 w-10 shrink-0 rounded object-cover" />)}</div>}
                <div className="space-y-1.5 p-3">
                  <p className="text-base font-bold text-[#ee4d2d]">{basePrice ? priceLabel : "Rp -"}</p>
                  <p className="line-clamp-2 text-sm text-slate-800">{name || "Nama produk"}</p>
                  {wholesale.length > 0 && samePrice && <p className="text-[11px] text-[#ee4d2d]">Grosir mulai {rupiah(Math.min(...wholesale.map((w) => w.price || basePrice)))}</p>}
                  {liveTiers.map((t) => <div key={t.name} className="flex flex-wrap gap-1"><span className="mr-1 text-[11px] text-slate-400">{t.name}</span>{t.options.slice(0, 6).map((o) => <span key={o} className="rounded border border-slate-200 px-1.5 text-[11px] text-slate-600">{o}</span>)}</div>)}
                  <p className="text-[11px] text-slate-400">Stok {totalStock}{preOrder ? ` · Pre-order ${dts} hari` : ""}{condition === "USED" ? " · Bekas" : ""}</p>
                </div>
              </div>
            </Panel>

            <Panel className="p-4">
              <div className="flex items-center justify-between"><p className="text-sm font-bold text-navy">Toko tujuan</p>
                {shops && shops.filter((s) => !s.error).length > 1 && <button onClick={() => setPicked(picked.length === shops.filter((s) => !s.error).length ? [] : shops.filter((s) => !s.error).map((s) => s.id))} className="text-xs font-semibold text-[#ee4d2d]">{picked.length === shops.filter((s) => !s.error).length ? "Batal semua" : "Pilih semua"}</button>}
              </div>
              <div className="mt-2 max-h-72 space-y-1 overflow-y-auto">
                {!shops ? <p className="flex items-center gap-2 py-4 text-sm text-slate-400"><Loader2 size={14} className="animate-spin" />Memuat toko…</p>
                  : !shops.length ? <p className="py-4 text-sm text-slate-500">Belum ada toko. <Link href="/marketplace/shops" className="font-semibold text-[#ee4d2d]">Hubungkan toko</Link></p>
                  : shops.map((s) => {
                    const r = results[s.id];
                    return (
                      <label key={s.id} className={`flex items-start gap-2.5 rounded-lg px-2 py-2 text-sm ${s.error ? "opacity-60" : "cursor-pointer hover:bg-slate-50"}`}>
                        <input type="checkbox" className="mt-1" disabled={!!s.error || running} checked={picked.includes(s.id)} onChange={(e) => setPicked(e.target.checked ? [...picked, s.id] : picked.filter((x) => x !== s.id))} />
                        <ShopeeMark size={18} />
                        <span className="min-w-0 flex-1">
                          <b className="block truncate text-navy">{s.name}</b>
                          {s.error && <span className="block truncate text-xs text-slate-400">{s.error}</span>}
                          {r?.state === "fail" && <span className="block text-xs text-rose-600">{r.message}</span>}
                          {r?.state === "ok" && (() => {
                            const [label, tone] = r.shopee_status ? SHOPEE_STATUS[r.shopee_status] ?? [r.shopee_status, "text-slate-600"] : [r.status === "UNLIST" ? (schedule ? "Dijadwalkan" : "Diarsipkan") : "Terkirim ke Shopee", "text-emerald-600"];
                            return (
                              <span className="block text-xs">
                                <span className={`block ${tone}`}>{label} · item {r.item_id}</span>
                                <span className="mt-0.5 flex gap-3">
                                  {r.seller_centre_url && <a href={r.seller_centre_url} target="_blank" rel="noreferrer" onClick={(e) => e.stopPropagation()} className="font-semibold text-[#ee4d2d]">Buka di Seller Centre</a>}
                                  <button type="button" onClick={(e) => { e.preventDefault(); check(s.id); }} className="font-semibold text-slate-500 hover:text-navy">{r.checking ? "Mengecek…" : "Cek status"}</button>
                                </span>
                              </span>
                            );
                          })()}
                        </span>
                        {r?.state === "run" && <Loader2 size={16} className="mt-0.5 shrink-0 animate-spin text-[#ee4d2d]" />}
                        {r?.state === "ok" && <CheckCircle2 size={16} className="mt-0.5 shrink-0 text-emerald-500" />}
                        {r?.state === "fail" && <XCircle size={16} className="mt-0.5 shrink-0 text-rose-500" />}
                      </label>
                    );
                  })}
              </div>
              {Object.keys(results).length > 0 && !running && (
                <div className="mt-3 flex items-center justify-between border-t border-slate-100 pt-3 text-sm text-slate-600">
                  <span><b className="text-emerald-600">{done} berhasil</b>{failed.length > 0 && <>, <b className="text-rose-600">{failed.length} gagal</b></>}</span>
                  {done > 0 && <Link href="/marketplace/products" className="font-semibold text-[#ee4d2d]">Lihat produk</Link>}
                </div>
              )}
            </Panel>
          </div>
        </aside>
      </div>

      {catOpen && cats && (
        <CategoryPicker categories={cats} current={cat} recommendations={recs} onClose={() => setCatOpen(false)} onConfirm={(next) => { setCat(next); setCatOpen(false); }} />
      )}

      {success && (
        <Dialog title="Produk berhasil disimpan" icon={CheckCircle2} onClose={() => { setSuccess(null); setCountdown(null); }}>
          <div className="space-y-4">
            <div className="flex items-center gap-3 rounded-xl bg-emerald-50 p-3">
              <CheckCircle2 size={28} className="shrink-0 text-emerald-500" />
              <p className="text-sm text-emerald-800"><b>{name.trim()}</b> sudah dikirim ke {success.length} toko Shopee.</p>
            </div>
            <ul className="divide-y divide-slate-100 rounded-xl border border-slate-100 text-sm">
              {success.map(({ shop, r }) => {
                const [label, tone] = r.shopee_status ? SHOPEE_STATUS[r.shopee_status] ?? [r.shopee_status, "text-slate-600"] : [r.status === "UNLIST" ? (schedule ? "Dijadwalkan" : "Diarsipkan") : "Terkirim ke Shopee", "text-emerald-600"];
                return (
                  <li key={shop} className="flex items-center justify-between gap-3 px-3 py-2.5">
                    <span className="min-w-0"><b className="block truncate text-navy">{shop}</b><span className={`text-xs ${tone}`}>{label} · item {r.item_id}</span></span>
                    {r.seller_centre_url && <a href={r.seller_centre_url} target="_blank" rel="noreferrer" onClick={() => setCountdown(null)} className="shrink-0 text-xs font-semibold text-[#ee4d2d]">Buka di Seller Centre</a>}
                  </li>
                );
              })}
            </ul>
            {success.some(({ r }) => r.shopee_status && r.shopee_status !== "NORMAL") && <p className="text-xs text-slate-500">Produk yang belum &quot;Tayang&quot; ada di Seller Centre → Produk Saya, tab Sedang Diperiksa / Diarsipkan / Pelanggaran.</p>}
            {countdown !== null && <p className="text-xs text-slate-400">Kembali ke daftar produk dalam {countdown} detik…</p>}
            <div className="flex flex-wrap justify-end gap-2">
              <button onClick={() => window.location.assign("/marketplace/publish")} className="h-10 rounded-lg border border-slate-200 px-4 text-sm font-medium text-slate-700 hover:bg-slate-50">Tambah Produk Lain</button>
              <button onClick={() => router.push("/marketplace/products")} className="h-10 rounded-lg bg-[#ee4d2d] px-5 text-sm font-semibold text-white hover:bg-[#d73f22]">Kembali ke Daftar Produk</button>
            </div>
          </div>
        </Dialog>
      )}

      {/* Action bar */}
      <div className="sticky bottom-0 z-30 rounded-t-xl border border-slate-200 bg-white/95 shadow-[0_-8px_24px_-16px_rgba(15,23,42,0.3)] backdrop-blur">
        <div className="flex flex-wrap items-center justify-end gap-2 px-4 py-3">
          {tried && problems.length > 0 && <button onClick={() => go(problems[0][0])} className="mr-auto truncate text-left text-xs text-rose-600">{problems[0][1]}{problems.length > 1 && ` (+${problems.length - 1} lagi)`}</button>}
          {failed.length > 0 && !running && <button onClick={() => publish(schedule ? "UNLIST" : "NORMAL", failed)} className="flex h-10 items-center gap-1.5 rounded-lg border border-slate-200 px-3 text-sm font-semibold text-navy"><RotateCcw size={15} />Ulangi yang gagal</button>}
          <Link href="/marketplace/products" className="hidden h-10 items-center rounded-lg border border-slate-200 px-4 sm:flex text-sm font-medium text-slate-700 hover:bg-slate-50">Kembali</Link>
          <button onClick={() => publish("UNLIST")} disabled={running || uploading || uploadingVideo || allDone} className="h-10 rounded-lg border border-slate-200 px-4 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50">Simpan & Arsipkan</button>
          <button onClick={() => publish("NORMAL")} disabled={running || uploading || uploadingVideo || allDone} className="flex h-10 items-center gap-2 rounded-lg bg-[#ee4d2d] px-5 text-sm font-semibold text-white hover:bg-[#d73f22] disabled:opacity-50">
            {running && <Loader2 size={15} className="animate-spin" />}{running ? "Menyimpan…" : allDone ? "Tersimpan" : schedule ? "Simpan & Jadwalkan" : "Simpan & Tampilkan"}{picked.length > 1 && !running && !allDone ? ` (${picked.filter((id) => results[id]?.state !== "ok").length} toko)` : ""}
          </button>
        </div>
      </div>
    </div>
  );
}

function Section({ id, title, sub, issues, sref, children }: { id: string; title: string; sub?: string; issues: string[]; sref: (el: HTMLElement | null) => void; children: React.ReactNode }) {
  return (
    <section id={id} ref={sref} className="scroll-mt-36">
      <Panel className="overflow-hidden p-0">
        <div className="border-b border-slate-100 bg-slate-50/70 px-5 py-4 sm:px-6"><h2 className="text-lg font-bold text-navy">{title}</h2>{sub && <p className="mt-0.5 text-sm text-slate-500">{sub}</p>}</div>
        <div className="space-y-5 p-5 sm:p-6">
          {issues.length > 0 && <ul className="space-y-0.5 rounded-xl border border-rose-100 bg-rose-50 px-3 py-2 text-xs text-rose-700">{issues.map((p) => <li key={p}>• {p}</li>)}</ul>}
          {children}
        </div>
      </Panel>
    </section>
  );
}

function Row({ label, req, hint, children }: { label: string; req?: boolean; hint?: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="grid gap-1.5 lg:grid-cols-[150px_1fr] lg:gap-4">
      <div className="text-sm font-medium text-slate-700 lg:pt-2 lg:text-right">{req && <span className="text-rose-500">* </span>}{label}</div>
      <div className="min-w-0">{children}{hint && <p className="mt-1 text-xs text-slate-400">{hint}</p>}</div>
    </div>
  );
}

function Radio({ on, onClick, children }: { on: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button type="button" onClick={onClick} className="flex items-center gap-2 text-left text-sm text-slate-700">
      <span className={`grid h-4 w-4 shrink-0 place-items-center rounded-full border ${on ? "border-[#ee4d2d]" : "border-slate-300"}`}>{on && <span className="h-2 w-2 rounded-full bg-[#ee4d2d]" />}</span>{children}
    </button>
  );
}

const categoryParts = (path: string) => path.split(/\s*(?:›|>)\s*/).map((x) => x.trim()).filter(Boolean);

function CategoryPicker({ categories, current, recommendations, onClose, onConfirm }: { categories: Cat[]; current: Cat | null; recommendations: Cat[]; onClose: () => void; onConfirm: (cat: Cat) => void }) {
  const [query, setQuery] = useState("");
  const [trail, setTrail] = useState<string[]>(() => current ? categoryParts(current.path).slice(0, -1) : []);
  const [selected, setSelected] = useState<Cat | null>(current);
  const search = useMemo(() => {
    const q = query.trim().toLowerCase();
    return q ? categories.filter((c) => `${c.name} ${c.path}`.toLowerCase().includes(q)).slice(0, 80) : [];
  }, [categories, query]);
  const maxDepth = Math.max(1, ...categories.map((c) => categoryParts(c.path).length));
  const visibleDepth = Math.min(maxDepth, Math.max(3, trail.length + 1));
  const optionsAt = (depth: number) => {
    const names = new Map<string, { name: string; leaf: Cat | null }>();
    for (const c of categories) {
      const parts = categoryParts(c.path);
      if (trail.slice(0, depth).some((p, i) => parts[i] !== p) || !parts[depth]) continue;
      const name = parts[depth];
      const existing = names.get(name);
      names.set(name, { name, leaf: parts.length === depth + 1 ? c : existing?.leaf ?? null });
    }
    return [...names.values()].sort((a, b) => a.name.localeCompare(b.name, "id"));
  };
  const choose = (depth: number, option: { name: string; leaf: Cat | null }) => {
    const next = [...trail.slice(0, depth), option.name];
    setTrail(option.leaf ? next.slice(0, -1) : next);
    setSelected(option.leaf);
  };
  const chooseSearch = (c: Cat) => { setSelected(c); setTrail(categoryParts(c.path).slice(0, -1)); };

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-slate-950/45 p-0 backdrop-blur-[2px] sm:items-center sm:p-6" role="dialog" aria-modal="true" aria-label="Pilih kategori produk">
      <div className="flex max-h-[94vh] w-full max-w-5xl flex-col overflow-hidden rounded-t-2xl bg-white shadow-2xl sm:max-h-[86vh] sm:rounded-2xl">
        <div className="flex items-start justify-between gap-4 border-b border-slate-100 px-5 py-4 sm:px-6">
          <div><h2 className="text-lg font-bold text-navy">Pilih Kategori</h2><p className="mt-0.5 text-sm text-slate-500">Pilih sampai kategori paling spesifik agar atribut produk sesuai.</p></div>
          <button type="button" onClick={onClose} className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-700" aria-label="Tutup"><X size={20} /></button>
        </div>
        <div className="space-y-4 overflow-hidden bg-slate-50/70 p-4 sm:p-5">
          <div className="relative"><Search size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" /><input autoFocus className="input h-11 bg-white pl-10" placeholder="Cari kategori, mis. helm, serum, atau buku…" value={query} onChange={(e) => setQuery(e.target.value)} /></div>
          {!query && recommendations.length > 0 && <div className="flex items-center gap-2 overflow-x-auto pb-0.5"><span className="shrink-0 text-xs font-semibold text-slate-500">Rekomendasi:</span>{recommendations.slice(0, 5).map((c) => <button type="button" key={c.id} onClick={() => chooseSearch(c)} className="shrink-0 rounded-full border border-orange-200 bg-white px-3 py-1.5 text-xs font-medium text-[#d94727] hover:bg-orange-50">{c.name}</button>)}</div>}
          <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
            {query ? (
              <div className="max-h-[48vh] overflow-y-auto p-2">
                {search.length ? search.map((c) => <button type="button" key={c.id} onClick={() => chooseSearch(c)} className={`flex w-full items-center justify-between gap-3 rounded-lg px-3 py-2.5 text-left hover:bg-slate-50 ${selected?.id === c.id ? "bg-orange-50 text-[#ee4d2d]" : "text-slate-700"}`}><span><b className="block text-sm">{c.name}</b><span className="block text-xs text-slate-400">{c.path}</span></span>{selected?.id === c.id && <CheckCircle2 size={17} className="shrink-0" />}</button>) : <p className="p-8 text-center text-sm text-slate-400">Kategori tidak ditemukan. Coba kata yang lebih umum.</p>}
              </div>
            ) : (
              <div className="flex min-h-[330px] max-h-[48vh] overflow-x-auto">
                {Array.from({ length: visibleDepth }, (_, depth) => {
                  const opts = optionsAt(depth);
                  if (!opts.length && depth > trail.length) return null;
                  return <div key={depth} className="w-[245px] shrink-0 overflow-y-auto border-r border-slate-100 p-2 last:border-r-0 sm:w-auto sm:min-w-[220px] sm:flex-1">{opts.map((o) => {
                    const active = trail[depth] === o.name || (selected && categoryParts(selected.path)[depth] === o.name);
                    return <button type="button" key={o.name} onClick={() => choose(depth, o)} className={`flex w-full items-center justify-between gap-2 rounded-lg px-3 py-2.5 text-left text-sm transition ${active ? "bg-orange-50 font-semibold text-[#ee4d2d]" : "text-slate-700 hover:bg-slate-50"}`}><span className="truncate">{o.name}</span>{o.leaf ? active && <CheckCircle2 size={15} className="shrink-0" /> : <ChevronRight size={15} className="shrink-0 text-slate-400" />}</button>;
                  })}</div>;
                })}
              </div>
            )}
          </div>
        </div>
        <div className="flex flex-col gap-3 border-t border-slate-100 bg-white px-5 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6">
          <div className="min-w-0 text-sm"><span className="text-slate-400">Dipilih: </span>{selected ? <b className="text-slate-700">{selected.path}</b> : <span className="text-amber-600">Pilih sampai kategori terakhir</span>}</div>
          <div className="flex shrink-0 justify-end gap-2"><button type="button" onClick={onClose} className="h-10 rounded-lg border border-slate-200 px-4 text-sm font-semibold text-slate-600 hover:bg-slate-50">Batal</button><button type="button" disabled={!selected} onClick={() => selected && onConfirm(selected)} className="h-10 rounded-lg bg-[#ee4d2d] px-5 text-sm font-semibold text-white hover:bg-[#d94325] disabled:cursor-not-allowed disabled:opacity-40">Pilih Kategori</button></div>
        </div>
      </div>
    </div>
  );
}
