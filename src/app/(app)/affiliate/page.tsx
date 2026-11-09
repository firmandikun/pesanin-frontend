"use client";
import { ArrowRight, Copy, Megaphone, Trash2, UsersRound } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { api, ApiError, Product, rupiah } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { CardTitle, Dialog, DialogActions, EmptyState, FieldLabel, Panel, PrimaryBtn, Toggle } from "@/components/kit";
import { askConfirm } from "@/components/Dialogs";

function AffiliateArt() {
  return (
    <svg viewBox="0 0 260 180" className="h-48 w-64" aria-hidden>
      <rect x="70" y="40" width="170" height="110" rx="8" fill="#f56a1b" /><rect x="80" y="50" width="150" height="88" rx="4" fill="#fff5ed" />
      <rect x="160" y="70" width="50" height="40" rx="4" fill="#fff" /><path d="M168 100 l10-12 8 6 14-16" stroke="#46c2b7" strokeWidth="3" fill="none" />
      <circle cx="180" cy="42" r="18" fill="#f2b9a0" /><path d="M162 38 q18-30 36 0 q-6-18-18-18 q-14 0-18 18z" fill="#7b4a2a" />
      <rect x="164" y="58" width="34" height="50" rx="12" fill="#e05510" />
      <path d="M120 60 l40 -14 v34 l-40 -12z" fill="#f6a31b" /><rect x="112" y="60" width="10" height="16" rx="2" fill="#e0784a" />
      <circle cx="70" cy="150" r="14" fill="#f6c25b" /><text x="70" y="154" fontSize="10" textAnchor="middle" fill="#a0640a" fontWeight="700">Rp</text>
      <circle cx="60" cy="95" r="8" fill="#2fb36d" /><path d="M56 95l3 3 5-6" stroke="#fff" strokeWidth="2" fill="none" />
      <path d="M40 30l3 7 7 3-7 3-3 7-3-7-7-3 7-3z" fill="#f6c25b" />
    </svg>
  );
}

