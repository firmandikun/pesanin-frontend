"use client";
import {
  AlertCircle, BadgeCheck, Code2, CreditCard, Edit3, Eye, EyeOff, FileText, GripVertical, Hourglass, ImageIcon, LayoutList,
  Monitor, MousePointerClick, Package, Palette, Plus, Receipt, Save, Search, ServerCog, ShoppingBag, Smartphone, Star,
  TicketPercent, Trash2, Truck, Type, Video, X,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { DateTimePicker } from "@/components/DatePicker";
import { useEffect, useState } from "react";
import { CustomField, FieldItem, FormSettings, PAYMENT_LABEL, Pixel, Product } from "@/lib/api";
import { comp, COMPONENT_DEFAULTS, defaultFormSettings, FIELD_LABELS, LOCKED, normalizeFields, PROVINCES } from "@/lib/productForm";
import { Modal } from "@/components/ui";
import { Check, Dropzone, EdCard, Label, Note, Switch, SwitchRow } from "./parts";
import { PaymentPanel, ShippingPanel } from "./Step2Panels";
import { Select } from "@/components/Select";

type Props = {
  p: Partial<Product>; set: <K extends keyof Product>(k: K, v: Product[K] | null) => void; setFs: (patch: Partial<FormSettings>) => void;
  products: Product[]; onLocate: (key: string) => void; e: (k: string) => string | undefined;
};

const RIGHT: [string, string, LucideIcon, boolean][] = [
  ["images", "Gambar Produk", ImageIcon, true], ["video", "Video", Video, true],
  ["description", "Deskripsi dan Poin-Poin Produk", FileText, true], ["sold", "Produk Terjual", BadgeCheck, true],
];
const LEFT: [string, string, LucideIcon, boolean][] = [
  ["trust_seal", "Segel Penambah Kepercayaan", BadgeCheck, true], ["variants", "Pilihan Varian Produk", ShoppingBag, false],
  ["form", "Formulir Pemesanan", FileText, false], ["save_buyer", "Simpan Data Pembeli", Save, false],
  ["bump", "Produk Bump", Package, false], ["shipping", "Pengiriman", Truck, true], ["payment", "Metode Pembayaran", CreditCard, true],
  ["coupon", "Kupon", TicketPercent, false], ["other_text", "Teks Lainnya", Edit3, true], ["summary", "Rincian Pesanan", Receipt, false],
  ["button", "Tombol Beli Sekarang", MousePointerClick, true],
];
const COLORS = ["#ffffff", "#fff1f2", "#f0fdf4", "#f0f9ff", "#fff5ed", "#f1f5f9", "#fefce8"];
export const PLATFORMS: [Pixel["platform"], string, string[]][] = [
  ["facebook", "Facebook Pixel", ["PageView", "ViewContent", "AddToCart", "InitiateCheckout", "AddPaymentInfo", "Lead", "Purchase"]],
  ["tiktok", "Tiktok Pixel", ["ViewContent", "ClickButton", "AddToCart", "InitiateCheckout", "PlaceAnOrder", "CompletePayment"]],
  ["google_ads", "Google Ads", ["conversion", "page_view", "purchase"]],
  ["gtm", "Google Tag Manager", ["page_view", "purchase"]],
  ["snack", "Snack Video", ["EVENT_CONTENT_VIEW", "EVENT_PURCHASE"]],
];

function loadTemplates(): { name: string; settings: FormSettings }[] {
  try { return JSON.parse(localStorage.getItem("formku_form_templates") ?? "[]"); } catch { return []; }
}

export function Step2({ p, set, setFs, products, onLocate }: Props) {
  const fs = p.form_settings ?? {};
  const [editing, setEditing] = useState<string | null>(null);
  const [inline, setInline] = useState<string | null>(null);
  const [device, setDevice] = useState<"desktop" | "mobile">("desktop");
  const [customDesign, setCustomDesign] = useState(true);
  const [templates, setTemplates] = useState<{ name: string; settings: FormSettings }[]>([]);
  useEffect(() => { setTemplates(loadTemplates()); }, []);

  const c = (k: string) => comp(fs, k);
  const setComp = (k: string, patch: Record<string, any>) => setFs({ components: { ...fs.components, [k]: { ...c(k), ...patch } } });
  const fields = normalizeFields(p);
  const setFields = (items: FieldItem[]) => setFs({ fields: { ...fs.fields, items } });
  const custom = fs.fields?.custom ?? [];
  const pixels = fs.tracking?.pixels ?? [];

  function loadTemplate(v: string) {
    if (v.startsWith("tpl:")) {
      const t = templates[Number(v.slice(4))];
      if (t) set("form_settings", { ...t.settings, page_name: fs.page_name });
    } else if (v.startsWith("prod:")) {
      const src = products.find((x) => x.id === Number(v.slice(5)));
      if (src?.form_settings) set("form_settings", { ...src.form_settings, page_name: fs.page_name });
    }
  }

  const compRow = ([key, label, Icon, editable]: [string, string, LucideIcon, boolean]) => {
    const fixed = key === "form" || key === "button";
    const soon = false;
    const on = fixed || c(key).enabled;
    const isInline = key === "payment" || key === "shipping";
    if (isInline && inline === key) {
      return (
        <div key={key} className="rounded-lg border border-brand-600 bg-white px-4 py-3">
          <div className="flex items-center gap-3">
            <Icon size={17} className="shrink-0 text-blue-600" />
            <div className="flex-1 text-sm font-semibold text-slate-800">{label}</div>
            <button type="button" className="text-sm font-medium text-brand-600" onClick={() => setInline(null)}>Edit</button>
            <Switch checked={on} onChange={(v) => setComp(key, { enabled: v })} />
            <button type="button" className="text-brand-600" onClick={() => onLocate(key)} aria-label={`Lihat ${label}`}><Search size={17} /></button>
          </div>
          {key === "payment" ? <PaymentPanel p={p} set={set} setFs={setFs} onClose={() => setInline(null)} /> : <ShippingPanel p={p} set={set} setFs={setFs} onClose={() => setInline(null)} />}
        </div>
      );
    }
    return (
      <div key={key} className="flex items-center gap-3 rounded-lg bg-slate-50 px-4 py-3">
        <Icon size={17} className="shrink-0 text-blue-600" />
        <div className="min-w-0 flex-1">
          <div className="text-sm font-semibold text-slate-800">{label}</div>
          {key === "coupon" && <div className="text-xs text-slate-500">Tambah dan atur kupon kamu disini (<a href="/others/coupons" className="text-brand-600">Kupon</a>)</div>}
        </div>
        {editable && <button type="button" className="text-sm font-medium text-brand-600 hover:underline" onClick={() => (isInline ? setInline(key) : setEditing(key))}>Edit</button>}
        {!fixed && <Switch checked={on} disabled={soon} onChange={(v) => setComp(key, { enabled: v })} />}
        <button type="button" disabled={!on} className="text-brand-600 disabled:text-slate-300" onClick={() => onLocate(key === "form" ? "form" : key)} aria-label={`Lihat ${label}`}><Search size={17} /></button>
      </div>
    );
  };

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-[28px] font-bold text-slate-800">Atur Halaman Formulir</h1>
          <p className="text-xs text-slate-500">Kamu bisa menyimpan tampilan ini sebagai template.<br />Menyimpan template tidak akan mempengaruhi header.</p>
        </div>
        <div className="w-60 shrink-0">
          <Label>Muat Template</Label>
          <div className="flex gap-1">
            <Select className="input h-9 text-xs" value="" onChange={(ev) => loadTemplate(ev.target.value)}>
              <option value="">Pilih Template</option>
              {templates.length > 0 && <optgroup label="Template tersimpan">{templates.map((t, i) => <option key={i} value={`tpl:${i}`}>{t.name}</option>)}</optgroup>}
              <optgroup label="Salin dari produk">{products.filter((x) => x.id !== p.id).map((x) => <option key={x.id} value={`prod:${x.id}`}>{x.name}</option>)}</optgroup>
            </Select>
            <button type="button" className="btn-ghost h-9 px-2 text-xs" onClick={() => set("form_settings", defaultFormSettings(p.name))}>Reset</button>
          </div>
        </div>
      </div>

      <EdCard icon={Palette} tint="blue" title="Desain Formulir">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <div className="flex items-center justify-between"><Label>Tema Formulir</Label><span className="badge mb-1.5 bg-rose-500 text-white">Tema Baru</span></div>
            <Select className="input" value={fs.theme ?? "classic"} onChange={(ev) => setFs({ theme: ev.target.value as any })}>
              <option value="classic">Tema Klasik</option><option value="new">Tema Baru</option>
            </Select>
          </div>
          <div>
            <Label>Tata Letak Tema</Label>
            <Select className="input" value={fs.layout ?? "sidebar_right"} onChange={(ev) => setFs({ layout: ev.target.value as any })}>
              <option value="sidebar_right">Sidebar Kanan</option><option value="sidebar_left">Sidebar Kiri</option><option value="single">Satu Kolom</option>
            </Select>
          </div>
        </div>
        <button type="button" className="text-sm font-medium text-brand-600" onClick={() => setCustomDesign(!customDesign)}>Kustomisasi Desain {customDesign ? "▴" : "▾"}</button>
        {customDesign && (
          <div className="space-y-3 rounded-lg bg-slate-50 p-4">
            <div className="text-xs font-semibold text-slate-700">Pilih warna latar belakang</div>
            <div className="flex flex-wrap items-center gap-3 rounded-lg bg-white p-3">
              {COLORS.map((col) => (
                <button key={col} type="button" onClick={() => setFs({ background: col })} aria-label={col}
                  className={`h-8 w-8 rounded-full border ${fs.background === col ? "ring-2 ring-brand-600 ring-offset-2" : "border-slate-200"}`} style={{ background: col }} />
              ))}
              <label className="relative h-8 w-8 cursor-pointer overflow-hidden rounded-full" style={{ background: "conic-gradient(red, yellow, lime, aqua, blue, magenta, red)" }}>
                <input type="color" className="absolute inset-0 opacity-0" value={fs.background ?? "#ffffff"} onChange={(ev) => setFs({ background: ev.target.value })} />
              </label>
            </div>
          </div>
        )}
        <div className="rounded-xl border border-slate-200 p-4">
          <h4 className="mb-3 font-semibold text-slate-800">Tampilan Watermark Logo dan Copyright Formulir</h4>
          <div className="space-y-3">
            <SwitchRow boxed icon={Eye} title="Watermark Logo Formulir" desc="Menampilkan “Powered by Pesanin” di Halaman Checkout." checked={fs.watermark_logo !== false} onChange={(v) => setFs({ watermark_logo: v })} />
            <SwitchRow boxed icon={Type} title="Watermark Copyright" desc="Menampilkan “Copyright” di Halaman Checkout." checked={fs.watermark_copyright !== false} onChange={(v) => setFs({ watermark_copyright: v })} />
          </div>
        </div>
      </EdCard>

      <EdCard icon={LayoutList} tint="violet" title="Header">
        <div><Label>Nama Halaman Checkout</Label><input className="input" placeholder={`Pemesanan ${p.name ?? ""}`} value={fs.page_name ?? ""} onChange={(ev) => setFs({ page_name: ev.target.value })} /></div>
        <SwitchRow boxed icon={Hourglass} iconCls="text-amber-600" title="Hitung Mundur Flash Sale" checked={!!fs.countdown?.enabled} onChange={(v) => setFs({ countdown: { ...fs.countdown, enabled: v } })} />
        {fs.countdown?.enabled && <div className="pl-11"><Label>Berakhir pada</Label><DateTimePicker value={fs.countdown.until} onChange={(v) => setFs({ countdown: { ...fs.countdown, until: v } })} /></div>}
        <div>
          <Label>Upload gambar untuk ditampilkan di header</Label>
          {fs.header_image ? (
            <div className="relative w-fit rounded-lg border border-slate-200 p-2"><img src={fs.header_image} alt="" className="max-h-16" />
              <button type="button" className="absolute -right-2 -top-2 rounded-full bg-slate-700 p-0.5 text-white" onClick={() => setFs({ header_image: null })} aria-label="Hapus"><X size={12} /></button></div>
          ) : <Dropzone compact label="Unggah Foto" onUploaded={(u) => setFs({ header_image: u[0] })} />}
          <div className="mt-2"><Note>Kamu bisa upload logo produk atau perusahaan kamu</Note></div>
        </div>
        <div className="space-y-3 border-t border-slate-100 pt-4">
          <div className="text-sm font-semibold text-slate-800">Judul dan Tagline</div>
          <SwitchRow boxed icon={Type} iconCls="text-orange-500" title="Tambahkan judul dibagian atas formulir" checked={!!fs.title?.enabled} onChange={(v) => setFs({ title: { ...fs.title, enabled: v } })} />
          {fs.title?.enabled && <input className="input" placeholder="Judul" value={fs.title.text ?? ""} onChange={(ev) => setFs({ title: { ...fs.title, text: ev.target.value } })} />}
          <SwitchRow boxed icon={Type} iconCls="text-orange-500" title="Tambahkan tagline dibagian atas formulir" checked={!!fs.tagline?.enabled} onChange={(v) => setFs({ tagline: { ...fs.tagline, enabled: v } })} />
          {fs.tagline?.enabled && <input className="input" placeholder="Tagline" value={fs.tagline.text ?? ""} onChange={(ev) => setFs({ tagline: { ...fs.tagline, text: ev.target.value } })} />}
        </div>
      </EdCard>

      <EdCard icon={LayoutList} tint="violet" title="Komponen Formulir"
        right={<button type="button" className="btn-outline btn-sm border-brand-600 text-brand-700" onClick={() => setFs({ components: {} })}>Reset</button>}>
        <div className="grid grid-cols-2 gap-1 rounded-lg bg-slate-100 p-1 text-sm">
          {(["desktop", "mobile"] as const).map((d) => (
            <button key={d} type="button" onClick={() => setDevice(d)} className={`flex items-center justify-center gap-2 rounded-md py-2 ${device === d ? "bg-white font-semibold text-brand-700" : "text-slate-500"}`}>
              {d === "desktop" ? <Monitor size={15} /> : <Smartphone size={15} />}{d === "desktop" ? "Desktop" : "Mobile"}
            </button>
          ))}
        </div>
        <p className="flex items-center gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800"><AlertCircle size={15} />
          {device === "desktop" ? "Pengurutan komponen belum tersedia di halaman desktop." : "Di mobile, informasi produk tampil di atas formulir."}</p>
        <div className="rounded-xl border border-slate-200 p-4">
          <h4 className="font-semibold text-slate-800">Informasi Bagian {fs.layout === "sidebar_left" ? "Kiri" : "Kanan"}</h4>
          <p className="mb-3 text-xs text-slate-500">Berupa isi dan informasi konten utama dari tataletak sidebar</p>
          <div className="space-y-2">{RIGHT.map(compRow)}</div>
        </div>
        <div className="rounded-xl border border-slate-200 p-4">
          <h4 className="font-semibold text-slate-800">Informasi Bagian {fs.layout === "sidebar_left" ? "Kanan" : "Kiri"}</h4>
          <p className="mb-3 text-xs text-slate-500">Berupa isi dan informasi konten</p>
          <div className="space-y-2">{LEFT.map(compRow)}</div>
        </div>
      </EdCard>

      <EdCard icon={AlertCircle} tint="red" title="Kecualikan Lokasi Pengiriman" desc="Pilih provinsi/kota/kabupaten yang ingin dikecualikan dari pengiriman"
        right={<Switch checked={!!fs.exclude_locations?.enabled} onChange={(v) => setFs({ exclude_locations: { ...fs.exclude_locations, enabled: v } })} />}>
        {fs.exclude_locations?.enabled && (
          <div className="space-y-2">
            <div className="flex flex-wrap gap-1.5">
              {(fs.exclude_locations.provinces ?? []).map((pr) => (
                <span key={pr} className="flex items-center gap-1 rounded-full bg-rose-50 px-2.5 py-1 text-xs font-semibold text-rose-700">{pr}
                  <button type="button" onClick={() => setFs({ exclude_locations: { ...fs.exclude_locations, provinces: fs.exclude_locations!.provinces!.filter((x) => x !== pr) } })} aria-label="Hapus"><X size={12} /></button></span>
              ))}
            </div>
            <Select className="input" value="" onChange={(ev) => ev.target.value && setFs({ exclude_locations: { ...fs.exclude_locations, provinces: [...(fs.exclude_locations?.provinces ?? []), ev.target.value] } })}>
              <option value="">Tambah provinsi…</option>
              {PROVINCES.filter((x) => !fs.exclude_locations?.provinces?.includes(x)).map((x) => <option key={x}>{x}</option>)}
            </Select>
          </div>
        )}
      </EdCard>

      <EdCard icon={FileText} tint="teal" title="Formulir Pemesanan"
        right={<button type="button" className="btn-outline btn-sm border-brand-600 text-brand-700" onClick={() => setFs({ fields: { hide_label: false, custom: [], village: false } })}>Reset</button>}>
        <div><Label>Mode</Label><Select className="input" disabled><option>Tampilkan Semua</option></Select></div>
        <FieldList p={p} fields={fields} setFields={setFields} hideLabel={!!fs.fields?.hide_label}
          setHideLabel={(v) => setFs({ fields: { ...fs.fields, hide_label: v } })} custom={custom}
          setCustom={(cf) => setFs({ fields: { ...fs.fields, custom: cf } })} />
        <div className="flex items-center justify-between">
          {p.type !== "digital" ? (
            <label className="flex items-center gap-2 rounded-lg border border-dashed border-slate-300 px-3 py-1.5 text-sm font-medium">
              <Switch checked={!!fs.fields?.village} onChange={(v) => setFs({ fields: { ...fs.fields, village: v } })} />Tambah Kelurahan
            </label>
          ) : <span />}
          <button type="button" className="btn-outline btn-sm border-brand-600 text-brand-700" onClick={() => setFs({ fields: { ...fs.fields, custom: [...custom, { id: Math.random().toString(36).slice(2, 8), label: "", required: false }] } })}>
            <Plus size={14} />Tambah Form Lain
          </button>
        </div>
      </EdCard>

      <EdCard icon={Star} tint="pink" title="Testimoni" desc="Tambahkan foto/screenshot testimoni dari pelanggan kamu"
        right={<Switch checked={!!fs.testimonials?.enabled} onChange={(v) => setFs({ testimonials: { ...fs.testimonials, enabled: v } })} />}>
        {fs.testimonials?.enabled && (
          <>
            {!!fs.testimonials.images?.length && (
              <div className="grid grid-cols-4 gap-2">
                {fs.testimonials.images.map((src) => (
                  <div key={src} className="relative overflow-hidden rounded-lg border border-slate-200"><img src={src} alt="" className="aspect-square w-full object-cover" />
                    <button type="button" className="absolute right-1 top-1 rounded-full bg-black/60 p-0.5 text-white" onClick={() => setFs({ testimonials: { ...fs.testimonials, images: fs.testimonials!.images!.filter((x) => x !== src) } })} aria-label="Hapus"><X size={12} /></button></div>
                ))}
              </div>
            )}
            <Dropzone compact multiple label="Unggah Testimoni" onUploaded={(u) => setFs({ testimonials: { ...fs.testimonials, images: [...(fs.testimonials?.images ?? []), ...u] } })} />
          </>
        )}
      </EdCard>

      <EdCard icon={ShoppingBag} tint="blue" title="Variasi Produk">
        {p.variants?.length ? (
          <Check checked={!!fs.hide_unavailable_variant} onChange={(v) => setFs({ hide_unavailable_variant: v })} label="Hide Unavailable Variant (sembunyikan varian yang stoknya habis)" />
        ) : (
          <p className="flex items-center gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2.5 text-sm text-amber-800"><AlertCircle size={16} />Hanya untuk product yang memiliki variasi. Anda dapat menambahkan variasi pada add product page</p>
        )}
      </EdCard>

      <EdCard icon={Code2} tint="violet" title="Pelacakan (Tracking)">
        <Tracking fs={fs} setFs={setFs} pixels={pixels} />
      </EdCard>

      <EdCard icon={ServerCog} tint="violet" title="Server Side Tracking" right={<span className="badge bg-slate-100 text-slate-500">Segera hadir</span>} />

      <ComponentEditor k={editing} onClose={() => setEditing(null)} p={p} set={set} c={c} setComp={setComp} />
    </div>
  );
}

