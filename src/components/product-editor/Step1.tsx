"use client";
import {
  Box, ClipboardList, Copy, GripVertical, ImageIcon, Images, Link2, MessageCircle, MousePointerClick, PackagePlus, Plus,
  ShieldCheck, SlidersHorizontal, Tag, Trash2, Users, X, FileDown, Loader2,
} from "lucide-react";
import { useMemo, useState } from "react";
import { API_URL, getToken, Product, rupiah, VariantOption } from "@/lib/api";
import { combinations, VARIANT_TYPES } from "@/lib/productForm";
import type { User } from "@/lib/auth";
import { Modal } from "@/components/ui";
import { Check, ChoiceCard, Dropzone, EdCard, Label, Note, RpInput, Switch, SwitchRow, uploadFiles } from "./parts";
import { Select } from "@/components/Select";

type Props = {
  p: Partial<Product>; set: <K extends keyof Product>(k: K, v: Product[K] | null) => void; setFs: (patch: any) => void;
  e: (k: string) => string | undefined; categories: string[]; products: Product[]; user: User; slugTouched: () => void;
};

const slugify = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

export function Step1({ p, set, setFs, e, categories, products, user, slugTouched }: Props) {
  const fs = p.form_settings ?? {};
  const [utmOpen, setUtmOpen] = useState(false);
  const origin = typeof window !== "undefined" ? `${location.host}/c/` : "/c/";
  const fullUrl = typeof window !== "undefined" ? `${location.origin}/c/${p.slug ?? ""}` : "";
  const err = (k: string) => e(k) && <p className="mt-1 text-xs text-rose-600">{e(k)}</p>;

  return (
    <div className="space-y-4">
      <h1 className="text-[28px] font-bold text-slate-800">{p.type === "digital" ? "Produk Digital" : "Produk dan Pengiriman"}</h1>

      <EdCard icon={Box} tint="violet" title="Pilih Jenis Formulir yang Ingin Kamu Pakai">
        <div className="grid grid-cols-2 gap-4">
          <ChoiceCard active={(fs.form_type ?? "single") === "single"} label="Satu Halaman Checkout" onClick={() => setFs({ form_type: "single" })}
            desc="Hanya satu formulir per produk. Gandakan produk untuk membuat formulir baru." />
          <ChoiceCard active={fs.form_type === "multiple"} label="Banyak Halaman Checkout" onClick={() => setFs({ form_type: "multiple" })}
            desc="Banyak formulir dalam satu produk. Ini lebih praktis jika ingin membuat lebih banyak formulir." />
        </div>
        {fs.form_type === "multiple" && <Note>Buat halaman tambahan untuk produk ini lewat menu Landing Page → blok Formulir (Checkout).</Note>}
      </EdCard>

      <EdCard icon={ImageIcon} tint="orange" title="Foto Produk">
        {!!p.images?.length && (
          <div className="grid grid-cols-5 gap-2">
            {p.images.map((src, i) => (
              <div key={src} className="group relative aspect-square overflow-hidden rounded-lg border border-slate-200">
                <img src={src} alt="" className="h-full w-full object-cover" />
                <button type="button" onClick={() => set("images", p.images!.filter((_, j) => j !== i))} className="absolute right-1 top-1 rounded-full bg-black/60 p-0.5 text-white opacity-0 group-hover:opacity-100" aria-label="Hapus foto"><X size={12} /></button>
                {i > 0 && <button type="button" onClick={() => { const n = [...p.images!]; [n[0], n[i]] = [n[i], n[0]]; set("images", n); }} className="absolute inset-x-1 bottom-1 rounded bg-white/90 text-[10px] font-semibold opacity-0 group-hover:opacity-100">Jadikan utama</button>}
                {i === 0 && <span className="absolute inset-x-0 bottom-0 bg-brand-600 py-0.5 text-center text-[10px] font-semibold text-white">Utama</span>}
              </div>
            ))}
          </div>
        )}
        {(p.images?.length ?? 0) < 10 && <Dropzone multiple label={p.images?.length ? "Tambah Photo" : "Unggah Foto Produk"} hint="Pilih hingga 10 foto sekaligus di sini" onUploaded={(u) => set("images", [...(p.images ?? []), ...u].slice(0, 10))} />}
        <Note>Kamu bisa menampilkan atau menyembunyikan gambar produk di halaman pembayaran</Note>
        <div className="flex items-center justify-between border-t border-slate-100 pt-3">
          <span className="text-sm font-semibold text-slate-800">Aktifkan Geser Otomatis</span>
          <Switch checked={!!p.autoslide} onChange={(v) => set("autoslide", v)} />
        </div>
      </EdCard>

      <EdCard icon={MousePointerClick} tint="indigo" title="Ikon Situs">
        <div className="grid grid-cols-2 gap-4">
          <ChoiceCard active={(fs.site_icon ?? "default") === "default"} label="Default" onClick={() => setFs({ site_icon: "default" })} />
          <ChoiceCard active={fs.site_icon === "custom"} label="Custom" onClick={() => setFs({ site_icon: "custom" })} />
        </div>
        <div className="flex items-stretch gap-2 border-t border-slate-100 pt-3">
          <span className="flex w-10 items-center justify-center overflow-hidden rounded bg-brand-600 text-white">
            {fs.site_icon === "custom" && fs.site_icon_url ? <img src={fs.site_icon_url} alt="" className="h-full w-full object-cover" /> : <ClipboardList size={20} />}
          </span>
          <div className="flex flex-1 items-end gap-2 rounded-t-lg bg-slate-800 px-3 pt-2">
            <span className="mb-2 flex gap-1.5">{["bg-rose-500", "bg-amber-400", "bg-emerald-500"].map((c) => <span key={c} className={`h-3 w-3 rounded-full ${c}`} />)}</span>
            <span className="flex max-w-xs items-center gap-2 truncate rounded-t-md bg-slate-600 px-3 py-1.5 text-xs text-white">
              <ClipboardList size={12} />{(p.site_title || p.name || "Nama Produk")} - Pesanin<X size={12} className="ml-4 opacity-60" />
            </span>
          </div>
        </div>
        {fs.site_icon === "custom" ? (
          <label className="btn-outline btn-sm w-fit cursor-pointer">Unggah Ikon<input type="file" accept="image/*" hidden onChange={async (ev) => { if (ev.target.files?.length) setFs({ site_icon_url: (await uploadFiles(ev.target.files))[0] }); }} /></label>
        ) : <p className="text-xs text-slate-600">Ikon Situs adalah ikon yang kamu lihat di tab browser atau bar bookmark. Ikon Situs akan mengikuti ikon toko secara global.</p>}
        <div className="border-t border-slate-100 pt-3">
          <Label>Site Title</Label>
          <input className="input" maxLength={64} placeholder={p.name || "Pesanin"} value={p.site_title ?? ""} onChange={(ev) => set("site_title", ev.target.value)} />
          <p className="mt-1 text-right text-xs text-slate-500">{(p.site_title ?? "").length}/64</p>
        </div>
      </EdCard>

      <EdCard icon={SlidersHorizontal} tint="green" title="Informasi Produk">
        <div>
          <Label>Nama Produk</Label>
          <input className="input" placeholder="Masukkan Nama Produk" value={p.name ?? ""} onChange={(ev) => set("name", ev.target.value)} />
          {err("name")}
        </div>
        <div>
          <Label>URL Halaman Checkout</Label>
          <div className="flex overflow-hidden rounded-lg border border-slate-200 focus-within:border-brand-500">
            <span className="flex items-center border-r border-slate-200 bg-slate-50 px-3 text-sm text-slate-500">{origin}</span>
            <input className="h-10 flex-1 px-3 text-sm outline-none" placeholder="Masukkan URL halaman" value={p.slug ?? ""} onChange={(ev) => { slugTouched(); set("slug", slugify(ev.target.value)); }} />
          </div>
          <div className="mt-1 flex items-center justify-between text-xs text-slate-600">
            <span>URL Halaman Checkout: <a href={fullUrl} target="_blank" className="italic text-brand-600 underline">{fullUrl}</a></span>
            <button type="button" className="text-brand-600" onClick={() => navigator.clipboard?.writeText(fullUrl)} aria-label="Salin URL"><Copy size={15} /></button>
          </div>
          {err("slug")}
        </div>
        <div className="flex items-center justify-between rounded-lg bg-slate-50 p-4">
          <div>
            <div className="flex items-center gap-2 font-semibold text-slate-800"><Link2 size={16} className="text-pink-500" />Checkout Page with UTM</div>
            <div className="text-xs text-slate-500">Generate UTM untuk melihat traffic pengunjung website-mu</div>
          </div>
          <button type="button" className="btn-outline btn-sm border-brand-600 text-brand-700" onClick={() => setUtmOpen(true)}><MousePointerClick size={14} />Generate</button>
        </div>
        <div>
          <Label>Kategori Produk</Label>
          <Select className="input" value={p.category ?? ""} onChange={(ev) => set("category", ev.target.value || null)}>
            <option value="">Pilih kategori produk</option>
            {categories.map((c) => <option key={c}>{c}</option>)}
          </Select>
          {err("category")}
        </div>
        <div>
          <Label hint="Draft: halaman checkout tidak bisa diakses dan pesanan tidak diproses">Status Produk</Label>
          <Select className="input" value={p.status} onChange={(ev) => set("status", ev.target.value as any)}>
            <option value="active">Aktif</option>
            <option value="draft">Draft (Pesanan yang masuk tidak akan diproses)</option>
          </Select>
        </div>
        {p.type !== "digital" && (
          <div className="rounded-lg bg-slate-50 p-3">
            <Check checked={!!p.is_preorder} onChange={(v) => set("is_preorder", v)} label={<span><b className="font-semibold">Produk Pre-Order</b><span className="block text-xs font-normal text-slate-500">Kalau kamu memerlukan waktu untuk nyiapin produknya untuk dikirim</span></span>} />
            {p.is_preorder && (
              <div className="mt-3 flex items-center gap-2 pl-6 text-sm">
                Dikirim dalam <input className="input h-9 w-20" type="number" min={1} value={p.preorder_days ?? ""} onChange={(ev) => set("preorder_days", Number(ev.target.value) || null)} /> hari
              </div>
            )}
          </div>
        )}
        {p.type !== "digital" && (
          <div>
            <Label hint="Dipakai untuk menghitung ongkir">Berat (gram)</Label>
            <input className="input" type="number" min={1} value={p.weight ?? 1000} onChange={(ev) => set("weight", Number(ev.target.value))} />
            {err("weight")}
          </div>
        )}
      </EdCard>

      {p.type === "digital" && <DigitalContent p={p} set={set} />}

      <EdCard icon={Tag} tint="pink" title="Harga Produk">
        <div className="grid grid-cols-2 gap-3">
          <div><Label>Harga Normal</Label><RpInput value={p.price} onChange={(v) => set("price", v ?? 0)} />{err("price")}</div>
          <div><Label>Harga Diskon / Harga Coret</Label><RpInput value={p.sale_price} onChange={(v) => set("sale_price", v)} />{err("sale_price")}</div>
        </div>
        <div><Label hint="Harga modal untuk menghitung keuntungan, tidak ditampilkan ke pembeli">Harga Jual / HPP</Label><RpInput value={p.cost_price} onChange={(v) => set("cost_price", v)} /></div>
        <div className="space-y-2 border-t border-slate-100 pt-3">
          {(p.wholesale_prices ?? []).map((t, i) => (
            <div key={i} className="flex items-end gap-2">
              <div className="w-28"><Label>Min. Beli</Label><input className="input" type="number" min={2} value={t.min_qty} onChange={(ev) => set("wholesale_prices", p.wholesale_prices!.map((x, j) => (j === i ? { ...x, min_qty: Number(ev.target.value) } : x)))} /></div>
              <div className="flex-1"><Label>Harga / pcs</Label><RpInput value={t.price} onChange={(v) => set("wholesale_prices", p.wholesale_prices!.map((x, j) => (j === i ? { ...x, price: v ?? 0 } : x)))} /></div>
              <button type="button" className="btn-ghost h-10 px-2 text-rose-600" onClick={() => set("wholesale_prices", p.wholesale_prices!.filter((_, j) => j !== i))} aria-label="Hapus"><Trash2 size={16} /></button>
            </div>
          ))}
          {err("wholesale_prices")}
          <button type="button" className="flex items-center gap-2 text-sm text-slate-600 hover:text-brand-700" onClick={() => set("wholesale_prices", [...(p.wholesale_prices ?? []), { min_qty: 3, price: p.sale_price || p.price || 0 }])}>
            <Plus size={16} className="rounded-full bg-slate-500 p-0.5 text-white" />Tambah Harga Grosir
          </button>
        </div>
      </EdCard>

      <EdCard icon={ClipboardList} tint="blue" title="Manajemen Stok">
        <div><Label>SKU (Stock Keeping Unit)</Label><input className="input" placeholder="Kode SKU Produk, Contoh PROD001" value={p.sku ?? ""} onChange={(ev) => set("sku", ev.target.value)} /></div>
        <div className="flex flex-wrap gap-5">
          <Check checked={!!p.track_stock} onChange={(v) => set("track_stock", v)} label="Lacak Stok Produk" />
          <Check checked={!!p.allow_oversell} disabled={!p.track_stock} onChange={(v) => set("allow_oversell", v)} label="Tetap jual meskipun stok habis" />
        </div>
        {p.track_stock && !p.variants?.length && (
          <div className="w-40"><Label>Jumlah Stok</Label><input className="input" type="number" value={p.stock ?? 0} onChange={(ev) => set("stock", Number(ev.target.value))} /></div>
        )}
        {p.track_stock && !!p.variants?.length && <Note>Stok diatur per variasi di bagian Variasi.</Note>}
        <div className="border-t border-slate-100 pt-3">
          <Check checked={(p.min_purchase ?? 1) > 1} onChange={(v) => set("min_purchase", v ? 2 : 1)} label="Aktifkan Minimum Pembelian" />
          {(p.min_purchase ?? 1) > 1 && <div className="mt-2 flex items-center gap-2 pl-6 text-sm">Minimal <input className="input h-9 w-20" type="number" min={2} value={p.min_purchase} onChange={(ev) => set("min_purchase", Math.max(1, Number(ev.target.value)))} /> pcs</div>}
        </div>
      </EdCard>

      <Variants p={p} set={set} setFs={setFs} />

      <EdCard icon={PackagePlus} tint="blue" title="Bump Produk" desc="Tawaran item tambahan di produk ini ketika di halaman checkout"
        right={<Switch checked={!!p.bump?.enabled} onChange={(v) => set("bump", { ...p.bump, enabled: v, items: p.bump?.items ?? [] })} />}>
        {p.bump?.enabled && (
          <div className="space-y-3">
            {(p.bump.items ?? []).map((it, i) => {
              const bp = products.find((x) => x.id === it.product_id);
              const upd = (patch: any) => set("bump", { ...p.bump, items: p.bump!.items!.map((x, j) => (j === i ? { ...x, ...patch } : x)) });
              return (
                <div key={i} className="space-y-2 rounded-lg border border-slate-200 p-3">
                  <div className="flex gap-2">
                    <Select className="input" value={it.product_id ?? ""} onChange={(ev) => upd({ product_id: Number(ev.target.value) })}>
                      <option value="">Pilih produk</option>
                      {products.filter((x) => x.id !== p.id && x.status === "active").map((x) => <option key={x.id} value={x.id}>{x.name}</option>)}
                    </Select>
                    <button type="button" className="btn-ghost px-2 text-rose-600" onClick={() => set("bump", { ...p.bump, items: p.bump!.items!.filter((_, j) => j !== i) })} aria-label="Hapus"><Trash2 size={16} /></button>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div><Label>Harga khusus bump</Label><RpInput value={it.price ?? null} onChange={(v) => upd({ price: v })} /><p className="mt-1 text-xs text-slate-500">Kosong = {bp ? rupiah(bp.sale_price || bp.price) : "harga produk"}</p></div>
                    <div><Label>Teks penawaran</Label><input className="input" placeholder="Hemat 20% khusus hari ini" value={it.description ?? ""} onChange={(ev) => upd({ description: ev.target.value })} /></div>
                  </div>
                </div>
              );
            })}
            {e("bump.items.0.product_id") && <p className="text-xs text-rose-600">Pilih produk bump.</p>}
            {(p.bump.items?.length ?? 0) < 3 && (
              <button type="button" className="flex items-start gap-2 text-left text-sm" onClick={() => set("bump", { ...p.bump, items: [...(p.bump!.items ?? []), { product_id: 0 as any }] })}>
                <Plus size={16} className="mt-0.5 rounded-full bg-brand-600 p-0.5 text-white" />
                <span><b className="font-semibold text-brand-700">Tambahkan Produk Bump</b><span className="block text-xs text-slate-500">Kamu bisa menambahkan max. 3 produk di halaman checkout ini</span></span>
              </button>
            )}
          </div>
        )}
      </EdCard>

      <EdCard icon={ShieldCheck} tint="blue" title="Keamanan">
        <SwitchRow icon={MessageCircle} title="WhatsApp Validator" desc="Untuk memvalidasi nomor WhatsApp yang dimasukkan pembeli benar-benar aktif" checked={!!p.whatsapp_validator} onChange={(v) => set("whatsapp_validator", v)} />
        <div className="border-t border-slate-100" />
        <SwitchRow icon={ShieldCheck} title="Aktifkan Captcha" desc="Pakai captcha untuk menghindari pesanan palsu. Sistem ini akan mendeteksi IP dan Cookies pengguna." checked={!!p.captcha} onChange={(v) => set("captcha", v)} />
      </EdCard>

      <EdCard icon={Users} tint="blue" title="Penanggung Jawab Produk Ini" desc="Produk ini akan di tangani oleh user dibawah ini">
        <Select className="input" value={p.responsible_user_id ?? ""} onChange={(ev) => set("responsible_user_id", ev.target.value ? Number(ev.target.value) : null)}>
          <option value="">Pilih Penanggung Jawab</option>
          <option value={user.id}>{user.name} — {user.email}</option>
        </Select>
      </EdCard>

      <UtmModal open={utmOpen} onClose={() => setUtmOpen(false)} base={fullUrl} />
    </div>
  );
}

