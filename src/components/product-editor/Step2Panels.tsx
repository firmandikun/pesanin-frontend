"use client";
import { CheckCircle2, CircleDollarSign, Edit3, EyeOff, GripVertical, Info, MapPinOff, Plus, Radar, ScanSearch, Trash2, Truck } from "lucide-react";
import { Modal } from "@/components/ui";
import { useState } from "react";
import { api, FormSettings, Product } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { BankLogo, CourierLogo } from "@/components/Logos";
import { Label, RpInput, Switch } from "./parts";
import { Select } from "@/components/Select";
import { askConfirm } from "@/components/Dialogs";

export { BankLogo } from "@/components/Logos";

export const EPAYMENT_CHANNELS: [string, string, string][] = [
  ["bri_va", "BRI Virtual Account", "BRI"], ["bca_va", "BCA Virtual Account", "BCA"], ["qris", "QRIS", "QRIS"],
  ["mandiri_bill", "Mandiri Bill", "MANDIRI"], ["bni_va", "BNI Virtual Account", "BNI"],
];
const METHOD_LABEL: Record<string, string> = { bank_transfer: "Bank Transfer", cod: "COD", epayment: "E-Payment" };
export const COURIERS: [string, string][] = [["jne", "JNE"], ["sicepat", "SiCepat"], ["sap", "SAP"], ["idexpress", "iDexpress"], ["jnt", "J&T"], ["lion", "Lion Parcel"], ["spx", "SPX Express"]];

type P = { p: Partial<Product>; set: <K extends keyof Product>(k: K, v: Product[K] | null) => void; setFs: (patch: Partial<FormSettings>) => void; onClose: () => void };

function Footer({ onCancel, onSave }: { onCancel: () => void; onSave: () => void }) {
  return (
    <div className="-mx-4 mt-4 flex justify-end gap-2 border-t border-slate-100 px-4 pt-3">
      <button type="button" onClick={onCancel} className="rounded-lg border border-brand-600 px-4 py-1.5 text-sm font-medium text-brand-600">Batal</button>
      <button type="button" onClick={onSave} className="rounded-lg bg-brand-600 px-4 py-1.5 text-sm font-semibold text-white">Simpan</button>
    </div>
  );
}

