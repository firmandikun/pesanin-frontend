"use client";
import { useEffect, useState } from "react";
import { api, fmtDate, Paginated } from "@/lib/api";
import { EmptyState, PageHead, Pager, Panel, SearchBox } from "@/components/kit";

export default function Chats() {
  const [q, setQ] = useState("");
  const [page, setPage] = useState(1);
  const [per, setPer] = useState(10);
  const [d, setD] = useState<Paginated<any> | null>(null);
  useEffect(() => { const t = setTimeout(() => api(`/rotator-chats?${new URLSearchParams({ search: q, page: String(page), per_page: String(per) })}`).then(setD), 200); return () => clearTimeout(t); }, [q, page, per]);
  return (
    <div className="space-y-5">
      <PageHead title="Chat List" />
      <Panel>
        <div className="p-4"><SearchBox value={q} onChange={setQ} placeholder="Search Chat ID" /></div>
        <table className="w-full text-sm">
          <thead><tr className="border-y border-slate-100 text-left text-[13px] text-slate-500"><th className="w-10 px-4 py-3"><input type="checkbox" /></th><th className="px-3 font-medium">WhatsApp Rotator</th><th className="px-3 font-medium">Staff</th><th className="px-3 font-medium">Chat ID</th><th className="px-3 font-medium">Date</th></tr></thead>
          <tbody>{d?.data.map((c) => (
            <tr key={c.id} className="border-b border-slate-100"><td className="px-4 py-3"><input type="checkbox" /></td><td className="px-3 font-medium text-slate-800">{c.rotator}</td><td className="px-3">{c.staff ?? "-"}</td><td className="px-3 font-mono">{c.chat_id}</td><td className="px-3 text-slate-600">{fmtDate(c.created_at)}</td></tr>
          ))}</tbody>
        </table>
        {d && !d.data.length && <EmptyState text="Belum ada data yang dibuat" />}
        <Pager page={page} last={d?.last_page ?? 1} onPage={setPage} total={d?.total} perPage={per} onPerPage={setPer} />
      </Panel>
    </div>
  );
}
