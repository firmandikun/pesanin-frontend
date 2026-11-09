"use client";
import { CheckCircle2, ImagePlus, Loader2, Plus, RotateCcw, Search, Trash2, Upload, XCircle } from "lucide-react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense, useEffect, useMemo, useState } from "react";
import { ShopeeMark } from "@/components/ChannelBadge";
import { PageHead, Panel } from "@/components/kit";
import { Select } from "@/components/Select";
import { api, ApiError, rupiah } from "@/lib/api";

type Cat = { id: number; name: string; path: string };
type Attr = { id: number; name: string; mandatory: boolean; input_type: number; validation: number; units: string[]; values: { id: number; name: string }[] };
type CatInfo = { attributes: Attr[]; brands: { mandatory: boolean; list: { id: number; name: string }[] }; limits: { images_min: number; images_max: number; name_min: number; name_max: number; description_max: number; price_min: number } };
type ShopOpt = { id: number; shop_id: number; name: string; channels: { id: number; name: string }[]; error: string | null };
type Img = { id: string; url: string; name: string };
type Answer = { value_ids: number[]; text: string; unit: string; custom?: boolean };
type Model = { label: string; index: number[]; price: number; stock: number; sku: string };
type Result = { state: "wait" | "run" | "ok" | "fail"; message?: string; item_id?: number };
type Prod = { id: number; name: string; description: string | null; price: number; stock: number | null; sku: string | null; weight: number | null; images: string[] | null;
  variants: { name: string; price: number; stock?: number; sku?: string }[] | null; variant_options: { type: string; values: string[] }[] | null };

