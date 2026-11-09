"use client";
import { Globe, Link2, Trash2 } from "lucide-react";
import { useEffect, useState } from "react";
import { ApiError } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { Dialog, DialogActions, EmptyState, FieldLabel, fmtDateLong, PageHead, Panel, PrimaryBtn, useResource } from "@/components/kit";
import { askConfirm } from "@/components/Dialogs";

type Domain = { id: number; domain: string; status: "pending" | "connected"; is_default: boolean; created_at: string };

export default function Domains() {
  const { user } = useAuth();
  const res = useResource<Domain>("domains");
  const [open, setOpen] = useState(false);
  const [host, setHost] = useState("");
  useEffect(() => setHost(location.host), []);
  const base = `${host}/c/`;

  return (
    <div className="space-y-5">
      <PageHead title="Custom Domain" tutorial={false}><PrimaryBtn onClick={() => setOpen(true)}>Add Custom Domain</PrimaryBtn></PageHead>
      <Panel className="flex flex-wrap items-center gap-4 px-5 py-5">
        <span className="flex h-11 w-11 items-center justify-center rounded-full bg-brand-50 text-brand-600"><Globe size={22} /></span>
        <div className="flex-1"><div className="text-lg font-semibold text-slate-800">Default Domain</div>
          <div className="text-xs text-slate-500">Checkout page URL: <span className="italic text-brand-600">http://{base}{user?.store_slug ? "" : ""}</span></div></div>
        <div className="flex items-center gap-6 rounded-lg border border-slate-200 px-4 py-2 text-sm"><span className="flex items-center gap-2"><Link2 size={15} />Domain :</span><span className="text-slate-700">{host}</span></div>
      </Panel>
      <Panel>
        <table className="w-full text-sm">
          <thead><tr className="border-b border-slate-100 text-left text-[13px] text-slate-500"><th className="px-5 py-3 font-medium">Domain</th><th /><th className="px-5 py-3 font-medium">Date Added</th><th className="px-5 py-3 font-medium">Status</th><th /></tr></thead>
          <tbody>
            <tr className="border-b border-slate-100">
              <td className="px-5 py-4 font-medium text-slate-800"><span className="flex items-center gap-2"><Link2 size={15} />{host}</span></td>
              <td><span className="rounded-full border border-emerald-300 bg-emerald-50 px-3 py-0.5 text-xs text-emerald-700">Connected</span></td>
              <td className="px-5 font-semibold text-slate-700">{user ? fmtDateLong(new Date().toISOString()) : ""}</td>
              <td className="px-5"><span className="rounded-full border border-fuchsia-300 bg-fuchsia-50 px-3 py-0.5 text-xs text-fuchsia-700">Default</span></td><td />
            </tr>
            {res.rows.map((d) => (
              <tr key={d.id} className="border-b border-slate-100">
                <td className="px-5 py-4 font-medium text-slate-800"><span className="flex items-center gap-2"><Link2 size={15} />{d.domain}</span></td>
                <td><span className={`rounded-full border px-3 py-0.5 text-xs ${d.status === "connected" ? "border-emerald-300 bg-emerald-50 text-emerald-700" : "border-amber-300 bg-amber-50 text-amber-700"}`}>{d.status === "connected" ? "Connected" : "Menunggu DNS"}</span></td>
                <td className="px-5 font-semibold text-slate-700">{fmtDateLong(d.created_at)}</td>
                <td className="px-5 text-xs text-slate-500">Arahkan CNAME ke <b>{host.split(":")[0]}</b></td>
                <td className="px-5 text-right"><button onClick={async () => (await askConfirm(`Hapus ${d.domain}?`)) && res.remove(d.id)} className="text-slate-400 hover:text-rose-600" aria-label="Hapus"><Trash2 size={16} /></button></td>
              </tr>
            ))}
          </tbody>
        </table>
        {res.data && !res.rows.length && <div className="border-t border-slate-100"><EmptyState text="Belum ada custom domain" sub="Tambahkan domain sendiri, misalnya order.tokokamu.com, agar link checkout lebih terpercaya." /></div>}
      </Panel>
      {open && <AddDomain onClose={() => setOpen(false)} onSave={async (domain) => { await res.create({ domain }); setOpen(false); }} />}
    </div>
  );
}

function AddDomain({ onClose, onSave }: { onClose: () => void; onSave: (d: string) => Promise<void> }) {
  const [domain, setDomain] = useState("");
  const [err, setErr] = useState("");
  return (
    <Dialog title="Add Custom Domain" icon={Globe} onClose={onClose}>
      <form onSubmit={async (e) => { e.preventDefault(); try { await onSave(domain.trim().toLowerCase()); } catch (x) { setErr(x instanceof ApiError ? Object.values(x.errors)[0]?.[0] ?? x.message : "Gagal"); } }}>
        <FieldLabel>Domain</FieldLabel>
        <input className="input" placeholder="order.tokokamu.com" value={domain} onChange={(e) => setDomain(e.target.value)} />
        {err && <p className="mt-1 text-xs text-rose-600">{err}</p>}
        <div className="mt-4 rounded-lg bg-slate-50 p-3 text-xs text-slate-600">Setelah ditambahkan, buat record <b>CNAME</b> di pengelola DNS domainmu yang mengarah ke server Pesanin. Status berubah menjadi <b>Connected</b> setelah DNS aktif.</div>
        <DialogActions onCancel={onClose} label="Add" cancel="Cancel" />
      </form>
    </Dialog>
  );
}