function Variants({ p, set, setFs }: Pick<Props, "p" | "set" | "setFs">) {
  const fs = p.form_settings ?? {};
  const options: VariantOption[] = p.variant_options ?? (p.variants?.length ? [{ type: "Varian", values: p.variants.map((v) => v.name) }] : []);
  const enabled = options.length > 0 || !!p.variants?.length;
  const [draft, setDraft] = useState<Record<number, string>>({});
  const [bulk, setBulk] = useState<{ price: number | null; stock: string }>({ price: null, stock: "" });
  const combos = useMemo(() => combinations(options), [JSON.stringify(options)]); // eslint-disable-line react-hooks/exhaustive-deps

  const apply = (opts: VariantOption[]) => {
    const names = combinations(opts);
    const prev = Object.fromEntries((p.variants ?? []).map((v) => [v.name, v]));
    set("variant_options", opts);
    set("variants", names.map((n) => prev[n] ?? { name: n, price: null, stock: p.track_stock ? 0 : null }));
  };
  const setOpt = (i: number, patch: Partial<VariantOption>) => apply(options.map((o, j) => (j === i ? { ...o, ...patch } : o)));
  const addValue = (i: number) => {
    const vals = (draft[i] ?? "").split(",").map((x) => x.trim()).filter(Boolean);
    if (!vals.length) return;
    setOpt(i, { values: [...new Set([...options[i].values, ...vals])] });
    setDraft({ ...draft, [i]: "" });
  };
  const updVariant = (name: string, patch: any) => set("variants", (p.variants ?? []).map((v) => (v.name === name ? { ...v, ...patch } : v)));

  return (
    <>
      <EdCard icon={Box} tint="violet" title="Varian Produk"
        right={<span className="flex items-center gap-2 text-xs font-semibold text-slate-700">Aktifkan Varian Produk<Switch checked={enabled} onChange={(v) => { if (v) apply([{ type: "", values: [] }]); else { set("variant_options", null); set("variants", []); } }} /></span>}>
        {enabled && (
          <>
            <div className="flex flex-wrap gap-x-5 gap-y-2">
              <Check checked={fs.variant_required !== false} onChange={(v) => setFs({ variant_required: v })} label="Wajib pilih varian" />
              <Check checked={!!fs.variant_qty_button} onChange={(v) => setFs({ variant_qty_button: v })} label="Tombol tambah QTY" />
            </div>
            <div className="space-y-4 border-t border-slate-100 pt-4">
              {options.map((o, i) => (
                <div key={i} className="flex gap-2">
                  <GripVertical size={16} className="mt-9 shrink-0 text-slate-300" />
                  <div className="flex-1 space-y-2">
                    <Label>Jenis Varian</Label>
                    <div className="flex gap-2">
                      <Select className="input" value={o.type} onChange={(ev) => setOpt(i, { type: ev.target.value })}>
                        <option value="">Pilih jenis varian</option>
                        {[...new Set([...VARIANT_TYPES, ...(o.type ? [o.type] : [])])].filter((t) => t === o.type || !options.some((x) => x.type === t)).map((t) => <option key={t}>{t}</option>)}
                      </Select>
                      <button type="button" className="btn-ghost px-2 text-slate-400 hover:text-rose-600" onClick={() => apply(options.filter((_, j) => j !== i))} aria-label="Hapus jenis"><Trash2 size={16} /></button>
                    </div>
                    <Label>Varian</Label>
                    <div className="flex flex-wrap items-center gap-1.5 rounded-lg border border-slate-200 p-1.5 focus-within:border-brand-500">
                      {o.values.map((v) => (
                        <span key={v} className="flex items-center gap-1 rounded-full border border-slate-300 px-2.5 py-0.5 text-xs font-medium">
                          {v}<button type="button" onClick={() => setOpt(i, { values: o.values.filter((x) => x !== v) })} aria-label={`Hapus ${v}`}><X size={12} /></button>
                        </span>
                      ))}
                      <input className="h-7 min-w-32 flex-1 px-1 text-sm outline-none" placeholder="Varian, Contoh: M, L, XL" value={draft[i] ?? ""}
                        onChange={(ev) => setDraft({ ...draft, [i]: ev.target.value })} onBlur={() => addValue(i)}
                        onKeyDown={(ev) => { if (ev.key === "Enter" || ev.key === ",") { ev.preventDefault(); addValue(i); } }} />
                    </div>
                  </div>
                </div>
              ))}
              {options.length < 2 && (
                <button type="button" className="flex items-center gap-2 text-sm font-semibold text-brand-700" onClick={() => apply([...options, { type: "", values: [] }])}>
                  <Plus size={16} className="rounded-full bg-brand-600 p-0.5 text-white" />Tambahkan Varian lainnya
                </button>
              )}
            </div>
          </>
        )}
      </EdCard>

      {enabled && combos.length > 0 && (
        <EdCard icon={Images} tint="green" title="Variasi">
          <div className="flex flex-wrap items-end gap-2 rounded-lg bg-slate-50 p-3">
            <div className="w-40"><Label>Harga semua</Label><RpInput value={bulk.price} onChange={(v) => setBulk({ ...bulk, price: v })} /></div>
            {p.track_stock && <div className="w-24"><Label>Stok semua</Label><input className="input" type="number" value={bulk.stock} onChange={(ev) => setBulk({ ...bulk, stock: ev.target.value })} /></div>}
            <button type="button" className="btn-outline" onClick={() => set("variants", (p.variants ?? []).map((v) => ({ ...v, ...(bulk.price != null ? { price: bulk.price } : {}), ...(bulk.stock !== "" ? { stock: Number(bulk.stock) } : {}) })))}>Ubah</button>
          </div>
          <div className="divide-y divide-slate-100">
            {(p.variants ?? []).map((v) => (
              <div key={v.name} className="flex items-center gap-3 py-2">
                <label className="flex h-10 w-10 shrink-0 cursor-pointer items-center justify-center overflow-hidden rounded-md border border-slate-200 bg-slate-50 text-slate-400">
                  {v.image ? <img src={v.image} alt="" className="h-full w-full object-cover" /> : <ImageIcon size={16} />}
                  <input type="file" accept="image/*" hidden onChange={async (ev) => { if (ev.target.files?.length) updVariant(v.name, { image: (await uploadFiles(ev.target.files))[0] }); }} />
                </label>
                <span className="flex-1 text-sm font-medium text-slate-700">{v.name}</span>
                <div className="w-36"><RpInput value={v.price ?? null} onChange={(val) => updVariant(v.name, { price: val })} /></div>
                {p.track_stock && <input className="input w-20" type="number" title="Stok" value={v.stock ?? 0} onChange={(ev) => updVariant(v.name, { stock: Number(ev.target.value) })} />}
              </div>
            ))}
          </div>
          <Note>Harga kosong = mengikuti harga produk. Sembunyikan varian yang stoknya habis di langkah 2 (Halaman Checkout).</Note>
        </EdCard>
      )}
    </>
  );
}

