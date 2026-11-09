"use client";
import {
  Archive, Check, ChevronDown, Copy, Download, FileText, Globe, Monitor, MoreVertical, Plus, PlusCircle, Search, Settings, Smartphone, Trash2, X,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { api, ApiError, Paginated, Product } from "@/lib/api";
import { LandingPage } from "@/lib/landing";
import { Pagination } from "@/components/ui";
import { Select } from "@/components/Select";
import { askConfirm, showAlert, askText } from "@/components/Dialogs";

const STATUS_DOT: Record<string, string> = { published: "bg-emerald-500", draft: "bg-slate-400", archived: "bg-amber-500" };

const ago = (iso: string) => {
  const h = Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 36e5));
  return h < 1 ? "baru saja" : h < 24 ? `${h}h ago` : `${Math.round(h / 24)}d ago`;
};

function StatTile({ label, value, icon: Icon, tint }: { label: string; value: number; icon: typeof FileText; tint: string }) {
  return (
    <div className="flex items-center gap-3 surface px-4 py-4">
      <span className={`flex h-11 w-11 items-center justify-center rounded-xl ${tint}`}><Icon size={22} /></span>
      <div><div className="text-xs text-slate-600">{label}</div><div className="text-xl font-bold text-slate-800">{value}</div></div>
    </div>
  );
}