export function PaymentPanel({ p, set, setFs, onClose }: P) {
  const { user, setUser } = useAuth();
  const fs = p.form_settings ?? {};
  const pay = fs.payment ?? {};
  const [snapshot] = useState(() => ({ payment: fs.payment, methods: p.payment_methods }));
  const [open, setOpen] = useState<Record<string, boolean>>({ bank_transfer: true, cod: true, epayment: true });
  const [newBank, setNewBank] = useState<{ bank: string; number: string; holder: string } | null>(null);
  const [drag, setDrag] = useState<number | null>(null);
  const order: string[] = (pay.order ?? ["bank_transfer", "cod", "epayment"]).filter((m: string) => !(m === "cod" && p.type === "digital"));
  const enabled = p.payment_methods ?? [];
  const setPay = (patch: Record<string, any>) => setFs({ payment: { ...pay, ...patch } });
  const toggle = (m: string, v: boolean) => set("payment_methods", order.filter((x) => (x === m ? v : enabled.includes(x))));
  const reorder = (next: string[]) => { setPay({ order: next }); set("payment_methods", next.filter((x) => enabled.includes(x))); };
  const banks = user?.bank_accounts ?? [];
  const disabledBanks: string[] = pay.disabled_banks ?? [];

  async function saveBanks(list: { bank: string; number: string; holder: string }[]) {
    const u = await api("/me", { method: "PUT", json: { name: user!.name, store_name: user!.store_name, store_slug: user!.store_slug, email: user!.email, whatsapp: user!.whatsapp, cod_fee_percent: user!.cod_fee_percent, bank_accounts: list } });
    setUser(u);
  }

  return (
    <div className="mt-3 space-y-3 border-t border-slate-100 pt-3">
      {order.map((m, i) => {
        const on = enabled.includes(m);
        return (
          <div key={m} draggable onDragStart={() => setDrag(i)} onDragOver={(e) => e.preventDefault()}
            onDrop={() => { if (drag === null || drag === i) return; const n = [...order]; const [x] = n.splice(drag, 1); n.splice(i, 0, x); reorder(n); setDrag(null); }}
            className="rounded-lg border border-slate-200 bg-white p-4">
            <div className="flex items-center gap-3">
              <span className="text-sm text-slate-600">{i + 1}.</span>
              <input type="checkbox" className="h-[18px] w-[18px] accent-brand-600" checked={on} onChange={(e) => toggle(m, e.target.checked)} />
              <span className="flex-1 text-sm font-semibold text-slate-800">{METHOD_LABEL[m]}</span>
              {m === "epayment" ? <span title="Pembayaran otomatis via Midtrans (Settings → Integrasi)"><Info size={17} className="text-slate-500" /></span>
                : <button type="button" onClick={() => setOpen({ ...open, [m]: !open[m] })} className="text-slate-500 hover:text-brand-600" aria-label="Edit"><Edit3 size={17} /></button>}
              <GripVertical size={17} className="cursor-grab text-slate-500" />
            </div>

            {m === "bank_transfer" && on && open[m] && (
              <div className="mt-3 space-y-3">
                <div className="text-sm font-semibold text-slate-800">Bank Transfer Settings</div>
                {banks.map((b, j) => (
                  <div key={j} className="flex items-center gap-3 rounded-lg border border-slate-200 px-4 py-3">
                    <span className="text-sm text-slate-600">{j + 1}.</span>
                    <input type="checkbox" className="h-[18px] w-[18px] accent-brand-600" checked={!disabledBanks.includes(b.number)}
                      onChange={(e) => setPay({ disabled_banks: e.target.checked ? disabledBanks.filter((x) => x !== b.number) : [...disabledBanks, b.number] })} />
                    <BankLogo bank={b.bank} />
                    <span className="flex-1"><b className="block text-sm text-slate-800">{b.bank}</b><span className="text-xs text-slate-500">{b.holder} • {b.number}</span></span>
                    <button type="button" onClick={() => setNewBank({ ...b, ...{ _i: j } } as any)} className="text-slate-500 hover:text-brand-600" aria-label="Edit"><Edit3 size={16} /></button>
                    <button type="button" onClick={async () => (await askConfirm(`Hapus rekening ${b.bank}?`)) && saveBanks(banks.filter((_, k) => k !== j))} className="text-slate-500 hover:text-rose-600" aria-label="Hapus"><Trash2 size={16} /></button>
                    <GripVertical size={16} className="text-slate-400" />
                  </div>
                ))}
                {newBank ? (
                  <div className="grid grid-cols-3 gap-2 rounded-lg bg-slate-50 p-3">
                    <input className="input" placeholder="Bank (mis. BCA)" value={newBank.bank} onChange={(e) => setNewBank({ ...newBank, bank: e.target.value })} />
                    <input className="input" placeholder="No. Rekening" value={newBank.number} onChange={(e) => setNewBank({ ...newBank, number: e.target.value })} />
                    <input className="input" placeholder="Atas Nama" value={newBank.holder} onChange={(e) => setNewBank({ ...newBank, holder: e.target.value })} />
                    <div className="col-span-3 flex justify-end gap-2">
                      <button type="button" className="text-sm text-slate-500" onClick={() => setNewBank(null)}>Batal</button>
                      <button type="button" className="rounded-lg bg-brand-600 px-3 py-1.5 text-sm font-semibold text-white" disabled={!newBank.bank || !newBank.number || !newBank.holder}
                        onClick={async () => { const idx = (newBank as any)._i; const clean = { bank: newBank.bank, number: newBank.number, holder: newBank.holder }; await saveBanks(idx === undefined ? [...banks, clean] : banks.map((x, k) => (k === idx ? clean : x))); setNewBank(null); }}>Simpan Rekening</button>
                    </div>
                  </div>
                ) : (
                  <button type="button" onClick={() => setNewBank({ bank: "", number: "", holder: user?.name ?? "" })} className="flex items-center gap-2 text-sm font-semibold text-brand-600">
                    <Plus size={17} className="rounded-full bg-brand-600 p-0.5 text-white" />Add Bank transfer
                  </button>
                )}
              </div>
            )}

            {m === "cod" && on && open[m] && (
              <div className="mt-3 space-y-3">
                <div className="border-b border-slate-100 pb-2 text-sm font-semibold text-slate-800">COD Settings</div>
                <div><Label>Courier Fee Percentage</Label><input className="input" type="number" step="0.1" min={0} value={pay.cod?.fee_percent ?? user?.cod_fee_percent ?? 3} onChange={(e) => setPay({ cod: { ...pay.cod, fee_percent: Number(e.target.value) } })} /></div>
                <div><Label>Fee Type</Label>
                  <Select className="input" value={pay.cod?.fee_type ?? "product_shipping"} onChange={(e) => setPay({ cod: { ...pay.cod, fee_type: e.target.value } })}>
                    <option value="product_shipping">Product + Shipping</option><option value="product">Product</option>
                  </Select>
                </div>
                <div><Label>Courier Minimal Fee</Label><RpInput value={pay.cod?.min_fee ?? 0} onChange={(v) => setPay({ cod: { ...pay.cod, min_fee: v } })} /></div>
                <div><Label>Courier Maximal Fee</Label><RpInput value={pay.cod?.max_fee ?? null} onChange={(v) => setPay({ cod: { ...pay.cod, max_fee: v } })} /></div>
              </div>
            )}

            {m === "epayment" && on && (
              <div className="mt-3 space-y-2">
                <div className="rounded-lg bg-slate-50 p-3">
                  <div className="text-sm font-semibold text-slate-800">Biaya admin pembayaran ditanggung oleh:</div>
                  <div className="mt-1.5 flex gap-5 text-sm">
                    {(["seller", "buyer"] as const).map((x) => (
                      <label key={x} className="flex items-center gap-1.5"><input type="radio" className="accent-brand-600" checked={(pay.epayment?.admin_fee_by ?? "buyer") === x} onChange={() => setPay({ epayment: { ...pay.epayment, admin_fee_by: x } })} />{x === "seller" ? "Seller" : "Buyer"}</label>
                    ))}
                  </div>
                </div>
                {EPAYMENT_CHANNELS.map(([k, label, logo], j) => {
                  const ch: string[] = pay.epayment?.channels ?? [];
                  return (
                    <div key={k} className="flex items-center gap-3 rounded-lg border border-slate-200 px-4 py-2.5">
                      <span className="text-sm text-slate-600">{j + 1}.</span>
                      <input type="checkbox" className="h-[18px] w-[18px] accent-brand-600" checked={ch.includes(k)} onChange={(e) => setPay({ epayment: { ...pay.epayment, channels: e.target.checked ? [...ch, k] : ch.filter((x) => x !== k) } })} />
                      <BankLogo bank={logo} small />
                      <span className="flex-1 text-sm font-medium text-slate-700">{label}</span>
                      <GripVertical size={16} className="text-slate-400" />
                    </div>
                  );
                })}
                <div className="flex items-center justify-between rounded-lg border border-slate-200 px-4 py-3">
                  <span><b className="block text-sm text-slate-800">Aktifkan Pelacakan (Tracking)</b><span className="text-xs text-slate-500">Melacak interaksi pengguna agar performa dapat dianalisis.</span></span>
                  <Switch checked={!!pay.epayment?.tracking} onChange={(v) => setPay({ epayment: { ...pay.epayment, tracking: v } })} />
                </div>
                <p className="text-xs text-slate-500">Diproses lewat akun Midtrans milikmu (Settings → Integrasi). Jika Midtrans belum terhubung, pembeli diarahkan konfirmasi via WhatsApp.</p>
              </div>
            )}
          </div>
        );
      })}

      <div className="space-y-3 border-t border-slate-100 pt-3">
        <div><div className="text-sm font-semibold text-slate-800">Siapkan kode unik untuk setiap pembayaran</div>
          <label className="mt-1 flex items-center gap-2 text-sm"><input type="checkbox" className="h-4 w-4 accent-brand-600" checked={!!pay.unique_code} onChange={(e) => setPay({ unique_code: e.target.checked })} />Aktifkan Kode Unik</label></div>
        <div className="border-t border-slate-100 pt-3"><div className="text-sm font-semibold text-slate-800">Pengaturan PPN pembelian</div>
          <label className="mt-1 flex items-center gap-2 text-sm"><input type="checkbox" className="h-4 w-4 accent-brand-600" checked={!!pay.ppn} onChange={(e) => setPay({ ppn: e.target.checked })} />Aktifkan PPN</label></div>
      </div>
      <Footer onCancel={() => { setFs({ payment: snapshot.payment }); set("payment_methods", snapshot.methods ?? null); onClose(); }} onSave={onClose} />
    </div>
  );
}

