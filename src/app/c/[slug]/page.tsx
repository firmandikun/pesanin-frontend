"use client";
import Script from "next/script";
import { use, useEffect, useState } from "react";
import { captureAttribution } from "@/lib/attribution";
import { api, Product } from "@/lib/api";
import { CheckoutExtras, CheckoutForm, Store } from "@/components/CheckoutForm";
import { PaymentReturn } from "@/components/PaymentReturn";

declare global { interface Window { fbq?: (...a: any[]) => void; ttq?: { track: (...a: any[]) => void } } }

export default function PublicCheckout({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = use(params);
  // Remember where the visitor came from (FB/IG/TikTok/Google…) before they reach the checkout.
  useEffect(() => { captureAttribution(); }, []);
  const [data, setData] = useState<({ product: Product; payment_methods: string[]; store: Store } & CheckoutExtras) | null>(null);
  const [missing, setMissing] = useState(false);
  const [returnCode, setReturnCode] = useState<string | null>(null);
  useEffect(() => { setReturnCode(new URLSearchParams(location.search).get("order")); }, []);

  useEffect(() => {
    api(`/public/products/${slug}`).then((d) => {
      setData(d);
      document.title = d.product.form_settings?.page_name || d.product.site_title || d.product.name;
    }).catch(() => setMissing(true));
  }, [slug]);

  // Fire purchase conversions on the configured pixels.
  useEffect(() => {
    const onPurchase = (e: Event) => {
      const o = (e as CustomEvent).detail;
      window.fbq?.("track", "Purchase", { value: o.total, currency: "IDR" });
      window.ttq?.track("CompletePayment", { value: o.total, currency: "IDR" });
    };
    window.addEventListener("formku:purchase", onPurchase);
    return () => window.removeEventListener("formku:purchase", onPurchase);
  }, []);

  if (missing) return <div className="flex min-h-screen items-center justify-center text-slate-500">Halaman tidak ditemukan atau produk tidak aktif.</div>;
  if (!data) return <div className="flex min-h-screen items-center justify-center text-slate-400">Memuat…</div>;
  const tracking = data.product.form_settings?.tracking?.pixels ?? [];
  const px = {
    facebook: tracking.filter((t) => t.platform === "facebook").map((t) => t.id).concat(data.product.pixels?.facebook ? [data.product.pixels.facebook] : []),
    tiktok: tracking.filter((t) => t.platform === "tiktok").map((t) => t.id).concat(data.product.pixels?.tiktok ? [data.product.pixels.tiktok] : []),
    gtm: tracking.filter((t) => t.platform === "gtm").map((t) => t.id),
  };
  const bg = data.product.form_settings?.background;

  return (
    <div className="min-h-screen px-3 py-6 md:py-10" style={{ background: bg && bg !== "#ffffff" ? bg : "#f3f4f8" }}>
      {px.facebook.length > 0 && (
        <Script id="fb-pixel" strategy="afterInteractive">{`!function(f,b,e,v,n,t,s){if(f.fbq)return;n=f.fbq=function(){n.callMethod?n.callMethod.apply(n,arguments):n.queue.push(arguments)};if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';n.queue=[];t=b.createElement(e);t.async=!0;t.src=v;s=b.getElementsByTagName(e)[0];s.parentNode.insertBefore(t,s)}(window,document,'script','https://connect.facebook.net/en_US/fbevents.js');${px.facebook.filter((id) => /^\d+$/.test(id)).map((id) => `fbq('init','${id}');`).join("")}fbq('track','PageView');fbq('track','InitiateCheckout');`}</Script>
      )}
      {px.tiktok.length > 0 && (
        <Script id="tt-pixel" strategy="afterInteractive">{`!function(w,d,t){w.TiktokAnalyticsObject=t;var ttq=w[t]=w[t]||[];ttq.methods=["page","track","identify","instances","debug","on","off","once","ready","alias","group","enableCookie","disableCookie"];ttq.setAndDefer=function(t,e){t[e]=function(){t.push([e].concat(Array.prototype.slice.call(arguments,0)))}};for(var i=0;i<ttq.methods.length;i++)ttq.setAndDefer(ttq,ttq.methods[i]);ttq.load=function(e){var n="https://analytics.tiktok.com/i18n/pixel/events.js";ttq._i=ttq._i||{};ttq._i[e]=[];ttq._i[e]._u=n;var o=d.createElement("script");o.async=!0;o.src=n+"?sdkid="+e+"&lib="+t;var a=d.getElementsByTagName("script")[0];a.parentNode.insertBefore(o,a)};${px.tiktok.filter((id) => /^[A-Z0-9]+$/i.test(id)).map((id) => `ttq.load('${id}');`).join("")}ttq.page();}(window,document,'ttq');`}</Script>
      )}
      {px.gtm.filter((id) => /^GTM-[A-Z0-9]+$/i.test(id)).map((id) => (
        <Script key={id} id={`gtm-${id}`} strategy="afterInteractive">{`(function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src='https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);})(window,document,'script','dataLayer','${id}');`}</Script>
      ))}
      <div className="mx-auto max-w-5xl rounded-2xl bg-white p-5 md:p-8">
        {returnCode ? <PaymentReturn code={returnCode} /> : <CheckoutForm product={data.product} methods={data.payment_methods} store={data.store} extras={data} />}
      </div>
    </div>
  );
}
