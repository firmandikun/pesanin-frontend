"use client";
import { Truck } from "lucide-react";
import { useState } from "react";
import { Dialog, DialogActions, FieldLabel } from "@/components/kit";
import { api, ApiError } from "@/lib/api";

export type Supplier = { id: number; name: string; phone: string | null; email: string | null; address: string | null; payment_terms_days: number; notes: string | null; owed?: number; orders?: number };

/** Add / edit a supplier (Pembelian → Supplier, and "+ Supplier baru" in the PO form). */
export function SupplierDialog({ value, onClose, onSaved }: { value: Partial<Supplier>; onClose: () => void; onSaved: (s: Supplier) => void }) {
  const [f, setF] = useState({ name: value.name ?? "", phone: value.phone ?? "", email: value.email ?? "", address: value.address ?? "", payment_terms_days: String(value.payment_terms_days ?? 0), notes: value.notes ?? "" });
  const [err, setErr] = useState("");
  const [saving, setSaving] = useState(false);
  const set = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => setF({ ...f, [k]: e.target.value });
  const submit = async (e: React.FormEvent) => {
    e.preventDefault(); setSaving(true); setErr("");
    const body = { ...f, phone: f.phone || null, email: f.email || null, address: f.address || null, notes: f.notes || null, payment_terms_days: Number(f.payment_terms_days) || 0 };
    try { onSaved(await api<Supplier>(value.id ? `/suppliers/${value.id}` : "/suppliers", { method: value.id ? "PUT" : "POST", json: body })); }
    catch (x) { setErr(x instanceof ApiError ? Object.values(x.errors)[0]?.[0] ?? x.message : "Gagal menyimpan."); }
    finally { setSaving(false); }
  };
  return (
    <Dialog title={value.id ? "Ubah Supplier" : "Tambah Supplier"} icon={Truck} onClose={onClose}>
      <form className="space-y-3" onSubmit={submit}>
        <div><FieldLabel>Nama supplier</FieldLabel><input className="input" required value={f.name} onChange={set("name")} placeholder="CV Sumber Makmur" /></div>
        <div className="grid gap-3 sm:grid-cols-2">
          <div><FieldLabel>No. WhatsApp / telepon</FieldLabel><input className="input" value={f.phone} onChange={set("phone")} placeholder="0812…" /></div>
          <div><FieldLabel>Email</FieldLabel><input className="input" type="email" value={f.email} onChange={set("email")} /></div>
        </div>
        <div><FieldLabel>Alamat</FieldLabel><input className="input" value={f.address} onChange={set("address")} /></div>
        <div><FieldLabel>Tempo pembayaran (hari, 0 = tunai)</FieldLabel><input className="input" type="number" min={0} max={180} value={f.payment_terms_days} onChange={set("payment_terms_days")} /></div>
        <div><FieldLabel>Catatan</FieldLabel><textarea className="input min-h-16 py-2" value={f.notes} onChange={set("notes")} /></div>
        {err && <p className="text-sm text-rose-600">{err}</p>}
        <DialogActions onCancel={onClose} saving={saving} />
      </form>
    </Dialog>
  );
}