function OptRow({ icon: Icon, title, desc, badge, checked, onChange, boxed }: { icon: typeof Truck; title: string; desc: string; badge?: boolean; checked: boolean; onChange: (v: boolean) => void; boxed?: boolean }) {
  return (
    <div className={`flex items-center gap-3 ${boxed ? "rounded-lg border border-slate-200 bg-white px-4 py-3" : "border-b border-slate-100 py-3 last:border-0"}`}>
      <span className={`flex shrink-0 items-center justify-center rounded-full ${boxed ? "h-10 w-10 bg-brand-50 text-brand-600" : "h-9 w-9 bg-slate-100 text-slate-600"}`}><Icon size={17} /></span>
      <span className="min-w-0 flex-1">
        <b className="flex items-center gap-2 text-sm font-semibold text-slate-800">{title}{badge && <span className="rounded-full border border-emerald-400 bg-emerald-50 px-2 text-[10px] font-semibold text-emerald-600">Baru</span>}</b>
        <span className="text-xs text-slate-500">{desc}</span>
      </span>
      <Switch checked={checked} onChange={onChange} />
    </div>
  );
}

const CARGO: [string, string][] = [["jne", "JNE Trucking"], ["jnt", "J&T Cargo"], ["lion", "Lion Parcel Big Pack"], ["sicepat", "SiCepat Gokil"]];
const SERVICE_DESC: Record<string, string> = { jne: "REG · 1-3 hari", sicepat: "REG · 2-3 hari", sap: "REG · 1-3 hari", idexpress: "STD · 2-4 hari", jnt: "EZ · 2-3 hari", lion: "REGPACK · 1-3 hari", spx: "STD · 2-3 hari" };