function FieldList({ p, fields, setFields, hideLabel, setHideLabel, custom, setCustom }: {
  p: Partial<Product>; fields: FieldItem[]; setFields: (f: FieldItem[]) => void; hideLabel: boolean; setHideLabel: (v: boolean) => void;
  custom: CustomField[]; setCustom: (c: CustomField[]) => void;
}) {
  const [drag, setDrag] = useState<number | null>(null);
  const [edit, setEdit] = useState<FieldItem | null>(null);
  let n = 0;
  return (
    <div className="rounded-xl border border-slate-200 p-4">
      <div className="mb-3 flex items-start justify-between gap-3">
        <div><h4 className="font-semibold text-slate-800">Inputan Formulir</h4><p className="text-xs text-slate-500">Berisi informasi data yang akan disii oleh pembeli</p></div>
        <label className="flex items-center gap-2 rounded-lg border border-dashed border-slate-300 bg-slate-50 px-3 py-1.5 text-sm font-medium">
          <EyeOff size={15} className="text-brand-600" />Sembunyikan Label<Switch checked={hideLabel} onChange={setHideLabel} />
        </label>
      </div>
      <div className="mb-2"><Note tone="blue">Angka dibawah ini sebagai penanda urutan form. Seret untuk mengubah urutan.</Note></div>
      <div className="space-y-2">
        {fields.map((f, i) => {
          const locked = LOCKED(p, f.key);
          const hiddenType = p.type === "digital" && (f.key === "address" || f.key === "region");
          if (hiddenType) return null;
          const num = f.enabled ? ++n : null;
          return (
            <div key={f.key} draggable onDragStart={() => setDrag(i)} onDragOver={(ev) => ev.preventDefault()}
              onDrop={() => { if (drag === null || drag === i) return; const next = [...fields]; const [m] = next.splice(drag, 1); next.splice(i, 0, m); setFields(next); setDrag(null); }}
              className={`flex items-center gap-3 rounded-lg bg-slate-50 px-3 py-2.5 ${drag === i ? "opacity-50" : ""}`}>
              <span className="flex h-6 w-6 items-center justify-center rounded-full bg-slate-200 text-xs font-semibold text-slate-600">{num ?? "-"}</span>
              <input type="checkbox" className="h-4 w-4 accent-brand-600" checked={f.enabled} disabled={locked} onChange={(ev) => setFields(fields.map((x) => (x.key === f.key ? { ...x, enabled: ev.target.checked } : x)))} />
              <span className={`flex-1 text-sm font-medium ${locked && f.key === "phone" ? "text-slate-400" : "text-slate-800"}`}>
                {f.label || FIELD_LABELS[f.key]} {f.required && <span className="ml-2 text-xs font-normal text-rose-500">Required</span>}
                {f.key === "region" && <span className="block text-xs font-normal text-slate-500">Form ini memiliki konversi penjualan yang lebih baik</span>}
              </span>
              <button type="button" className="text-slate-500 hover:text-brand-600" onClick={() => setEdit(f)} aria-label="Edit"><Edit3 size={16} /></button>
              <GripVertical size={16} className="cursor-grab text-slate-400" />
            </div>
          );
        })}
        {custom.length > 0 && <div className="border-t border-dashed border-slate-300" />}
        {custom.map((cf, i) => (
          <div key={cf.id} className="flex items-center gap-3 rounded-lg bg-slate-50 px-3 py-2">
            <span className="flex h-6 w-6 items-center justify-center rounded-full bg-slate-200 text-xs font-semibold text-slate-600">{++n}</span>
            <input className="input h-9 flex-1" placeholder="Label inputan, mis. Ukuran Sepatu" value={cf.label} onChange={(ev) => setCustom(custom.map((x, j) => (j === i ? { ...x, label: ev.target.value } : x)))} />
            <Check checked={cf.required} onChange={(v) => setCustom(custom.map((x, j) => (j === i ? { ...x, required: v } : x)))} label="Wajib" />
            <button type="button" className="text-slate-400 hover:text-rose-600" onClick={() => setCustom(custom.filter((_, j) => j !== i))} aria-label="Hapus"><Trash2 size={16} /></button>
          </div>
        ))}
      </div>
      <Modal open={!!edit} onClose={() => setEdit(null)} title={`Edit ${edit ? FIELD_LABELS[edit.key] : ""}`} icon={Edit3}>
        {edit && (
          <div className="space-y-4">
            <div><Label>Teks placeholder / label</Label><input className="input" placeholder={FIELD_LABELS[edit.key]} value={edit.label ?? ""} onChange={(ev) => setEdit({ ...edit, label: ev.target.value })} /></div>
            <SwitchRow icon={AlertCircle} title="Wajib diisi (Required)" checked={edit.required} disabled={LOCKED(p, edit.key)} onChange={(v) => setEdit({ ...edit, required: v })} />
            <button type="button" className="btn-primary w-full" onClick={() => { setFields(fields.map((x) => (x.key === edit.key ? edit : x))); setEdit(null); }}>Simpan</button>
          </div>
        )}
      </Modal>
    </div>
  );
}

