/** WhatsApp-style preview of a template message. */
export function WaBubble({ header, body, footer, buttons }: { header?: string | null; body: string; footer?: string | null; buttons?: string[] }) {
  return (
    <div className="rounded-xl bg-[#e7ddd3] p-3">
      <div className="max-w-[300px] rounded-lg rounded-tl-none bg-white p-2.5 text-[13px] text-slate-800 shadow-sm">
        {header && <p className="mb-1 font-semibold">{header}</p>}
        <p className="whitespace-pre-wrap break-words">{body || <span className="text-slate-400">Isi pesan…</span>}</p>
        {footer && <p className="mt-1 text-[11px] text-slate-400">{footer}</p>}
        <p className="mt-0.5 text-right text-[10px] text-slate-400">10.24</p>
      </div>
      {!!buttons?.length && (
        <div className="mt-1 max-w-[300px] space-y-1">{buttons.filter(Boolean).map((b, i) => <div key={i} className="rounded-lg bg-white py-1.5 text-center text-[13px] font-medium text-sky-600 shadow-sm">{b}</div>)}</div>
      )}
    </div>
  );
}
