"use client";
import { useEffect, useState } from "react";
import { api, fmtDate, Paginated } from "@/lib/api";
import { Pagination } from "@/components/ui";

type Log = { id: number; action: string; description: string; ip_address: string; created_at: string };

export default function Activity() {
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(10);
  const [d, setD] = useState<Paginated<Log> | null>(null);
  useEffect(() => { api(`/activity-logs?page=${page}&per_page=${perPage}`).then(setD); }, [page, perPage]);

  return (
    <div className="max-w-4xl space-y-5">
      <h1 className="page-title">Log Aktivitas</h1>
      <div className="card overflow-x-auto">
        <table className="w-full">
          <thead className="border-b border-slate-200 bg-slate-50"><tr>{["Waktu", "Aksi", "Keterangan", "IP"].map((h) => <th key={h} className="th">{h}</th>)}</tr></thead>
          <tbody className="divide-y divide-slate-100">
            {d?.data.map((l) => (
              <tr key={l.id}><td className="td text-slate-500">{fmtDate(l.created_at)}</td><td className="td"><code className="text-xs">{l.action}</code></td><td className="td">{l.description}</td><td className="td text-slate-500">{l.ip_address}</td></tr>
            ))}
          </tbody>
        </table>
        {d && <Pagination page={d.current_page} last={d.last_page} onChange={setPage} total={d.total} perPage={perPage} onPerPage={setPerPage} />}
      </div>
    </div>
  );
}
