"use client";
import { ArrowRightToLine, CalendarRange, Clock, Link2, Monitor, Plus, RefreshCw, SlidersHorizontal, MessageSquare, Trash2, Users, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { api, ApiError, Product } from "@/lib/api";
import { CardTitle, EmptyState, FieldLabel, PageHead, Panel, Toggle } from "@/components/kit";
import { DEFAULT_ROTATOR } from "@/components/kit/rotator";
import { Select } from "@/components/Select";

const PARAMS: [string, string][] = [[":nama_cs:", "otomatis diganti nama CS"], [":judul_rotator:", "otomatis diganti judul rotator ini"], [":nama_produk:", "otomatis diganti nama produk"]];

export function RotatorForm({ id }: { id?: number }) {
  const router = useRouter();
  const [f, setF] = useState<any>({ title: "", product_id: null, staff_ids: [] as number[], settings: { ...DEFAULT_ROTATOR, dynamic: [] as { key: string; value: string }[] } });
  const [products, setProducts] = useState<Product[]>([]);
  const [staff, setStaff] = useState<any[]>([]);
  const [slug, setSlug] = useState<string | null>(null);
  const [err, setErr] = useState("");
  const [saving, setSaving] = useState(false);
  const [pick, setPick] = useState("");
  const area = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    api("/products?per_page=100").then((r) => setProducts(r.products.data));
    api("/r/staff?per_page=100").then((r) => setStaff(r.data));
    if (id) api("/r/rotators?per_page=100").then((r) => {
      const x = r.data.find((y: any) => y.id === id);
      if (x) { setF({ title: x.title, product_id: x.product_id, staff_ids: x.staff_ids ?? [], settings: { ...DEFAULT_ROTATOR, dynamic: [], ...(x.settings ?? {}) } }); setSlug(x.slug); }
    });
  }, [id]);

  const st = f.settings;
  const setS = (patch: any) => setF({ ...f, settings: { ...st, ...patch } });
  const insert = (token: string) => {
    const el = area.current; const pos = el?.selectionStart ?? st.greeting.length;
    setS({ greeting: st.greeting.slice(0, pos) + token + st.greeting.slice(pos) });
  };
  const link = slug ? `${typeof window !== "undefined" ? location.origin : ""}/wa/${slug}` : null;

  async function publish() {
    setSaving(true); setErr("");
    try {
      const body = { ...f, product_id: f.product_id || null };
      if (id) await api(`/r/rotators/${id}`, { method: "PUT", json: body });
      else { const r = await api("/r/rotators", { method: "POST", json: body }); router.replace(`/whatsapp-rotator/${r.id}`); }
      router.push("/whatsapp-rotator");
    } catch (x) { setErr(x instanceof ApiError ? Object.values(x.errors)[0]?.[0] ?? x.message : "Gagal menyimpan"); } finally { setSaving(false); }
  }

  return (
    <div className="space-y-5">
      <PageHead title={id ? "Edit WhatsApp Rotator" : "Add New WhatsApp Rotator"} crumbs={[["WhatsApp Rotator", "/whatsapp-rotator"], [id ? "Edit WhatsApp Rotator" : "Add New WhatsApp Rotator"]]}>
        <button onClick={publish} disabled={saving} className="h-10 rounded-lg bg-brand-600 px-6 text-sm font-semibold text-white disabled:opacity-50">{saving ? "…" : "Publish"}</button>
      </PageHead>
      {err && <div className="rounded-lg bg-rose-50 p-3 text-sm text-rose-700">{err}</div>}
      <div className="grid items-start gap-5 lg:grid-cols-[1.25fr_1fr]">
        <div className="space-y-5">
          <Panel>
            <CardTitle icon={SlidersHorizontal} title="WhatsApp Rotator" tint="blue" />
            <div className="space-y-4 p-5">
              <div><FieldLabel>Judul Rotator</FieldLabel>
                <div className="overflow-hidden rounded-lg border border-slate-200"><input className="h-10 w-full px-3 text-sm outline-none" placeholder="Layanan 1" value={f.title} onChange={(e) => setF({ ...f, title: e.target.value })} />
                  <div className="flex items-center gap-2 bg-slate-50 px-3 py-2 text-xs text-slate-600"><Link2 size={14} />{link ? <a href={link} target="_blank" className="text-brand-600 underline">{link}</a> : "Belum ada data link"}</div></div></div>
              <div><FieldLabel>Nama Produk <span className="font-normal text-slate-400">(Optional)</span></FieldLabel>
                <Select className="input" value={f.product_id ?? ""} onChange={(e) => setF({ ...f, product_id: e.target.value ? Number(e.target.value) : null })}><option value="">Select Product</option>{products.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}</Select></div>
            </div>
          </Panel>
          <Panel>
            <CardTitle icon={Users} title="Staf CS WhatsApp" tint="green" />
            <div className="space-y-2 p-5">
              {f.staff_ids.map((sid: number) => { const s = staff.find((x) => x.id === sid); return s && (
                <div key={sid} className="flex items-center gap-3 rounded-lg bg-slate-50 px-3 py-2 text-sm"><span className="flex-1 font-medium">{s.name}</span><span className="text-slate-500">{s.phone}</span>
                  <button onClick={() => setF({ ...f, staff_ids: f.staff_ids.filter((x: number) => x !== sid) })} aria-label="Hapus"><X size={15} /></button></div>
              ); })}
              <div className="flex items-center gap-2">
                <Select className="input h-9" value={pick} onChange={(e) => setPick(e.target.value)}><option value="">Pilih staf…</option>{staff.filter((s) => !f.staff_ids.includes(s.id)).map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}</Select>
                <button disabled={!pick} onClick={() => { setF({ ...f, staff_ids: [...f.staff_ids, Number(pick)] }); setPick(""); }} className="flex shrink-0 items-center gap-1.5 text-sm font-medium text-brand-600 disabled:opacity-40"><Plus size={16} className="rounded-full bg-brand-600 p-0.5 text-white" />Add CS Staff to Rotator</button>
              </div>
              {!staff.length && <p className="text-xs text-slate-500">Belum ada staf. Tambahkan di menu <a href="/whatsapp-rotator/staff" className="text-brand-600 underline">Staf CS WhatsApp</a>.</p>}
            </div>
          </Panel>
          <Panel>
            <CardTitle icon={MessageSquare} title="Greeting Text" tint="pink" />
            <div className="space-y-3 p-5">
              <FieldLabel>Format Pesan WhatsApp</FieldLabel>
              <textarea ref={area} className="textarea" rows={5} value={st.greeting} onChange={(e) => setS({ greeting: e.target.value })} />
              <div className="text-sm font-semibold text-slate-700">Parameter Yang Tersedia:</div>
              {PARAMS.map(([k, d]) => (
                <div key={k} className="flex items-center gap-2 text-sm"><button onClick={() => insert(k)} className="flex items-center gap-1 rounded bg-brand-600 px-1.5 py-0.5 text-xs text-white"><ArrowRightToLine size={12} />Insert</button>
                  <code className="rounded bg-slate-100 px-1 text-xs">{k}</code><span className="text-slate-600">{d}</span></div>
              ))}
            </div>
          </Panel>
          <Panel>
            <CardTitle icon={SlidersHorizontal} title="Dynamic Parameters" tint="orange" />
            <div className="space-y-3 p-5">
              <div className="border-b border-slate-100 pb-3"><div className="text-sm font-semibold text-slate-700">Dynamic Parameters</div><p className="text-sm text-slate-500">Use dynamic parameters as extra values for the greeting text template.</p></div>
              {st.dynamic.map((p: any, i: number) => (
                <div key={i} className="flex gap-2"><input className="input" placeholder="key (mis. promo)" value={p.key} onChange={(e) => setS({ dynamic: st.dynamic.map((x: any, j: number) => (j === i ? { ...x, key: e.target.value } : x)) })} />
                  <input className="input" placeholder="value" value={p.value} onChange={(e) => setS({ dynamic: st.dynamic.map((x: any, j: number) => (j === i ? { ...x, value: e.target.value } : x)) })} />
                  <button onClick={() => setS({ dynamic: st.dynamic.filter((_: any, j: number) => j !== i) })} className="text-slate-400" aria-label="Hapus"><Trash2 size={16} /></button></div>
              ))}
              <button onClick={() => setS({ dynamic: [...st.dynamic, { key: "", value: "" }] })} className="flex items-center gap-1.5 text-sm font-medium text-brand-600"><Plus size={16} className="rounded-full bg-brand-600 p-0.5 text-white" />Add Dynamic Parameters</button>
              {link && <div className="rounded-lg bg-slate-50 p-3 text-xs"><div className="mb-1 font-semibold text-slate-700">Link Generator</div><code className="break-all text-brand-600">{link}{st.dynamic.length ? "?" + st.dynamic.filter((p: any) => p.key).map((p: any) => `${p.key}=${encodeURIComponent(p.value)}`).join("&") : ""}</code></div>}
            </div>
          </Panel>
          <Panel>
            <CardTitle icon={CalendarRange} title="Statistic" tint="violet" />
            <EmptyState text="Belum ada data statistic" />
          </Panel>
          <Panel>
            <CardTitle icon={Monitor} title="Rotator Loading Page" tint="blue" />
            <div className="space-y-4 p-5">
              {([["text_redirect", "Teks Ketika Redirect", "Tulisan ini akan muncul di loading page sebelum visitor diarahkan ke WhatsApp."],
                ["text_unavailable", "Teks Ketika Tidak Ada Yang Available", "Tulisan ini akan muncul di loading page jika TIDAK ADA satupun CS yang aktif dan WhatsApp CS default belum diisi."],
                ["text_button", "Teks Tombol", "Tulisan ini akan muncul di button WhatsApp di loading page."]] as const).map(([k, l, h]) => (
                <div key={k}><FieldLabel>{l}</FieldLabel><input className="input" value={st[k]} onChange={(e) => setS({ [k]: e.target.value })} /><p className="mt-1 text-xs text-slate-500">{h}</p></div>
              ))}
            </div>
          </Panel>
        </div>
        <div className="space-y-5">
          <Panel>
            <CardTitle icon={ArrowRightToLine} title="WA Rotator Redirect" tint="pink" />
            <label className="flex items-center gap-3 p-5 text-sm font-medium text-slate-700"><Toggle checked={!!st.redirect_desktop} onChange={(v) => setS({ redirect_desktop: v })} />Redirect on Desktop & Tablet</label>
          </Panel>
          <Panel>
            <CardTitle icon={RefreshCw} title="Override WhatsApp Method" tint="sky" />
            <div className="divide-y divide-slate-100 px-5 py-2">
              {([["", "WhatsApp Global", "Use default value from settings"], ["api", "WhatsApp API Link", "https://api.whatsapp.com/send?phone=62812xx"], ["deeplink", "WhatsApp Deep Link", "whatsapp://send?phone=62812xx"]] as const).map(([v, t, d]) => (
                <label key={t} className="flex cursor-pointer items-start gap-3 py-3"><input type="radio" className="mt-1 h-4 w-4 accent-brand-600" checked={(st.method ?? "") === v} onChange={() => setS({ method: v })} />
                  <span><b className="block text-sm text-slate-800">{t}</b><span className="text-xs text-slate-500">{d}</span></span></label>
              ))}
            </div>
          </Panel>
          <Panel>
            <CardTitle icon={Clock} title="Rotator Delay Time" tint="violet" />
            <div className="p-5"><Select className="input" value={st.delay} onChange={(e) => setS({ delay: Number(e.target.value) })}>{[0, 1, 2, 3, 5, 10].map((n) => <option key={n} value={n}>{n} Detik</option>)}</Select></div>
          </Panel>
        </div>
      </div>
    </div>
  );
}
