"use client";
import { ArrowUp, ChartLine, FileText, Globe, Search, UsersRound } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { api } from "@/lib/api";
import { AreaChart, CardTitle, EmptyState, Panel, RangeButton, useRange } from "@/components/kit";
import { Select } from "@/components/Select";

const dur = (s: number) => [Math.floor(s / 3600), Math.floor((s % 3600) / 60), Math.floor(s % 60)].map((n) => String(n).padStart(2, "0")).join(":");
const Growth = ({ v }: { v: number }) => <span className="ml-2 inline-flex items-center gap-0.5 rounded-full bg-[#3d7cf0] px-2 py-0.5 text-[11px] font-semibold text-white"><ArrowUp size={10} />{v >= 0 ? "+" : ""}{v}%</span>;

export default function LandingReports() {
  const [range, setRange] = useRange(6);
  const [pageId, setPageId] = useState("");
  const [d, setD] = useState<any>(null);
  const [tab, setTab] = useState<"referrers" | "urls">("referrers");
  const [q, setQ] = useState("");
  useEffect(() => { api(`/landing-reports?${new URLSearchParams({ ...range, ...(pageId ? { page_id: pageId } : {}) })}`).then(setD); }, [range, pageId]);
  const s = d?.sessions;
  const rows = useMemo(() => (d?.[tab] ?? []).filter((r: any) => String(r.label).toLowerCase().includes(q.toLowerCase())), [d, tab, q]);
  const tot = useMemo(() => {
    const r = d?.[tab] ?? [];
    const sum = (k: string) => r.reduce((a: number, x: any) => a + Number(x[k]), 0);
    const sess = sum("sessions");
    return { users: sum("users"), newUsers: sum("new_users"), sessions: sess, bounce: sess ? r.reduce((a: number, x: any) => a + x.bounce * x.sessions, 0) / sess : 0, avg: sess ? r.reduce((a: number, x: any) => a + x.avg_session * x.sessions, 0) / sess : 0 };
  }, [d, tab]);

  const tile = (label: string, v: number, tint: string, icon: string) => (
    <div className="flex items-center gap-3 rounded-xl bg-slate-50 px-4 py-4">
      <span className={`flex h-11 w-11 items-center justify-center rounded-full ${tint}`}><FileText size={20} /></span>
      <div><div className="text-xs text-slate-600">{label}</div><div className="text-xl font-bold text-slate-800">{v}</div></div>{icon}
    </div>
  );
  const metric = (label: string, value: React.ReactNode, g?: number) => (
    <div className="px-4 py-3"><div className="text-xs text-slate-600">{label}</div><div className="mt-1 flex items-center text-xl font-bold text-slate-800">{value}{g !== undefined && <Growth v={g} />}</div></div>
  );

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-[34px] font-bold text-slate-800">Statistics</h1>
        <div className="flex gap-2">
          <Select className="h-10 w-48 rounded-lg border border-brand-600 bg-white px-3 text-sm" value={pageId} onChange={(e) => setPageId(e.target.value)}>
            <option value="">All Pages</option>{d?.page_list.map((p: any) => <option key={p.id} value={p.id}>{p.title}</option>)}
          </Select>
          <RangeButton value={range} onChange={setRange} />
        </div>
      </div>

      <Panel>
        <CardTitle icon={FileText} title="Page Statistic" tint="orange" />
        <div className="grid gap-4 p-5 sm:grid-cols-2 lg:grid-cols-4">
          {tile("Total Pages", d?.pages.total ?? 0, "bg-brand-100 text-brand-600", "")}
          {tile("Pages on Draft", d?.pages.draft ?? 0, "bg-violet-100 text-violet-600", "")}
          {tile("Published Pages", d?.pages.published ?? 0, "bg-lime-100 text-lime-700", "")}
          {tile("Archived Pages", d?.pages.archived ?? 0, "bg-orange-100 text-orange-600", "")}
        </div>
      </Panel>

      <Panel>
        <CardTitle icon={UsersRound} title="Active Sessions" tint="pink" right={<Select className="h-10 rounded-lg border border-brand-600 px-3 text-sm"><option>All Active Sessions</option></Select>} />
        <div className="grid divide-slate-100 p-3 sm:grid-cols-2 lg:grid-cols-4 lg:divide-x">
          {metric("Session", s?.sessions ?? 0, s?.sessions_growth)}{metric("Users", s?.users ?? 0, s?.users_growth)}
          {metric("Page/Session", s?.page_per_session ?? 0)}{metric("Average Session Duration", dur(s?.avg_duration ?? 0))}
          {metric("Bounce Rate Click", s?.bounce_click ?? 0)}{metric("Bounce Rate Scroll", s?.bounce_scroll ?? 0)}{metric("% New Sessions", `${s?.new_sessions ?? 0}%`)}
        </div>
        <div className="px-5 pb-5"><AreaChart data={(d?.daily ?? []).map((x: any) => ({ label: x.date, value: x.sessions }))} /></div>
      </Panel>

      <Panel>
        <CardTitle icon={ChartLine} title="Statistic Overview" tint="violet" />
        <div className="grid divide-slate-100 p-3 md:grid-cols-3 md:divide-x">
          {([["Page Open", "sessions", "#3b82f6"], ["Page Visitors", "visitors", "#22d3ee"], ["Page Clicks", "clicks", "#c026d3"]] as const).map(([l, k, c]) => (
            <div key={k} className="px-3">
              {metric(l, d?.overview?.[k === "sessions" ? "opens" : k] ?? 0, k === "clicks" ? 0 : s?.[k === "sessions" ? "sessions_growth" : "users_growth"])}
              <AreaChart data={(d?.daily ?? []).map((x: any) => ({ label: x.date, value: x[k] }))} height={180} color={c} rotate />
            </div>
          ))}
        </div>
      </Panel>

      <Panel>
        <CardTitle icon={Globe} title={tab === "referrers" ? "Referring Domain" : "Referring URL"} tint="blue" right={
          <div className="flex items-center gap-2">
            <Select className="h-10 rounded-lg border border-slate-200 px-2 text-sm" value={tab} onChange={(e) => setTab(e.target.value as any)}><option value="referrers">Domain</option><option value="urls">URL</option></Select>
            <div className="relative"><Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" /><input className="h-10 w-60 rounded-lg border border-slate-200 pl-9 text-sm outline-none" placeholder="Search" value={q} onChange={(e) => setQ(e.target.value)} /></div>
          </div>} />
        <div className="grid gap-4 p-5 sm:grid-cols-3 lg:grid-cols-6">
          {[["Total Users", tot.users, "bg-pink-100"], ["Total New Users", tot.newUsers, "bg-brand-100"], ["Total Sessions", tot.sessions, "bg-cyan-100"],
            ["Avg. Bounce Rate", `${tot.bounce.toFixed(2)}%`, "bg-slate-100"], ["Avg. Page/Session", (s?.page_per_session ?? 0).toFixed(2), "bg-amber-50"], ["Total Avg. Session", dur(tot.avg), "bg-orange-100"]].map(([l, v, c]) => (
            <div key={l as string} className={`rounded-lg px-3 py-2.5 ${c}`}><div className="text-xl font-semibold text-slate-800">{v}</div><div className="text-xs text-slate-600">{l}</div></div>
          ))}
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead><tr className="border-y border-slate-100 text-left text-[13px] text-slate-600">{[tab === "referrers" ? "Domain" : "URL", "Users", "New Users", "Session", "Bounce Rate", "Page / Session", "Avg. Session"].map((h) => <th key={h} className="px-5 py-3 font-medium">{h}</th>)}</tr></thead>
            <tbody>{rows.map((r: any) => {
              const pct = (n: number, t: number) => <span className="text-slate-400"> ({t ? Math.round((n / t) * 100) : 0}%)</span>;
              return (
                <tr key={r.label} className="border-b border-slate-100">
                  <td className="max-w-xs truncate px-5 py-3">{r.label}</td><td className="px-5">{r.users}{pct(r.users, tot.users)}</td><td className="px-5">{r.new_users}{pct(Number(r.new_users), tot.newUsers)}</td>
                  <td className="px-5">{r.sessions}{pct(r.sessions, tot.sessions)}</td><td className="px-5 font-semibold">{Number(r.bounce).toFixed(2)}%</td><td className="px-5">1</td><td className="px-5">{dur(r.avg_session)}</td>
                </tr>
              );
            })}</tbody>
          </table>
          {d && !rows.length && <EmptyState text="Belum ada kunjungan" sub="Data muncul setelah landing page yang dipublikasikan dikunjungi." variant="chart" />}
        </div>
      </Panel>
    </div>
  );
}