function ServiceCard({ title, desc, badge, on, onToggle, list, picked, onManage }: {
  title: string; desc: string; badge?: boolean; on: boolean; onToggle: (v: boolean) => void; list: [string, string][]; picked: string[]; onManage: () => void;
}) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-3.5">
      <div className="flex items-center gap-3">
        <input type="checkbox" className="h-[18px] w-[18px] accent-brand-600" checked={on} onChange={(e) => onToggle(e.target.checked)} />
        <span className="flex h-9 w-9 items-center justify-center rounded-full bg-orange-50 text-orange-500"><Truck size={17} /></span>
        <span className="flex-1">
          <b className="flex items-center gap-2 text-sm text-slate-800">{title}{badge && <span className="rounded-full border border-emerald-400 bg-emerald-50 px-2 text-[10px] font-semibold text-emerald-600">Baru</span>}</b>
          <span className="text-xs text-slate-500">{desc}</span>
        </span>
        <button type="button" onClick={onManage} className="text-sm font-medium text-brand-600 hover:underline">Atur Kurir</button>
      </div>
      {on && (
        <div className="mt-3 flex flex-wrap gap-x-4 gap-y-2 pl-1">
          {list.filter(([k]) => picked.includes(k)).map(([k, l]) => (
            <span key={k} className="flex items-center gap-1.5 text-[13px] font-medium text-slate-700"><CheckCircle2 size={17} className="fill-emerald-500 text-white" />{l}</span>
          ))}
          {!list.some(([k]) => picked.includes(k)) && <span className="text-xs text-rose-600">Belum ada kurir dipilih</span>}
        </div>
      )}
    </div>
  );
}

