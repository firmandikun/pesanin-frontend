"use client";
import { MessageCircle } from "lucide-react";
import Script from "next/script";
import { use, useEffect, useState } from "react";
import { captureAttribution } from "@/lib/attribution";
import { api, API_URL } from "@/lib/api";
import { LandingPage } from "@/lib/landing";
import { BlockView, CheckoutData, visibilityClass } from "@/components/landing/BlockRenderer";

type Data = { page: LandingPage; store: { store_name: string; whatsapp?: string }; products: CheckoutData };

export default function PublicLanding({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = use(params);
  // Remember where the visitor came from (FB/IG/TikTok/Google…) before they reach the checkout.
  useEffect(() => { captureAttribution(); }, []);
  const [data, setData] = useState<Data | null>(null);
  const [missing, setMissing] = useState(false);

  useEffect(() => {
    const preview = new URLSearchParams(location.search).get("preview") ? "?preview=1" : "";
    api<Data>(`/public/pages/${slug}${preview}`).then((d) => {
      setData(d);
      document.title = d.page.seo?.title || d.page.title;
      if (d.page.seo?.description) {
        const meta = document.querySelector('meta[name="description"]') ?? document.head.appendChild(Object.assign(document.createElement("meta"), { name: "description" }));
        meta.setAttribute("content", d.page.seo.description);
      }
    }).catch(() => setMissing(true));
  }, [slug]);

  useEffect(() => {
    const onPurchase = (e: Event) => {
      const o = (e as CustomEvent).detail;
      (window as any).fbq?.("track", "Purchase", { value: o.total, currency: "IDR" });
      (window as any).ttq?.track("CompletePayment", { value: o.total, currency: "IDR" });
    };
    window.addEventListener("formku:purchase", onPurchase);
    return () => window.removeEventListener("formku:purchase", onPurchase);
  }, []);

  // Analytics beacon for Landing Page > Laporan.
  useEffect(() => {
    if (!data || new URLSearchParams(location.search).get("preview")) return;
    const id = (k: string, store: Storage) => { let v = store.getItem(k); if (!v) { v = Math.random().toString(36).slice(2) + Date.now().toString(36); store.setItem(k, v); } return v; };
    let visitor = "", session = "";
    try { visitor = id("fk_vid", localStorage); session = id(`fk_sid_${slug}`, sessionStorage); } catch { visitor = session = Math.random().toString(36).slice(2); }
    const start = Date.now();
    let maxScroll = 0;
    const send = (event: string, extra: Record<string, unknown> = {}) =>
      fetch(`${API_URL}/public/pages/${slug}/track`, { method: "POST", keepalive: true, headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify({ visitor_id: visitor, session_id: session, event, referrer: document.referrer || null, ...extra }) }).catch(() => {});
    send("view");
    const onScroll = () => { const p = Math.round(((scrollY + innerHeight) / document.body.scrollHeight) * 100); if (p > maxScroll + 10) { maxScroll = p; send("scroll", { scroll: Math.min(100, p) }); } };
    const onClick = (e: MouseEvent) => { if ((e.target as HTMLElement).closest("a,button")) send("click"); };
    const ping = setInterval(() => send("ping", { duration: Math.round((Date.now() - start) / 1000) }), 15000);
    const leave = () => send("ping", { duration: Math.round((Date.now() - start) / 1000), scroll: maxScroll });
    addEventListener("scroll", onScroll, { passive: true }); addEventListener("click", onClick); addEventListener("pagehide", leave);
    return () => { clearInterval(ping); removeEventListener("scroll", onScroll); removeEventListener("click", onClick); removeEventListener("pagehide", leave); };
  }, [data, slug]);

  if (missing) return <div className="flex min-h-screen items-center justify-center text-slate-500">Halaman tidak ditemukan.</div>;
  if (!data) return <div className="flex min-h-screen items-center justify-center text-slate-400">Memuat…</div>;
  const { page, store, products } = data;
  const color = page.theme?.primary ?? "#e05510";
  const fb = page.settings?.facebook_pixel, tt = page.settings?.tiktok_pixel;
  const wa = (store.whatsapp ?? "").replace(/\D/g, "").replace(/^0/, "62");

  return (
    <div className="min-h-screen" style={{ background: page.theme?.background ?? "#fff" }}>
      {fb && /^\d+$/.test(fb) && (
        <Script id="fb-pixel" strategy="afterInteractive">{`!function(f,b,e,v,n,t,s){if(f.fbq)return;n=f.fbq=function(){n.callMethod?n.callMethod.apply(n,arguments):n.queue.push(arguments)};if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';n.queue=[];t=b.createElement(e);t.async=!0;t.src=v;s=b.getElementsByTagName(e)[0];s.parentNode.insertBefore(t,s)}(window,document,'script','https://connect.facebook.net/en_US/fbevents.js');fbq('init','${fb}');fbq('track','PageView');fbq('track','ViewContent');`}</Script>
      )}
      {tt && /^[A-Z0-9]+$/i.test(tt) && (
        <Script id="tt-pixel" strategy="afterInteractive">{`!function(w,d,t){w.TiktokAnalyticsObject=t;var ttq=w[t]=w[t]||[];ttq.methods=["page","track","identify","instances","debug","on","off","once","ready","alias","group","enableCookie","disableCookie"];ttq.setAndDefer=function(t,e){t[e]=function(){t.push([e].concat(Array.prototype.slice.call(arguments,0)))}};for(var i=0;i<ttq.methods.length;i++)ttq.setAndDefer(ttq,ttq.methods[i]);ttq.load=function(e){var n="https://analytics.tiktok.com/i18n/pixel/events.js";ttq._i=ttq._i||{};ttq._i[e]=[];ttq._i[e]._u=n;var o=d.createElement("script");o.async=!0;o.src=n+"?sdkid="+e+"&lib="+t;var a=d.getElementsByTagName("script")[0];a.parentNode.insertBefore(o,a)};ttq.load('${tt}');ttq.page();}(window,document,'ttq');`}</Script>
      )}
      <div className={`mx-auto space-y-6 px-5 py-8 ${page.theme?.width === "wide" ? "max-w-4xl" : "max-w-xl"}`}>
        {page.blocks.map((b) => <div key={b.id} className={visibilityClass(b.data)}><BlockView block={b} color={color} checkout={products} whatsapp={store.whatsapp} /></div>)}
        <p className="pt-6 text-center text-xs text-slate-400">© {new Date().getFullYear()} {store.store_name} · dibuat dengan <b className="text-brand-600">pesanin</b></p>
      </div>
      {page.settings?.floating_whatsapp && wa && (
        <a href={`https://wa.me/${wa}`} target="_blank" aria-label="Chat WhatsApp"
          className="fixed bottom-5 right-5 flex h-14 w-14 items-center justify-center rounded-full bg-[#25D366] text-white shadow-xl shadow-green-600/30 transition hover:scale-105">
          <MessageCircle size={26} />
        </a>
      )}
    </div>
  );
}
