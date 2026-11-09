"use client";
import {
  ChevronDown, ChevronLeft, ChevronUp, Copy, Eye, EyeOff, GripVertical, Monitor, MoreVertical, Palette, Pin, Redo2,
  Rocket, Search, Settings, Smartphone, Tablet, Trash2, Undo2,
} from "lucide-react";
import { LogoMark, Wordmark } from "@/components/Logo";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense, use, useEffect, useMemo, useRef, useState } from "react";
import { api, ApiError, Product } from "@/lib/api";
import { Block, BlockType, BLOCKS, blockMeta, LandingPage, newBlock } from "@/lib/landing";
import { BlockEditor } from "@/components/landing/BlockEditor";
import { BlockView, CheckoutData } from "@/components/landing/BlockRenderer";
import { Field } from "@/components/ui";
import { Select } from "@/components/Select";

const DEVICES = { desktop: { w: "100%", icon: Monitor, label: "Desktop" }, tablet: { w: "768px", icon: Tablet, label: "Tablet" }, mobile: { w: "400px", icon: Smartphone, label: "Mobile" } } as const;
type Device = keyof typeof DEVICES;
type Mode = { kind: "home" } | { kind: "add" } | { kind: "block"; id: string; snapshot: Block } | { kind: "style" } | { kind: "settings" };
const PINNED: BlockType[] = ["headline", "subheadline", "text", "button", "whatsapp", "image", "slider", "testimonials", "faq", "divider", "video", "checkout", "html"];
const GROUPS: [string, BlockType[]][] = [
  ["CONTENT", ["headline", "subheadline", "text", "button", "spacer", "divider", "features", "whatsapp", "announcement"]],
  ["GROUP", ["faq", "testimonials"]], ["MEDIA", ["image", "slider", "video"]], ["SHOPPING", ["pricing"]],
  ["OTHER", ["countdown", "html"]], ["PESANIN", ["checkout"]],
];