export default function Affiliate() {
  const { user, setUser } = useAuth();
  const enabled = !!(user as any)?.settings?.affiliate?.enabled;
  const [list, setList] = useState<any[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [open, setOpen] = useState(false);
  const load = useCallback(() => api("/affiliate-stats").then(setList), []);
  useEffect(() => { if (enabled) { load(); api("/products?per_page=100").then((r) => setProducts(r.products.data)); } }, [enabled, load]);

  async function start() {
    const settings = await api("/user-settings", { method: "PUT", json: { key: "affiliate", value: { enabled: true } } });
    setUser({ ...user!, settings } as any);
  }

  if (!enabled) {
    return (
      <div className="space-y-5">
        <h1 className="text-[34px] font-bold text-slate-800">Pesanin Afiliasi</h1>
        <Panel className="space-y-8 p-6">
          <div className="grid items-center gap-6 bg-[linear-gradient(#f4f6fb_1px,transparent_1px),linear-gradient(90deg,#f4f6fb_1px,transparent_1px)] bg-[size:36px_36px] md:grid-cols-[1fr_auto]">
            <div className="space-y-3">
              <div className="font-semibold text-brand-600">Selamat datang di Pesanin Affiliate</div>
              <h2 className="text-2xl font-bold text-slate-800">Tingkatkan Penjualan dengan Program Afiliasi!</h2>
              <p className="text-slate-600">Pantau semua performa dan penjualan afiliasi langsung dari satu dashboard.<br />Bebas biaya pendaftaran, komisi dibayarkan hanya untuk setiap penjualan sukses.</p>
              <button onClick={start} className="flex items-center gap-2 rounded-lg bg-brand-600 px-5 py-2.5 text-sm font-semibold text-white">Mulai Program Afiliasi<ArrowRight size={16} /></button>
            </div>
            <AffiliateArt />
          </div>
          <div>
            <h3 className="mb-4 text-xl font-semibold text-slate-800">Manfaat untuk kamu</h3>
            <div className="grid gap-6 md:grid-cols-2">
              {[["Menjangkau Lebih Banyak Pelanggan", "Produk dipromosikan oleh banyak afiliator melalui berbagai channel.", "bg-emerald-100"],
                ["Meningkatkan Penjualan", "Affiliate membantu mendorong traffic dan konversi secara konsisten.", "bg-amber-100"],
                ["Biaya Promosi Lebih Efisien", "Komisi hanya dibayarkan jika terjadi penjualan yang sukses.", "bg-sky-100"],
                ["Mudah Dikelola & Terukur", "Kelola afiliator dan pantau performa penjualan langsung dari dashboard.", "bg-brand-100"]].map(([t, d, c]) => (
                <div key={t} className="flex items-center gap-4"><span className={`flex h-16 w-16 shrink-0 items-center justify-center rounded-full ${c}`}><UsersRound size={26} className="text-slate-600" /></span>
                  <div><div className="font-semibold text-slate-800">{t}</div><div className="text-sm text-slate-600">{d}</div></div></div>
              ))}
            </div>
          </div>
        </Panel>
      </div>
    );
  }

  const totals = list.reduce((a, x) => ({ orders: a.orders + x.orders, revenue: a.revenue + x.revenue, commission: a.commission + x.commission }), { orders: 0, revenue: 0, commission: 0 });
  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between"><h1 className="text-[34px] font-bold text-slate-800">Pesanin Afiliasi</h1><PrimaryBtn onClick={() => setOpen(true)}>Tambah Afiliator</PrimaryBtn></div>
      <div className="grid gap-4 md:grid-cols-4">
        {[["Afiliator", list.length], ["Pesanan dari Afiliasi", totals.orders], ["Penjualan (Lunas)", rupiah(totals.revenue)], ["Total Komisi", rupiah(totals.commission)]].map(([l, v]) => (
          <div key={l as string} className="surface p-4"><div className="text-xs text-slate-500">{l}</div><div className="mt-1 text-xl font-bold text-slate-800">{v}</div></div>
        ))}
      </div>
      <Panel>
        <CardTitle icon={Megaphone} title="Daftar Afiliator" tint="orange" />
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead><tr className="border-b border-slate-100 text-left text-[13px] text-slate-500">{["Nama", "Kode", "Komisi", "Pesanan", "Penjualan", "Komisi Didapat", "Link", "Aktif", ""].map((h) => <th key={h} className="whitespace-nowrap px-4 py-3 font-medium">{h}</th>)}</tr></thead>
            <tbody>{list.map((a) => {
              const link = products[0] ? `${location.origin}/c/${products[0].slug}?ref=${a.code}` : "";
              return (
                <tr key={a.id} className="border-b border-slate-100">
                  <td className="px-4 py-3"><div className="font-medium text-slate-800">{a.name}</div><div className="text-xs text-slate-500">{a.phone || a.email}</div></td>
                  <td className="px-4 font-mono">{a.code}</td><td className="px-4">{a.commission_percent}%</td><td className="px-4">{a.orders}</td>
                  <td className="whitespace-nowrap px-4">{rupiah(a.revenue)}</td><td className="whitespace-nowrap px-4 font-semibold text-emerald-600">{rupiah(a.commission)}</td>
                  <td className="px-4"><button onClick={() => navigator.clipboard?.writeText(link)} className="flex items-center gap-1 text-xs text-brand-600" title={link}><Copy size={13} />Salin link</button></td>
                  <td className="px-4"><Toggle checked={a.is_active} onChange={async (v) => { await api(`/r/affiliates/${a.id}`, { method: "PUT", json: { is_active: v } }); load(); }} /></td>
                  <td className="px-4"><button onClick={async () => { if (await askConfirm(`Hapus ${a.name}?`)) { await api(`/r/affiliates/${a.id}`, { method: "DELETE" }); load(); } }} className="text-slate-400 hover:text-rose-600" aria-label="Hapus"><Trash2 size={16} /></button></td>
                </tr>
              );
            })}</tbody>
          </table>
          {!list.length && <EmptyState text="Belum ada afiliator" sub="Tambahkan afiliator, lalu bagikan link checkout dengan kode ?ref= mereka. Pesanan dari link itu otomatis tercatat." />}
        </div>
      </Panel>
      {open && <AddAffiliate onClose={() => setOpen(false)} onSaved={() => { setOpen(false); load(); }} />}
    </div>
  );
}

function AddAffiliate({ onClose, onSaved }: { onClose: () => void; onSaved: () => void }) {
  const [f, setF] = useState({ name: "", phone: "", email: "", code: "", commission_percent: 10 });
  const [err, setErr] = useState("");
  return (
    <Dialog title="Tambah Afiliator" icon={UsersRound} onClose={onClose}>
      <form className="space-y-3" onSubmit={async (e) => { e.preventDefault(); try { await api("/r/affiliates", { method: "POST", json: { ...f, code: f.code || null, email: f.email || null, is_active: true } }); onSaved(); } catch (x) { setErr(x instanceof ApiError ? Object.values(x.errors)[0]?.[0] ?? x.message : "Gagal"); } }}>
        <div><FieldLabel>Nama</FieldLabel><input className="input" value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} /></div>
        <div className="grid grid-cols-2 gap-3">
          <div><FieldLabel>No. WhatsApp</FieldLabel><input className="input" value={f.phone} onChange={(e) => setF({ ...f, phone: e.target.value })} /></div>
          <div><FieldLabel>Email</FieldLabel><input className="input" value={f.email} onChange={(e) => setF({ ...f, email: e.target.value })} /></div>
          <div><FieldLabel>Kode (opsional)</FieldLabel><input className="input" placeholder="otomatis" value={f.code} onChange={(e) => setF({ ...f, code: e.target.value.toUpperCase() })} /></div>
          <div><FieldLabel>Komisi (%)</FieldLabel><input className="input" type="number" min={0} max={100} value={f.commission_percent} onChange={(e) => setF({ ...f, commission_percent: Number(e.target.value) })} /></div>
        </div>
        {err && <p className="text-xs text-rose-600">{err}</p>}
        <DialogActions onCancel={onClose} />
      </form>
    </Dialog>
  );
}
