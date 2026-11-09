"use client";
import { BadgeCheck, Edit3, Eye, Film, GripVertical, ImageIcon, LayoutList, MessageCircle, PanelBottom, Palette, PenLine, Receipt, Search, SquareCheck, Type } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { useState } from "react";
import { Pixel, Product, SuccessSettings } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { SUCCESS_COMPONENTS, successComp, successOrder } from "@/lib/successPage";
import { Modal } from "@/components/ui";
import { ChoiceCard, EdCard, Label, Switch, SwitchRow } from "./parts";
import { PLATFORMS } from "./Step2";
import { Select } from "@/components/Select";

const ICONS: Record<string, LucideIcon> = {
  icon: BadgeCheck, judul: PenLine, title: PenLine, header: PenLine, total: SquareCheck, subtitle: PenLine,
  chat: MessageCircle, image: ImageIcon, video: Film, footer: PanelBottom, other: PenLine,
};
const COLORS = ["#ffffff", "#fff1f2", "#f0f9ff", "#f0fdf4", "#fff5ed", "#f1f5f9", "#f0fdfa"];
const METHOD_LABEL: Record<string, string> = { bank_transfer: "Bank Transfer", cod: "COD", epayment: "E-Payment" };

export function Step3({ p, setSs, method, setMethod, onLocate }: {
  p: Partial<Product>; setSs: (patch: Partial<SuccessSettings>) => void; method: string; setMethod: (m: string) => void; onLocate: (k: string) => void;
}) {
  const { user } = useAuth();
  const ss = p.success_settings ?? {};
  const [editing, setEditing] = useState<string | null>(null);
  const [drag, setDrag] = useState<number | null>(null);
  const [pxTab, setPxTab] = useState<Pixel["platform"]>("facebook");
  const methods = ["bank_transfer", "cod", "epayment"];
  const order = successOrder(ss, method);
  const setComp = (key: string, patch: Record<string, any>) =>
    setSs({ components: { ...ss.components, [method]: { ...ss.components?.[method], [key]: { ...ss.components?.[method]?.[key], ...patch } } } });
  const pixels = ss.pixels ?? [];
  const events = PLATFORMS.find((x) => x[0] === pxTab)![2];
  const action = ss.action ?? "page";

  return (
    <div className="space-y-4">
      <h1 className="text-[28px] font-bold text-slate-800">Atur Halaman Sukses Kamu</h1>

      <EdCard icon={Palette} tint="blue" title="Desain Halaman Sukses">
        <div className="rounded-lg bg-slate-50 p-4">
          <div className="mb-3 text-xs font-semibold text-slate-700">Pilih warna latar belakang</div>
          <div className="flex flex-wrap items-center gap-3 rounded-lg bg-white p-3">
            {COLORS.map((col) => (
              <button key={col} type="button" onClick={() => setSs({ background: col })} aria-label={col}
                className={`h-8 w-8 rounded-full border ${(ss.background ?? "#ffffff") === col ? "ring-2 ring-brand-600 ring-offset-2" : "border-slate-200"}`} style={{ background: col }} />
            ))}
            <label className="relative h-8 w-8 cursor-pointer overflow-hidden rounded-full" style={{ background: "conic-gradient(red, yellow, lime, aqua, blue, magenta, red)" }}>
              <input type="color" className="absolute inset-0 opacity-0" value={ss.background ?? "#ffffff"} onChange={(e) => setSs({ background: e.target.value })} />
            </label>
          </div>
        </div>
      </EdCard>

      <EdCard icon={LayoutList} tint="violet" title="Header">
        <div className="text-sm font-semibold text-slate-800">Judul dan Tagline</div>
        <SwitchRow boxed icon={Type} iconCls="text-orange-500" title="Tampilkan judul dibagian atas kanvas" checked={!!ss.title?.enabled} onChange={(v) => setSs({ title: { ...ss.title, enabled: v } })} />
        {ss.title?.enabled && <input className="input" placeholder="Judul" value={ss.title.text ?? ""} onChange={(e) => setSs({ title: { ...ss.title, text: e.target.value } })} />}
        <SwitchRow boxed icon={Type} iconCls="text-orange-500" title="Tampilkan tagline dibagian atas kanvas" checked={!!ss.tagline?.enabled} onChange={(v) => setSs({ tagline: { ...ss.tagline, enabled: v } })} />
        {ss.tagline?.enabled && <input className="input" placeholder="Tagline" value={ss.tagline.text ?? ""} onChange={(e) => setSs({ tagline: { ...ss.tagline, text: e.target.value } })} />}
      </EdCard>

      <EdCard icon={LayoutList} tint="violet" title="Komponen Halaman Sukses">
        <div className="grid grid-cols-3 gap-3">
          {methods.map((m) => {
            const available = (p.payment_methods ?? []).includes(m);
            return (
              <div key={m} className={available ? "" : "pointer-events-none opacity-40"}>
                <ChoiceCard active={method === m} label={METHOD_LABEL[m]} onClick={() => setMethod(m)} />
              </div>
            );
          })}
        </div>
        <div className="space-y-2">
          {order.map((key, i) => {
            const meta = SUCCESS_COMPONENTS.find((c) => c.key === key)!;
            const Icon = ICONS[key];
            const c = successComp(ss, method, key, p);
            return (
              <div key={key} draggable onDragStart={() => setDrag(i)} onDragOver={(e) => e.preventDefault()}
                onDrop={() => { if (drag === null || drag === i) return; const n = [...order]; const [x] = n.splice(drag, 1); n.splice(i, 0, x); setSs({ order: { ...ss.order, [method]: n } }); setDrag(null); }}
                className="flex items-center gap-3 rounded-lg bg-slate-50 px-4 py-3.5">
                <GripVertical size={17} className="cursor-grab text-slate-400" />
                <Icon size={17} className="text-blue-600" />
                <span className="flex-1 text-sm font-semibold text-slate-800">{meta.label}</span>
                {meta.edit && <button type="button" onClick={() => setEditing(key)} className="text-sm font-medium text-brand-600 hover:underline">Edit</button>}
                <Switch checked={c.enabled} onChange={(v) => setComp(key, { enabled: v })} />
                <button type="button" disabled={!c.enabled} onClick={() => onLocate(key)} className="text-slate-500 disabled:text-slate-300" aria-label="Lihat"><Search size={17} /></button>
              </div>
            );
          })}
        </div>
        <button type="button" onClick={() => setSs({ components: { ...ss.components, [method]: {} }, order: { ...ss.order, [method]: [] } })} className="w-full rounded-lg bg-slate-50 py-2 text-sm text-slate-600">Reset</button>
      </EdCard>

      <EdCard icon={Eye} tint="blue" title="Ketika Sudah Selesai Isi Formulir">
        <div className="grid grid-cols-2 gap-y-3 text-sm text-slate-700">
          {([["page", "Tampilkan halaman sukses"], ["whatsapp_random", "Alihkan ke whatsApp (random)"], ["url", "Alihkan ke URL lain"], ["whatsapp", "Alihkan ke whatsApp (nomor CS)"]] as const).map(([k, l]) => (
            <label key={k} className="flex items-center gap-2"><input type="radio" className="h-4 w-4 accent-brand-600" checked={action === k} onChange={() => setSs({ action: k })} />{l}</label>
          ))}
        </div>
        {action === "whatsapp" && <div><Label>Nomor WhatsApp CS</Label><input className="input" placeholder={user?.whatsapp ?? "08…"} value={ss.whatsapp ?? ""} onChange={(e) => setSs({ whatsapp: e.target.value })} /></div>}
        {action === "whatsapp_random" && <p className="text-xs text-slate-500">Nomor diambil acak dari WA Rotator (segera hadir). Sementara memakai nomor WhatsApp toko.</p>}
        {action === "url" && <div><Label>URL Tujuan</Label><input className="input" placeholder="https://" value={ss.redirect_url ?? ""} onChange={(e) => setSs({ redirect_url: e.target.value })} /></div>}
      </EdCard>

      <section className="rounded-xl border border-slate-200 bg-white p-4">
        <div className="flex overflow-x-auto border-b border-slate-200 text-sm">
          {PLATFORMS.map(([k, label]) => (
            <button key={k} type="button" onClick={() => setPxTab(k)} className={`whitespace-nowrap border-b-[3px] px-4 py-2.5 ${pxTab === k ? "border-brand-600 font-semibold text-brand-700" : "border-transparent text-slate-600"}`}>{label}</button>
          ))}
        </div>
        <div className="mt-4 space-y-3">
          {pixels.map((px, i) => ({ px, i })).filter(({ px }) => px.platform === pxTab).map(({ px, i }) => (
            <div key={i} className="space-y-3 rounded-lg border border-slate-200 p-4">
              <div className="grid grid-cols-2 gap-2">
                <div><Label>Pixel ID</Label><input className="input" placeholder="Input or Select Pixel ID" value={px.id} onChange={(e) => setSs({ pixels: pixels.map((x, j) => (j === i ? { ...x, id: e.target.value.trim() } : x)) })} /></div>
                <div><Label>Pixel Name</Label><input className="input" placeholder="Pixel Name" value={px.name ?? ""} onChange={(e) => setSs({ pixels: pixels.map((x, j) => (j === i ? { ...x, name: e.target.value } : x)) })} /></div>
              </div>
              <div><Label>Pixel Event</Label>
                <Select className="input" value={px.event ?? ""} onChange={(e) => setSs({ pixels: pixels.map((x, j) => (j === i ? { ...x, event: e.target.value } : x)) })}>
                  <option value="">Input or Select Pixel Event</option>{events.map((x) => <option key={x}>{x}</option>)}
                </Select>
              </div>
              <div className="flex justify-between text-xs"><span className="text-slate-600">conversion count: <b className="text-brand-600">Global Settings</b></span>
                <button type="button" className="font-semibold text-rose-600" onClick={() => setSs({ pixels: pixels.filter((_, j) => j !== i) })}>Delete</button></div>
            </div>
          ))}
          <button type="button" onClick={() => setSs({ pixels: [...pixels, { platform: pxTab, id: "", event: events[events.length - 1] }] })} className="w-full rounded-lg border border-brand-600 py-2 text-sm font-medium text-brand-700">Add More Pixel</button>
        </div>
      </section>

      <Modal open={!!editing} onClose={() => setEditing(null)} title={`Edit ${SUCCESS_COMPONENTS.find((c) => c.key === editing)?.label ?? ""}`} icon={Edit3}>
        {editing && (() => {
          const meta = SUCCESS_COMPONENTS.find((c) => c.key === editing)!;
          const c = successComp(ss, method, editing, p);
          return (
            <div className="space-y-3">
              {meta.edit === "text" ? (
                <div><Label>Teks ({METHOD_LABEL[method]})</Label><textarea className="textarea" rows={3} value={ss.components?.[method]?.[editing]?.text ?? c.text} onChange={(e) => setComp(editing, { text: e.target.value })} />
                  <p className="mt-1 text-xs text-slate-500">Gunakan {"{produk}"} untuk nama produk.</p></div>
              ) : (
                <div><Label>{editing === "video" ? "Link YouTube / Vimeo" : "URL Gambar"}</Label><input className="input" value={c.url ?? ""} onChange={(e) => setComp(editing, { url: e.target.value, enabled: true })} /></div>
              )}
              <button type="button" className="btn-primary w-full" onClick={() => setEditing(null)}>Selesai</button>
            </div>
          );
        })()}
      </Modal>
    </div>
  );
}