/** yyyy-mm-dd in the browser's timezone (toISOString would shift WIB midnight back a day). */
const localDay = (ts: number) => { const d = new Date(ts * 1000); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`; };
const MULTI = (a: Attr) => a.input_type === 4 || a.input_type === 5;
const CUSTOM_OK = (a: Attr) => a.input_type === 2 || a.input_type === 3 || a.input_type === 5;

export default function PublishPage() {
  return <Suspense fallback={null}><Publish /></Suspense>;
}

/** Upload satu produk ke banyak toko Shopee sekaligus. */
function Publish() {
  const sp = useSearchParams();
  const [products, setProducts] = useState<Prod[]>([]);
  const [productId, setProductId] = useState(sp.get("product") ?? "");
  const [name, setName] = useState("");
  const [desc, setDesc] = useState("");
  const [price, setPrice] = useState(0);
  const [stock, setStock] = useState(0);
  const [sku, setSku] = useState("");
  const [weight, setWeight] = useState(100);
  const [dims, setDims] = useState({ length: "", width: "", height: "" });
  const [images, setImages] = useState<Img[]>([]);
  const [uploading, setUploading] = useState(false);
  const [tiers, setTiers] = useState<{ name: string; options: string[] }[]>([]);
  const [models, setModels] = useState<Model[]>([]);

  const [cats, setCats] = useState<Cat[] | null>(null);
  const [catQ, setCatQ] = useState("");
  const [cat, setCat] = useState<Cat | null>(null);
  const [info, setInfo] = useState<CatInfo | null>(null);
  const [answers, setAnswers] = useState<Record<number, Answer>>({});
  const [brandId, setBrandId] = useState(0);
  const [brandQ, setBrandQ] = useState("");

  const [shops, setShops] = useState<ShopOpt[] | null>(null);
  const [shopQ, setShopQ] = useState("");
  const [picked, setPicked] = useState<number[]>([]);
  const [results, setResults] = useState<Record<number, Result>>({});
  const [running, setRunning] = useState(false);
  const [err, setErr] = useState("");

  useEffect(() => {
    api("/products?per_page=100&type=physical").then((r) => setProducts(r.products.data));
    api<Cat[]>("/marketplace/publish/categories").then(setCats).catch((e) => setErr(e instanceof ApiError ? e.message : "Gagal memuat kategori Shopee"));
    api<ShopOpt[]>("/marketplace/publish/shops").then((s) => { setShops(s); setPicked(s.filter((x) => !x.error).map((x) => x.id)); });
  }, []);

  // Prefill from a Pesanin product.
  useEffect(() => {
    const p = products.find((x) => String(x.id) === productId);
    if (!p) return;
    setName(p.name); setDesc(p.description ?? p.name); setPrice(p.price); setStock(p.stock ?? 0); setSku(p.sku ?? ""); setWeight(p.weight || 100);
    const opts = (p.variant_options ?? []).slice(0, 2).filter((o) => o.values?.length);
    if (p.variants?.length && opts.length) {
      setTiers(opts.map((o) => ({ name: o.type.slice(0, 14), options: o.values.map((v) => v.slice(0, 20)) })));
      setModels(p.variants.map((v) => {
        const parts = opts.length > 1 ? v.name.split(/\s*[/,]\s*/) : [v.name];
        return { label: v.name, index: parts.map((part, k) => Math.max(0, opts[k]?.values.indexOf(part) ?? 0)), price: v.price, stock: v.stock ?? 0, sku: v.sku ?? "" };
      }));
    } else { setTiers([]); setModels([]); }
    if (p.images?.length) {
      setUploading(true);
      api<Img[]>("/marketplace/publish/images", { method: "POST", json: { urls: p.images.slice(0, 9) } }).then(setImages).catch(() => setImages([])).finally(() => setUploading(false));
    }
  }, [productId, products]);

  useEffect(() => {
    if (!cat) return setInfo(null);
    setInfo(null); setAnswers({}); setBrandId(0);
    api<CatInfo>(`/marketplace/publish/categories/${cat.id}`).then(setInfo).catch((e) => setErr(e instanceof ApiError ? e.message : "Gagal memuat atribut"));
  }, [cat]);

  const catMatches = useMemo(() => {
    const q = catQ.trim().toLowerCase();
    if (!cats || q.length < 2) return [];
    return cats.filter((c) => c.path.toLowerCase().includes(q)).slice(0, 40);
  }, [cats, catQ]);

  const upload = async (files: FileList | null) => {
    if (!files?.length) return;
    const fd = new FormData();
    [...files].slice(0, 9 - images.length).forEach((f) => fd.append("files[]", f));
    setUploading(true); setErr("");
    try { const added = await api<Img[]>("/marketplace/publish/images", { method: "POST", body: fd }); setImages((i) => [...i, ...added].slice(0, 9)); }
    catch (e) { setErr(e instanceof ApiError ? e.message : "Upload foto gagal"); } finally { setUploading(false); }
  };

  const setAns = (id: number, patch: Partial<Answer>) => setAnswers((a) => ({ ...a, [id]: { ...(a[id] ?? { value_ids: [], text: "", unit: "" }), ...patch } }));
  const filled = (a: Attr) => { const x = answers[a.id]; return !!x && (x.value_ids.length > 0 || x.text.trim() !== ""); };

  const problems = [
    !name.trim() && "Nama produk wajib diisi",
    info && (name.length < info.limits.name_min || name.length > info.limits.name_max) && `Nama ${info.limits.name_min}–${info.limits.name_max} karakter`,
    !desc.trim() && "Deskripsi wajib diisi",
    info && desc.length > info.limits.description_max && `Deskripsi maks ${info.limits.description_max} karakter`,
    !cat && "Pilih kategori Shopee",
    info && images.length < info.limits.images_min && `Minimal ${info.limits.images_min} foto`,
    !info && images.length < 1 && "Tambahkan foto",
    !models.length && price < (info?.limits.price_min ?? 100) && "Harga terlalu rendah",
    info?.attributes.filter((a) => a.mandatory && !filled(a)).map((a) => `Isi atribut "${a.name}"`)[0],
    info?.brands.mandatory && brandId === 0 && !info.brands.list.some((b) => b.id === 0) && "Pilih merek",
    !picked.length && "Pilih minimal 1 toko",
  ].filter(Boolean) as string[];

  const publish = async (only?: number[]) => {
    // Shops that already got this product are skipped, so a second click can't create duplicates.
    const targets = (only ?? picked).filter((id) => results[id]?.state !== "ok");
    if (!targets.length) return;
    setRunning(true); setErr("");
    setResults((r) => ({ ...r, ...Object.fromEntries(targets.map((id) => [id, { state: "wait" }])) }));
    const body = {
      product_id: productId ? Number(productId) : null, name: name.trim(), description: desc.trim(), category_id: cat!.id,
      brand_id: brandId, brand_name: info?.brands.list.find((b) => b.id === brandId)?.name ?? "NoBrand",
      price, stock, sku: sku || null, weight, image_ids: images.map((i) => i.id),
      ...(dims.length && dims.width && dims.height ? { length: +dims.length, width: +dims.width, height: +dims.height } : {}),
      attributes: Object.entries(answers).map(([id, a]) => ({ id: +id, value_ids: a.value_ids, text: a.text, unit: a.unit || null })),
      ...(models.length ? { tiers, models: models.map((m) => ({ index: m.index, price: m.price, stock: m.stock, sku: m.sku || null })) } : {}),
    };
    for (const id of targets) {
      setResults((r) => ({ ...r, [id]: { state: "run" } }));
      try {
        const r = await api<{ item_id: number }>(`/marketplace/publish/${id}`, { method: "POST", json: body });
        setResults((x) => ({ ...x, [id]: { state: "ok", item_id: r.item_id } }));
      } catch (e) {
        setResults((x) => ({ ...x, [id]: { state: "fail", message: e instanceof ApiError ? e.message : "Gagal" } }));
      }
    }
    setRunning(false);
  };

  const shopList = (shops ?? []).filter((s) => !shopQ || s.name.toLowerCase().includes(shopQ.toLowerCase()) || String(s.shop_id).includes(shopQ));
  const done = Object.values(results).filter((r) => r.state === "ok").length;
  const failed = Object.entries(results).filter(([, r]) => r.state === "fail").map(([id]) => +id);
  const brands = (info?.brands.list ?? []).filter((b) => !brandQ || b.name.toLowerCase().includes(brandQ.toLowerCase())).slice(0, 100);

  return (
    <div className="space-y-5">
      <PageHead title="Upload ke Shopee" tutorial={false} crumbs={[["Marketplace"], ["Produk Shopee", "/marketplace/products"], ["Upload"]]} />
      {err && <p className="rounded-xl bg-rose-50 p-3 text-sm text-rose-700">{err}</p>}

      <div className="grid gap-5 xl:grid-cols-[1fr_380px]">
        <div className="space-y-5">
          {/* 1. Produk */}
          <Panel className="space-y-4 p-5">
            <h2 className="font-bold text-navy">1. Produk</h2>
            <label className="block text-sm"><span className="mb-1 block font-medium text-slate-700">Ambil dari produk Pesanin (opsional)</span>
              <Select className="input h-10" value={productId} onChange={(e) => setProductId(e.target.value)}>
                <option value="">— Isi manual —</option>
                {products.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
              </Select>
            </label>
            <label className="block text-sm"><span className="mb-1 flex justify-between font-medium text-slate-700">Nama produk *<span className="text-xs font-normal text-slate-400">{name.length}/{info?.limits.name_max ?? 226}</span></span>
              <input className="input h-10" value={name} onChange={(e) => setName(e.target.value)} /></label>
            <label className="block text-sm"><span className="mb-1 flex justify-between font-medium text-slate-700">Deskripsi *<span className="text-xs font-normal text-slate-400">{desc.length}/{info?.limits.description_max ?? 3000}</span></span>
              <textarea className="input min-h-28 py-2" value={desc} onChange={(e) => setDesc(e.target.value)} /></label>

            <div>
              <p className="mb-2 text-sm font-medium text-slate-700">Foto * <span className="font-normal text-slate-400">({images.length}/{info?.limits.images_max ?? 9}{info ? `, minimal ${info.limits.images_min}` : ""})</span></p>
              <div className="flex flex-wrap gap-2">
                {images.map((im, i) => (
                  <div key={im.id} className="group relative h-24 w-24 overflow-hidden rounded-xl bg-slate-100">
                    <img src={im.url} alt="" className="h-full w-full object-cover" />
                    {i === 0 && <span className="absolute left-1 top-1 rounded bg-navy px-1 text-[10px] font-semibold text-white">Utama</span>}
                    <button onClick={() => setImages(images.filter((x) => x.id !== im.id))} className="absolute right-1 top-1 hidden rounded-md bg-white/90 p-1 text-rose-600 group-hover:block" aria-label="Hapus foto"><Trash2 size={13} /></button>
                  </div>
                ))}
                {images.length < 9 && (
                  <label className="flex h-24 w-24 cursor-pointer flex-col items-center justify-center gap-1 rounded-xl border-2 border-dashed border-slate-200 text-xs text-slate-500 hover:border-brand-400">
                    {uploading ? <Loader2 size={18} className="animate-spin" /> : <ImagePlus size={18} />}{uploading ? "Mengunggah…" : "Tambah foto"}
                    <input type="file" accept="image/jpeg,image/png" multiple className="hidden" onChange={(e) => { upload(e.target.files); e.target.value = ""; }} />
                  </label>
                )}
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-3">
              {!models.length && <>
                <label className="text-sm"><span className="mb-1 block font-medium text-slate-700">Harga *</span><input type="number" className="input h-10" value={price || ""} onChange={(e) => setPrice(+e.target.value)} /></label>
                <label className="text-sm"><span className="mb-1 block font-medium text-slate-700">Stok *</span><input type="number" className="input h-10" value={stock} onChange={(e) => setStock(+e.target.value)} /></label>
                <label className="text-sm"><span className="mb-1 block font-medium text-slate-700">SKU</span><input className="input h-10" value={sku} onChange={(e) => setSku(e.target.value)} /></label>
              </>}
              <label className="text-sm"><span className="mb-1 block font-medium text-slate-700">Berat (gram) *</span><input type="number" className="input h-10" value={weight || ""} onChange={(e) => setWeight(+e.target.value)} /></label>
              <div className="text-sm sm:col-span-2"><span className="mb-1 block font-medium text-slate-700">Ukuran paket (cm, opsional)</span>
                <div className="flex gap-2">{(["length", "width", "height"] as const).map((k) => <input key={k} type="number" className="input h-10" placeholder={{ length: "P", width: "L", height: "T" }[k]} value={dims[k]} onChange={(e) => setDims({ ...dims, [k]: e.target.value })} />)}</div>
              </div>
            </div>

            {models.length > 0 && (
              <div>
                <p className="mb-2 text-sm font-medium text-slate-700">Varian ({tiers.map((t) => t.name).join(" × ")})</p>
                <div className="overflow-x-auto rounded-xl border border-slate-100">
                  <table className="w-full min-w-[520px] text-sm">
                    <thead className="bg-slate-50 text-left text-xs text-slate-500"><tr><th className="px-3 py-2">Varian</th><th className="px-3 py-2">Harga</th><th className="px-3 py-2">Stok</th><th className="px-3 py-2">SKU</th></tr></thead>
                    <tbody className="divide-y divide-slate-100">
                      {models.map((m, i) => (
                        <tr key={i}>
                          <td className="px-3 py-2 font-medium text-slate-700">{m.index.map((ti, k) => tiers[k]?.options[ti]).join(", ")}</td>
                          {(["price", "stock", "sku"] as const).map((k) => (
                            <td key={k} className="px-3 py-1.5"><input type={k === "sku" ? "text" : "number"} className="input h-9" value={m[k] as string | number}
                              onChange={(e) => setModels(models.map((x, j) => j === i ? { ...x, [k]: k === "sku" ? e.target.value : +e.target.value } : x))} /></td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </Panel>

          {/* 2. Kategori & atribut */}
          <Panel className="space-y-4 p-5">
            <h2 className="font-bold text-navy">2. Kategori & atribut Shopee</h2>
            {cat ? (
              <div className="flex items-center justify-between gap-3 rounded-xl bg-orange-50 px-4 py-3 text-sm">
                <span className="text-slate-700">{cat.path}</span>
                <button onClick={() => { setCat(null); setCatQ(""); }} className="shrink-0 font-semibold text-brand-600">Ganti</button>
              </div>
            ) : (
              <div>
                <div className="relative"><Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input className="input h-10 pl-9" placeholder={cats ? `Cari dari ${cats.length.toLocaleString("id-ID")} kategori, mis. serum` : "Memuat kategori…"} value={catQ} onChange={(e) => setCatQ(e.target.value)} disabled={!cats} /></div>
                {catMatches.length > 0 && (
                  <ul className="mt-2 max-h-64 overflow-y-auto rounded-xl border border-slate-100">
                    {catMatches.map((c) => <li key={c.id}><button onClick={() => setCat(c)} className="w-full px-3 py-2 text-left text-sm hover:bg-slate-50"><b className="text-navy">{c.name}</b><span className="block text-xs text-slate-500">{c.path}</span></button></li>)}
                  </ul>
                )}
                {catQ.trim().length >= 2 && cats && !catMatches.length && <p className="mt-2 text-sm text-slate-400">Tidak ada kategori yang cocok.</p>}
              </div>
            )}

            {cat && !info && <p className="flex items-center gap-2 text-sm text-slate-400"><Loader2 size={15} className="animate-spin" />Memuat atribut…</p>}
            {info && (
              <>
                <div className="grid gap-3 sm:grid-cols-2">
                  {info.attributes.map((a) => {
                    const v: Answer = answers[a.id] ?? { value_ids: [], text: "", unit: "" };
                    const label = <span className="mb-1 block font-medium text-slate-700">{a.name}{a.mandatory && <span className="text-rose-500"> *</span>}</span>;
                    if (MULTI(a)) return (
                      <div key={a.id} className="text-sm sm:col-span-2">{label}
                        <div className="flex flex-wrap gap-1.5">{a.values.map((o) => {
                          const on = v.value_ids.includes(o.id);
                          return <button key={o.id} type="button" onClick={() => setAns(a.id, { value_ids: on ? v.value_ids.filter((x) => x !== o.id) : [...v.value_ids, o.id] })} className={`rounded-lg px-2.5 py-1 text-xs font-medium ${on ? "bg-navy text-white" : "bg-slate-100 text-slate-600"}`}>{o.name}</button>;
                        })}</div>
                      </div>
                    );
                    if (a.values.length) return (
                      <label key={a.id} className="text-sm">{label}
                        <Select className="input h-10" value={v.custom ? "custom" : v.value_ids[0] ?? ""} onChange={(e) => e.target.value === "custom" ? setAns(a.id, { value_ids: [], custom: true }) : setAns(a.id, { value_ids: e.target.value ? [+e.target.value] : [], text: "", custom: false })}>
                          <option value="">— Pilih —</option>
                          {a.values.map((o) => <option key={o.id} value={o.id}>{o.name}</option>)}
                          {CUSTOM_OK(a) && <option value="custom">Lainnya (isi sendiri)…</option>}
                        </Select>
                        {v.custom && (
                          <div className="mt-1.5 flex gap-2"><input className="input h-9" placeholder="Isi nilai" value={v.text} onChange={(e) => setAns(a.id, { text: e.target.value })} />
                            {a.units.length > 0 && <Select className="input h-9 w-24" value={v.unit} onChange={(e) => setAns(a.id, { unit: e.target.value })}><option value="">Unit</option>{a.units.map((u) => <option key={u}>{u}</option>)}</Select>}</div>
                        )}
                      </label>
                    );
                    return (
                      <label key={a.id} className="text-sm">{label}
                        {a.validation === 4
                          ? <input type="date" className="input h-10" value={v.text ? localDay(+v.text) : ""} onChange={(e) => setAns(a.id, { text: e.target.value ? String(Math.floor(new Date(e.target.value + "T12:00:00").getTime() / 1000)) : "" })} />
                          : <div className="flex gap-2"><input type={a.validation === 1 || a.validation === 3 ? "number" : "text"} className="input h-10" value={v.text} onChange={(e) => setAns(a.id, { text: e.target.value })} />
                            {a.units.length > 0 && <Select className="input h-10 w-24" value={v.unit} onChange={(e) => setAns(a.id, { unit: e.target.value })}><option value="">Unit</option>{a.units.map((u) => <option key={u}>{u}</option>)}</Select>}</div>}
                      </label>
                    );
                  })}
                </div>
                <div className="text-sm">
                  <span className="mb-1 block font-medium text-slate-700">Merek{info.brands.mandatory && <span className="text-rose-500"> *</span>}</span>
                  <div className="flex gap-2">
                    {info.brands.list.length > 20 && <input className="input h-10 w-48" placeholder="Cari merek" value={brandQ} onChange={(e) => setBrandQ(e.target.value)} />}
                    <Select className="input h-10 flex-1" value={brandId} onChange={(e) => setBrandId(+e.target.value)}>
                      {!info.brands.list.some((b) => b.id === 0) && <option value={0}>— Pilih merek —</option>}
                      {brands.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
                    </Select>
                  </div>
                </div>
              </>
            )}
          </Panel>
        </div>

        {/* 3. Toko & kirim */}
        <div className="space-y-5">
          <Panel className="p-5 xl:sticky xl:top-24">
            <div className="flex items-center justify-between"><h2 className="font-bold text-navy">3. Upload ke toko</h2>
              {shops && shops.length > 0 && <button onClick={() => setPicked(picked.length === shops.filter((s) => !s.error).length ? [] : shops.filter((s) => !s.error).map((s) => s.id))} className="text-xs font-semibold text-brand-600">{picked.length === shops.filter((s) => !s.error).length ? "Batal semua" : "Pilih semua"}</button>}
            </div>
            {shops && shops.length > 6 && <input className="input mt-3 h-9 text-sm" placeholder="Cari toko" value={shopQ} onChange={(e) => setShopQ(e.target.value)} />}
            <div className="mt-3 max-h-80 space-y-1 overflow-y-auto">
              {!shops ? <p className="flex items-center gap-2 py-4 text-sm text-slate-400"><Loader2 size={14} className="animate-spin" />Memuat toko…</p>
                : !shops.length ? <p className="py-4 text-sm text-slate-500">Belum ada toko. <Link href="/marketplace/shops" className="font-semibold text-brand-600">Hubungkan toko</Link></p>
                : shopList.map((s) => {
                  const r = results[s.id];
                  return (
                    <label key={s.id} className={`flex items-start gap-2.5 rounded-lg px-2 py-2 text-sm ${s.error ? "opacity-60" : "cursor-pointer hover:bg-slate-50"}`}>
                      <input type="checkbox" className="mt-1" disabled={!!s.error || running} checked={picked.includes(s.id)} onChange={(e) => setPicked(e.target.checked ? [...picked, s.id] : picked.filter((x) => x !== s.id))} />
                      <ShopeeMark size={18} />
                      <span className="min-w-0 flex-1">
                        <b className="block truncate text-navy">{s.name}</b>
                        <span className="block truncate text-xs text-slate-400">{s.error ?? `Kurir: ${s.channels.map((c) => c.name.replace(/^Sandbox-|\(Don't modify\)/g, "")).join(", ")}`}</span>
                        {r?.state === "fail" && <span className="block text-xs text-rose-600">{r.message}</span>}
                        {r?.state === "ok" && <span className="block text-xs text-emerald-600">Berhasil · item {r.item_id}</span>}
                      </span>
                      {r?.state === "run" && <Loader2 size={16} className="mt-0.5 shrink-0 animate-spin text-brand-600" />}
                      {r?.state === "ok" && <CheckCircle2 size={16} className="mt-0.5 shrink-0 text-emerald-500" />}
                      {r?.state === "fail" && <XCircle size={16} className="mt-0.5 shrink-0 text-rose-500" />}
                    </label>
                  );
                })}
            </div>

            <div className="mt-4 space-y-1 border-t border-slate-100 pt-4 text-sm text-slate-600">
              <p className="flex justify-between"><span>Toko dipilih</span><b className="text-navy">{picked.length}</b></p>
              <p className="flex justify-between"><span>Harga</span><b className="text-navy">{models.length ? `${rupiah(Math.min(...models.map((m) => m.price)))}–${rupiah(Math.max(...models.map((m) => m.price)))}` : rupiah(price)}</b></p>
              <p className="flex justify-between"><span>Foto</span><b className="text-navy">{images.length}</b></p>
            </div>
            {problems.length > 0 && <p className="mt-3 rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-800">{problems[0]}{problems.length > 1 && ` (+${problems.length - 1} lagi)`}</p>}
            {Object.keys(results).length > 0 && !running && <p className="mt-3 text-sm text-slate-600">Selesai: <b className="text-emerald-600">{done} berhasil</b>{failed.length > 0 && <>, <b className="text-rose-600">{failed.length} gagal</b></>}.</p>}
            <div className="mt-4 flex gap-2">
              <button onClick={() => publish()} disabled={running || problems.length > 0 || uploading || picked.every((id) => results[id]?.state === "ok")} className="flex h-11 flex-1 items-center justify-center gap-2 rounded-lg bg-[#ee4d2d] text-sm font-semibold text-white disabled:opacity-50">
                {running ? <Loader2 size={16} className="animate-spin" /> : <Upload size={16} />}{running ? "Mengupload…" : picked.every((id) => results[id]?.state === "ok") ? "Sudah diupload" : `Upload ke ${picked.filter((id) => results[id]?.state !== "ok").length} toko`}
              </button>
              {failed.length > 0 && !running && <button onClick={() => publish(failed)} className="flex h-11 items-center gap-1.5 rounded-lg bg-slate-100 px-3 text-sm font-semibold text-navy" title="Ulangi yang gagal"><RotateCcw size={15} />Ulangi</button>}
            </div>
            {done > 0 && !running && <Link href="/marketplace/products" className="mt-3 flex items-center justify-center gap-1.5 text-sm font-semibold text-brand-600"><Plus size={14} />Lihat di Produk Shopee</Link>}
          </Panel>
        </div>
      </div>
    </div>
  );
}