function Builder({ id }: { id: string }) {
  const sp = useSearchParams();
  const [page, setPage] = useState<LandingPage | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [checkout, setCheckout] = useState<CheckoutData>({});
  const [mode, setMode] = useState<Mode>({ kind: sp.get("tab") === "settings" ? "settings" : "home" });
  const [device, setDevice] = useState<Device>("mobile");
  const [query, setQuery] = useState("");
  const [past, setPast] = useState<Block[][]>([]);
  const [future, setFuture] = useState<Block[][]>([]);
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState("");
  const [menu, setMenu] = useState<string | null>(null);
  const [sectionOpen, setSectionOpen] = useState(true);
  const drag = useRef<number | null>(null);

  useEffect(() => {
    api<LandingPage>(`/landing-pages/${id}`).then((p) => { setPage(p); if (p.theme?.width === "wide") setDevice("desktop"); });
    Promise.all(["physical", "digital"].map((t) => api(`/products?per_page=100&type=${t}`))).then((r) => setProducts(r.flatMap((x) => x.products.data)));
  }, [id]);

  const productIds = useMemo(() => [...new Set((page?.blocks ?? []).filter((b) => b.type === "checkout" && b.data.product_id).map((b) => b.data.product_id as number))], [page?.blocks]);
  useEffect(() => {
    productIds.filter((pid) => !checkout[pid]).forEach((pid) => {
      const p = products.find((x) => x.id === pid);
      if (p?.status === "active") api(`/public/products/${p.slug}?preview=1`).then((c) => setCheckout((m) => ({ ...m, [pid]: c })));
    });
  }, [productIds, products, checkout]);
  useEffect(() => {
    const warn = (e: BeforeUnloadEvent) => { if (dirty) e.preventDefault(); };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty]);

  if (!page) return <div className="flex h-screen items-center justify-center bg-[#141416] text-slate-400">Memuat builder…</div>;
  const blocks = page.blocks ?? [];
  const color = page.theme?.primary ?? "var(--color-brand-600)";
  const notify = (m: string) => { setToast(m); setTimeout(() => setToast(""), 2200); };

  const commit = (next: Block[], record = true) => {
    if (record) { setPast((h) => [...h.slice(-49), blocks]); setFuture([]); }
    setPage((p) => ({ ...p!, blocks: next }));
    setDirty(true);
  };
  const undo = () => { if (!past.length) return; setFuture((f) => [blocks, ...f]); setPage((p) => ({ ...p!, blocks: past[past.length - 1] })); setPast((h) => h.slice(0, -1)); setDirty(true); };
  const redo = () => { if (!future.length) return; setPast((h) => [...h, blocks]); setPage((p) => ({ ...p!, blocks: future[0] })); setFuture((f) => f.slice(1)); setDirty(true); };
  const updatePage = (patch: Partial<LandingPage>) => { setPage((p) => ({ ...p!, ...patch })); setDirty(true); };

  const openBlock = (b: Block) => setMode({ kind: "block", id: b.id, snapshot: structuredClone(b) });
  const add = (type: BlockType) => { const b = newBlock(type); commit([...blocks, b]); openBlock(b); };
  const duplicate = (b: Block) => { const i = blocks.indexOf(b); const c = { ...structuredClone(b), id: Math.random().toString(36).slice(2, 10) }; commit([...blocks.slice(0, i + 1), c, ...blocks.slice(i + 1)]); };
  const remove = (b: Block) => { commit(blocks.filter((x) => x.id !== b.id)); setMode({ kind: "home" }); };
  const selectedId = mode.kind === "block" ? mode.id : null;
  const sel = blocks.find((b) => b.id === selectedId) ?? null;

  async function save(status?: LandingPage["status"]) {
    setSaving(true);
    try {
      const saved = await api<LandingPage>(`/landing-pages/${page!.id}`, { method: "PUT", json: {
        title: page!.title, slug: page!.slug, label: page!.label || null, status: status ?? page!.status, product_id: page!.product_id ?? null,
        theme: page!.theme, seo: page!.seo, settings: page!.settings, blocks,
      } });
      setPage(saved); setDirty(false);
      notify(status === "published" ? "Halaman dipublikasikan 🚀" : "Tersimpan");
    } catch (e) {
      notify(e instanceof ApiError ? Object.values(e.errors)[0]?.[0] ?? e.message : "Gagal menyimpan");
    } finally { setSaving(false); }
  }

  const darkBtn = "flex h-9 items-center gap-2 rounded-md bg-[#36363d] px-3 text-[13px] font-medium text-white hover:bg-[#424249]";
  const crumb = (label: string) => (
    <div className="mb-5 inline-flex rounded bg-[#2a2a30] px-2 py-1 text-xs text-slate-300">
      <button onClick={() => setMode({ kind: "home" })} className="hover:text-white">Home</button><span className="mx-1.5">/</span>{label}
    </div>
  );

  return (
    <div className="flex h-screen flex-col bg-[#141416] text-white">
      <header className="flex h-[60px] shrink-0 items-center gap-2 border-b border-[#26262b] bg-[#1c1c1f] px-4">
        <span className="mr-4 flex items-center gap-2.5"><LogoMark size={30} /><span className="leading-none"><Wordmark light className="text-xl" /><span className="block text-[9px] font-medium text-slate-400">Page Builder</span></span></span>
        <Link href="/landing-pages" className={darkBtn}><ChevronLeft size={15} />Back to Page List</Link>
        <Select tone="dark" className="h-9 w-44 rounded-md border border-[#3a3a41] bg-[#1c1c1f] px-2 text-[13px] text-white" value={page.theme?.width ?? "narrow"} onChange={(e) => updatePage({ theme: { ...page.theme, width: e.target.value as any } })}>
          <option value="narrow">Canvas: Default</option><option value="wide">Canvas: Wide</option>
        </Select>
        <label className="flex h-9 cursor-pointer items-center gap-1 rounded-md border border-[#3a3a41] px-2" title="Warna latar halaman">
          <span className="h-5 w-5 rounded-full border border-white/30" style={{ background: page.theme?.background ?? "#fff" }} /><ChevronDown size={14} />
          <input type="color" className="sr-only" value={page.theme?.background ?? "#ffffff"} onChange={(e) => updatePage({ theme: { ...page.theme, background: e.target.value } })} />
        </label>
        <div className="mx-auto hidden items-center gap-2 lg:flex">
          <span className="mr-1 text-[15px] text-slate-200">Preview on</span>
          {(Object.keys(DEVICES) as Device[]).map((k) => {
            const D = DEVICES[k];
            return <button key={k} onClick={() => setDevice(k)} className={`${darkBtn} ${device === k ? "!bg-brand-600" : ""}`}><D.icon size={15} />{D.label}</button>;
          })}
        </div>
        <button onClick={undo} disabled={!past.length} className="flex h-9 w-9 items-center justify-center rounded-md border border-[#4a4a52] disabled:opacity-30" aria-label="Undo"><Undo2 size={17} /></button>
        <button onClick={redo} disabled={!future.length} className="mr-3 flex h-9 w-9 items-center justify-center rounded-md border border-[#4a4a52] disabled:opacity-30" aria-label="Redo"><Redo2 size={17} /></button>
        <button onClick={() => save("published")} disabled={saving} title="Publish" className="mr-3 flex h-9 w-9 items-center justify-center rounded-md bg-[#1f7a3d] hover:bg-[#25914a]"><Rocket size={17} /></button>
        <button className={darkBtn} onClick={() => { navigator.clipboard?.writeText(`${location.origin}/p/${page.slug}`); notify("Link disalin"); }}>Copy Link</button>
        <a className={darkBtn} href={`/p/${page.slug}?preview=1`} target="_blank">Preview</a>
        <button onClick={() => save()} disabled={saving} className="flex h-9 items-center rounded-md bg-brand-600 px-6 text-[13px] font-semibold hover:bg-[#4a52d4]">{saving ? "…" : "Save"}</button>
      </header>

      <div className="flex min-h-0 flex-1">
        <aside className="dark-panel flex w-[300px] shrink-0 flex-col bg-[#1c1c1f]">
          <div className="flex-1 overflow-y-auto p-6 pb-3">
            {mode.kind === "home" && (
              <>
                <h2 className="truncate text-lg font-semibold">{page.title}</h2>
                <div className="my-5 border-t border-[#2e2e34]" />
                <button onClick={() => { setQuery(""); setMode({ kind: "add" }); }} className="h-10 w-full rounded-md bg-brand-600 text-sm font-semibold hover:bg-[#4a52d4]">Add Component</button>
                <div className="mt-4 space-y-1">
                  {blocks.map((b, i) => {
                    const m = blockMeta(b.type);
                    return (
                      <div key={b.id} draggable onDragStart={() => { drag.current = i; }} onDragOver={(e) => e.preventDefault()}
                        onDrop={() => { const from = drag.current; if (from === null || from === i) return; const n = [...blocks]; const [x] = n.splice(from, 1); n.splice(i, 0, x); commit(n); drag.current = null; }}
                        className="group relative flex items-center gap-2 rounded-md bg-[#26262b] px-2 py-3 text-[15px] hover:bg-[#2e2e34]">
                        <GripVertical size={16} className="cursor-grab text-slate-500" />
                        <button className="flex-1 truncate text-left" onClick={() => openBlock(b)}>{m.label}</button>
                        <button onClick={() => openBlock(b)} className="text-slate-400 hover:text-white" aria-label="Pengaturan"><Settings size={15} /></button>
                        <button onClick={() => duplicate(b)} className="text-slate-400 hover:text-white" aria-label="Duplikat"><Copy size={15} /></button>
                        <button onClick={() => setMenu(menu === b.id ? null : b.id)} className="text-slate-400 hover:text-white" aria-label="Lainnya"><MoreVertical size={15} /></button>
                        {menu === b.id && (
                          <div className="absolute right-0 top-11 z-10 w-36 rounded-md bg-[#2e2e34] p-1 text-sm shadow-xl" onMouseLeave={() => setMenu(null)}>
                            <button className="block w-full rounded px-2 py-1.5 text-left hover:bg-[#3a3a41]" onClick={() => { setMenu(null); if (i > 0) { const n = [...blocks]; [n[i - 1], n[i]] = [n[i], n[i - 1]]; commit(n); } }}>Pindah ke atas</button>
                            <button className="block w-full rounded px-2 py-1.5 text-left hover:bg-[#3a3a41]" onClick={() => { setMenu(null); if (i < blocks.length - 1) { const n = [...blocks]; [n[i + 1], n[i]] = [n[i], n[i + 1]]; commit(n); } }}>Pindah ke bawah</button>
                            <button className="block w-full rounded px-2 py-1.5 text-left text-rose-400 hover:bg-[#3a3a41]" onClick={() => { setMenu(null); remove(b); }}>Hapus</button>
                          </div>
                        )}
                      </div>
                    );
                  })}
                  {!blocks.length && <p className="py-6 text-center text-sm text-slate-500">Belum ada komponen.</p>}
                </div>
              </>
            )}

            {mode.kind === "add" && (
              <>
                {crumb("Add Component")}
                <div className="mb-3 flex items-center justify-between"><h2 className="text-lg font-semibold">Component</h2><span className="flex h-7 w-7 items-center justify-center rounded-md bg-brand-600"><Pin size={14} /></span></div>
                <div className="relative mb-4">
                  <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input autoFocus className="h-9 w-full rounded-md border border-[#5b63d6] bg-transparent pl-9 pr-3 text-sm outline-none" placeholder="Search Component" value={query} onChange={(e) => setQuery(e.target.value)} />
                </div>
                {([["PINNED", PINNED] as [string, BlockType[]], ...GROUPS]).map(([g, types]) => {
                  const items = types.map(blockMeta).filter((b) => b.label.toLowerCase().includes(query.toLowerCase()));
                  if (!items.length) return null;
                  return (
                    <div key={g} className="mb-4">
                      <div className="mb-1 text-xs font-semibold tracking-wider text-slate-400">{g}</div>
                      {items.map((b) => (
                        <button key={g + b.type} onClick={() => add(b.type)} className="group flex w-full items-center gap-3 rounded-md px-1 py-2.5 text-left text-[15px] hover:bg-[#26262b]">
                          <b.icon size={17} className="text-slate-300" /><span className="flex-1">{b.label}</span><Pin size={14} className="text-slate-500 opacity-0 group-hover:opacity-100" />
                        </button>
                      ))}
                    </div>
                  );
                })}
              </>
            )}

            {mode.kind === "block" && sel && (
              <>
                {crumb(blockMeta(sel.type).label)}
                <div className="space-y-4">
                  <BlockEditor block={sel} products={products} onChange={(data) => commit(blocks.map((b) => (b.id === sel.id ? { ...b, data } : b)), false)} />
                </div>
                <div className="mt-6 rounded-lg bg-[#26262b] p-4">
                  <div className="mb-3 flex items-center justify-between font-semibold">Visibility<ChevronUp size={16} /></div>
                  {(["desktop", "tablet", "mobile"] as Device[]).map((d) => {
                    const D = DEVICES[d];
                    const hidden = !!sel.data[`hide_${d}`];
                    return (
                      <div key={d} className="flex items-center justify-between py-2 text-sm">
                        <span className="flex items-center gap-2 text-slate-200"><D.icon size={15} />Show on {D.label}</span>
                        <span className="flex overflow-hidden rounded-md">
                          <button onClick={() => commit(blocks.map((b) => (b.id === sel.id ? { ...b, data: { ...b.data, [`hide_${d}`]: true } } : b)), false)} className={`px-2 py-1.5 ${hidden ? "bg-brand-600" : "bg-[#36363d]"}`} aria-label="Sembunyikan"><EyeOff size={14} /></button>
                          <button onClick={() => commit(blocks.map((b) => (b.id === sel.id ? { ...b, data: { ...b.data, [`hide_${d}`]: false } } : b)), false)} className={`px-2 py-1.5 ${!hidden ? "bg-brand-600" : "bg-[#36363d]"}`} aria-label="Tampilkan"><Eye size={14} /></button>
                        </span>
                      </div>
                    );
                  })}
                </div>
              </>
            )}

            {mode.kind === "style" && (
              <>
                {crumb("Style Guide")}
                <h2 className="mb-4 text-lg font-semibold">Style Guide</h2>
                <div className="space-y-4">
                  <Field label="Warna utama"><input type="color" className="h-10 w-full cursor-pointer rounded-md border border-[#3a3a41] bg-transparent" value={page.theme?.primary ?? "var(--color-brand-600)"} onChange={(e) => updatePage({ theme: { ...page.theme, primary: e.target.value } })} /></Field>
                  <Field label="Warna latar"><input type="color" className="h-10 w-full cursor-pointer rounded-md border border-[#3a3a41] bg-transparent" value={page.theme?.background ?? "#ffffff"} onChange={(e) => updatePage({ theme: { ...page.theme, background: e.target.value } })} /></Field>
                  <Field label="Lebar kanvas">
                    <Select tone="dark" className="input" value={page.theme?.width ?? "narrow"} onChange={(e) => updatePage({ theme: { ...page.theme, width: e.target.value as any } })}>
                      <option value="narrow">Default (mobile-first)</option><option value="wide">Wide</option>
                    </Select>
                  </Field>
                </div>
              </>
            )}

            {mode.kind === "settings" && (
              <>
                {crumb("Page Settings")}
                <h2 className="mb-4 text-lg font-semibold">Page Settings</h2>
                <div className="space-y-4">
                  <Field label="Page Name"><input className="input" value={page.title} onChange={(e) => updatePage({ title: e.target.value })} /></Field>
                  <Field label="Slug" hint={`/p/${page.slug}`}><input className="input" value={page.slug} onChange={(e) => updatePage({ slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]+/g, "-") })} /></Field>
                  <Field label="Label"><input className="input" value={page.label ?? ""} onChange={(e) => updatePage({ label: e.target.value })} /></Field>
                  <Field label="Status">
                    <Select tone="dark" className="input" value={page.status} onChange={(e) => updatePage({ status: e.target.value as any })}><option value="draft">Draft</option><option value="published">Published</option><option value="archived">Archived</option></Select>
                  </Field>
                  <Field label="Produk utama">
                    <Select tone="dark" className="input" value={page.product_id ?? ""} onChange={(e) => updatePage({ product_id: e.target.value ? Number(e.target.value) : null })}>
                      <option value="">—</option>{products.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
                    </Select>
                  </Field>
                  <div className="pt-2 text-xs font-semibold tracking-wider text-slate-400">SEO</div>
                  <Field label="Meta Title"><input className="input" value={page.seo?.title ?? ""} onChange={(e) => updatePage({ seo: { ...page.seo, title: e.target.value } })} /></Field>
                  <Field label="Meta Description"><textarea className="textarea" rows={3} value={page.seo?.description ?? ""} onChange={(e) => updatePage({ seo: { ...page.seo, description: e.target.value } })} /></Field>
                  <div className="pt-2 text-xs font-semibold tracking-wider text-slate-400">FLOATING & TRACKING</div>
                  <label className="flex items-center justify-between text-sm">Floating WhatsApp Button
                    <input type="checkbox" className="h-4 w-4 accent-brand-600" checked={!!page.settings?.floating_whatsapp} onChange={(e) => updatePage({ settings: { ...page.settings, floating_whatsapp: e.target.checked } })} /></label>
                  <Field label="Nomor WhatsApp"><input className="input" placeholder="Kosong = nomor toko" value={page.settings?.whatsapp ?? ""} onChange={(e) => updatePage({ settings: { ...page.settings, whatsapp: e.target.value } })} /></Field>
                  <Field label="Facebook Pixel ID"><input className="input" value={page.settings?.facebook_pixel ?? ""} onChange={(e) => updatePage({ settings: { ...page.settings, facebook_pixel: e.target.value } })} /></Field>
                  <Field label="TikTok Pixel ID"><input className="input" value={page.settings?.tiktok_pixel ?? ""} onChange={(e) => updatePage({ settings: { ...page.settings, tiktok_pixel: e.target.value } })} /></Field>
                </div>
              </>
            )}
          </div>

          {mode.kind === "home" ? (
            <div className="border-t border-[#2e2e34] px-4 py-3 text-[15px]">
              <button onClick={() => setSectionOpen(!sectionOpen)} className="flex w-full items-center justify-between rounded px-2 py-2 hover:bg-[#26262b]">Section 1{sectionOpen ? <ChevronUp size={16} /> : <ChevronDown size={16} />}</button>
              {sectionOpen && (
                <>
                  <button onClick={() => setMode({ kind: "style" })} className="flex w-full items-center gap-3 rounded px-2 py-2.5 hover:bg-[#26262b]"><Palette size={17} />Style Guide</button>
                  <button onClick={() => setMode({ kind: "settings" })} className="flex w-full items-center gap-3 rounded px-2 py-2.5 hover:bg-[#26262b]"><Settings size={17} />Page Settings</button>
                </>
              )}
            </div>
          ) : (
            <div className="flex gap-2 border-t border-[#2e2e34] p-4">
              <button className="h-9 flex-1 rounded-md bg-[#36363d] text-sm font-medium hover:bg-[#424249]"
                onClick={() => { if (mode.kind === "block") commit(blocks.map((b) => (b.id === mode.id ? mode.snapshot : b)), false); setMode({ kind: "home" }); }}>Cancel</button>
              {mode.kind !== "add" && <button className="h-9 flex-1 rounded-md bg-brand-600 text-sm font-semibold hover:bg-[#4a52d4]" onClick={() => { if (mode.kind === "block") setPast((h) => [...h, blocks.map((b) => (b.id === mode.id ? mode.snapshot : b))]); setMode({ kind: "home" }); }}>Save</button>}
            </div>
          )}
        </aside>

        <main className="flex-1 overflow-y-auto px-6 py-8" onClick={() => mode.kind === "block" && setMode({ kind: "home" })}>
          <div className="mx-auto transition-all" style={{ width: DEVICES[device].w, maxWidth: "100%" }}>
            <div className="min-h-[70vh] shadow-2xl" style={{ background: page.theme?.background ?? "#fff" }}>
              <div className={`mx-auto space-y-5 px-5 py-8 text-slate-700 ${page.theme?.width === "wide" && device !== "mobile" ? "max-w-4xl" : "max-w-xl"}`}>
                {blocks.map((b) => {
                  const hidden = !!b.data[`hide_${device}`];
                  const on = selectedId === b.id;
                  return (
                    <div key={b.id} onClick={(e) => { e.stopPropagation(); openBlock(b); }}
                      className={`relative cursor-pointer outline-offset-[6px] ${on ? "outline-2 outline-brand-600" : "hover:outline-1 hover:outline-dashed hover:outline-[#7b83e8]"} ${hidden ? "opacity-30" : ""}`}>
                      {on && (
                        <>
                          <div className="absolute -left-[8px] -top-[38px] z-10 flex gap-0.5 rounded-t-md bg-brand-600 px-1.5 py-1 text-white">
                            <button onClick={(e) => { e.stopPropagation(); remove(b); }} className="rounded p-1 hover:bg-white/20" aria-label="Hapus"><Trash2 size={14} /></button>
                            <button onClick={(e) => { e.stopPropagation(); duplicate(b); }} className="rounded p-1 hover:bg-white/20" aria-label="Duplikat"><Copy size={14} /></button>
                          </div>
                          <div className="absolute -right-[8px] -top-[38px] z-10 rounded-t-md bg-brand-600 px-2 py-1 text-white"><Settings size={14} className="m-1" /></div>
                        </>
                      )}
                      {hidden && <span className="absolute right-0 top-0 z-10 rounded bg-slate-800 px-1.5 py-0.5 text-[10px] text-white">Hidden on {DEVICES[device].label}</span>}
                      <div className={b.type === "checkout" || b.type === "video" ? "pointer-events-none" : "[&_a]:pointer-events-none"}>
                        <BlockView block={b} color={color} checkout={checkout} preview />
                      </div>
                    </div>
                  );
                })}
                {!blocks.length && (
                  <button onClick={(e) => { e.stopPropagation(); setMode({ kind: "add" }); }} className="flex w-full flex-col items-center gap-2 rounded-xl border-2 border-dashed border-slate-300 py-24 text-slate-400 hover:border-brand-600 hover:text-brand-600">
                    Klik <b>Add Component</b> untuk mulai menyusun halaman
                  </button>
                )}
              </div>
            </div>
          </div>
        </main>
      </div>
      {toast && <div className="fixed bottom-6 left-1/2 z-50 -translate-x-1/2 rounded-md bg-white px-4 py-2 text-sm font-semibold text-slate-800 shadow-xl">{toast}</div>}
    </div>
  );
}

export default function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  return <Suspense><Builder id={id} /></Suspense>;
}
