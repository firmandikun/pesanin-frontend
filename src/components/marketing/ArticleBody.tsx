/**
 * Renders a blog body written in the editor's simple format, one block per line:
 * "## " heading, "### " subheading, "- " list item, "> " quote, "![alt](url)" image,
 * plus inline **bold** and [text](https://link). Everything else is a paragraph.
 */
function inline(text: string, key: string): React.ReactNode[] {
  const out: React.ReactNode[] = [];
  const re = /\*\*(.+?)\*\*|\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g;
  let last = 0;
  let m: RegExpExecArray | null;
  let i = 0;
  while ((m = re.exec(text))) {
    if (m.index > last) out.push(text.slice(last, m.index));
    out.push(m[1] !== undefined
      ? <strong key={`${key}-${i++}`} className="font-bold text-navy">{m[1]}</strong>
      : <a key={`${key}-${i++}`} href={m[3]} target="_blank" rel="noopener noreferrer" className="font-semibold text-brand-600 underline underline-offset-2">{m[2]}</a>);
    last = m.index + m[0].length;
  }
  if (last < text.length) out.push(text.slice(last));
  return out;
}

export function ArticleBody({ lines }: { lines: string[] }) {
  return (
    <div className="space-y-4 text-[17px] leading-relaxed text-slate-700">
      {lines.map((raw, i) => {
        const b = raw.trim();
        if (!b) return null;
        const img = b.match(/^!\[([^\]]*)\]\((https?:\/\/[^\s)]+)\)$/);
        if (img) return (
          <figure key={i} className="py-2">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={img[2]} alt={img[1]} className="w-full rounded-2xl border border-slate-100" />
            {img[1] && <figcaption className="mt-2 text-center text-sm text-slate-500">{img[1]}</figcaption>}
          </figure>
        );
        if (b.startsWith("### ")) return <h3 key={i} className="pt-2 text-xl font-extrabold text-navy">{inline(b.slice(4), `h${i}`)}</h3>;
        if (b.startsWith("## ")) return <h2 key={i} className="pt-4 text-2xl font-extrabold text-navy">{inline(b.slice(3), `h${i}`)}</h2>;
        if (b.startsWith("> ")) return <blockquote key={i} className="rounded-r-xl border-l-4 border-brand-400 bg-brand-50/60 px-5 py-3 italic text-slate-700">{inline(b.slice(2), `q${i}`)}</blockquote>;
        if (b.startsWith("- ")) return <p key={i} className="flex gap-3 pl-1"><span className="mt-2.5 h-1.5 w-1.5 shrink-0 rounded-full bg-brand-500" /><span>{inline(b.slice(2), `l${i}`)}</span></p>;
        return <p key={i}>{inline(b, `p${i}`)}</p>;
      })}
    </div>
  );
}
