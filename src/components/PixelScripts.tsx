"use client";
import Script from "next/script";
import { useEffect } from "react";

declare global {
  interface Window { fbq?: (...a: any[]) => void; ttq?: { track: (...a: any[]) => void }; gtag?: (...a: any[]) => void; dataLayer?: unknown[] }
}

export type PixelSet = { facebook: string[]; tiktok: string[]; gtm: string[]; google_ads: string[] };
type Source = { platform?: string; id?: string } | null | undefined;

const VALID: Record<keyof PixelSet, RegExp> = {
  facebook: /^\d{5,20}$/,
  tiktok: /^[A-Z0-9]{8,30}$/i,
  gtm: /^GTM-[A-Z0-9]+$/i,
  google_ads: /^AW-\d+(\/[A-Za-z0-9_-]+)?$/,
};

/** Merge pixel lists (product, success page, landing page, saved "Semua halaman" pixels) into one deduped, valid set. */
export function mergePixels(...parts: (Partial<Record<string, (string | null | undefined)[]>> | Source[] | null | undefined)[]): PixelSet {
  const out: PixelSet = { facebook: [], tiktok: [], gtm: [], google_ads: [] };
  const add = (platform: string | undefined, id: string | null | undefined) => {
    const k = platform as keyof PixelSet;
    const v = (id ?? "").trim();
    if (k in out && VALID[k].test(v) && !out[k].includes(v)) out[k].push(v);
  };
  for (const part of parts) {
    if (!part) continue;
    if (Array.isArray(part)) part.forEach((x) => add(x?.platform, x?.id));
    else Object.entries(part).forEach(([k, ids]) => (ids ?? []).forEach((id) => add(k, id)));
  }
  return out;
}

/**
 * Installs Meta, TikTok, Google Ads and GTM tags. Landing page: PageView + ViewContent. Checkout: PageView +
 * InitiateCheckout. Both fire Purchase / CompletePayment / Google Ads conversion when an order is placed.
 */
export function PixelScripts({ pixels, kind }: { pixels: PixelSet; kind: "checkout" | "landing" }) {
  useEffect(() => {
    const onPurchase = (e: Event) => {
      const o = (e as CustomEvent).detail ?? {};
      const value = Number(o.total) || 0;
      window.fbq?.("track", "Purchase", { value, currency: "IDR" }, o.code ? { eventID: `purchase-${o.code}` } : undefined);
      window.ttq?.track("CompletePayment", { value, currency: "IDR", content_type: "product" });
      pixels.google_ads.filter((id) => id.includes("/")).forEach((sendTo) =>
        window.gtag?.("event", "conversion", { send_to: sendTo, value, currency: "IDR", transaction_id: o.code ?? "" }));
      window.dataLayer?.push({ event: "purchase", ecommerce: { transaction_id: o.code, value, currency: "IDR" } });
    };
    window.addEventListener("formku:purchase", onPurchase);
    return () => window.removeEventListener("formku:purchase", onPurchase);
  }, [pixels]);

  const fbEvent = kind === "checkout" ? "InitiateCheckout" : "ViewContent";
  const ttEvent = kind === "checkout" ? "InitiateCheckout" : "ViewContent";
  const aw = [...new Set(pixels.google_ads.map((id) => id.split("/")[0]))];

  return (
    <>
      {pixels.facebook.length > 0 && (
        <Script id="fb-pixel" strategy="afterInteractive">{`!function(f,b,e,v,n,t,s){if(f.fbq)return;n=f.fbq=function(){n.callMethod?n.callMethod.apply(n,arguments):n.queue.push(arguments)};if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';n.queue=[];t=b.createElement(e);t.async=!0;t.src=v;s=b.getElementsByTagName(e)[0];s.parentNode.insertBefore(t,s)}(window,document,'script','https://connect.facebook.net/en_US/fbevents.js');${pixels.facebook.map((id) => `fbq('init','${id}');`).join("")}fbq('track','PageView');fbq('track','${fbEvent}');`}</Script>
      )}
      {pixels.tiktok.length > 0 && (
        <Script id="tt-pixel" strategy="afterInteractive">{`!function(w,d,t){w.TiktokAnalyticsObject=t;var ttq=w[t]=w[t]||[];ttq.methods=["page","track","identify","instances","debug","on","off","once","ready","alias","group","enableCookie","disableCookie"];ttq.setAndDefer=function(t,e){t[e]=function(){t.push([e].concat(Array.prototype.slice.call(arguments,0)))}};for(var i=0;i<ttq.methods.length;i++)ttq.setAndDefer(ttq,ttq.methods[i]);ttq.load=function(e){var n="https://analytics.tiktok.com/i18n/pixel/events.js";ttq._i=ttq._i||{};ttq._i[e]=[];ttq._i[e]._u=n;var o=d.createElement("script");o.async=!0;o.src=n+"?sdkid="+e+"&lib="+t;var a=d.getElementsByTagName("script")[0];a.parentNode.insertBefore(o,a)};${pixels.tiktok.map((id) => `ttq.load('${id}');`).join("")}ttq.page();ttq.track('${ttEvent}');}(window,document,'ttq');`}</Script>
      )}
      {aw.length > 0 && (
        <>
          <Script id="gads-lib" strategy="afterInteractive" src={`https://www.googletagmanager.com/gtag/js?id=${aw[0]}`} />
          <Script id="gads-init" strategy="afterInteractive">{`window.dataLayer=window.dataLayer||[];window.gtag=function(){dataLayer.push(arguments)};gtag('js',new Date());${aw.map((id) => `gtag('config','${id}');`).join("")}`}</Script>
        </>
      )}
      {pixels.gtm.map((id) => (
        <Script key={id} id={`gtm-${id}`} strategy="afterInteractive">{`(function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src='https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);})(window,document,'script','dataLayer','${id}');`}</Script>
      ))}
    </>
  );
}
