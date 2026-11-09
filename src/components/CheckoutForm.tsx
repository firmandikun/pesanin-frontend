"use client";
import { getAttribution } from "@/lib/attribution";
import { CheckCircle2, Copy, Flame, HandCoins, Landmark, MapPin, MessageCircle, Minus, Plus, ShieldCheck, ThumbsUp, Timer, Truck, Wallet } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { api, ApiError, BumpItem, CustomField, FieldItem, PAYMENT_LABEL, Product, Quote, Rate, rupiah } from "@/lib/api";
import { ShippingOptions } from "./ShippingOptions";
import { embedUrl } from "@/lib/landing";
import { comp, FIELD_PLACEHOLDERS, header, normalizeFields } from "@/lib/productForm";
import { successComp, successOrder } from "@/lib/successPage";
import { SuccessIllustration } from "./Illustrations";
import { BankLogo, EPAYMENT_CHANNELS } from "./product-editor/Step2Panels";
import { RegionSelect } from "./RegionSelect";

export type Store = { store_name: string; cod_fee_percent: number; origin: string | null };
export type Result = {
  order: any; bank_accounts: { bank: string; number: string; holder: string }[]; message?: string | null;
  action: "page" | "whatsapp" | "url"; redirect_url?: string | null; whatsapp_url?: string | null; payment_url?: string | null;
};

function localUnitPrice(p: Partial<Product>, variant: string, qty: number) {
  let price = Number(p.sale_price || p.price || 0);
  const v = p.variants?.find((x) => x.name === variant);
  if (v?.price) price = Number(v.price);
  const tier = [...(p.wholesale_prices ?? [])].sort((a, b) => b.min_qty - a.min_qty).find((t) => qty >= t.min_qty);
  return tier ? Math.min(price, Number(tier.price)) : price;
}

function newToken() {
  const a = new Uint8Array(16);
  crypto.getRandomValues(a);
  return Array.from(a, (b) => b.toString(16).padStart(2, "0")).join("");
}

function Countdown({ until }: { until: string }) {
  const [now, setNow] = useState(Date.now());
  useEffect(() => { const t = setInterval(() => setNow(Date.now()), 1000); return () => clearInterval(t); }, []);
  const left = Math.max(0, new Date(until).getTime() - now);
  if (!left) return null;
  const parts = [Math.floor(left / 864e5), Math.floor((left % 864e5) / 36e5), Math.floor((left % 36e5) / 6e4), Math.floor((left % 6e4) / 1e3)];
  return (
    <div className="flex items-center justify-center gap-3 rounded-lg bg-rose-600 px-3 py-2.5 text-white">
      <Timer size={18} /><span className="text-sm font-bold">Flash Sale berakhir dalam</span>
      <span className="flex gap-1 font-mono text-sm font-bold">{parts.map((n, i) => <span key={i} className="rounded bg-white/20 px-1.5">{String(n).padStart(2, "0")}</span>)}</span>
    </div>
  );
}

function variantGroups(p: Partial<Product>) {
  if (p.variant_options?.length) return p.variant_options.filter((o) => o.values.length);
  return p.variants?.length ? [{ type: "Varian", values: p.variants.map((v) => v.name) }] : [];
}

export type CheckoutExtras = { fields?: FieldItem[]; custom_fields?: CustomField[]; bump_items?: BumpItem[]; sold?: number | null; preview_shipping?: { origin: string | null; rates: Rate[] } };

