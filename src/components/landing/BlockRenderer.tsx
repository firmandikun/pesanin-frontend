"use client";
import { CheckCircle2, ChevronDown, ImageIcon, MessageCircle, Quote, ShoppingCart, Star, Video } from "lucide-react";
import { useEffect, useState } from "react";
import { rupiah } from "@/lib/api";
import { Block, embedUrl } from "@/lib/landing";
import { CheckoutForm } from "@/components/CheckoutForm";

export type CheckoutData = Record<string, { product: any; payment_methods: string[]; store: any; fields?: any; bump_items?: any[]; custom_fields?: any[]; sold?: number | null }>;

const waLink = (number: string, message: string) => {
  const d = (number || "").replace(/\D/g, "");
  return `https://wa.me/${d.startsWith("0") ? "62" + d.slice(1) : d}?text=${encodeURIComponent(message || "")}`;
};

function Placeholder({ icon: Icon, text }: { icon: typeof ImageIcon; text: string }) {
  return (
    <div className="flex aspect-video flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-slate-200 bg-slate-50 text-sm text-slate-400">
      <Icon size={28} />{text}
    </div>
  );
}

function Countdown({ until, label, color }: { until: string; label: string; color: string }) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => { const t = setInterval(() => setNow(Date.now()), 1000); return () => clearInterval(t); }, []);
  const left = Math.max(0, new Date(until).getTime() - now);
  const parts = [Math.floor(left / 864e5), Math.floor((left % 864e5) / 36e5), Math.floor((left % 36e5) / 6e4), Math.floor((left % 6e4) / 1e3)];
  return (
    <div className="text-center">
      <p className="mb-3 text-sm font-semibold text-slate-600">{label}</p>
      <div className="flex justify-center gap-2">
        {parts.map((n, i) => (
          <div key={i} className="w-16 rounded-xl py-2 text-white" style={{ background: color }}>
            <div className="text-2xl font-extrabold tabular-nums">{String(n).padStart(2, "0")}</div>
            <div className="text-[10px] uppercase opacity-80">{["Hari", "Jam", "Menit", "Detik"][i]}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

function Slider({ images }: { images: string[] }) {
  const [i, setI] = useState(0);
  useEffect(() => {
    if (images.length < 2) return;
    const t = setInterval(() => setI((x) => (x + 1) % images.length), 3500);
    return () => clearInterval(t);
  }, [images.length]);
  if (!images.length) return <Placeholder icon={ImageIcon} text="Tambahkan gambar slide" />;
  return (
    <div>
      <div className="overflow-hidden rounded-2xl"><img src={images[i]} alt="" className="w-full object-cover" /></div>
      <div className="mt-2 flex justify-center gap-1.5">
        {images.map((_, j) => <button key={j} onClick={() => setI(j)} className={`h-1.5 rounded-full transition-all ${j === i ? "w-6 bg-slate-700" : "w-1.5 bg-slate-300"}`} aria-label={`Slide ${j + 1}`} />)}
      </div>
    </div>
  );
}

/** Responsive visibility classes for the public page (mobile < 768 ≤ tablet < 1024 ≤ desktop). */
export function visibilityClass(d: Record<string, any>) {
  return [d.hide_mobile && "max-md:hidden", d.hide_tablet && "md:max-lg:hidden", d.hide_desktop && "lg:hidden"].filter(Boolean).join(" ");
}

export function BlockView({ block, color, checkout, preview, whatsapp }: {
  block: Block; color: string; checkout: CheckoutData; preview?: boolean; whatsapp?: string;
}) {
  const d = block.data;
  // Empty media/config placeholders only make sense inside the builder.
  const empty = (node: React.ReactNode) => (preview ? node : null);
  const align = d.align === "left" ? "text-left" : d.align === "right" ? "text-right" : "text-center";

  switch (block.type) {
    case "announcement":
      return <div className="rounded-xl px-4 py-2.5 text-center text-sm font-bold tracking-wide text-white" style={{ background: color }}>{d.text}</div>;
    case "headline":
      return <h1 className={`${align} font-extrabold leading-tight tracking-tight text-ink ${d.size === "lg" ? "text-2xl md:text-3xl" : "text-3xl md:text-4xl"}`}>{d.text}</h1>;
    case "subheadline":
      return <p className={`${align} text-lg text-slate-600`}>{d.text}</p>;
    case "text":
      return <div className="whitespace-pre-line leading-relaxed text-slate-700">{d.content}</div>;
    case "image":
      return d.url ? <img src={d.url} alt={d.alt ?? ""} className="w-full rounded-2xl" /> : empty(<Placeholder icon={ImageIcon} text="Tambahkan URL / unggah gambar" />);
    case "slider":
      return d.images?.length ? <Slider images={d.images} /> : empty(<Placeholder icon={ImageIcon} text="Tambahkan gambar slide" />);
    case "video": {
      const src = d.url ? embedUrl(d.url) : null;
      return src
        ? <div className="aspect-video overflow-hidden rounded-2xl"><iframe src={src} className="h-full w-full" allowFullScreen title="video" /></div>
        : empty(<Placeholder icon={Video} text="Masukkan link YouTube / Vimeo" />);
    }
    case "button":
      return (
        <div className="text-center">
          <a href={d.url || "#"} className="inline-flex h-12 items-center rounded-xl px-8 font-bold text-white shadow-lg transition hover:brightness-110" style={{ background: color }}>{d.label}</a>
        </div>
      );
    case "whatsapp":
      return (
        <div className="text-center">
          <a href={waLink(d.number || whatsapp || "", d.message)} target="_blank" className="inline-flex h-12 items-center gap-2 rounded-xl bg-[#25D366] px-8 font-bold text-white shadow-lg shadow-green-500/20 transition hover:brightness-105">
            <MessageCircle size={20} />{d.label}
          </a>
        </div>
      );
    case "features":
      return (
        <div>
          {d.title && <h2 className="mb-4 text-center text-xl font-bold text-ink">{d.title}</h2>}
          <ul className="space-y-3">
            {(d.items ?? []).map((it: string, i: number) => (
              <li key={i} className="flex items-start gap-3 rounded-xl bg-white/70 p-3">
                <CheckCircle2 size={20} className="mt-0.5 shrink-0" style={{ color }} /><span>{it}</span>
              </li>
            ))}
          </ul>
        </div>
      );
    case "testimonials":
      return (
        <div>
          {d.title && <h2 className="mb-4 text-center text-xl font-bold text-ink">{d.title}</h2>}
          <div className="grid gap-3 sm:grid-cols-2">
            {(d.items ?? []).map((t: any, i: number) => (
              <figure key={i} className="rounded-2xl bg-white p-4">
                <Quote size={18} className="mb-2 text-slate-300" />
                <blockquote className="text-sm text-slate-700">{t.text}</blockquote>
                <figcaption className="mt-3 flex items-center justify-between">
                  <span className="text-sm font-semibold text-ink">{t.name}</span>
                  <span className="flex">{Array.from({ length: 5 }, (_, k) => <Star key={k} size={14} className={k < (t.rating ?? 5) ? "fill-amber-400 text-amber-400" : "text-slate-200"} />)}</span>
                </figcaption>
              </figure>
            ))}
          </div>
        </div>
      );
    case "faq":
      return (
        <div>
          {d.title && <h2 className="mb-4 text-center text-xl font-bold text-ink">{d.title}</h2>}
          <div className="space-y-2">
            {(d.items ?? []).map((f: any, i: number) => (
              <details key={i} className="group rounded-xl bg-white p-4">
                <summary className="flex cursor-pointer list-none items-center justify-between font-semibold text-ink">
                  {f.q}<ChevronDown size={18} className="text-slate-400 transition group-open:rotate-180" />
                </summary>
                <p className="mt-2 text-sm text-slate-600">{f.a}</p>
              </details>
            ))}
          </div>
        </div>
      );
    case "pricing":
      return (
        <div className="rounded-2xl p-6 text-center ring-2" style={{ ["--tw-ring-color" as any]: color, background: `${color}0d` }}>
          {d.title && <p className="font-semibold text-slate-600">{d.title}</p>}
          {d.normal ? <p className="mt-1 text-slate-400 line-through">{rupiah(d.normal)}</p> : null}
          <p className="text-4xl font-extrabold tracking-tight" style={{ color }}>{rupiah(d.price)}</p>
          {d.normal > d.price && <span className="mt-2 inline-block rounded-full bg-rose-500 px-3 py-0.5 text-xs font-bold text-white">Hemat {Math.round((1 - d.price / d.normal) * 100)}%</span>}
          {d.note && <p className="mt-3 text-sm text-slate-600">{d.note}</p>}
        </div>
      );
    case "countdown":
      return d.until ? <Countdown until={d.until} label={d.label} color={color} /> : empty(<Placeholder icon={ImageIcon} text="Atur tanggal berakhir countdown" />);
    case "checkout": {
      const c = d.product_id ? checkout[d.product_id] : null;
      if (!c) return empty(<Placeholder icon={ShoppingCart} text={d.product_id ? "Produk tidak aktif" : "Pilih produk untuk formulir"} />);
      return (
        <div id="order" className="scroll-mt-6 rounded-2xl bg-white p-5">
          {d.title && <h2 className="mb-4 text-center text-xl font-bold text-ink">{d.title}</h2>}
          <CheckoutForm product={c.product} methods={c.payment_methods} store={c.store} preview={preview} extras={c} mobile />
        </div>
      );
    }
    case "divider":
      return <hr className="border-slate-200" />;
    case "spacer":
      return <div style={{ height: Number(d.size) || 24 }} />;
    case "html":
      return <iframe sandbox="allow-popups" srcDoc={d.code} className="w-full rounded-xl" style={{ minHeight: 80 }} title="html" />;
  }
}
