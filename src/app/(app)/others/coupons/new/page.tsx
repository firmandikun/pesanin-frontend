"use client";
import { CalendarDays, ClipboardList, Package, Receipt, ShoppingBag, Truck } from "lucide-react";
import { DatePicker } from "@/components/DatePicker";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import { api, ApiError, Product, rupiah } from "@/lib/api";
import { CardTitle, FieldLabel, PageHead, Panel } from "@/components/kit";
import { Select } from "@/components/Select";

const KIND_TITLE: Record<string, [string, string]> = { product: ["Jumlah potongan produk", "Diskon produk"], order: ["Jumlah pesanan", "Diskon pesanan"], shipping: ["Potongan ongkos kirim", "Diskon pengiriman"] };

function Form() {
  const sp = useSearchParams();
  const router = useRouter();
  const id = sp.get("id");
  const kind = (sp.get("kind") ?? "order") as "product" | "order" | "shipping";
  const now = new Date();
  const [f, setF] = useState<any>({
    kind, method: "code", code: "", product_type: "physical", product_ids: [], value_type: "amount", value: "", payment_type: "all",
    min_type: "none", min_value: "", exclusive: false, limit_total: false, max_uses: "", once_per_customer: false,
    start_date: now.toISOString().slice(0, 10), start_time: now.toTimeString().slice(0, 5), has_end: false, end_date: "", end_time: "23:59", is_active: true,
  });
  const [products, setProducts] = useState<Product[]>([]);
  const [err, setErr] = useState<Record<string, string[]>>({});
  const [saving, setSaving] = useState(false);
  useEffect(() => { api("/products?per_page=100").then((r) => setProducts(r.products.data)); }, []);
  useEffect(() => {
    if (!id) return;
    api("/r/coupons?per_page=100").then((r) => {
      const c = r.data.find((x: any) => String(x.id) === id);
      if (!c) return;
      const s = c.starts_at ? new Date(c.starts_at) : now; const e = c.ends_at ? new Date(c.ends_at) : null;
      setF({ ...c, code: c.code ?? "", min_value: c.min_value || "", max_uses: c.max_uses ?? "", limit_total: !!c.max_uses, product_ids: c.product_ids ?? [],
        start_date: s.toISOString().slice(0, 10), start_time: s.toTimeString().slice(0, 5), has_end: !!e, end_date: e?.toISOString().slice(0, 10) ?? "", end_time: e?.toTimeString().slice(0, 5) ?? "23:59" });
    });
  }, [id]); // eslint-disable-line react-hooks/exhaustive-deps
  const set = (patch: any) => setF({ ...f, ...patch });
  const e = (k: string) => err[k]?.[0] && <p className="mt-1 text-xs text-rose-600">{err[k][0]}</p>;

  async function save() {
    setSaving(true); setErr({});
    const body = {
      kind: f.kind, method: f.method, code: f.method === "code" ? f.code : null, product_type: f.product_type, product_ids: f.kind === "product" ? f.product_ids : null,
      value_type: f.value_type, value: Number(f.value), payment_type: f.payment_type, min_type: f.min_type, min_value: f.min_type === "none" ? 0 : Number(f.min_value || 0),
      exclusive: f.exclusive, max_uses: f.limit_total ? Number(f.max_uses || 1) : null, once_per_customer: f.once_per_customer,
      starts_at: `${f.start_date} ${f.start_time}:00`, ends_at: f.has_end && f.end_date ? `${f.end_date} ${f.end_time}:00` : null, is_active: f.is_active,
    };
    try {
      await api(id ? `/r/coupons/${id}` : "/r/coupons", { method: id ? "PUT" : "POST", json: body });
      router.push("/others/coupons");
    } catch (x) { if (x instanceof ApiError) setErr(x.errors); } finally { setSaving(false); }
  }

  const radio = (k: string, v: string, label: string, sub?: string) => (
    <label className="flex cursor-pointer items-start gap-2 text-sm"><input type="radio" className="mt-0.5 h-4 w-4 accent-brand-600" checked={f[k] === v} onChange={() => set({ [k]: v })} /><span>{label}{sub && <span className="block text-xs text-slate-500">{sub}</span>}</span></label>
  );
  const Icon = f.kind === "shipping" ? Truck : f.kind === "product" ? Package : Receipt;

  return (
    <div className="space-y-5">
      <PageHead title="Buat Diskon" crumbs={[["Coupons", "/others/coupons"], ["Tambahkan Kupon Baru"]]}>
        <button onClick={() => router.push("/others/coupons")} className="h-10 rounded-lg border border-brand-600 bg-white px-8 text-sm font-semibold text-brand-600">Batal</button>
        <button onClick={save} disabled={saving} className="h-10 rounded-lg bg-brand-600 px-8 text-sm font-semibold text-white disabled:opacity-50">{saving ? "…" : "Simpan"}</button>
      </PageHead>
      <div className="grid items-start gap-5 lg:grid-cols-[1.4fr_1fr]">
        <div className="space-y-5">
          <Panel>
            <CardTitle icon={ShoppingBag} title="Jenis Produk" tint="violet" />
            <div className="space-y-2 p-5">
              {([["physical", "Produk Fisik", "Barang yang memiliki bentuk nyata dan bisa dirasakan secara fisik"], ["digital", "Produk Digital", "Berupa data atau informasi yang disimpan secara digital."]] as const).map(([v, t, d]) => (
                <label key={v} className={`flex cursor-pointer items-center gap-3 rounded-lg border p-3 ${f.product_type === v ? "border-brand-600 bg-brand-50/40" : "border-slate-200"}`}>
                  <input type="radio" className="h-4 w-4 accent-brand-600" checked={f.product_type === v} onChange={() => set({ product_type: v })} /><span className="text-lg">{v === "physical" ? "📦" : "💾"}</span>
                  <span><b className="block text-sm text-slate-800">{t}</b><span className="text-xs text-slate-500">{d}</span></span></label>
              ))}
            </div>
          </Panel>
          <Panel>
            <CardTitle icon={Icon} title={KIND_TITLE[f.kind][0]} tint="blue" right={<span className="text-sm text-slate-500">{KIND_TITLE[f.kind][1]}</span>} />
            <div className="space-y-4 p-5">
              <div><FieldLabel>Method</FieldLabel>
                <div className="flex gap-2">{([["code", "Kode diskon"], ["auto", "Diskon otomatis"]] as const).map(([v, l]) => (
                  <button key={v} type="button" onClick={() => set({ method: v })} className={`relative rounded-lg border px-4 py-2 text-sm ${f.method === v ? "border-brand-600 font-medium text-brand-600" : "border-slate-200 text-slate-600"}`}>{l}{f.method === v && <span className="absolute -right-1.5 -top-1.5 h-3 w-3 rounded-full bg-emerald-500 ring-2 ring-white" />}</button>
                ))}</div></div>
              {f.method === "code" && (
                <div><div className="flex items-center justify-between"><FieldLabel>Kode diskon</FieldLabel><button type="button" onClick={() => set({ code: Math.random().toString(36).slice(2, 10).toUpperCase() })} className="text-sm font-medium text-brand-600">Hasilkan kode acak</button></div>
                  <input className="input" value={f.code} onChange={(ev) => set({ code: ev.target.value.toUpperCase() })} /><p className="mt-1 text-xs text-slate-500">Pelanggan harus memasukkan kode ini saat checkout.</p>{e("code")}</div>
              )}
              {f.kind === "product" && (
                <div><FieldLabel>Produk</FieldLabel>
                  <div className="flex flex-wrap gap-2">{products.filter((p) => p.type === f.product_type).map((p) => (
                    <label key={p.id} className={`flex cursor-pointer items-center gap-2 rounded-lg border px-3 py-1.5 text-sm ${f.product_ids.includes(p.id) ? "border-brand-600 bg-brand-50/40" : "border-slate-200"}`}>
                      <input type="checkbox" className="accent-brand-600" checked={f.product_ids.includes(p.id)} onChange={(ev) => set({ product_ids: ev.target.checked ? [...f.product_ids, p.id] : f.product_ids.filter((x: number) => x !== p.id) })} />{p.name}</label>
                  ))}</div></div>
              )}
              <div><FieldLabel>Discount Value</FieldLabel>
                <div className="flex gap-2">
                  <Select className="input w-32" value={f.value_type} onChange={(ev) => set({ value_type: ev.target.value })}><option value="amount">Rp</option><option value="percent">%</option></Select>
                  <input className="input" type="number" min={1} placeholder="Discount Value" value={f.value} onChange={(ev) => set({ value: ev.target.value })} /></div>{e("value")}</div>
              <div><FieldLabel>Payment Type</FieldLabel><div className="flex gap-5">{radio("payment_type", "all", "COD & Non-COD")}{radio("payment_type", "cod", "COD")}{radio("payment_type", "non_cod", "Non-COD")}</div></div>
              <div className="border-t border-slate-100 pt-4"><FieldLabel>Persyaratan Pembelian Minimum</FieldLabel>
                <div className="space-y-2">{radio("min_type", "none", "Tidak ada persyaratan minimum")}{radio("min_type", "amount", "Jumlah pembelian minimum (Rp)")}{radio("min_type", "qty", "Jumlah minimum item")}</div>
                {f.min_type !== "none" && <input className="input mt-2 w-48" type="number" min={1} value={f.min_value} onChange={(ev) => set({ min_value: ev.target.value })} />}</div>
              <label className="flex items-start gap-2 border-t border-slate-100 pt-4 text-sm"><input type="checkbox" className="mt-0.5 h-4 w-4 accent-brand-600" checked={f.exclusive} onChange={(ev) => set({ exclusive: ev.target.checked })} />
                <span><b>Kupon Tunggal (Eksklusif)</b><span className="block text-xs text-slate-500">Pembeli hanya dapat menggunakan kupon ini dan tidak dapat menambahkan/mengkombinasikan dengan kupon yang lain</span></span></label>
              <div className="space-y-2 border-t border-slate-100 pt-4"><FieldLabel>Penggunaan Diskon Maksimum</FieldLabel>
                <label className="flex items-center gap-2 text-sm"><input type="checkbox" className="h-4 w-4 accent-brand-600" checked={f.limit_total} onChange={(ev) => set({ limit_total: ev.target.checked })} />Batasi berapa kali diskon ini dapat digunakan secara total</label>
                {f.limit_total && <input className="input ml-6 w-40" type="number" min={1} value={f.max_uses} onChange={(ev) => set({ max_uses: ev.target.value })} />}
                <label className="flex items-center gap-2 text-sm"><input type="checkbox" className="h-4 w-4 accent-brand-600" checked={f.once_per_customer} onChange={(ev) => set({ once_per_customer: ev.target.checked })} />Batasi hingga satu penggunaan per pelanggan</label></div>
            </div>
          </Panel>
          <Panel>
            <CardTitle icon={CalendarDays} title="Active Dates" tint="green" />
            <div className="space-y-3 p-5">
              <div className="grid grid-cols-2 gap-3">
                <div><FieldLabel>Start date</FieldLabel><DatePicker value={f.start_date} onChange={(v) => set({ start_date: v })} /></div>
                <div><FieldLabel>Start time</FieldLabel><input type="time" className="input" value={f.start_time} onChange={(ev) => set({ start_time: ev.target.value })} /></div>
              </div>
              <label className="flex items-center gap-2 text-sm"><input type="checkbox" className="h-4 w-4 accent-brand-600" checked={f.has_end} onChange={(ev) => set({ has_end: ev.target.checked })} />Set end date</label>
              {f.has_end && <div className="grid grid-cols-2 gap-3"><DatePicker value={f.end_date} minDate={f.start_date ? new Date(f.start_date) : undefined} onChange={(v) => set({ end_date: v })} /><input type="time" className="input" value={f.end_time} onChange={(ev) => set({ end_time: ev.target.value })} /></div>}
              {e("ends_at")}
            </div>
          </Panel>
        </div>
        <Panel className="lg:sticky lg:top-24">
          <CardTitle icon={ClipboardList} title="Summary" tint="blue" />
          <div className="space-y-4 p-5 text-sm">
            <h3 className="text-xl font-bold text-slate-800">{f.method === "code" ? (f.code || "No information entered yet.") : "Diskon otomatis"}</h3>
            <div><b className="text-slate-800">Type and method</b>
              <ul className="mt-1 list-disc pl-5 text-slate-600"><li>{KIND_TITLE[f.kind][0]}</li><li>{f.method === "code" ? "Code" : "Automatic"}</li></ul></div>
            {f.value && <div><b className="text-slate-800">Details</b>
              <ul className="mt-1 list-disc pl-5 text-slate-600">
                <li>{f.value_type === "percent" ? `${f.value}%` : rupiah(Number(f.value))} off {f.kind === "shipping" ? "ongkir" : f.kind === "product" ? "produk terpilih" : "seluruh pesanan"}</li>
                <li>{f.payment_type === "all" ? "COD & Non-COD" : f.payment_type === "cod" ? "Khusus COD" : "Khusus Non-COD"}</li>
                {f.min_type !== "none" && <li>Minimal {f.min_type === "amount" ? rupiah(Number(f.min_value || 0)) : `${f.min_value || 0} item`}</li>}
                {f.limit_total && <li>Maks {f.max_uses || 1}x penggunaan</li>}{f.once_per_customer && <li>Sekali per pelanggan</li>}
                <li>Aktif mulai {f.start_date}{f.has_end && f.end_date ? ` s/d ${f.end_date}` : ""}</li>
              </ul></div>}
            <div className="border-t border-slate-100 pt-3"><b className="text-slate-800">Performance</b><p className="text-slate-600">{id ? `Dipakai ${f.used_count ?? 0} kali.` : "Diskon belum aktif."}</p></div>
          </div>
        </Panel>
      </div>
    </div>
  );
}

export default function Page() { return <Suspense><Form /></Suspense>; }
