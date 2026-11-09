"use client";
import { Plus, Trash2, Upload } from "lucide-react";
import { DateTimePicker } from "@/components/DatePicker";
import { useState } from "react";
import { API_URL, getToken, Product } from "@/lib/api";
import { Block } from "@/lib/landing";
import { Field, MoneyInput } from "@/components/ui";
import { Select } from "@/components/Select";
import { showAlert } from "@/components/Dialogs";

async function uploadFiles(files: FileList): Promise<string[]> {
  const fd = new FormData();
  Array.from(files).slice(0, 10).forEach((f) => fd.append("files[]", f));
  const res = await fetch(`${API_URL}/uploads`, { method: "POST", body: fd, headers: { Authorization: `Bearer ${getToken()}`, Accept: "application/json" } });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message);
  return data.urls;
}

function UploadButton({ multiple, onDone }: { multiple?: boolean; onDone: (urls: string[]) => void }) {
  const [busy, setBusy] = useState(false);
  return (
    <label className="btn-outline btn-sm cursor-pointer">
      <Upload size={14} />{busy ? "Mengunggah…" : "Unggah"}
      <input type="file" accept="image/*" multiple={multiple} hidden onChange={async (e) => {
        if (!e.target.files?.length) return;
        setBusy(true);
        try { onDone(await uploadFiles(e.target.files)); } catch (err) { showAlert((err as Error).message, "Gagal mengunggah"); } finally { setBusy(false); }
      }} />
    </label>
  );
}

function ListEditor<T>({ items, onChange, blank, render }: { items: T[]; onChange: (v: T[]) => void; blank: T; render: (item: T, set: (v: T) => void) => React.ReactNode }) {
  return (
    <div className="space-y-2">
      {items.map((it, i) => (
        <div key={i} className="relative rounded-xl border border-slate-200 p-3 pr-10">
          {render(it, (v) => onChange(items.map((x, j) => (j === i ? v : x))))}
          <button className="absolute right-2 top-2 rounded-lg p-1 text-slate-400 hover:bg-rose-50 hover:text-rose-600" onClick={() => onChange(items.filter((_, j) => j !== i))} aria-label="Hapus"><Trash2 size={15} /></button>
        </div>
      ))}
      <button className="btn-ghost btn-sm text-brand-600" onClick={() => onChange([...items, structuredClone(blank)])}><Plus size={14} />Tambah</button>
    </div>
  );
}

const AlignPicker = ({ value, onChange }: { value: string; onChange: (v: string) => void }) => (
  <Field label="Perataan">
    <div className="grid grid-cols-3 gap-1 rounded-xl bg-slate-100 p-1 text-xs font-semibold">
      {["left", "center", "right"].map((a) => (
        <button key={a} onClick={() => onChange(a)} className={`rounded-lg py-1.5 ${value === a ? "bg-white" : "text-slate-500"}`}>{{ left: "Kiri", center: "Tengah", right: "Kanan" }[a]}</button>
      ))}
    </div>
  </Field>
);