export function CheckoutForm({ product: p, methods, store, preview, mobile, manual, onDone, extras }: {
  product: Partial<Product>; methods: string[]; store?: Store; preview?: boolean; mobile?: boolean;
  manual?: boolean; onDone?: (r: Result | null) => void; extras?: CheckoutExtras;
}) {
  const physical = p.type !== "digital";
  const fs = p.form_settings ?? {};
  const fields = extras?.fields ? (Array.isArray(extras.fields) ? extras.fields : Object.entries(extras.fields).map(([key, v]: any) => ({ key, ...v }))) : normalizeFields(p);
  const custom = extras?.custom_fields ?? fs.fields?.custom ?? [];
  const bumps = extras?.bump_items ?? [];
  const groups = variantGroups(p);
  const c = (k: string) => comp(fs, k);
  const isNew = fs.theme === "new";
  const inputCls = isNew ? "input" : "h-11 w-full rounded-md border border-slate-300 bg-white px-3 text-sm text-ink outline-none placeholder:text-slate-400 focus:border-brand-500";

  const [form, setForm] = useState<Record<string, any>>({ quantity: (p.min_purchase ?? 1) > 1 ? p.min_purchase : "", payment_method: methods[0], bump_items: [] as number[], custom_fields: {} });
  const [picked, setPicked] = useState<string[]>(() => groups.map((g) => g.values[0]));
  const [regionLabel, setRegionLabel] = useState<string | null>(null);
  const [quote, setQuote] = useState<Quote | null>(null);
  const [errors, setErrors] = useState<Record<string, string[]>>({});
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<Result | null>(null);
  const [slide, setSlide] = useState(0);
  const token = useRef("");

  const variant = groups.length ? picked.join(" / ") : "";
  useEffect(() => { token.current = newToken(); }, []);
  useEffect(() => { if (!methods.includes(form.payment_method)) setForm((f) => ({ ...f, payment_method: methods[0] })); }, [methods, form.payment_method]);
  useEffect(() => { setPicked(groups.map((g, i) => (g.values.includes(picked[i]) ? picked[i] : g.values[0]))); }, [JSON.stringify(groups)]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (!p.autoslide || (p.images?.length ?? 0) < 2) return;
    const t = setInterval(() => setSlide((s) => (s + 1) % p.images!.length), 3000);
    return () => clearInterval(t);
  }, [p.autoslide, p.images]);
  // "Simpan Data Pembeli": prefill from the buyer's last order on this device.
  useEffect(() => {
    if (preview || manual || !c("save_buyer").enabled) return;
    try { const saved = JSON.parse(localStorage.getItem("formku_buyer") ?? "null"); if (saved) setForm((f) => ({ ...f, ...saved })); } catch {}
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const qtyEnabled = fields.find((f) => f.key === "quantity")?.enabled !== false;
  const qty = Math.max(p.min_purchase ?? 1, Number(form.quantity) || 1);

  useEffect(() => {
    if (preview || !p.slug) return;
    const t = setTimeout(() => {
      api<Quote>(`/public/products/${p.slug}/quote`, { method: "POST", json: { ...form, variant, quantity: qty } }).then((q) => {
        setQuote(q);
        if (q.shipping && q.shipping.code !== form.courier) setForm((f) => ({ ...f, courier: q.shipping!.code }));
      }).catch(() => {});
    }, 200);
    return () => clearTimeout(t);
  }, [preview, p.slug, form.region_id, form.courier, variant, JSON.stringify(form.bump_items), form.payment_method, qty, form.coupon_code]); // eslint-disable-line react-hooks/exhaustive-deps

  const unit = quote?.unit_price ?? localUnitPrice(p, variant, qty);
  const bumpTotal = quote ? quote.bump_price : bumps.filter((b) => form.bump_items.includes(b.product_id)).reduce((a, b) => a + b.price, 0);
  const shippingCost = quote?.shipping_cost ?? 0;
  const codFee = quote ? quote.cod_fee : form.payment_method === "cod" ? Math.round((unit * qty + bumpTotal) * (store?.cod_fee_percent ?? 3) / 100) : 0;
  const discount = quote?.discount ?? 0;
  const total = quote ? quote.total : unit * qty + bumpTotal + shippingCost + codFee;
  const [couponDraft, setCouponDraft] = useState("");
  const normal = Number(p.variants?.find((v) => v.name === variant)?.price || p.price || 0);

  const set = (k: string, v: any) => setForm((f) => ({ ...f, [k]: v }));
  // Traffic source (Facebook, TikTok, Google…): UTM tags, ad click IDs, in-app browser or referrer.
  const utm = () => (manual ? {} : getAttribution());

  function saveDraft() {
    if (preview || manual || !p.slug || !(form.phone || form.customer_name)) return;
    api(`/public/products/${p.slug}/abandoned`, { method: "POST", json: { customer_name: form.customer_name, phone: form.phone, address: form.address, region_id: form.region_id, variant: variant || null, quantity: qty, checkout_token: token.current } }).catch(() => {});
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (preview) return;
    setLoading(true);
    setErrors({});
    const body = { ...form, variant: variant || null, quantity: qty };
    try {
      if (manual) {
        await api("/orders", { method: "POST", json: { ...body, product_id: p.id } });
        return onDone?.(null);
      }
      const ref = new URLSearchParams(location.search).get("ref");
      const res = await api<Result>(`/public/products/${p.slug}/checkout`, { method: "POST", json: { ...body, ...utm(), ...(ref ? { ref } : {}), checkout_token: token.current } });
      if (c("save_buyer").enabled) {
        try { localStorage.setItem("formku_buyer", JSON.stringify({ customer_name: form.customer_name, phone: form.phone, email: form.email, address: form.address })); } catch {}
      }
      window.dispatchEvent(new CustomEvent("formku:purchase", { detail: res.order }));
      // E-Payment via the seller's Midtrans: go straight to the payment page (returns to ?order=CODE).
      if (res.payment_url) return void (location.href = res.payment_url);
      if (res.action === "whatsapp" && res.whatsapp_url) return void (location.href = res.whatsapp_url);
      if (res.action === "url" && res.redirect_url) return void (location.href = res.redirect_url);
      setResult(res);
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (err) {
      if (err instanceof ApiError) setErrors(Object.keys(err.errors).length ? err.errors : { customer_name: [err.message] });
    } finally {
      setLoading(false);
    }
  }

  if (result) return <SuccessView result={result} product={p} />;

  const err = (k: string) => errors[k]?.[0] && <p className="mt-1 text-xs text-rose-600">{errors[k][0]}</p>;
  const sectionTitle = (t: string) => <h2 className="mb-3 flex items-center gap-3 text-lg font-bold text-ink">{t}<span className="h-px flex-1 bg-slate-300" /></h2>;
  const ph = (f: FieldItem) => `${f.label || FIELD_PLACEHOLDERS[f.key]}${f.required ? " *" : ""}`;
  const head = header(fs);
  const seal = c("trust_seal");
  const desc = c("description");
  const btn = c("button");
  const other = c("other_text");

  const renderField = (f: FieldItem) => {
    switch (f.key) {
      case "name": return <div key="name"><input className={inputCls} placeholder={ph(f)} value={form.customer_name ?? ""} onChange={(e) => set("customer_name", e.target.value)} onBlur={saveDraft} />{err("customer_name")}</div>;
      case "phone": return <div key="phone"><input className={inputCls} placeholder={ph(f)} inputMode="tel" value={form.phone ?? ""} onChange={(e) => set("phone", e.target.value)} onBlur={saveDraft} />{err("phone")}</div>;
      case "email": return <div key="email"><input className={inputCls} type="email" placeholder={ph(f)} value={form.email ?? ""} onChange={(e) => set("email", e.target.value)} />{err("email")}</div>;
      case "quantity":
        return (
          <div key="quantity">
            {fs.variant_qty_button ? (
              <div className="flex items-center justify-between rounded-md border border-slate-300 bg-white px-3 py-1.5 text-sm">
                <span className="text-slate-500">Jumlah Pesanan</span>
                <span className="flex items-center gap-3">
                  <button type="button" className="rounded-md bg-slate-100 p-1" onClick={() => set("quantity", Math.max(p.min_purchase ?? 1, qty - 1))} aria-label="Kurangi"><Minus size={14} /></button>
                  <b className="w-6 text-center">{qty}</b>
                  <button type="button" className="rounded-md bg-slate-100 p-1" onClick={() => set("quantity", qty + 1)} aria-label="Tambah"><Plus size={14} /></button>
                </span>
              </div>
            ) : <input className={inputCls} type="number" min={p.min_purchase ?? 1} placeholder={ph(f)} value={form.quantity} onChange={(e) => set("quantity", e.target.value)} />}
            {err("quantity")}
          </div>
        );
      case "notes": return <div key="notes"><textarea className={isNew ? "textarea" : `${inputCls} h-20 py-2`} placeholder={ph(f)} value={form.notes ?? ""} onChange={(e) => set("notes", e.target.value)} />{err("notes")}</div>;
      case "address": return <div key="address"><input className={inputCls} placeholder={ph(f)} value={form.address ?? ""} onChange={(e) => set("address", e.target.value)} onBlur={saveDraft} />{err("address")}</div>;
      case "region":
        return (
          <div key="region" className="space-y-3">
            <div>
              <RegionSelect seller={p.slug} value={form.region_id} label={regionLabel} placeholder={ph(f)} onChange={(r) => { setRegionLabel(r.label); setForm((x) => ({ ...x, region_id: r.id, courier: undefined })); }} />
              {err("region_id")}
            </div>
            {fs.fields?.village && <div><input className={inputCls} placeholder="Kelurahan *" value={form.village ?? ""} onChange={(e) => set("village", e.target.value)} />{err("village")}</div>}
          </div>
        );
    }
  };

  const info = (
    <div className="space-y-4">
      {c("images").enabled && !!p.images?.length && (
        <div id="cmp-images">
          <div className="overflow-hidden rounded-lg"><img src={p.images[slide] ?? p.images[0]} alt={p.name} className="w-full object-cover" /></div>
          {p.images.length > 1 && (
            <div className="mt-2 flex gap-2 overflow-x-auto">
              {p.images.map((src, i) => (
                <button type="button" key={src} onClick={() => setSlide(i)} className={`h-12 w-12 shrink-0 overflow-hidden rounded-md border-2 ${i === slide ? "border-brand-600" : "border-transparent"}`}>
                  <img src={src} alt="" className="h-full w-full object-cover" />
                </button>
              ))}
            </div>
          )}
        </div>
      )}
      {c("video").enabled && c("video").url && embedUrl(c("video").url) && (
        <div id="cmp-video" className="aspect-video overflow-hidden rounded-lg"><iframe src={embedUrl(c("video").url)!} className="h-full w-full" allowFullScreen title="video" /></div>
      )}
      {desc.enabled && (
        <div id="cmp-description" className="space-y-2">
          <h3 className="text-lg font-bold text-emerald-600">{desc.title || p.name || "Tulis konten"}</h3>
          {p.description && <p className="whitespace-pre-line text-sm text-slate-600">{p.description}</p>}
          {!!p.features?.length && (
            <ul className="space-y-1.5 text-sm">{p.features.filter(Boolean).map((f, i) => <li key={i} className="flex gap-2"><CheckCircle2 size={18} className="shrink-0 fill-emerald-500 text-white" />{f}</li>)}</ul>
          )}
        </div>
      )}
      {c("sold").enabled && (
        <div id="cmp-sold" className="flex items-center gap-2 rounded-lg bg-amber-50 px-3 py-2 text-sm font-semibold text-amber-800">
          <Flame size={16} />{(c("sold").label || "{n} produk sudah terjual").replace("{n}", String(extras?.sold ?? 0))}
        </div>
      )}
      {fs.testimonials?.enabled && !!fs.testimonials.images?.length && (
        <div id="cmp-testimonials" className="space-y-2">
          <h3 className="font-bold text-ink">Testimoni</h3>
          <div className="grid grid-cols-2 gap-2">{fs.testimonials.images.map((src) => <img key={src} src={src} alt="" className="rounded-lg" />)}</div>
        </div>
      )}
      {!manual && (fs.watermark_logo !== false || fs.watermark_copyright !== false) && (
        <p className="text-center text-xs text-slate-400">
          {fs.watermark_logo !== false && <>Powered by <b className="text-brand-600">pesanin</b><br /></>}
          {fs.watermark_copyright !== false && <>Copyright © {new Date().getFullYear()}</>}
        </p>
      )}
    </div>
  );

  const formEl = (
    <form onSubmit={submit} className="space-y-5">
      <input type="text" name="website" tabIndex={-1} autoComplete="off" className="hidden" value={form.website ?? ""} onChange={(e) => set("website", e.target.value)} />
      {!manual && seal.enabled && (
        <div id="cmp-trust_seal" className="flex justify-center gap-6 text-sm font-semibold text-slate-600">
          {(seal.items ?? ["Jaminan Kepuasan", "Transaksi Dijamin Aman"]).map((t: string, i: number) => (
            <span key={i} className="flex items-center gap-2">
              <span className="flex h-9 w-9 items-center justify-center rounded-full bg-slate-100 text-slate-700">{i % 2 ? <ShieldCheck size={18} /> : <ThumbsUp size={18} />}</span>
              <span className="max-w-24 leading-tight">{t}</span>
            </span>
          ))}
        </div>
      )}

      {c("variants").enabled && groups.length > 0 && (
        <div id="cmp-variants">
          {sectionTitle("Pilihan Produk:")}
          <div className="space-y-3">
            {groups.map((g, gi) => (
              <div key={g.type}>
                <div className="mb-1.5 text-sm font-semibold text-ink">{g.type}</div>
                <div className="flex flex-wrap gap-2">
                  {g.values.map((v) => {
                    const combo = groups.map((x, j) => (j === gi ? v : picked[j])).join(" / ");
                    const stock = p.variants?.find((x) => x.name === combo)?.stock;
                    const out = p.track_stock && stock != null && stock <= 0 && !p.allow_oversell;
                    if (out && fs.hide_unavailable_variant) return null;
                    const on = picked[gi] === v;
                    return (
                      <button type="button" key={v} disabled={out} onClick={() => setPicked(picked.map((x, j) => (j === gi ? v : x)))}
                        className={`relative min-w-24 rounded-md border px-4 py-2.5 text-sm transition disabled:opacity-40 ${on ? "border-brand-600 font-semibold text-brand-700 ring-1 ring-brand-600" : "border-slate-300 text-slate-600"}`}>
                        {v}
                        {on && <span className="absolute -right-1.5 -top-1.5 rounded-full bg-white text-emerald-500"><CheckCircle2 size={16} className="fill-emerald-500 text-white" /></span>}
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
          {err("variant")}
        </div>
      )}

      <div id="cmp-form">
        {sectionTitle("Data Penerima:")}
        <div className="space-y-3">
          {fields.filter((f) => f.enabled).map(renderField)}
          {custom.map((cf) => (
            <div key={cf.id}>
              <input className={inputCls} placeholder={`${cf.label}${cf.required ? " *" : ""}`} value={form.custom_fields?.[cf.id] ?? ""} onChange={(e) => set("custom_fields", { ...form.custom_fields, [cf.id]: e.target.value })} />
              {err(`custom_fields.${cf.id}`)}
            </div>
          ))}
        </div>
      </div>

      {physical && c("shipping").enabled && (form.region_id || preview) && (!preview || extras?.preview_shipping) && (
        <div id="cmp-shipping">
          {sectionTitle("Pengiriman:")}
          {preview ? (
            <ShippingOptions origin={extras?.preview_shipping?.origin ?? null} rates={extras?.preview_shipping?.rates ?? []} opts={fs.shipping ?? {}} name="courier-preview" />
          ) : (
            <ShippingOptions origin={quote?.origin ?? null} rates={quote?.rates ?? []} selected={form.courier} onSelect={(code) => set("courier", code)} opts={fs.shipping ?? {}} />
          )}
        </div>
      )}

      {c("bump").enabled && bumps.length > 0 && (
        <div id="cmp-bump" className="space-y-2">
          {bumps.map((b) => {
            const on = form.bump_items.includes(b.product_id);
            return (
              <label key={b.product_id} className={`flex cursor-pointer gap-3 rounded-lg border-2 border-dashed p-3 text-sm transition ${on ? "border-amber-500 bg-amber-50" : "border-amber-300 bg-amber-50/50"}`}>
                <input type="checkbox" className="mt-1 accent-amber-600" checked={on} onChange={(e) => set("bump_items", e.target.checked ? [...form.bump_items, b.product_id] : form.bump_items.filter((x: number) => x !== b.product_id))} />
                {b.image && <img src={b.image} alt="" className="h-12 w-12 rounded-md object-cover" />}
                <span className="flex-1">
                  <b className="text-ink">Ya, tambahkan {b.name}</b>
                  <span className="ml-1 font-bold text-amber-700">+{rupiah(b.price)}</span>
                  {b.normal_price && b.normal_price > b.price ? <span className="ml-1 text-xs text-slate-400 line-through">{rupiah(b.normal_price)}</span> : null}
                  {b.description && <span className="block text-slate-600">{b.description}</span>}
                </span>
              </label>
            );
          })}
        </div>
      )}

      {c("payment").enabled && (
        <div id="cmp-payment">
          {sectionTitle("Metode Pembayaran:")}
          <div className="grid gap-2">
            {methods.map((m) => (
              <label key={m} className={`flex cursor-pointer items-center gap-3 rounded-lg border px-3 py-3 text-sm font-semibold transition ${form.payment_method === m ? "border-brand-600 bg-brand-50/50 text-brand-700" : "border-slate-200 text-ink hover:border-slate-300"}`}>
                <input type="radio" name="pm" className="accent-brand-600" checked={form.payment_method === m} onChange={() => set("payment_method", m)} />
                <span className="flex h-7 w-9 items-center justify-center rounded bg-slate-100 text-slate-600">{m === "cod" ? <HandCoins size={15} /> : m === "bank_transfer" ? <Landmark size={15} /> : <Wallet size={15} />}</span>
                {PAYMENT_LABEL[m]}
              </label>
            ))}
          </div>
          {form.payment_method === "epayment" && (fs.payment?.epayment?.channels?.length ?? 0) > 0 && (
            <div className="mt-2 grid grid-cols-2 gap-2">
              {EPAYMENT_CHANNELS.filter(([k]) => fs.payment!.epayment.channels.includes(k)).map(([k, label, logo]) => (
                <label key={k} className={`flex cursor-pointer items-center gap-2 rounded-lg border px-2.5 py-2 text-xs font-medium ${form.payment_channel === k ? "border-brand-600 bg-brand-50/50" : "border-slate-200"}`}>
                  <input type="radio" name="channel" className="accent-brand-600" checked={form.payment_channel === k} onChange={() => set("payment_channel", k)} />
                  <BankLogo bank={logo} small />{label}
                </label>
              ))}
            </div>
          )}
          {err("payment_method")}
        </div>
      )}

      {other.enabled && other.text && <div id="cmp-other_text" className="whitespace-pre-line rounded-lg bg-slate-50 p-3 text-sm text-slate-700">{other.text}</div>}

      {c("coupon").enabled && (
        <div id="cmp-coupon">
          <div className="flex gap-2">
            <input className={inputCls} placeholder="Punya kode kupon?" value={couponDraft} onChange={(e) => setCouponDraft(e.target.value.toUpperCase())} />
            <button type="button" onClick={() => set("coupon_code", couponDraft || undefined)} className="shrink-0 rounded-md border border-brand-600 px-4 text-sm font-semibold text-brand-700">Pakai</button>
          </div>
          {form.coupon_code && quote?.coupon_error && <p className="mt-1 text-xs text-rose-600">{quote.coupon_error}</p>}
          {quote?.coupon && <p className="mt-1 text-xs font-medium text-emerald-600">Kupon {quote.coupon.code ?? "otomatis"} dipakai — hemat {rupiah(discount)}</p>}
          {err("coupon_code")}
        </div>
      )}

      {c("summary").enabled && (
        <div id="cmp-summary" className="space-y-1.5 rounded-lg bg-slate-50 p-4 text-sm">
          <h3 className="mb-2 border-b border-slate-200 pb-2 font-bold text-ink">Rincian Pesanan</h3>
          <div className="flex justify-between gap-3">
            <span className="text-slate-600">({qty}x) {p.name || "Produk"} {variant && `(${variant})`}</span>
            <span className="text-right font-semibold">{rupiah(unit * qty)}{normal > unit && <span className="block text-xs font-normal text-rose-400 line-through">{rupiah(normal * qty)}</span>}</span>
          </div>
          {bumps.filter((b) => form.bump_items.includes(b.product_id)).map((b) => <div key={b.product_id} className="flex justify-between"><span className="text-slate-600">{b.name}</span><span className="font-semibold">{rupiah(b.price)}</span></div>)}
          {shippingCost > 0 && <div className="flex justify-between"><span className="text-slate-600">Biaya Pengiriman ({((quote?.weight ?? 0) / 1000).toLocaleString("id-ID")}kg)</span><span className="font-semibold">{rupiah(shippingCost)}</span></div>}
          {codFee > 0 && <div className="flex justify-between"><span className="text-slate-600">Biaya COD</span><span className="font-semibold">{rupiah(codFee)}</span></div>}
          {discount > 0 && <div className="flex justify-between text-emerald-700"><span>Diskon{quote?.coupon?.code ? ` (${quote.coupon.code})` : ""}</span><span className="font-semibold">-{rupiah(discount)}</span></div>}
          <div className="flex justify-between border-t border-slate-200 pt-2 text-base font-bold"><span>Total</span><span className="text-emerald-600">{rupiah(total)}</span></div>
        </div>
      )}

      <button id="cmp-button" disabled={loading}
        className={`flex w-full items-center justify-center rounded-md font-bold text-white transition hover:brightness-105 disabled:opacity-60 ${isNew ? "h-12 rounded-xl text-base" : "h-14 text-2xl"}`}
        style={{ background: btn.color || (isNew ? "var(--color-brand-600)" : "#12b012") }}>
        {loading ? "Memproses…" : manual ? "Simpan Pesanan" : btn.text || p.button_text || "Beli Sekarang"}
      </button>
    </form>
  );

  const headerEl = !manual && (fs.header_image || head.title || head.tagline || head.countdown) && (
    <div className="mb-6 space-y-3 text-center">
      {fs.header_image && <img src={fs.header_image} alt="" className="mx-auto max-h-16" />}
      {head.title && <h1 className="text-2xl font-bold text-ink">{head.title}</h1>}
      {head.tagline && <p className="text-slate-600">{head.tagline}</p>}
      {head.countdown && <Countdown until={head.countdown} />}
    </div>
  );

  if (manual) return formEl;
  const single = mobile || fs.layout === "single";
  return (
    <div>
      {headerEl}
      {single ? (
        <div className="space-y-6">{info}{formEl}</div>
      ) : (
        <div className="grid gap-8 md:grid-cols-[1fr_0.85fr]">
          <div className={fs.layout === "sidebar_left" ? "md:order-2" : ""}>{formEl}</div>
          <div className={fs.layout === "sidebar_left" ? "md:order-1" : ""}><div className="md:sticky md:top-6">{info}</div></div>
        </div>
      )}
    </div>
  );
}

export function SuccessView({ result, product, onLocateRef }: { result: Result; product: Partial<Product>; onLocateRef?: boolean }) {
  const o = result.order;
  const method = (o.payment_method as string) || "bank_transfer";
  const ss = product.success_settings ?? {};
  const fs = product.form_settings ?? {};
  const c = (k: string) => successComp(ss, method, k, product);
  const [copied, setCopied] = useState<string | null>(null);
  const copy = (v: string) => { navigator.clipboard?.writeText(v); setCopied(v); setTimeout(() => setCopied(null), 1500); };
  const video = c("video").url ? embedUrl(c("video").url!) : null;

  const parts: Record<string, React.ReactNode> = {
    icon: <SuccessIllustration className="mx-auto h-24 w-28" />,
    judul: <h1 className="text-[22px] font-bold text-slate-800">{c("judul").text}</h1>,
    title: <p className="text-[15px] text-slate-600">{c("title").text}</p>,
    header: <h2 className="pt-4 text-[22px] font-bold text-slate-800">{c("header").text}</h2>,
    total: <div className="mx-auto my-2 w-fit rounded-lg bg-sky-100 px-5 py-2.5 text-[28px] font-bold text-slate-800">{rupiah(o.total)}</div>,
    subtitle: (
      <div className="space-y-4">
        <p className="text-[15px] text-slate-600">{c("subtitle").text}</p>
        {method === "bank_transfer" && result.bank_accounts.length > 0 && (
          <div className="overflow-hidden rounded-xl border border-slate-200 text-left">
            {result.bank_accounts.map((b) => (
              <div key={b.number} className="flex items-center gap-4 border-b border-slate-100 px-5 py-4">
                <BankLogo bank={b.bank} />
                <span className="flex-1"><b className="block text-lg text-slate-800">{b.holder}</b><span className="text-slate-600">{b.number} • {b.bank}</span></span>
                <button type="button" onClick={() => copy(b.number)} className="text-slate-500 hover:text-brand-600" aria-label="Salin">{copied === b.number ? <CheckCircle2 size={18} className="text-emerald-500" /> : <Copy size={18} />}</button>
              </div>
            ))}
            <div className="bg-slate-50 px-5 py-4">
              <div className="flex items-center justify-between"><span className="text-slate-600">Total transfer</span>
                <span className="flex items-center gap-2 text-[26px] font-bold text-slate-800">{rupiah(o.total)}<button type="button" onClick={() => copy(String(o.total))} className="text-slate-500" aria-label="Salin total"><Copy size={18} /></button></span></div>
              <a href={result.whatsapp_url ?? "#"} target="_blank" className="mt-4 flex h-10 items-center justify-center rounded-lg bg-brand-600 text-sm font-semibold text-white">Konfirmasi Pembayaran</a>
            </div>
          </div>
        )}
      </div>
    ),
    chat: result.whatsapp_url ? <a href={result.whatsapp_url} target="_blank" className="mx-auto flex h-11 w-fit items-center gap-2 rounded-lg bg-[#25D366] px-6 font-semibold text-white"><MessageCircle size={18} />{c("chat").text}</a> : null,
    image: c("image").url ? <img src={c("image").url} alt="" className="mx-auto rounded-lg" /> : null,
    video: video ? <div className="aspect-video overflow-hidden rounded-lg"><iframe src={video} className="h-full w-full" allowFullScreen title="video" /></div> : null,
    footer: <p className="text-sm text-slate-500">{c("footer").text}</p>,
    other: <p className="whitespace-pre-line text-sm text-slate-700">{c("other").text}</p>,
  };

  return (
    <div className="space-y-4" style={{ background: ss.background && ss.background !== "#ffffff" ? ss.background : undefined }}>
      {(ss.title?.enabled || ss.tagline?.enabled) && (
        <div className="text-center">
          {ss.title?.enabled && <h1 className="text-2xl font-bold text-slate-800">{ss.title.text}</h1>}
          {ss.tagline?.enabled && <p className="text-slate-600">{ss.tagline.text}</p>}
        </div>
      )}
      <div className="mx-auto max-w-2xl space-y-2 rounded-xl bg-white px-6 py-6 text-center">
        {successOrder(ss, method).filter((k) => c(k).enabled && parts[k]).map((k) => <div key={k} id={onLocateRef ? `scmp-${k}` : undefined}>{parts[k]}</div>)}
        {o.code && <p className="pt-2 text-xs text-slate-400">ID Pesanan: {o.code}</p>}
      </div>
      {(fs.watermark_logo !== false || fs.watermark_copyright !== false) && (
        <p className="text-center text-xs text-slate-400">
          {fs.watermark_logo !== false && <>Powered by <b className="text-slate-500">pesanin</b><br /></>}
          {fs.watermark_copyright !== false && <span className="text-slate-600">Copyright © {new Date().getFullYear()}</span>}
        </p>
      )}
    </div>
  );
}