function CourierPicker({ title, list, picked, onClose, onSave }: { title: string; list: [string, string][]; picked: string[]; onClose: () => void; onSave: (v: string[]) => void }) {
  const [sel, setSel] = useState(picked);
  return (
    <Modal open onClose={onClose} title={title} icon={Truck}>
      <div className="space-y-2">
        <label className="flex items-center gap-2 border-b border-slate-100 pb-2 text-sm font-medium"><input type="checkbox" className="h-4 w-4 accent-brand-600" checked={sel.length === list.length} onChange={(e) => setSel(e.target.checked ? list.map(([k]) => k) : [])} />Pilih semua</label>
        {list.map(([k, l]) => (
          <label key={k} className={`flex cursor-pointer items-center gap-3 rounded-lg border px-3 py-2.5 ${sel.includes(k) ? "border-brand-600 bg-brand-50/40" : "border-slate-200"}`}>
            <input type="checkbox" className="h-4 w-4 accent-brand-600" checked={sel.includes(k)} onChange={(e) => setSel(e.target.checked ? [...sel, k] : sel.filter((x) => x !== k))} />
            <CourierLogo code={k} /><span className="flex-1"><b className="block text-sm text-slate-800">{l}</b><span className="text-xs text-slate-500">{SERVICE_DESC[k]}</span></span>
          </label>
        ))}
        <div className="flex justify-end gap-2 pt-2">
          <button type="button" onClick={onClose} className="rounded-lg border border-brand-600 px-4 py-1.5 text-sm font-medium text-brand-600">Batal</button>
          <button type="button" onClick={() => { onSave(sel); onClose(); }} className="rounded-lg bg-brand-600 px-4 py-1.5 text-sm font-semibold text-white">Simpan</button>
        </div>
      </div>
    </Modal>
  );
}

