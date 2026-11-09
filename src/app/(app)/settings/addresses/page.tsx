"use client";
import { MapPin, Pencil, Plus, Trash2, Warehouse } from "lucide-react";
import { useEffect, useState } from "react";
import { api, ApiError } from "@/lib/api";
import { Empty, Field, IconTile, Modal } from "@/components/ui";
import { RegionSelect } from "@/components/RegionSelect";
import { askConfirm } from "@/components/Dialogs";

type Address = { id?: number; label: string; name: string; phone: string; address: string; region_id?: number | null; region?: { label: string } | null; postal_code?: string; is_default: boolean };
const empty: Address = { label: "", name: "", phone: "", address: "", region_id: null, postal_code: "", is_default: false };

export default function Addresses() {
  const [list, setList] = useState<Address[]>([]);
  const [edit, setEdit] = useState<Address | null>(null);
  const [errors, setErrors] = useState<Record<string, string[]>>({});
  const load = () => api("/addresses").then(setList);
  useEffect(() => { load(); }, []);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    try {
      await api(edit!.id ? `/addresses/${edit!.id}` : "/addresses", { method: edit!.id ? "PUT" : "POST", json: edit });
      setEdit(null); load();
    } catch (err) { if (err instanceof ApiError) setErrors(err.errors); }
  }
  async function remove(a: Address) {
    if (await askConfirm(`Hapus alamat ${a.label}?`)) { await api(`/addresses/${a.id}`, { method: "DELETE" }); load(); }
  }

  return (
    <div className="max-w-3xl space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="page-title">My Address</h1>
          <p className="text-sm text-slate-500">Alamat utama dipakai sebagai asal pengiriman untuk menghitung ongkir di halaman checkout.</p>
        </div>
        <button className="btn-primary" onClick={() => { setErrors({}); setEdit(empty); }}><Plus size={16} />Tambah Alamat</button>
      </div>
      {list.map((a) => (
        <div key={a.id} className="card flex items-start justify-between gap-4 p-5">
          <IconTile icon={Warehouse} tone={a.is_default ? "brand" : "slate"} />
          <div className="flex-1 text-sm">
            <div className="font-bold text-ink">{a.label} {a.is_default && <span className="badge ml-2 bg-brand-50 text-brand-700">Asal Pengiriman</span>}</div>
            <div>{a.name} • {a.phone}</div>
            <div className="text-slate-500">{a.address}, {a.region?.label} {a.postal_code}</div>
          </div>
          <div className="flex gap-1">
            <button className="btn-outline btn-sm" onClick={() => { setErrors({}); setEdit(a); }}><Pencil size={13} />Edit</button>
            <button className="btn-ghost btn-sm px-2 text-rose-600" onClick={() => remove(a)} aria-label="Hapus"><Trash2 size={14} /></button>
          </div>
        </div>
      ))}
      {!list.length && <div className="card"><Empty icon={MapPin} text="Belum ada alamat pickup." /></div>}
      <Modal open={!!edit} onClose={() => setEdit(null)} title={edit?.id ? "Edit Alamat" : "Tambah Alamat"} icon={MapPin}>
        {edit && (
          <form onSubmit={save} className="space-y-3">
            {([["label", "Label (mis. Gudang Utama)"], ["name", "Nama Pengirim"], ["phone", "No. HP"], ["address", "Alamat"], ["postal_code", "Kode Pos"]] as const).map(([k, l]) => (
              <Field key={k} label={l} error={errors[k]?.[0]}><input className="input" value={(edit[k] as string) ?? ""} onChange={(e) => setEdit({ ...edit, [k]: e.target.value })} /></Field>
            ))}
            <Field label="Kota / Kecamatan" error={errors.region_id?.[0]}>
              <RegionSelect value={edit.region_id} label={edit.region?.label} onChange={(r) => setEdit({ ...edit, region_id: r.id, region: r })} />
            </Field>
            <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={edit.is_default} onChange={(e) => setEdit({ ...edit, is_default: e.target.checked })} />Jadikan alamat utama</label>
            <button className="btn-primary w-full">Simpan</button>
          </form>
        )}
      </Modal>
    </div>
  );
}