function Tracking({ fs, setFs, pixels }: { fs: FormSettings; setFs: Props["setFs"]; pixels: Pixel[] }) {
  const [tab, setTab] = useState<Pixel["platform"]>("facebook");
  const events = PLATFORMS.find((x) => x[0] === tab)![2];
  const setPixels = (px: Pixel[]) => setFs({ tracking: { ...fs.tracking, pixels: px } });
  const list = pixels.map((px, i) => ({ px, i })).filter(({ px }) => px.platform === tab);
  return (
    <div className="space-y-4">
      <div>
        <div className="text-sm font-semibold text-slate-800">Atur Jumlah Konversi Global</div>
        <p className="mb-2 text-xs text-slate-500">Pilih cara kamu menghitung konversi.</p>
        <div className="space-y-3 rounded-lg bg-slate-50 p-4">
          {([["every", "Every - Event Selalu Trigger (Default)", "Melakukan trigger event setiap halaman dibuka. Biasanya untuk purchase, karena setiap purchase berharga."],
            ["once", "Once - Event Hanya Sekali Trigger", "Hanya sekali trigger, jika melakukan reload tidak dihitung. Biasanya untuk lead, register, dan lainnya."]] as const).map(([v, t, d]) => (
            <label key={v} className="flex cursor-pointer gap-3">
              <input type="radio" className="mt-1 accent-brand-600" checked={(fs.tracking?.conversion ?? "every") === v} onChange={() => setFs({ tracking: { ...fs.tracking, conversion: v } })} />
              <span><span className="block text-sm font-medium text-slate-800">{t}</span><span className="text-xs text-slate-500">{d}</span></span>
            </label>
          ))}
        </div>
      </div>
      <div className="flex overflow-x-auto border-b border-slate-200 text-sm">
        {PLATFORMS.map(([k, label]) => (
          <button key={k} type="button" onClick={() => setTab(k)} className={`whitespace-nowrap border-b-2 px-3 py-2 ${tab === k ? "border-brand-600 font-semibold text-brand-700" : "border-transparent text-slate-500"}`}>{label}</button>
        ))}
      </div>
      {list.map(({ px, i }) => (
        <div key={i} className="space-y-3 rounded-lg border border-slate-200 p-4">
          <div className="grid grid-cols-2 gap-2">
            <div><Label>Pixel ID</Label><input className="input" placeholder={tab === "gtm" ? "GTM-XXXXXX" : "Input Pixel ID"} value={px.id} onChange={(ev) => setPixels(pixels.map((x, j) => (j === i ? { ...x, id: ev.target.value.trim() } : x)))} /></div>
            <div><Label>Pixel Name</Label><input className="input" placeholder="Pixel Name" value={px.name ?? ""} onChange={(ev) => setPixels(pixels.map((x, j) => (j === i ? { ...x, name: ev.target.value } : x)))} /></div>
          </div>
          <div><Label>Pixel Event</Label>
            <Select className="input" value={px.event ?? ""} onChange={(ev) => setPixels(pixels.map((x, j) => (j === i ? { ...x, event: ev.target.value } : x)))}>
              <option value="">Input or Select Pixel Event</option>{events.map((x) => <option key={x}>{x}</option>)}
            </Select>
          </div>
          <div className="flex justify-between text-xs"><span className="text-slate-600">conversion count: <b className="text-brand-600">Global Settings</b></span>
            <button type="button" className="font-semibold text-rose-600" onClick={() => setPixels(pixels.filter((_, j) => j !== i))}>Delete</button></div>
        </div>
      ))}
      <button type="button" className="btn-outline w-full border-brand-600 text-brand-700" onClick={() => setPixels([...pixels, { platform: tab, id: "", event: events[0] }])}>Add More Pixel</button>
    </div>
  );
}

