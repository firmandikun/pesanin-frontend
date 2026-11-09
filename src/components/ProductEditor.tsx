"use client";
import { Logo } from "@/components/Logo";
import { ArrowLeft, ArrowRight, Check, ChevronRight, Monitor, Smartphone, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { api, ApiError, BumpItem, FormSettings, Product } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { defaultFormSettings } from "@/lib/productForm";
import { CheckoutForm, SuccessView } from "./CheckoutForm";
import { Step1 } from "./product-editor/Step1";
import { Step2 } from "./product-editor/Step2";
import { Step3 } from "./product-editor/Step3";
import { askText } from "@/components/Dialogs";

const STEPS = ["Tambah Produk", "Halaman Checkout", "Desain Halaman Sukses"];

const blank = (type: "physical" | "digital"): Partial<Product> => ({
  name: "", slug: "", type, status: "active", price: 0, is_preorder: false, track_stock: false, stock: 0, allow_oversell: true,
  min_purchase: 1, weight: 1000, images: [], autoslide: false, features: ["Fitur Pertama", "Fitur Kedua", "Fitur Ketiga"],
  variants: [], variant_options: null, wholesale_prices: [], bump: { enabled: false, items: [] },
  payment_methods: type === "digital" ? ["bank_transfer"] : ["bank_transfer", "cod"],
  whatsapp_validator: false, captcha: false, button_text: "Beli Sekarang",
  form_settings: defaultFormSettings(), success_settings: { action: "page", messages: {} },
});

const slugify = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

export function ProductEditor({ id, type = "physical" }: { id?: number; type?: "physical" | "digital" }) {
  const router = useRouter();
  const { user } = useAuth();
  const [p, setP] = useState<Partial<Product> | null>(id ? null : blank(type));
  const [step, setStep] = useState(0);
  const [device, setDevice] = useState<"desktop" | "mobile">("desktop");
  const [categories, setCategories] = useState<string[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [errors, setErrors] = useState<Record<string, string[]>>({});
  const [saving, setSaving] = useState(false);
  const [successMethod, setSuccessMethod] = useState("cod");
  const slugTouched = useRef(!!id);
  const previewRef = useRef<HTMLDivElement>(null);
  const leftRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    api<string[]>("/categories").then(setCategories);
    Promise.all(["physical", "digital"].map((t) => api(`/products?per_page=100&type=${t}`))).then((r) => setProducts(r.flatMap((x) => x.products.data)));
    if (id) api<Product>(`/products/${id}`).then((x) => setP({ ...x, form_settings: { ...defaultFormSettings(x.name), ...(x.form_settings ?? {}) } }));
  }, [id]);
  useEffect(() => { leftRef.current?.scrollTo({ top: 0 }); }, [step]);
  // Sample courier list for the preview, from the seller's pickup address.
  const [previewShipping, setPreviewShipping] = useState<{ origin: string | null; rates: any[] } | null>(null);
  const shippingKey = JSON.stringify([p?.weight, p?.form_settings?.shipping]);
  useEffect(() => {
    if (!p || p.type === "digital") return;
    const t = setTimeout(() => api("/shipping/preview", { method: "POST", json: { weight: p.weight, shipping: p.form_settings?.shipping ?? {} } }).then(setPreviewShipping).catch(() => {}), 300);
    return () => clearTimeout(t);
  }, [shippingKey]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!p) return <div className="flex h-screen items-center justify-center text-slate-400">Memuat…</div>;

  const set = <K extends keyof Product>(k: K, v: Product[K] | null) => setP((prev) => {
    const next = { ...prev!, [k]: v };
    if (k === "name" && !slugTouched.current) next.slug = slugify(String(v ?? ""));
    return next;
  });
  const setFs = (patch: Partial<FormSettings>) => setP((prev) => ({ ...prev!, form_settings: { ...prev!.form_settings, ...patch } }));
  const ss = p.success_settings ?? {};
  const setSs = (patch: Partial<NonNullable<Product["success_settings"]>>) => setP((prev) => ({ ...prev!, success_settings: { ...prev!.success_settings, ...patch } }));
  const e = (k: string) => errors[k]?.[0] ?? Object.entries(errors).find(([key]) => key.startsWith(k + "."))?.[1][0];
  const methods = (p.payment_methods?.length ? p.payment_methods : ["bank_transfer"]).filter((m) => !(m === "cod" && p.type === "digital"));
  const sm = methods.includes(successMethod) ? successMethod : methods[0];

  // Bump previews come from the seller's other products.
  const bumpItems: BumpItem[] = p.bump?.enabled ? (p.bump.items ?? []).flatMap((it) => {
    const bp = products.find((x) => x.id === it.product_id);
    return bp ? [{ product_id: bp.id, name: bp.name, image: bp.images?.[0], price: it.price ?? (bp.sale_price || bp.price), normal_price: bp.price, description: it.description }] : [];
  }) : [];

  function locate(key: string, prefix = "cmp") {
    setTimeout(() => {
      const el = previewRef.current?.querySelector(`#${prefix}-${key}`) as HTMLElement | null;
      if (!el) return;
      el.scrollIntoView({ behavior: "smooth", block: "center" });
      el.animate([{ boxShadow: "0 0 0 3px #e05510" }, { boxShadow: "0 0 0 0 transparent" }], { duration: 1400 });
    }, 50);
  }

  async function save() {
    setSaving(true);
    setErrors({});
    try {
      const body = {
        ...p, features: (p!.features ?? []).filter(Boolean), slug: p!.slug || undefined,
        bump: { ...p!.bump, items: (p!.bump?.items ?? []).filter((x) => x.product_id) },
        variant_options: p!.variant_options?.filter((o) => o.type && o.values.length) ?? null,
        form_settings: { ...p!.form_settings, page_name: p!.form_settings?.page_name || `Pemesanan ${p!.name}` },
      };
      if (id) await api(`/products/${id}`, { method: "PUT", json: body });
      else await api("/products", { method: "POST", json: body });
      router.push("/products");
    } catch (err) {
      if (err instanceof ApiError) {
        setErrors(err.errors);
        const first = Object.keys(err.errors)[0] ?? "";
        setStep(first.startsWith("form_settings") || first.startsWith("payment_methods") ? 1 : first.startsWith("success") ? 2 : 0);
      }
    } finally {
      setSaving(false);
    }
  }

  const errorCount = Object.keys(errors).length;

  return (
    <div className="flex h-screen flex-col bg-[#f5f6fa]">
      <header className="flex h-16 shrink-0 items-center justify-between bg-navy px-6 text-white">
        <Logo light />
        <ol className="hidden items-center gap-4 text-sm md:flex">
          {STEPS.map((s, i) => (
            <li key={s} className="flex items-center gap-4">
              <button type="button" onClick={() => setStep(i)} className="flex items-center gap-3">
                <span className={`flex h-9 w-9 items-center justify-center rounded-full border text-sm font-semibold ${i < step ? "border-white bg-white text-brand-600" : i === step ? "border-white bg-white text-brand-600" : "border-white/60 text-white/70"}`}>
                  {i < step ? <Check size={16} strokeWidth={3} /> : i + 1}
                </span>
                <span className={i <= step ? "font-semibold" : "text-white/70"}>{s}</span>
              </button>
              {i < STEPS.length - 1 && <ChevronRight size={16} className="text-white/70" />}
            </li>
          ))}
        </ol>
        <button type="button" onClick={() => router.push("/products")} aria-label="Tutup"><X size={22} /></button>
      </header>

      <div className="grid min-h-0 flex-1 lg:grid-cols-[1fr_1fr]">
        <div className="relative flex min-h-0 flex-col">
          <div ref={leftRef} className="flex-1 overflow-y-auto px-6 py-6 md:px-10">
            <div className="mx-auto max-w-[680px] pb-10">
              {errorCount > 0 && (
                <div className="mb-4 rounded-lg border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700">
                  <b>Periksa kembali:</b> {Object.values(errors).slice(0, 3).map((x) => x[0]).join(" · ")}
                </div>
              )}
              {step === 0 && <Step1 p={p} set={set} setFs={setFs} e={e} categories={categories} products={products} user={user!} slugTouched={() => { slugTouched.current = true; }} />}
              {step === 1 && <Step2 p={p} set={set} setFs={setFs} products={products} onLocate={locate} e={e} />}
              {step === 2 && <Step3 p={p} setSs={setSs} method={sm} setMethod={setSuccessMethod} onLocate={(k) => locate(k, "scmp")} />}
            </div>
          </div>
          <div className="flex shrink-0 items-center justify-between border-t border-slate-200 bg-white px-6 py-3">
            <span className="text-sm text-slate-500">{step + 1}/3</span>
            <div className="flex gap-2">
              {step > 0 && <button type="button" className="btn-outline" onClick={() => setStep(step - 1)}><ArrowLeft size={15} />Kembali</button>}
              {step === 1 && (
                <button type="button" className="btn-outline border-brand-600 text-brand-700" onClick={async () => {
                  const name = await askText("Nama template", p.name ? `Template ${p.name}` : "Template baru");
                  if (!name) return;
                  try {
                    const list = JSON.parse(localStorage.getItem("formku_form_templates") ?? "[]");
                    localStorage.setItem("formku_form_templates", JSON.stringify([...list, { name, settings: { ...p.form_settings, page_name: undefined } }]));
                  } catch {}
                }}>Simpan Sebagai Templat</button>
              )}
              {step < 2 ? <button type="button" className="btn-primary bg-brand-600" onClick={() => setStep(step + 1)}>Selanjutnya<ArrowRight size={15} /></button>
                : <button type="button" className="btn-primary bg-brand-600" disabled={saving} onClick={save}>{saving ? "Menyimpan…" : <>Selesai<Check size={15} /></>}</button>}
            </div>
          </div>
        </div>

        <div className="hidden min-h-0 flex-col border-l border-slate-200 bg-white lg:flex">
          <div className="border-b border-slate-200 p-6 pb-4">
            <div className="grid grid-cols-2 gap-1 rounded-xl bg-[#e8ebf3] p-1 text-sm">
              {(["desktop", "mobile"] as const).map((d) => (
                <button key={d} type="button" onClick={() => setDevice(d)} className={`flex items-center justify-center gap-2 rounded-lg py-2 ${device === d ? "bg-white font-semibold text-brand-700" : "text-slate-500"}`}>
                  {d === "desktop" ? <Monitor size={16} /> : <Smartphone size={16} />}{d === "desktop" ? "Desktop" : "Mobile"}
                </button>
              ))}
            </div>
          </div>
          <div ref={previewRef} className="flex-1 overflow-y-auto p-4" style={{ background: step < 2 && p.form_settings?.background && p.form_settings.background !== "#ffffff" ? p.form_settings.background : undefined }}>
            <div className={`mx-auto rounded-2xl border border-slate-200 bg-white p-5 ${device === "mobile" ? "max-w-[380px]" : ""}`}>
              {step === 2
                ? <SuccessView product={p} onLocateRef result={{
                    order: { code: "", quantity: 1, total: p.sale_price || p.price, payment_method: sm, cod_fee: 0 },
                    bank_accounts: sm === "bank_transfer" ? (user?.bank_accounts ?? []).filter((b) => !(p.form_settings?.payment?.disabled_banks ?? []).includes(b.number)) : [],
                    action: "page", whatsapp_url: "#",
                  }} />
                : <CheckoutForm key={`${methods.join()}-${device}`} product={p} methods={methods} preview mobile={device === "mobile"}
                    extras={{ bump_items: bumpItems, sold: 128, preview_shipping: previewShipping ?? undefined }} store={{ store_name: "", cod_fee_percent: user?.cod_fee_percent ?? 3, origin: null }} />}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
