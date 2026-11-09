"use client";
import { Bell, Mail, Send, Trash2 } from "lucide-react";
import { useState } from "react";
import { api, ApiError } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { Dialog, DialogActions, EmptyState, FieldLabel, PageHead, Pager, Panel, PrimaryBtn, Toggle, useResource } from "@/components/kit";
import { Select } from "@/components/Select";

type Acc = { id: number; type: string; name: string; value: string; is_active: boolean; events?: string[] };
const EVENTS: [string, string][] = [["new_order", "Pesanan baru masuk"], ["paid", "Pesanan dibayar"], ["confirmation", "Konfirmasi pembayaran baru"], ["wa_disconnected", "Koneksi WhatsApp terputus"], ["low_stock", "Stok hampir habis"]];

export default function Notifications() {
  const { user, setUser } = useAuth();
  const [tab, setTab] = useState<"email" | "telegram" | "other">("email");
  const [status, setStatus] = useState("");
  const res = useResource<Acc>("notification-accounts", { type: tab === "other" ? "email" : tab, ...(status ? { is_active: status } : {}) });
  const [open, setOpen] = useState(false);
  const isEmail = tab === "email";

  return (
    <div className="space-y-5">
      <PageHead title="Notifications" />
      <Panel>
        <div className="m-3 grid grid-cols-3 rounded-lg bg-slate-50 p-1 text-sm">
          {([["email", "Email", Mail], ["telegram", "Telegram", Send], ["other", "Notifikasi Lainnya", Bell]] as const).map(([k, l, I]) => (
            <button key={k} onClick={() => setTab(k)} className={`flex items-center justify-center gap-2 rounded-md py-2 ${tab === k ? "bg-white font-medium text-slate-800" : "text-slate-500"}`}><I size={16} />{l}</button>
          ))}
        </div>
        {tab === "other" ? (
          <div className="space-y-3 p-5">
            <p className="text-sm text-slate-600">Pilih kejadian yang dikirim ke semua akun notifikasi aktif.</p>
            {EVENTS.map(([k, l]) => {
              const notify = (user as any)?.settings?.notify ?? {};
              const on = notify[k] ?? true;
              return <div key={k} className="flex items-center justify-between rounded-lg bg-slate-50 px-4 py-3 text-sm"><span>{l}</span>
                <Toggle checked={on} onChange={async (v) => { const settings = await api("/user-settings", { method: "PUT", json: { key: "notify", value: { ...notify, [k]: v } } }); setUser({ ...user!, settings } as any); }} /></div>;
            })}
          </div>
        ) : (
          <>
            <div className="flex flex-wrap items-center gap-3 px-5 py-3">
              <span className="flex h-9 w-9 items-center justify-center rounded-full bg-rose-50 text-rose-500">{isEmail ? <Mail size={17} /> : <Send size={17} />}</span>
              <h2 className="flex-1 text-[17px] font-semibold text-slate-800">{isEmail ? "Email Account" : "Telegram Account"}</h2>
              <Select className="h-10 rounded-lg border border-slate-200 px-3 text-sm" value={status} onChange={(e) => setStatus(e.target.value)}><option value="">All Status</option><option value="1">Active</option><option value="0">Inactive</option></Select>
              <PrimaryBtn onClick={() => setOpen(true)}>Add Account</PrimaryBtn>
            </div>
            <table className="w-full text-sm">
              <thead><tr className="border-y border-slate-100 text-left text-[13px] text-slate-500"><th className="px-5 py-3 font-medium">Name</th><th className="px-5 font-medium">{isEmail ? "Email Address" : "Chat ID"}</th><th className="px-5 font-medium">Status</th><th /></tr></thead>
              <tbody>
                {isEmail && (
                  <tr className="border-b border-slate-100"><td className="px-5 py-4 font-medium text-slate-800">{user?.name}</td><td className="px-5 font-medium">{user?.email}</td>
                    <td className="px-5"><span className="rounded-full border border-brand-600 bg-brand-50 px-3 py-0.5 text-xs text-brand-600">Main User</span></td><td className="px-5 text-right"><Toggle checked onChange={() => {}} /></td></tr>
                )}
                {res.rows.map((a) => (
                  <tr key={a.id} className="border-b border-slate-100"><td className="px-5 py-4 font-medium text-slate-800">{a.name}</td><td className="px-5">{a.value}</td>
                    <td className="px-5"><span className={`rounded-full px-3 py-0.5 text-xs ${a.is_active ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-500"}`}>{a.is_active ? "Active" : "Inactive"}</span></td>
                    <td className="px-5"><span className="flex items-center justify-end gap-3"><Toggle checked={a.is_active} onChange={(v) => res.update(a.id, { is_active: v })} /><button onClick={() => res.remove(a.id)} className="text-slate-400 hover:text-rose-600" aria-label="Hapus"><Trash2 size={16} /></button></span></td></tr>
                ))}
              </tbody>
            </table>
            {!isEmail && res.data && !res.rows.length && <EmptyState text="Belum ada akun Telegram" sub="Tambahkan Chat ID Telegram untuk menerima notifikasi pesanan." />}
            <Pager page={res.page} last={res.data?.last_page ?? 1} onPage={res.setPage} total={res.data?.total} perPage={res.perPage} onPerPage={res.setPerPage} />
          </>
        )}
      </Panel>
      {open && <AddAccount type={isEmail ? "email" : "telegram"} onClose={() => setOpen(false)} onSave={async (b) => { await res.create(b); setOpen(false); }} />}
    </div>
  );
}

function AddAccount({ type, onClose, onSave }: { type: "email" | "telegram"; onClose: () => void; onSave: (b: unknown) => Promise<void> }) {
  const [f, setF] = useState({ name: "", value: "", events: EVENTS.map(([k]) => k) });
  const [err, setErr] = useState("");
  return (
    <Dialog title="Add Account" icon={type === "email" ? Mail : Send} onClose={onClose}>
      <form className="space-y-3" onSubmit={async (e) => { e.preventDefault(); try { await onSave({ ...f, type, is_active: true }); } catch (x) { setErr(x instanceof ApiError ? Object.values(x.errors)[0]?.[0] ?? x.message : "Gagal"); } }}>
        <div><FieldLabel>Nama</FieldLabel><input className="input" value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} /></div>
        <div><FieldLabel>{type === "email" ? "Email Address" : "Telegram Chat ID"}</FieldLabel><input className="input" type={type === "email" ? "email" : "text"} value={f.value} onChange={(e) => setF({ ...f, value: e.target.value })} /></div>
        <div><FieldLabel>Kirim notifikasi untuk</FieldLabel>
          <div className="space-y-1.5">{EVENTS.map(([k, l]) => (
            <label key={k} className="flex items-center gap-2 text-sm"><input type="checkbox" className="h-4 w-4 accent-brand-600" checked={f.events.includes(k)} onChange={(e) => setF({ ...f, events: e.target.checked ? [...f.events, k] : f.events.filter((x) => x !== k) })} />{l}</label>
          ))}</div></div>
        {err && <p className="text-xs text-rose-600">{err}</p>}
        <DialogActions onCancel={onClose} label="Add" cancel="Cancel" />
      </form>
    </Dialog>
  );
}
