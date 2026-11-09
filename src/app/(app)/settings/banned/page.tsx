"use client";
import { Ban, ShieldCheck, Unlock } from "lucide-react";
import { useEffect, useState } from "react";
import { api, ApiError, fmtDate } from "@/lib/api";
import { Empty } from "@/components/ui";
import { Select } from "@/components/Select";

type Banned = { id: number; type: "ip" | "phone"; value: string; reason?: string; created_at: string };

export default function BannedDevices() {
  const [list, setList] = useState<Banned[]>([]);
  const [form, setForm] = useState({ type: "phone", value: "", reason: "" });
  const [error, setError] = useState("");
  const load = () => api("/banned-devices").then(setList);
  useEffect(() => { load(); }, []);

  async function add(e: React.FormEvent) {
    e.preventDefault(); setError("");
    try { await api("/banned-devices", { method: "POST", json: form }); setForm({ ...form, value: "", reason: "" }); load(); }
    catch (err) { if (err instanceof ApiError) setError(err.message); }
  }

  return (
    <div className="max-w-3xl space-y-5">
      <h1 className="page-title">Banned Device</h1>
      <p className="text-sm text-slate-600">Pesanan dari nomor WhatsApp atau alamat IP di bawah ini akan ditolak otomatis.</p>
      <form onSubmit={add} className="card flex flex-wrap gap-2 p-4">
        <Select className="input w-36" value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })}>
          <option value="phone">No. WhatsApp</option><option value="ip">Alamat IP</option>
        </Select>
        <input className="input flex-1" placeholder={form.type === "ip" ? "mis. 103.10.10.10" : "mis. 08123456789"} value={form.value} onChange={(e) => setForm({ ...form, value: e.target.value })} required />
        <input className="input flex-1" placeholder="Alasan (opsional)" value={form.reason} onChange={(e) => setForm({ ...form, reason: e.target.value })} />
        <button className="btn-danger"><Ban size={16} />Blokir</button>
        {error && <p className="w-full text-xs text-red-600">{error}</p>}
      </form>
      <div className="card divide-y divide-slate-100">
        {list.map((b) => (
          <div key={b.id} className="flex items-center justify-between p-4 text-sm">
            <div><span className="badge mr-2 bg-red-100 text-red-700">{b.type === "ip" ? "IP" : "WhatsApp"}</span><b>{b.value}</b><div className="text-xs text-slate-500">{b.reason} • {fmtDate(b.created_at)}</div></div>
            <button className="btn-outline btn-sm" onClick={async () => { await api(`/banned-devices/${b.id}`, { method: "DELETE" }); load(); }}><Unlock size={13} />Buka blokir</button>
          </div>
        ))}
        {!list.length && <Empty icon={ShieldCheck} text="Belum ada perangkat yang diblokir." />}
      </div>
    </div>
  );
}