function UtmModal({ open, onClose, base }: { open: boolean; onClose: () => void; base: string }) {
  const [u, setU] = useState({ utm_source: "facebook", utm_medium: "cpc", utm_campaign: "", utm_content: "", utm_term: "" });
  const url = `${base}?${new URLSearchParams(Object.entries(u).filter(([, v]) => v) as [string, string][])}`;
  const [copied, setCopied] = useState(false);
  return (
    <Modal open={open} onClose={onClose} title="Checkout Page with UTM" icon={Link2}>
      <div className="space-y-3">
        {(Object.keys(u) as (keyof typeof u)[]).map((k) => (
          <div key={k}><Label>{k}</Label><input className="input" value={u[k]} onChange={(ev) => setU({ ...u, [k]: ev.target.value })} /></div>
        ))}
        <div className="break-all rounded-lg bg-slate-50 p-3 text-xs text-slate-700">{url}</div>
        <button type="button" className="btn-primary w-full" onClick={() => { navigator.clipboard?.writeText(url); setCopied(true); }}><Copy size={15} />{copied ? "Tersalin!" : "Salin URL"}</button>
      </div>
    </Modal>
  );
}

/** What a digital buyer receives once paid: sent automatically by WhatsApp/email with a private access link. */
function DigitalContent({ p, set }: { p: Partial<Product>; set: (k: any, v: any) => void }) {
  const c = p.digital_content ?? {};
  const put = (patch: Partial<NonNullable<Product["digital_content"]>>) => set("digital_content", { ...c, ...patch });
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const upload = async (f: File | undefined) => {
    if (!f) return;
    setBusy(true); setErr("");
    try {
      const fd = new FormData(); fd.append("file", f);
      const res = await fetch(`${API_URL}/uploads/digital`, { method: "POST", body: fd, headers: { Authorization: `Bearer ${getToken()}`, Accept: "application/json" } });
      const d = await res.json();
      if (!res.ok) throw new Error(d.errors?.file?.[0] ?? d.message ?? "Upload gagal");
      put({ file: d.file, file_name: d.file_name });
    } catch (e) { setErr((e as Error).message); } finally { setBusy(false); }
  };
  return (
    <EdCard icon={FileDown} tint="blue" title="Isi Produk Digital">
      <Note>Setelah pembayaran lunas, pembeli otomatis menerima link akses pribadi lewat WhatsApp/email (atur di Pengaturan → Otomatisasi Pesanan). Isi link, file, atau keduanya.</Note>
      <div><Label hint="Google Drive, kelas online, grup, dll. Hanya terlihat setelah lunas.">Link produk</Label>
        <input className="input" type="url" placeholder="https://drive.google.com/…" value={c.url ?? ""} onChange={(e) => put({ url: e.target.value || null })} /></div>
      <div><Label hint="PDF, ZIP, EPUB, MP4, dll. Maks 50 MB. Disimpan privat, hanya bisa diunduh pembeli yang sudah bayar.">File produk</Label>
        {c.file ? (
          <div className="flex items-center gap-3 rounded-lg bg-slate-50 px-3 py-2 text-sm"><FileDown size={16} className="text-slate-500" /><span className="flex-1 truncate">{c.file_name ?? "file"}</span>
            <button type="button" onClick={() => put({ file: null, file_name: null })} className="text-rose-600" aria-label="Hapus file"><Trash2 size={15} /></button></div>
        ) : (
          <label className={`flex cursor-pointer items-center justify-center gap-2 rounded-lg border border-dashed border-slate-300 px-3 py-4 text-sm text-slate-600 hover:bg-slate-50 ${busy ? "opacity-60" : ""}`}>
            {busy ? <Loader2 size={16} className="animate-spin" /> : <Plus size={16} />}{busy ? "Mengunggah…" : "Pilih file"}
            <input type="file" className="hidden" disabled={busy} onChange={(e) => upload(e.target.files?.[0])} /></label>
        )}
        {err && <p className="mt-1 text-xs text-rose-600">{err}</p>}</div>
      <div><Label>Petunjuk untuk pembeli (opsional)</Label>
        <textarea className="input min-h-20 py-2" maxLength={3000} placeholder="Cara mengakses, kode akses, kontak bantuan…" value={c.instructions ?? ""} onChange={(e) => put({ instructions: e.target.value || null })} /></div>
    </EdCard>
  );
}