export default function LandingPages() {
  const router = useRouter();
  const [data, setData] = useState<{ pages: Paginated<LandingPage>; stats: any; labels: string[]; templates: Record<string, string> } | null>(null);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const [label, setLabel] = useState("");
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(10);
  const [creating, setCreating] = useState(false);
  const [menu, setMenu] = useState<string | null>(null);
  const [selected, setSelected] = useState<number[]>([]);
  const [host, setHost] = useState("");
  useEffect(() => setHost(location.host), []);

  const load = useCallback(() => {
    api(`/landing-pages?${new URLSearchParams({ search, status, label, page: String(page), per_page: String(perPage) })}`).then(setData);
  }, [search, status, label, page, perPage]);
  useEffect(() => { const t = setTimeout(load, 250); return () => clearTimeout(t); }, [load]);

  async function update(p: LandingPage, json: Record<string, unknown>) { setMenu(null); await api(`/landing-pages/${p.id}`, { method: "PUT", json }); load(); }
  async function remove(p: LandingPage) { setMenu(null); if (await askConfirm(`Hapus halaman "${p.title}"?`)) { await api(`/landing-pages/${p.id}`, { method: "DELETE" }); load(); } }
  async function duplicate(p: LandingPage) { await api(`/landing-pages/${p.id}/duplicate`, { method: "POST" }); load(); }
  async function setLabelFor(p: LandingPage) { const l = await askText("Label halaman", p.label ?? ""); if (l !== null) update(p, { label: l || null }); }

  const s = data?.stats;
  const rows = data?.pages.data ?? [];

  return (
    <div className="space-y-5">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-[34px] font-bold text-slate-800">Page List</h1>
          <p className="mt-2 text-sm text-slate-600">A list of the pages that the user has made.</p>
        </div>
        <Link href="/segera?f=Tutorial%20Landing%20Page" className="rounded-lg border border-slate-200 bg-white px-8 py-2.5 text-sm font-medium text-brand-600">Tutorial</Link>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatTile label="Total Pages" value={s?.total ?? 0} icon={FileText} tint="bg-brand-100 text-brand-600" />
        <StatTile label="Pages on Draft" value={s?.draft ?? 0} icon={FileText} tint="bg-violet-100 text-violet-600" />
        <StatTile label="Published Pages" value={s?.published ?? 0} icon={FileText} tint="bg-lime-100 text-lime-700" />
        <StatTile label="Archived Pages" value={s?.archived ?? 0} icon={FileText} tint="bg-orange-100 text-orange-600" />
      </div>

      <div className="surface">
        <div className="flex flex-wrap items-center gap-2 p-4">
          <div className="relative w-56">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input className="h-9 w-full rounded-lg border border-slate-200 pl-9 pr-3 text-sm outline-none focus:border-brand-600" placeholder="Search" value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} />
          </div>
          <Select className="h-9 rounded-lg border border-slate-200 px-3 text-sm" value={status} onChange={(e) => { setStatus(e.target.value); setPage(1); }}>
            <option value="">All Pages</option><option value="published">Published</option><option value="draft">Draft</option><option value="archived">Archived</option>
          </Select>
          <Select className="h-9 rounded-lg border border-slate-200 px-3 text-sm" value={label} onChange={(e) => setLabel(e.target.value)}>
            <option value="">Label</option>{data?.labels.map((l) => <option key={l}>{l}</option>)}
          </Select>
          <div className="ml-auto flex gap-2">
            <button onClick={() => setCreating(true)} className="flex h-9 items-center gap-2 rounded-lg bg-brand-600 px-5 text-sm font-semibold text-white"><PlusCircle size={16} />Create New Page</button>
            <button onClick={() => showAlert("Import halaman dari file JSON segera hadir.", "Segera hadir")} className="flex h-9 items-center gap-2 rounded-lg border border-brand-600 px-4 text-sm font-semibold text-brand-600"><Download size={16} />Import Page</button>
          </div>
        </div>

        {selected.length > 0 && (
          <div className="flex items-center gap-3 border-y border-slate-100 bg-slate-50 px-4 py-2 text-sm">
            <b>{selected.length} dipilih</b>
            <button className="text-brand-600" onClick={async () => { await Promise.all(selected.map((id) => api(`/landing-pages/${id}`, { method: "PUT", json: { status: "archived" } }))); setSelected([]); load(); }}>Archive</button>
            <button className="text-rose-600" onClick={async () => { if (!(await askConfirm(`Hapus ${selected.length} halaman?`))) return; await Promise.all(selected.map((id) => api(`/landing-pages/${id}`, { method: "DELETE" }))); setSelected([]); load(); }}>Delete</button>
          </div>
        )}

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100 text-left text-[13px] text-slate-500">
                <th className="w-10 px-4 py-3"><input type="checkbox" className="accent-brand-600" checked={rows.length > 0 && selected.length === rows.length} onChange={(e) => setSelected(e.target.checked ? rows.map((r) => r.id) : [])} /></th>
                <th className="px-2 py-3 font-medium">Status</th><th className="px-2 py-3 font-medium">Page Name</th><th className="px-2 py-3 font-medium">Label</th>
                <th className="px-2 py-3 font-medium">Domain</th><th className="px-2 py-3 font-medium">Last Modified</th><th className="px-2 py-3" />
              </tr>
            </thead>
            <tbody>
              {rows.map((p) => (
                <tr key={p.id} className="group border-b border-slate-100 align-top last:border-0">
                  <td className="px-4 py-4"><input type="checkbox" className="accent-brand-600" checked={selected.includes(p.id)} onChange={(e) => setSelected(e.target.checked ? [...selected, p.id] : selected.filter((x) => x !== p.id))} /></td>
                  <td className="relative px-2 py-3">
                    <button onClick={() => setMenu(menu === `s${p.id}` ? null : `s${p.id}`)} className="flex items-center gap-1 rounded-lg border border-slate-200 px-2 py-1.5">
                      <span className={`flex h-5 w-5 items-center justify-center rounded-full ${STATUS_DOT[p.status]} text-white`}><Check size={12} strokeWidth={3} /></span><ChevronDown size={14} className="text-slate-500" />
                    </button>
                    {menu === `s${p.id}` && (
                      <div className="absolute left-2 top-12 z-10 w-36 rounded-lg bg-white p-1 shadow-lg ring-1 ring-slate-100" onMouseLeave={() => setMenu(null)}>
                        {(["published", "draft", "archived"] as const).map((st) => (
                          <button key={st} onClick={() => update(p, { status: st })} className="flex w-full items-center gap-2 rounded px-2 py-1.5 text-left capitalize hover:bg-slate-50">
                            <span className={`h-2 w-2 rounded-full ${STATUS_DOT[st]}`} />{st}{p.status === st && <Check size={13} className="ml-auto" />}
                          </button>
                        ))}
                      </div>
                    )}
                  </td>
                  <td className="px-2 py-3">
                    <div className="flex items-start gap-3">
                      <div className="flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded border border-slate-200 bg-slate-50 text-slate-300">
                        {p.product?.images?.[0] ? <img src={p.product.images[0]} alt="" className="h-full w-full object-cover" /> : <FileText size={16} />}
                      </div>
                      <div>
                        <Link href={`/landing-pages/${p.id}`} className="font-medium text-slate-800 hover:text-brand-600">{p.title}</Link>
                        <div className="mt-1 flex gap-2 text-xs text-brand-600 opacity-0 transition group-hover:opacity-100">
                          <Link href={`/landing-pages/${p.id}?tab=settings`}>Edit</Link>
                          <Link href={`/landing-pages/${p.id}`}>Edit with Builder</Link>
                          <button onClick={() => duplicate(p)}>Duplicate</button>
                          <a href={`/p/${p.slug}${p.status === "published" ? "" : "?preview=1"}`} target="_blank">Visit Page</a>
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="px-2 py-3">
                    <button onClick={() => setLabelFor(p)} className="flex items-center gap-1 rounded-md border border-dashed border-slate-300 px-2 py-0.5 text-xs text-slate-600">
                      {p.label ? p.label : <><Plus size={11} />Label</>}
                    </button>
                  </td>
                  <td className="px-2 py-3">
                    <div className="flex items-center gap-1.5 font-medium text-slate-800"><Globe size={15} className="text-slate-500" />{host || "pesanin"}<ChevronDown size={14} className="text-slate-400" /></div>
                    <div className="mt-0.5 flex items-center gap-1.5 text-xs">
                      <a href={`/p/${p.slug}${p.status === "published" ? "" : "?preview=1"}`} target="_blank" className="text-brand-600 underline">/p/{p.slug}</a>
                      <button onClick={() => navigator.clipboard?.writeText(`${location.origin}/p/${p.slug}`)} className="text-slate-400 hover:text-brand-600" aria-label="Salin"><Copy size={13} /></button>
                    </div>
                  </td>
                  <td className="whitespace-nowrap px-2 py-3 text-slate-600">{ago(p.updated_at)}</td>
                  <td className="relative px-2 py-3 text-right">
                    <div className="flex justify-end gap-1">
                      <Link href={`/landing-pages/${p.id}?tab=settings`} className="flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-700"><Settings size={14} />Settings</Link>
                      <button onClick={() => setMenu(menu === `m${p.id}` ? null : `m${p.id}`)} className="rounded-lg px-1.5 text-slate-500 hover:bg-slate-100" aria-label="Aksi"><MoreVertical size={16} /></button>
                    </div>
                    {menu === `m${p.id}` && (
                      <div className="absolute right-2 top-12 z-10 w-40 rounded-lg bg-white p-1 text-left shadow-lg ring-1 ring-slate-100" onMouseLeave={() => setMenu(null)}>
                        <button onClick={() => duplicate(p)} className="flex w-full items-center gap-2 rounded px-2 py-1.5 hover:bg-slate-50"><Copy size={14} />Duplicate</button>
                        <button onClick={() => update(p, { status: "archived" })} className="flex w-full items-center gap-2 rounded px-2 py-1.5 hover:bg-slate-50"><Archive size={14} />Archive</button>
                        <button onClick={() => remove(p)} className="flex w-full items-center gap-2 rounded px-2 py-1.5 text-rose-600 hover:bg-rose-50"><Trash2 size={14} />Delete</button>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {data && !rows.length && <div className="py-16 text-center text-sm text-slate-500">Belum ada halaman. Klik <b>Create New Page</b> untuk mulai.</div>}
        </div>
        {data && <Pagination page={data.pages.current_page} last={data.pages.last_page} onChange={setPage} total={data.pages.total} perPage={perPage} onPerPage={setPerPage} />}
      </div>

      {creating && data && <CreateModal templates={data.templates} onClose={() => setCreating(false)} onCreated={(id) => router.push(`/landing-pages/${id}`)} />}
    </div>
  );
}

function TemplateThumb({ k }: { k: string }) {
  const bars: Record<string, React.ReactNode> = {
    blank: null,
    simple: <><div className="mx-auto h-1.5 w-3/4 rounded bg-slate-700" /><div className="mx-auto h-1 w-1/2 rounded bg-slate-300" /><div className="mx-auto h-10 w-12 rounded bg-rose-200" /><div className="mx-auto h-2 w-10 rounded bg-rose-500" /></>,
    product_solution: <><div className="mx-auto h-1.5 w-3/4 rounded bg-slate-700" /><div className="mx-auto h-1.5 w-2/3 rounded bg-rose-500" /><div className="mx-auto h-10 w-20 rounded bg-amber-100" /><div className="mx-auto h-1 w-3/4 rounded bg-slate-300" /></>,
    product_fisik: <><div className="h-1.5 w-full rounded bg-brand-600" /><div className="mx-auto h-1.5 w-2/3 rounded bg-slate-700" /><div className="mx-auto h-10 w-20 rounded bg-slate-200" /><div className="mx-auto h-1 w-1/2 rounded bg-slate-300" /></>,
  };
  return <div className="flex h-24 flex-col justify-center gap-1.5 rounded-t-lg bg-white px-4">{bars[k]}</div>;
}

function CreateModal({ templates, onClose, onCreated }: { templates: Record<string, string>; onClose: () => void; onCreated: (id: number) => void }) {
  const [form, setForm] = useState({ title: "", template: "blank", product_id: "", preview: "mobile" });
  const [products, setProducts] = useState<Product[]>([]);
  const [errors, setErrors] = useState<Record<string, string[]>>({});
  const [busy, setBusy] = useState(false);
  useEffect(() => { Promise.all(["physical", "digital"].map((t) => api(`/products?per_page=100&type=${t}`))).then((r) => setProducts(r.flatMap((x) => x.products.data))); }, []);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      const page = await api("/landing-pages", { method: "POST", json: { title: form.title, template: form.template, product_id: form.product_id || null } });
      if (form.preview === "desktop") await api(`/landing-pages/${page.id}`, { method: "PUT", json: { theme: { ...page.theme, width: "wide" } } });
      onCreated(page.id);
    } catch (err) {
      if (err instanceof ApiError) setErrors(err.errors);
      setBusy(false);
    }
  }

  const all = [...Object.entries(templates), ["link_bio", "Link Bio"], ["product_sales", "Product Sales"]];
  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-slate-900/50 p-4 pt-14" onClick={onClose}>
      <form onSubmit={submit} onClick={(e) => e.stopPropagation()} className="w-full max-w-xl rounded-xl bg-white shadow-2xl">
        <div className="flex items-center justify-between px-6 pt-5">
          <h3 className="flex items-center gap-2 text-lg font-bold text-slate-800"><FileText size={20} />Create New Page</h3>
          <button type="button" onClick={onClose} className="text-slate-400" aria-label="Tutup"><X size={18} /></button>
        </div>
        <div className="space-y-4 px-6 pb-6 pt-3">
          <p className="text-sm text-slate-600">Create a new page by selecting one of the templates below</p>
          <div>
            <div className="mb-2 font-semibold text-slate-800">Template</div>
            <div className="grid grid-cols-3 gap-3">
              {all.map(([k, name]) => {
                const soon = k === "link_bio" || k === "product_sales";
                const on = form.template === k;
                return (
                  <button type="button" key={k} disabled={soon} onClick={() => setForm({ ...form, template: k })} className="text-left disabled:cursor-not-allowed">
                    <div className={`relative overflow-hidden rounded-lg border-2 bg-slate-100 p-2 ${on ? "border-brand-600" : "border-transparent"}`}>
                      {soon ? <div className="flex h-24 items-center justify-center"><span className="rounded bg-[#5b8def] px-3 py-1 text-xs font-semibold text-white">Coming Soon</span></div> : <TemplateThumb k={k} />}
                      {on && <span className="absolute right-2 top-2 flex h-5 w-5 items-center justify-center rounded-full bg-brand-600 text-white"><Check size={12} strokeWidth={3} /></span>}
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
              {([["mobile", "Mobile", Smartphone], ["desktop", "Desktop", Monitor]] as const).map(([k, l, Icon]) => (
                <button type="button" key={k} onClick={() => setForm({ ...form, preview: k })}
                  className={`flex items-center gap-3 rounded-lg border-2 px-4 py-3 text-sm font-medium ${form.preview === k ? "border-brand-600 text-brand-600" : "border-slate-200 text-slate-600"}`}><Icon size={18} />{l}</button>
              ))}
            </div>
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium text-slate-700">Page Name</label>
            <input className="h-10 w-full rounded-lg border border-slate-200 px-3 text-sm outline-none focus:border-brand-600" placeholder="Nama halaman" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
            {errors.title && <p className="mt-1 text-xs text-rose-600">{errors.title[0]}</p>}
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium text-slate-700">Produk (opsional)</label>
            <Select className="h-10 w-full rounded-lg border border-slate-200 px-3 text-sm" value={form.product_id} onChange={(e) => setForm({ ...form, product_id: e.target.value })}>
              <option value="">Tanpa produk</option>{products.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
            </Select>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <button type="button" onClick={onClose} className="rounded-lg border border-brand-600 px-6 py-2 text-sm font-semibold text-brand-600">Batal</button>
            <button disabled={busy} className="rounded-lg bg-brand-600 px-6 py-2 text-sm font-semibold text-white disabled:opacity-50">{busy ? "Membuat…" : "Create Page"}</button>
          </div>
        </div>
      </form>
    </div>
  );
}
