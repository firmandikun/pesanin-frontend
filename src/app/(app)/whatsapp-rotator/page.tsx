"use client";
import { Copy, Pencil, Trash2 } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { EmptyState, PageHead, Pager, Panel, PrimaryBtn, RangeButton, SearchBox, useRange } from "@/components/kit";
import { useRouter } from "next/navigation";
import { askConfirm } from "@/components/Dialogs";

export default function Rotators() {
  const router = useRouter();
  const [range, setRange] = useRange(183);
  const [q, setQ] = useState("");
  const [rows, setRows] = useState<any[] | null>(null);
  const [page, setPage] = useState(1);
  const [per, setPer] = useState(10);
  const load = () => api(`/rotator-stats?${new URLSearchParams(range)}`).then(setRows);
  useEffect(() => { load(); }, [range]); // eslint-disable-line react-hooks/exhaustive-deps
  const filtered = (rows ?? []).filter((r) => r.title.toLowerCase().includes(q.toLowerCase()));
  const shown = filtered.slice((page - 1) * per, page * per);

  return (
    <div className="space-y-5">
      <PageHead title="WhatsApp Rotator" />
      <Panel>
        <div className="flex flex-wrap items-center gap-3 p-4">
          <SearchBox value={q} onChange={setQ} placeholder="Cari WhatsApp Rotator" />
          <div className="ml-auto flex gap-2"><RangeButton value={range} onChange={setRange} /><PrimaryBtn onClick={() => router.push("/whatsapp-rotator/new")}>Add New WhatsApp Rotator</PrimaryBtn></div>
        </div>
        <table className="w-full text-sm">
          <thead><tr className="border-y border-slate-100 text-left text-[13px] text-slate-500"><th className="w-10 px-4 py-3"><input type="checkbox" /></th><th className="px-3 font-medium">WhatsApp Rotator</th><th className="px-3 font-medium">Unique Views (UV)</th><th className="px-3 font-medium">UV Hari Ini</th><th className="px-3 font-medium">Returning Views Hari Ini</th><th /></tr></thead>
          <tbody>{shown.map((r) => {
            const link = `${location.origin}/wa/${r.slug}`;
            return (
              <tr key={r.id} className="border-b border-slate-100">
                <td className="px-4 py-3"><input type="checkbox" /></td>
                <td className="px-3"><Link href={`/whatsapp-rotator/${r.id}`} className="font-medium text-slate-800 hover:text-brand-600">{r.title}</Link>
                  <div className="flex items-center gap-1 text-xs text-brand-600">/wa/{r.slug}<button onClick={() => navigator.clipboard?.writeText(link)} aria-label="Salin"><Copy size={12} /></button></div></td>
                <td className="px-3">{r.uv}</td><td className="px-3">{r.uv_today}</td><td className="px-3">{r.returning_today}</td>
                <td className="px-3 text-right"><span className="flex justify-end gap-3 text-slate-500">
                  <Link href={`/whatsapp-rotator/${r.id}`} aria-label="Edit"><Pencil size={15} /></Link>
                  <button onClick={async () => { if (await askConfirm(`Hapus ${r.title}?`)) { await api(`/r/rotators/${r.id}`, { method: "DELETE" }); load(); } }} className="hover:text-rose-600" aria-label="Hapus"><Trash2 size={15} /></button></span></td>
              </tr>
            );
          })}</tbody>
        </table>
        {rows && !filtered.length && <EmptyState text="WhatsApp Rotator masih kosong" />}
        <Pager page={page} last={Math.max(1, Math.ceil(filtered.length / per))} onPage={setPage} total={filtered.length} perPage={per} onPerPage={setPer} />
      </Panel>
    </div>
  );
}