function ComponentEditor({ k, onClose, p, set, c, setComp }: {
  k: string | null; onClose: () => void; p: Partial<Product>; set: Props["set"]; c: (k: string) => any; setComp: (k: string, patch: any) => void;
}) {
  if (!k) return null;
  const label = [...RIGHT, ...LEFT].find((x) => x[0] === k)?.[1] ?? k;
  const body = (() => {
    switch (k) {
      case "images":
        return <div className="space-y-3"><Note>Foto produk diatur di langkah 1 (Tambah Produk).</Note>
          <SwitchRow icon={ImageIcon} title="Aktifkan Geser Otomatis" checked={!!p.autoslide} onChange={(v) => set("autoslide", v)} /></div>;
      case "video":
        return <div><Label>Link YouTube / Vimeo</Label><input className="input" placeholder="https://youtu.be/…" value={c("video").url ?? ""} onChange={(ev) => setComp("video", { url: ev.target.value, enabled: true })} /></div>;
      case "description":
        return (
          <div className="space-y-3">
            <div><Label>Judul</Label><input className="input" placeholder={p.name ?? "Tulis konten"} value={c("description").title ?? ""} onChange={(ev) => setComp("description", { title: ev.target.value })} /></div>
            <div><Label>Deskripsi</Label><textarea className="textarea" rows={4} value={p.description ?? ""} onChange={(ev) => set("description", ev.target.value)} /></div>
            <div>
              <Label>Poin-Poin</Label>
              <div className="space-y-2">
                {(p.features ?? []).map((f, i) => (
                  <div key={i} className="flex gap-2"><input className="input" value={f} onChange={(ev) => set("features", p.features!.map((x, j) => (j === i ? ev.target.value : x)))} />
                    <button type="button" className="btn-ghost px-2 text-rose-600" onClick={() => set("features", p.features!.filter((_, j) => j !== i))} aria-label="Hapus"><Trash2 size={15} /></button></div>
                ))}
              </div>
              <button type="button" className="btn-ghost btn-sm mt-2 text-brand-600" onClick={() => set("features", [...(p.features ?? []), ""])}><Plus size={14} />Tambah Poin</button>
            </div>
          </div>
        );
      case "sold":
        return <div><Label>Teks</Label><input className="input" placeholder="{n} produk sudah terjual" value={c("sold").label ?? ""} onChange={(ev) => setComp("sold", { label: ev.target.value })} /><p className="mt-1 text-xs text-slate-500">{"{n}"} diganti jumlah terjual.</p></div>;
      case "trust_seal": {
        const items: string[] = c("trust_seal").items ?? ["Jaminan Kepuasan", "Transaksi Dijamin Aman"];
        return <div className="space-y-2">{items.map((t, i) => <input key={i} className="input" value={t} onChange={(ev) => setComp("trust_seal", { items: items.map((x, j) => (j === i ? ev.target.value : x)) })} />)}</div>;
      }
      case "payment":
        return (
          <div className="space-y-3">
            {Object.entries(PAYMENT_LABEL).filter(([m]) => !(m === "cod" && p.type === "digital")).map(([m, l]) => (
              <SwitchRow key={m} icon={CreditCard} title={l} desc={m === "cod" ? "Biaya COD dibebankan ke pembeli" : m === "bank_transfer" ? "Rekening dari Account Settings" : undefined}
                checked={p.payment_methods?.includes(m) ?? false}
                onChange={(v) => set("payment_methods", v ? [...(p.payment_methods ?? []), m] : (p.payment_methods ?? []).filter((x) => x !== m))} />
            ))}
          </div>
        );
      case "other_text":
        return <div><Label>Teks</Label><textarea className="textarea" rows={5} value={c("other_text").text ?? ""} onChange={(ev) => setComp("other_text", { text: ev.target.value, enabled: true })} /></div>;
      case "button":
        return (
          <div className="space-y-3">
            <div><Label>Teks Tombol</Label><input className="input" value={c("button").text ?? p.button_text ?? "Beli Sekarang"} onChange={(ev) => { setComp("button", { text: ev.target.value }); set("button_text", ev.target.value); }} /></div>
            <div><Label>Warna Tombol</Label><input type="color" className="h-10 w-24 cursor-pointer rounded-lg border border-slate-200" value={c("button").color ?? "#12b012"} onChange={(ev) => setComp("button", { color: ev.target.value })} /></div>
          </div>
        );
      default:
        return null;
    }
  })();
  return <Modal open onClose={onClose} title={`Edit ${label}`} icon={Edit3}>{body}<button type="button" className="btn-primary mt-4 w-full" onClick={onClose}>Selesai</button></Modal>;
}

export { COMPONENT_DEFAULTS };