export function ShippingPanel({ p, setFs, onClose }: P) {
  const fs = p.form_settings ?? {};
  const sh = fs.shipping ?? {};
  const [snapshot] = useState(() => fs.shipping);
  const [picker, setPicker] = useState<"regular" | "cargo" | null>(null);
  const setSh = (patch: Record<string, any>) => setFs({ shipping: { ...sh, ...patch } });
  const couriers: string[] = sh.couriers?.length ? sh.couriers : COURIERS.map(([k]) => k);
  const cargoCouriers: string[] = sh.cargo_couriers ?? CARGO.map(([k]) => k);

  return (
    <div className="mt-3 space-y-4 border-t border-slate-100 pt-4">
      <label className="flex items-center gap-2.5 text-sm text-slate-700"><input type="checkbox" className="h-4 w-4 accent-brand-600" checked={!!sh.different_cod} onChange={(e) => setSh({ different_cod: e.target.checked })} />Tipe pengiriman berbeda antara COD dan NON-COD</label>
      <div className="space-y-4 rounded-lg bg-slate-50 p-4">
        <div><Label>Tipe Pengiriman</Label>
          <Select className="input bg-white" value={sh.type ?? "auto"} onChange={(e) => setSh({ type: e.target.value })}>
            <option value="auto">Otomatis</option><option value="flat">Ongkir Tetap</option><option value="free">Gratis Ongkir</option>
          </Select></div>
        {sh.type === "flat" && <div><Label>Ongkir tetap</Label><RpInput value={sh.flat_fee ?? 0} onChange={(v) => setSh({ flat_fee: v })} /></div>}
        <div>
          <div className="text-sm font-semibold text-slate-800">Layanan Pengiriman</div>
          <p className="mb-2 text-xs text-slate-500">Infomasi tentang pilihan ekspedisi yang akan tampil di halaman checkout</p>
          <div className="space-y-2">
            <ServiceCard title="Reguler" desc="Layanan pengiriman umum" on={sh.regular !== false} onToggle={(v) => setSh({ regular: v })} list={COURIERS} picked={couriers} onManage={() => setPicker("regular")} />
            <ServiceCard title="Cargo" badge desc="Untuk pengiriman dengan berat di atas atau sama dengan 5-10kg" on={!!sh.cargo} onToggle={(v) => setSh({ cargo: v })} list={CARGO} picked={cargoCouriers} onManage={() => setPicker("cargo")} />
          </div>
        </div>
        <div><Label>Tambahan Biaya Ongkir</Label>
          <div className="flex overflow-hidden rounded-lg border border-slate-200 bg-white focus-within:border-brand-600"><span className="flex items-center border-r border-slate-200 bg-slate-50 px-3 text-sm text-slate-500">Rp</span>
            <input type="number" className="h-10 flex-1 px-3 text-sm outline-none" value={sh.extra_fee ?? 0} onChange={(e) => setSh({ extra_fee: Number(e.target.value) })} /></div>
          <p className="mt-1 text-xs text-slate-500">Sesuaikan biaya pengiriman di sini (masukkan nilai negatif untuk mengurangi biaya)</p></div>
        <div className="border-t border-slate-200 pt-3">
          <div className="text-sm font-semibold text-slate-800">Pengaturan Tambahan</div>
          <OptRow icon={EyeOff} title="Sembunyikan Biaya Pengiriman Tambahan" desc="Biaya pengiriman tambahan akan langsung ditambahkan dan dijadikan satu dengan ongkir." checked={!!sh.hide_extra_fee} onChange={(v) => setSh({ hide_extra_fee: v })} />
          <OptRow icon={CircleDollarSign} title="Diskon Ongkir" desc="Potongan harga berupa nominal rupiah (Rp) atau diskon persentase (%)" checked={!!sh.discount?.enabled} onChange={(v) => setSh({ discount: { type: "amount", value: 0, ...sh.discount, enabled: v } })} />
          {sh.discount?.enabled && (
            <div className="mb-3 ml-12 flex gap-2">
              <Select className="input w-24 bg-white" value={sh.discount.type ?? "amount"} onChange={(e) => setSh({ discount: { ...sh.discount, type: e.target.value } })}><option value="amount">Rp</option><option value="percent">%</option></Select>
              <input className="input" type="number" min={0} value={sh.discount.value ?? 0} onChange={(e) => setSh({ discount: { ...sh.discount, value: Number(e.target.value) } })} />
            </div>
          )}
          <OptRow icon={Radar} title="Tampilkan Harga Asli Pengiriman" badge desc="Di halaman Checkout akan menampilkan harga asli dari ekspedisi." checked={!!sh.show_original_price} onChange={(v) => setSh({ show_original_price: v })} />
          <OptRow icon={EyeOff} title="Sembunyikan Tampilan Kurir" desc="Tampilan ekspedisi akan disembunyikan dari halaman checkout." checked={!!sh.hide_courier} onChange={(v) => setSh({ hide_courier: v })} />
        </div>
      </div>
      <OptRow boxed icon={ScanSearch} title="Pemeriksaan Shipping Coverage" desc="Alamat yang tidak terjangkau oleh ekspedisi tidak akan bisa dipilih." checked={!!sh.coverage_check} onChange={(v) => setSh({ coverage_check: v })} />
      <OptRow boxed icon={MapPinOff} title="Sembunyikan Lokasi dikirim dari" badge desc="Info tentang lokasi barang dikirim tidak akan tampil di halaman checkout" checked={!!sh.hide_origin} onChange={(v) => setSh({ hide_origin: v })} />
      <Footer onCancel={() => { setFs({ shipping: snapshot }); onClose(); }} onSave={onClose} />
      {picker === "regular" && <CourierPicker title="Atur Kurir — Reguler" list={COURIERS} picked={couriers} onClose={() => setPicker(null)} onSave={(v) => setSh({ couriers: v })} />}
      {picker === "cargo" && <CourierPicker title="Atur Kurir — Cargo" list={CARGO} picked={cargoCouriers} onClose={() => setPicker(null)} onSave={(v) => setSh({ cargo_couriers: v })} />}
    </div>
  );
}