export function BlockEditor({ block, onChange, products }: { block: Block; onChange: (data: Record<string, any>) => void; products: Product[] }) {
  const d = block.data;
  const set = (k: string, v: any) => onChange({ ...d, [k]: v });
  const text = (k: string, label: string, area = false) => (
    <Field label={label}>
      {area ? <textarea className="textarea" rows={5} value={d[k] ?? ""} onChange={(e) => set(k, e.target.value)} />
        : <input className="input" value={d[k] ?? ""} onChange={(e) => set(k, e.target.value)} />}
    </Field>
  );

  switch (block.type) {
    case "announcement": return text("text", "Teks");
    case "headline":
      return <>{text("text", "Teks", true)}<AlignPicker value={d.align} onChange={(v) => set("align", v)} />
        <Field label="Ukuran"><Select tone="dark" className="input" value={d.size} onChange={(e) => set("size", e.target.value)}><option value="xl">Besar</option><option value="lg">Sedang</option></Select></Field></>;
    case "subheadline": return <>{text("text", "Teks", true)}<AlignPicker value={d.align} onChange={(v) => set("align", v)} /></>;
    case "text": return text("content", "Konten", true);
    case "image":
      return (
        <>
          <Field label="URL Gambar"><div className="flex gap-2"><input className="input" value={d.url ?? ""} onChange={(e) => set("url", e.target.value)} /><UploadButton onDone={(u) => set("url", u[0])} /></div></Field>
          {text("alt", "Teks alternatif")}
        </>
      );
    case "slider":
      return (
        <Field label="Gambar">
          <div className="space-y-2">
            {(d.images ?? []).map((src: string, i: number) => (
              <div key={i} className="flex items-center gap-2">
                <img src={src} alt="" className="h-10 w-10 rounded-lg object-cover" />
                <input className="input" value={src} onChange={(e) => set("images", d.images.map((x: string, j: number) => (j === i ? e.target.value : x)))} />
                <button className="btn-ghost btn-sm" onClick={() => set("images", d.images.filter((_: string, j: number) => j !== i))}><Trash2 size={14} /></button>
              </div>
            ))}
            <UploadButton multiple onDone={(u) => set("images", [...(d.images ?? []), ...u])} />
          </div>
        </Field>
      );
    case "video": return <Field label="Link YouTube / Vimeo" hint="mis. https://youtu.be/xxxx"><input className="input" value={d.url ?? ""} onChange={(e) => set("url", e.target.value)} /></Field>;
    case "button": return <>{text("label", "Teks tombol")}<Field label="Link" hint="Gunakan #order untuk scroll ke formulir"><input className="input" value={d.url ?? ""} onChange={(e) => set("url", e.target.value)} /></Field></>;
    case "whatsapp": return <>{text("label", "Teks tombol")}<Field label="Nomor WhatsApp" hint="Kosongkan untuk nomor toko"><input className="input" value={d.number ?? ""} onChange={(e) => set("number", e.target.value)} /></Field>{text("message", "Pesan awal", true)}</>;
    case "features":
      return <>{text("title", "Judul")}<Field label="Poin">
        <ListEditor<string> items={d.items ?? []} blank="" onChange={(v) => set("items", v)} render={(it, s) => <input className="input" value={it} onChange={(e) => s(e.target.value)} />} />
      </Field></>;
    case "testimonials":
      return <>{text("title", "Judul")}<Field label="Testimoni">
        <ListEditor<any> items={d.items ?? []} blank={{ name: "", text: "", rating: 5 }} onChange={(v) => set("items", v)} render={(it, s) => (
          <div className="space-y-2">
            <input className="input" placeholder="Nama" value={it.name} onChange={(e) => s({ ...it, name: e.target.value })} />
            <textarea className="textarea" rows={2} placeholder="Testimoni" value={it.text} onChange={(e) => s({ ...it, text: e.target.value })} />
            <Select tone="dark" className="input" value={it.rating} onChange={(e) => s({ ...it, rating: Number(e.target.value) })}>{[5, 4, 3, 2, 1].map((r) => <option key={r} value={r}>{r} bintang</option>)}</Select>
          </div>
        )} />
      </Field></>;
    case "faq":
      return <>{text("title", "Judul")}<Field label="Pertanyaan">
        <ListEditor<any> items={d.items ?? []} blank={{ q: "", a: "" }} onChange={(v) => set("items", v)} render={(it, s) => (
          <div className="space-y-2">
            <input className="input" placeholder="Pertanyaan" value={it.q} onChange={(e) => s({ ...it, q: e.target.value })} />
            <textarea className="textarea" rows={2} placeholder="Jawaban" value={it.a} onChange={(e) => s({ ...it, a: e.target.value })} />
          </div>
        )} />
      </Field></>;
    case "pricing":
      return <>{text("title", "Judul")}
        <Field label="Harga Normal (dicoret)"><MoneyInput value={d.normal} onChange={(v) => set("normal", v)} /></Field>
        <Field label="Harga Jual"><MoneyInput value={d.price} onChange={(v) => set("price", v ?? 0)} /></Field>
        {text("note", "Catatan")}</>;
    case "countdown":
      return <>{text("label", "Label")}<Field label="Berakhir pada"><DateTimePicker value={d.until} onChange={(v) => set("until", v)} /></Field></>;
    case "checkout":
      return <>{text("title", "Judul")}
        <Field label="Produk" hint="Formulir checkout lengkap (ongkir, COD, varian) akan tampil di sini">
          <Select tone="dark" className="input" value={d.product_id ?? ""} onChange={(e) => set("product_id", e.target.value ? Number(e.target.value) : null)}>
            <option value="">Pilih produk</option>
            {products.map((p) => <option key={p.id} value={p.id}>{p.name}{p.status === "draft" ? " (draft)" : ""}</option>)}
          </Select>
        </Field></>;
    case "spacer": return <Field label="Tinggi (px)"><input className="input" type="number" value={d.size} onChange={(e) => set("size", Number(e.target.value))} /></Field>;
    case "html": return <Field label="Kode HTML" hint="Dirender di dalam iframe terisolasi"><textarea className="textarea font-mono text-xs" rows={8} value={d.code ?? ""} onChange={(e) => set("code", e.target.value)} /></Field>;
    default: return <p className="text-sm text-slate-500">Tidak ada pengaturan untuk komponen ini.</p>;
  }
}
