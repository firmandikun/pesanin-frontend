"use client";
import { AlertTriangle, ArrowRight, CalendarClock, CheckCircle2, FileText, Megaphone, Plug, Send, Users } from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { askConfirm } from "@/components/Dialogs";
import { WaBubble } from "@/components/inbox/WaBubble";
import { Dialog, EmptyState, FieldLabel, PageHead, Pager, Panel, PrimaryBtn, Toggle } from "@/components/kit";
import { Select } from "@/components/Select";
import { api, ApiError, Paginated } from "@/lib/api";
import { BROADCAST_STATUS, BroadcastRow, BroadcastStatus, CATEGORY, fillBody, QUALITY, RECIPIENT_STATUS, tierLabel, WaTemplate } from "@/lib/broadcast";
import { ChatLabel, showPhone } from "@/lib/inbox";

const fmt = (d: string | null) => (d ? new Date(d).toLocaleString("id-ID", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" }) : "–");
const num = (n: number | null | undefined) => (n == null ? "∞" : n.toLocaleString("id-ID"));

/** WhatsApp broadcast: send an approved template to many customers, paced and tracked. */
export default function BroadcastPage() {
  const [status, setStatus] = useState<BroadcastStatus | null>(null);
  const [templates, setTemplates] = useState<WaTemplate[] | null>(null);
  const [tab, setTab] = useState<"active" | "history">("active");
  const [page, setPage] = useState(1);
  const [list, setList] = useState<Paginated<BroadcastRow> | null>(null);
  const [create, setCreate] = useState(false);
  const [detail, setDetail] = useState<number | null>(null);

  const loadStatus = useCallback(() => {
    api<BroadcastStatus>("/broadcasts/status").then((s) => {
      setStatus(s);
      if (s.connected) api<{ data: WaTemplate[] }>("/whatsapp/templates").then((r) => setTemplates(r.data)).catch(() => setTemplates([]));
    });
  }, []);
  const loadList = useCallback(() => { api<Paginated<BroadcastRow>>(`/broadcasts?tab=${tab}&page=${page}`).then(setList); }, [tab, page]);
  useEffect(() => { loadStatus(); }, [loadStatus]);
  useEffect(() => { loadList(); }, [loadList]);
  useEffect(() => setPage(1), [tab]);
  // Live progress while something is sending or due.
  const live = list?.data.some((b) => b.status === "sending" || b.status === "scheduled");
  useEffect(() => { if (!live) return; const t = setInterval(loadList, 5000); return () => clearInterval(t); }, [live, loadList]);

  const approved = (templates ?? []).filter((t) => t.status === "APPROVED");
  const usable = approved.filter((t) => t.supported);
  const steps = [
    { n: 1, icon: Plug, title: "Hubungkan Nomor WhatsApp Resmi", text: "Nomor WhatsApp Business harus aktif di Cloud API Meta.", done: !!status?.connected, href: "/settings/integrations#whatsapp", cta: "Hubungkan Nomor" },
    { n: 2, icon: FileText, title: "Siapkan & Ajukan Template Meta", text: status?.connected ? `${approved.length} template disetujui.` : "Broadcast wajib memakai template yang disetujui Meta.", done: usable.length > 0, href: "/broadcast/templates", cta: "Buat Template" },
    { n: 3, icon: Users, title: "Siapkan Daftar Kontak / Label", text: status ? `${status.customers_with_phone} pelanggan punya nomor, ${status.opted_in} setuju promosi.` : "Kelompokkan pelanggan dengan label.", done: (status?.opted_in ?? 0) > 0, href: "/customers", cta: "Kelola Kontak" },
  ];
  const planPct = status?.plan.limit ? Math.min(100, (status.plan.used / status.plan.limit) * 100) : 0;
  const capPct = status?.capacity ? Math.min(100, (status.used_24h / status.capacity) * 100) : 0;

  return (
    <div className="space-y-5">
      <PageHead title="Broadcast" tutorial={false} crumbs={[["Chat", "/chat"], ["Broadcast"]]}>
        <Link href="/broadcast/templates" className="flex h-10 items-center gap-2 rounded-lg bg-white px-4 text-sm font-semibold text-navy"><FileText size={16} />Template</Link>
        <PrimaryBtn onClick={() => setCreate(true)} disabled={!status?.connected}>Buat Broadcast</PrimaryBtn>
      </PageHead>
      <p className="-mt-3 text-sm text-slate-500">Kirim pesan template WhatsApp ke banyak pelanggan sekaligus. Pesan dikirim bertahap agar nomor tetap aman.</p>

      {status && !status.connected && (
        <div className="flex flex-wrap items-start gap-3 rounded-xl border border-rose-200 bg-rose-50 p-4 text-rose-700">
          <AlertTriangle size={18} className="mt-0.5 shrink-0" />
          <div className="flex-1"><b className="block">WhatsApp Belum Terhubung</b><span className="text-sm">Hubungkan WhatsApp Business Account untuk mulai mengirim broadcast.</span></div>
          <Link href="/settings/integrations#whatsapp" className="flex h-9 items-center gap-2 rounded-lg bg-white px-3 text-sm font-semibold text-rose-700 ring-1 ring-rose-200"><Plug size={15} />Hubungkan WhatsApp</Link>
        </div>
      )}
      {status?.error && <p className="rounded-xl bg-amber-50 p-3 text-sm text-amber-800">{status.error}</p>}

      <Panel className="p-5">
        <h2 className="font-semibold text-slate-800">Panduan Prasyarat Kirim Pesan</h2>
        <p className="mt-0.5 text-sm text-slate-500">Selesaikan 3 langkah berikut sebelum mengirim broadcast:</p>
        <div className="mt-4 grid gap-3 md:grid-cols-3">
          {steps.map((s) => (
            <div key={s.n} className="flex flex-col gap-2 rounded-xl p-4 ring-1 ring-slate-100">
              <div className="flex items-center gap-2">
                {s.done ? <CheckCircle2 size={22} className="shrink-0 fill-emerald-100 text-emerald-600" /> : <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-slate-100 text-xs font-bold text-slate-600">{s.n}</span>}
                <s.icon size={15} className="text-slate-500" /><b className="text-sm text-slate-800">{s.title}</b>
              </div>
              <p className="flex-1 text-xs text-slate-500">{s.text}</p>
              <Link href={s.href} className="flex h-9 items-center justify-center gap-1.5 rounded-lg text-sm font-semibold text-slate-700 ring-1 ring-slate-200 hover:bg-slate-50">{s.cta}<ArrowRight size={14} /></Link>
            </div>
          ))}
        </div>
      </Panel>

      <div className="grid gap-4 md:grid-cols-2">
        <Panel className="space-y-3 p-5">
          <div className="flex items-center justify-between"><b className="text-sm text-slate-800">Batas Paket ({status?.plan.name ?? "…"})</b>
            <Link href="/settings/billing" className="flex items-center gap-1 text-xs font-semibold text-brand-600">Upgrade<ArrowRight size={13} /></Link></div>
          <p className="text-sm text-slate-600">Penerima broadcast bulan ini: <b className="text-slate-800">{num(status?.plan.used)}</b> / {num(status?.plan.limit)}</p>
          <div className="h-2 rounded-full bg-slate-100"><div className="h-2 rounded-full bg-brand-600" style={{ width: `${planPct}%` }} /></div>
        </Panel>
        <Panel className="space-y-3 p-5">
          <b className="text-sm text-slate-800">Status Nomor WhatsApp {status?.phone && <span className="font-normal text-slate-500">· {status.phone}</span>}</b>
          <p className="text-sm text-slate-600">Kapasitas kirim Meta: <b className="text-slate-800">{status?.tier ? `${tierLabel(status.tier)} / 24 jam` : "Belum tersedia"}</b> · Kualitas: <b className={QUALITY[status?.quality ?? ""]?.[1] ?? "text-slate-800"}>{QUALITY[status?.quality ?? ""]?.[0] ?? "N/A"}</b></p>
          <p className="text-sm text-slate-600">Terpakai 24 jam terakhir: <b className="text-slate-800">{num(status?.used_24h)}</b> / {status?.tier ? num(status.capacity) : "–"}</p>
          <div className="h-2 rounded-full bg-slate-100"><div className="h-2 rounded-full bg-emerald-500" style={{ width: `${capPct}%` }} /></div>
          <p className="text-xs text-slate-400">Pesanin mengirim bertahap dan berhenti otomatis sebelum batas Meta, lalu melanjutkan saat kuota tersedia lagi.</p>
        </Panel>
      </div>

      <Panel>
        <div className="flex gap-2 border-b border-slate-100 p-3">
          {([["active", "Aktif"], ["history", "Riwayat"]] as const).map(([id, label]) => (
            <button key={id} onClick={() => setTab(id)} className={`h-9 rounded-lg px-4 text-sm font-semibold ${tab === id ? "bg-navy text-white" : "text-slate-600 hover:bg-slate-100"}`}>{label}</button>
          ))}
        </div>
        {!list ? <p className="p-8 text-center text-sm text-slate-400">Memuat…</p> : !list.data.length ? (
          <EmptyState text={tab === "active" ? "Tidak ada broadcast yang berjalan" : "Belum ada riwayat broadcast"} sub={tab === "active" ? "Klik Buat Broadcast untuk mengirim promo ke pelanggan." : undefined} />
        ) : (
          <div className="overflow-x-auto"><table className="w-full text-sm">
            <thead><tr className="border-b border-slate-100 text-left text-[13px] text-slate-500">{["Broadcast", "Status", "Jadwal", "Progres", "Diterima", "Dibaca", "Gagal"].map((h) => <th key={h} className="whitespace-nowrap px-4 py-3 font-medium">{h}</th>)}</tr></thead>
            <tbody>{list.data.map((b) => {
              const [st, tone] = BROADCAST_STATUS[b.status];
              const pct = b.total ? Math.round(((b.total - b.queued) / b.total) * 100) : 0;
              return (
                <tr key={b.id} onClick={() => setDetail(b.id)} className="cursor-pointer border-b border-slate-50 hover:bg-slate-50/60">
                  <td className="px-4 py-3"><b className="block text-navy">{b.name}</b><span className="text-xs text-slate-400">{b.template_name} · {b.total} penerima{b.created_by && ` · oleh ${b.created_by}`}</span></td>
                  <td className="px-4 py-3"><span className={`rounded px-1.5 py-0.5 text-xs font-semibold ${tone}`}>{st}</span></td>
                  <td className="whitespace-nowrap px-4 py-3 text-slate-500">{fmt(b.scheduled_at)}</td>
                  <td className="min-w-36 px-4 py-3"><div className="h-1.5 rounded-full bg-slate-100"><div className="h-1.5 rounded-full bg-brand-600" style={{ width: `${pct}%` }} /></div><span className="text-xs text-slate-500">{b.sent} terkirim · {pct}%</span></td>
                  <td className="px-4 py-3 text-slate-700">{b.delivered}</td>
                  <td className="px-4 py-3 text-slate-700">{b.read}</td>
                  <td className={`px-4 py-3 ${b.failed ? "text-rose-600" : "text-slate-400"}`}>{b.failed}</td>
                </tr>
              );
            })}</tbody>
          </table></div>
        )}
        {list && <Pager page={page} last={list.last_page} onPage={setPage} total={list.total} perPage={10} />}
      </Panel>

      {create && status && <CreateBroadcast status={status} templates={usable} onClose={() => setCreate(false)} onCreated={(id) => { setCreate(false); setTab("active"); loadList(); loadStatus(); setDetail(id); }} />}
      {detail && <Detail id={detail} onClose={() => { setDetail(null); loadList(); }} />}
    </div>
  );
}

function CreateBroadcast({ status, templates, onClose, onCreated }: { status: BroadcastStatus; templates: WaTemplate[]; onClose: () => void; onCreated: (id: number) => void }) {
  const [name, setName] = useState("");
  const [tplKey, setTplKey] = useState(templates[0] ? `${templates[0].name}|${templates[0].language}` : "");
  const tpl = templates.find((t) => `${t.name}|${t.language}` === tplKey);
  const [vars, setVars] = useState<{ mode: "text" | "name"; value: string }[]>([]);
  const [source, setSource] = useState<"customers" | "manual">("customers");
  const [label, setLabel] = useState("");
  const [optIn, setOptIn] = useState(true);
  const [numbers, setNumbers] = useState("");
  const [later, setLater] = useState(false);
  const [at, setAt] = useState("");
  const [labels, setLabels] = useState<ChatLabel[]>([]);
  const [count, setCount] = useState<number | null>(null);
  const [err, setErr] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => { api<{ data: ChatLabel[] }>("/chat-labels").then((r) => setLabels(r.data)).catch(() => {}); }, []);
  // One input per {{n}}; the first one defaults to the customer's name.
  useEffect(() => { setVars(Array.from({ length: tpl?.variables ?? 0 }, (_, i) => (i === 0 ? { mode: "name", value: "Kak" } : { mode: "text", value: "" }))); }, [tplKey]); // eslint-disable-line react-hooks/exhaustive-deps
  const audience = useMemo(() => (source === "customers" ? { source, label: label || null, opt_in_only: optIn } : { source, numbers }), [source, label, optIn, numbers]);
  useEffect(() => {
    if (source === "manual" && !numbers.trim()) { setCount(0); return; }
    const t = setTimeout(() => api<{ count: number }>("/broadcasts/preview", { method: "POST", json: { audience } }).then((r) => setCount(r.count)).catch(() => setCount(null)), 300);
    return () => clearTimeout(t);
  }, [audience, source, numbers]);

  const preview = tpl ? fillBody(tpl.body, vars.map((v) => (v.mode === "name" ? "Rina" : v.value))) : "";
  const remaining = status.plan.limit == null ? null : Math.max(0, status.plan.limit - status.plan.used);
  const over = remaining != null && (count ?? 0) > remaining;
  const submit = async () => {
    setSaving(true); setErr("");
    try {
      const r = await api<{ broadcast: BroadcastRow }>("/broadcasts", { method: "POST", json: {
        name, template: { name: tpl!.name, language: tpl!.language }, variables: vars, audience,
        scheduled_at: later && at ? new Date(at).toISOString() : null,
      } });
      onCreated(r.broadcast.id);
    } catch (e) { setErr(e instanceof ApiError ? Object.values(e.errors)[0]?.[0] ?? e.message : "Gagal membuat broadcast"); } finally { setSaving(false); }
  };

  return (
    <Dialog title="Buat Broadcast" icon={Megaphone} onClose={onClose} width="max-w-4xl">
      {!templates.length ? (
        <div className="space-y-3 text-sm text-slate-600"><p>Belum ada template yang disetujui Meta dan bisa dipakai broadcast.</p>
          <Link href="/broadcast/templates" className="inline-flex h-10 items-center gap-2 rounded-lg bg-brand-600 px-4 font-semibold text-white"><FileText size={15} />Buat Template</Link></div>
      ) : (
        <form onSubmit={(e) => { e.preventDefault(); submit(); }} className="grid gap-6 md:grid-cols-[1fr_300px]">
          <div className="space-y-5">
            <div><FieldLabel>Nama broadcast</FieldLabel><input className="input" required maxLength={120} placeholder="Promo akhir bulan" value={name} onChange={(e) => setName(e.target.value)} /></div>
            <div><FieldLabel>Template</FieldLabel>
              <Select className="input" value={tplKey} onChange={(e) => setTplKey(e.target.value)}>
                {templates.map((t) => <option key={`${t.name}|${t.language}`} value={`${t.name}|${t.language}`}>{t.name} ({t.language} · {CATEGORY[t.category ?? ""] ?? t.category})</option>)}
              </Select></div>
            {vars.length > 0 && (
              <div className="space-y-2 rounded-lg bg-slate-50 p-3"><p className="text-xs font-semibold text-slate-600">Isi variabel</p>
                {vars.map((v, i) => (
                  <div key={i} className="flex flex-wrap items-center gap-2">
                    <span className="w-10 font-mono text-xs text-slate-500">{`{{${i + 1}}}`}</span>
                    <Select className="input h-9 w-44 bg-white text-sm" value={v.mode} onChange={(e) => setVars(vars.map((x, j) => (j === i ? { ...x, mode: e.target.value as "text" | "name" } : x)))}>
                      <option value="name">Nama pelanggan</option><option value="text">Teks sama untuk semua</option></Select>
                    <input className="input h-9 min-w-40 flex-1 bg-white text-sm" required={v.mode === "text"} placeholder={v.mode === "name" ? "Jika nama kosong, mis. Kak" : "mis. 20%"} value={v.value} onChange={(e) => setVars(vars.map((x, j) => (j === i ? { ...x, value: e.target.value } : x)))} />
                  </div>
                ))}
              </div>
            )}
            <div>
              <FieldLabel>Penerima</FieldLabel>
              <div className="mb-3 flex gap-2">
                {([["customers", "Dari daftar pelanggan"], ["manual", "Tempel nomor"]] as const).map(([id, l]) => (
                  <button key={id} type="button" onClick={() => setSource(id)} className={`h-9 flex-1 rounded-lg text-sm font-semibold ${source === id ? "bg-navy text-white" : "bg-slate-100 text-slate-600"}`}>{l}</button>
                ))}
              </div>
              {source === "customers" ? (
                <div className="space-y-3">
                  <Select className="input" value={label} onChange={(e) => setLabel(e.target.value)}><option value="">Semua pelanggan</option>{labels.map((l) => <option key={l.id} value={l.name}>Label: {l.name}</option>)}</Select>
                  <label className="flex items-center justify-between gap-3 text-sm"><span><b className="block text-slate-700">Hanya yang setuju menerima promosi</b><span className="text-xs text-slate-500">Disarankan. Mengirim promo ke yang tidak setuju bisa menurunkan kualitas nomor.</span></span><Toggle checked={optIn} onChange={setOptIn} /></label>
                </div>
              ) : (
                <><textarea className="input min-h-28 py-2 font-mono text-sm" placeholder={"081234567890, Rina\n6281298765432\n…"} value={numbers} onChange={(e) => setNumbers(e.target.value)} />
                  <p className="mt-1 text-xs text-slate-500">Satu nomor per baris, boleh diikuti koma dan nama. Nomor ganda otomatis dibuang.</p></>
              )}
              <p className={`mt-2 text-sm ${over ? "text-rose-600" : "text-slate-600"}`}><b>{count ?? "…"}</b> penerima{remaining != null && ` · sisa kuota bulan ini ${remaining.toLocaleString("id-ID")}`}{over && " (melebihi kuota)"}</p>
            </div>
            <div className="space-y-2">
              <label className="flex items-center justify-between text-sm font-medium text-slate-700"><span className="flex items-center gap-1.5"><CalendarClock size={15} />Jadwalkan nanti</span><Toggle checked={later} onChange={setLater} /></label>
              {later && <input type="datetime-local" className="input" required value={at} min={new Date(Date.now() + 5 * 60000).toISOString().slice(0, 16)} onChange={(e) => setAt(e.target.value)} />}
            </div>
            {err && <p className="rounded-lg bg-rose-50 p-2 text-sm text-rose-700">{err}</p>}
          </div>
          <div className="space-y-3">
            <p className="text-sm font-medium text-slate-700">Pratinjau</p>
            {tpl && <WaBubble header={tpl.header} body={preview} footer={tpl.footer} buttons={tpl.buttons} />}
            <p className="text-xs text-slate-400">Biaya pesan template ditagih Meta langsung ke akun WhatsApp Business-mu, bukan oleh Pesanin.</p>
            <button disabled={saving || !count || over || !tpl} className="flex h-11 w-full items-center justify-center gap-2 rounded-lg bg-brand-600 text-sm font-semibold text-white disabled:opacity-50">
              <Send size={15} />{saving ? "Menyimpan…" : later ? `Jadwalkan ke ${count ?? 0} penerima` : `Kirim ke ${count ?? 0} penerima`}</button>
          </div>
        </form>
      )}
    </Dialog>
  );
}

function Detail({ id, onClose }: { id: number; onClose: () => void }) {
  const [data, setData] = useState<{ broadcast: BroadcastRow; recipients: Paginated<{ id: number; name: string | null; phone: string; status: string; error: string | null; sent_at: string | null }> } | null>(null);
  const [filter, setFilter] = useState("");
  const [page, setPage] = useState(1);
  const load = useCallback(() => { api(`/broadcasts/${id}?page=${page}${filter ? `&status=${filter}` : ""}`).then(setData); }, [id, page, filter]);
  useEffect(() => { load(); }, [load]);
  const b = data?.broadcast;
  useEffect(() => { if (b?.status !== "sending" && b?.status !== "scheduled") return; const t = setInterval(load, 4000); return () => clearInterval(t); }, [b?.status, load]);
  const cancel = async () => { if (await askConfirm("Batalkan broadcast ini? Pesan yang belum terkirim tidak akan dikirim.")) { await api(`/broadcasts/${id}/cancel`, { method: "POST" }); load(); } };

  return (
    <Dialog title={b?.name ?? "Broadcast"} icon={Megaphone} onClose={onClose} width="max-w-3xl">
      {!b ? <p className="py-6 text-center text-sm text-slate-400">Memuat…</p> : (
        <div className="space-y-4">
          <div className="flex flex-wrap items-center gap-2 text-sm text-slate-500">
            <span className={`rounded px-1.5 py-0.5 text-xs font-semibold ${BROADCAST_STATUS[b.status][1]}`}>{BROADCAST_STATUS[b.status][0]}</span>
            <span>{b.template_name}</span><span>· jadwal {fmt(b.scheduled_at)}</span>{b.finished_at && <span>· selesai {fmt(b.finished_at)}</span>}
            {(b.status === "scheduled" || b.status === "sending") && <button onClick={cancel} className="ml-auto h-8 rounded-lg px-3 text-xs font-semibold text-rose-600 ring-1 ring-rose-200 hover:bg-rose-50">Batalkan</button>}
          </div>
          <div className="grid grid-cols-3 gap-2 text-center sm:grid-cols-5">
            {([["", "Total", b.total], ["sent", "Terkirim", b.sent], ["delivered", "Diterima", b.delivered], ["read", "Dibaca", b.read], ["failed", "Gagal", b.failed]] as const).map(([k, l, v]) => (
              <button key={l} onClick={() => { setFilter(k); setPage(1); }} className={`rounded-lg p-2 ${filter === k ? "bg-navy text-white" : "bg-slate-50"}`}><div className={`text-xs ${filter === k ? "text-white/70" : "text-slate-500"}`}>{l}</div><b className="text-lg">{v}</b></button>
            ))}
          </div>
          <div className="overflow-x-auto rounded-lg ring-1 ring-slate-100"><table className="w-full text-sm">
            <thead><tr className="border-b border-slate-100 text-left text-xs text-slate-500"><th className="px-3 py-2 font-medium">Penerima</th><th className="px-3 py-2 font-medium">Status</th><th className="px-3 py-2 font-medium">Waktu kirim</th></tr></thead>
            <tbody>{data!.recipients.data.map((r) => (
              <tr key={r.id} className="border-b border-slate-50 align-top">
                <td className="px-3 py-2"><b className="block text-slate-700">{r.name ?? "–"}</b><span className="text-xs text-slate-400">{showPhone(r.phone)}</span></td>
                <td className="px-3 py-2"><span className={`text-xs font-semibold ${RECIPIENT_STATUS[r.status]?.[1] ?? ""}`}>{RECIPIENT_STATUS[r.status]?.[0] ?? r.status}</span>{r.error && <span className="block text-xs text-rose-500">{r.error}</span>}</td>
                <td className="whitespace-nowrap px-3 py-2 text-xs text-slate-500">{fmt(r.sent_at)}</td>
              </tr>
            ))}</tbody>
          </table>
            {!data!.recipients.data.length && <p className="p-4 text-center text-xs text-slate-400">Tidak ada penerima dengan status ini.</p>}
          </div>
          <Pager page={page} last={data!.recipients.last_page} onPage={setPage} total={data!.recipients.total} perPage={20} />
        </div>
      )}
    </Dialog>
  );
}
