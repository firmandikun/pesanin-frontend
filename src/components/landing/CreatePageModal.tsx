"use client";
import { Check, FileText, Monitor, Smartphone, X } from "lucide-react";
import { useState } from "react";
import { Product } from "@/lib/api";
import { Select } from "@/components/Select";

export const DEFAULT_LP_TEMPLATES: Record<string, string> = {
  blank: "Blank Page",
  simple: "Simple Product",
  product_solution: "Product Solution",
  product_fisik: "Product Fisik / Promo",
};

export function TemplateThumb({ k }: { k: string }) {
  const bars: Record<string, React.ReactNode> = {
    blank: null,
    simple: (
      <>
        <div className="mx-auto h-1.5 w-3/4 rounded bg-slate-700" />
        <div className="mx-auto h-1 w-1/2 rounded bg-slate-300" />
        <div className="mx-auto h-10 w-12 rounded bg-rose-200" />
        <div className="mx-auto h-2 w-10 rounded bg-rose-500" />
      </>
    ),
    product_solution: (
      <>
        <div className="mx-auto h-1.5 w-3/4 rounded bg-slate-700" />
        <div className="mx-auto h-1.5 w-2/3 rounded bg-rose-500" />
        <div className="mx-auto h-10 w-20 rounded bg-amber-100" />
        <div className="mx-auto h-1 w-3/4 rounded bg-slate-300" />
      </>
    ),
    product_fisik: (
      <>
        <div className="h-1.5 w-full rounded bg-brand-600" />
        <div className="mx-auto h-1.5 w-2/3 rounded bg-slate-700" />
        <div className="mx-auto h-10 w-20 rounded bg-slate-200" />
        <div className="mx-auto h-1 w-1/2 rounded bg-slate-300" />
      </>
    ),
  };
  return <div className="flex h-24 flex-col justify-center gap-1.5 rounded-t-lg bg-white px-4">{bars[k]}</div>;
}

export type CreatePageValues = {
  title: string;
  template: string;
  product_id: string;
  preview: "mobile" | "desktop";
};

export function CreatePageModal({
  templates = DEFAULT_LP_TEMPLATES,
  products,
  defaultTitle = "",
  defaultTemplate = "product_fisik",
  heading = "Create New Page",
  submitLabel = "Create Page",
  onClose,
  onSubmit,
}: {
  templates?: Record<string, string>;
  products?: Product[];
  defaultTitle?: string;
  defaultTemplate?: string;
  heading?: string;
  submitLabel?: string;
  onClose: () => void;
  onSubmit: (values: CreatePageValues) => Promise<void> | void;
}) {
  const [form, setForm] = useState<CreatePageValues>({
    title: defaultTitle,
    template: defaultTemplate,
    product_id: "",
    preview: "mobile",
  });
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.title.trim()) {
      setError("Nama halaman wajib diisi.");
      return;
    }
    setError("");
    setBusy(true);
    try {
      await onSubmit(form);
    } catch (err) {
      setError((err as Error).message || "Gagal membuat halaman");
      setBusy(false);
    }
  }

  const all = [...Object.entries(templates), ["link_bio", "Link Bio"], ["product_sales", "Product Sales"]];

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-slate-900/50 p-4 pt-14" onClick={onClose}>
      <form onSubmit={submit} onClick={(e) => e.stopPropagation()} className="w-full max-w-xl rounded-xl bg-white shadow-2xl">
        <div className="flex items-center justify-between px-6 pt-5">
          <h3 className="flex items-center gap-2 text-lg font-bold text-slate-800">
            <FileText size={20} />
            {heading}
          </h3>
          <button type="button" onClick={onClose} className="text-slate-400 hover:text-slate-600" aria-label="Tutup">
            <X size={18} />
          </button>
        </div>
        <div className="space-y-4 px-6 pb-6 pt-3">
          <p className="text-sm text-slate-600">Create a new page by selecting one of the templates below</p>
          <div>
            <div className="mb-2 font-semibold text-slate-800">Template</div>
            <div className="grid grid-cols-3 gap-3">
              {all.filter(([k]) => k !== "link_bio" && k !== "product_sales").map(([k, name]) => {
                const soon = false; // "Link Bio" & "Product Sales" templates are not built yet: hidden instead of "Coming Soon"
                const on = form.template === k;
                return (
                  <button
                    type="button"
                    key={k}
                    disabled={soon}
                    onClick={() => setForm({ ...form, template: k })}
                    className="text-left disabled:cursor-not-allowed"
                  >
                    <div className={`relative overflow-hidden rounded-lg border-2 bg-slate-100 p-2 ${on ? "border-brand-600" : "border-transparent"}`}>
                      {soon ? (
                        <div className="flex h-24 items-center justify-center">
                          <span className="rounded bg-[#5b8def] px-3 py-1 text-xs font-semibold text-white">Coming Soon</span>
                        </div>
                      ) : (
                        <TemplateThumb k={k} />
                      )}
                      {on && (
                        <span className="absolute right-2 top-2 flex h-5 w-5 items-center justify-center rounded-full bg-brand-600 text-white">
                          <Check size={12} strokeWidth={3} />
                        </span>
                      )}
                    </div>
                    <div className={`mt-1.5 text-sm ${soon ? "text-slate-300" : "text-slate-800"}`}>{name}</div>
                  </button>
                );
              })}
            </div>
          </div>
          <div className="border-t border-slate-100 pt-4">
            <div className="mb-2 font-semibold text-slate-800">Default Preview</div>
            <div className="grid grid-cols-2 gap-3">
              {([
                ["mobile", "Mobile", Smartphone],
                ["desktop", "Desktop", Monitor],
              ] as const).map(([k, l, Icon]) => (
                <button
                  type="button"
                  key={k}
                  onClick={() => setForm({ ...form, preview: k })}
                  className={`flex items-center gap-3 rounded-lg border-2 px-4 py-3 text-sm font-medium ${
                    form.preview === k ? "border-brand-600 text-brand-600" : "border-slate-200 text-slate-600"
                  }`}
                >
                  <Icon size={18} />
                  {l}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium text-slate-700">Page Name</label>
            <input
              className="h-10 w-full rounded-lg border border-slate-200 px-3 text-sm outline-none focus:border-brand-600"
              placeholder="Nama halaman / template"
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
            />
            {error && <p className="mt-1 text-xs text-rose-600">{error}</p>}
          </div>
          {products && (
            <div>
              <label className="mb-1.5 block text-sm font-medium text-slate-700">Produk (opsional)</label>
              <Select
                className="h-10 w-full rounded-lg border border-slate-200 px-3 text-sm"
                value={form.product_id}
                onChange={(e) => setForm({ ...form, product_id: e.target.value })}
              >
                <option value="">Tanpa produk</option>
                {products.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </Select>
            </div>
          )}
          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg border border-brand-600 px-6 py-2 text-sm font-semibold text-brand-600"
            >
              Batal
            </button>
            <button
              disabled={busy}
              className="rounded-lg bg-brand-600 px-6 py-2 text-sm font-semibold text-white disabled:opacity-50"
            >
              {busy ? "Membuat…" : submitLabel}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}
