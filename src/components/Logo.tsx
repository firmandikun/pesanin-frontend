import { useId } from "react";

/** Pesanin mark: a shopping bag with a check — "pesanan masuk, beres". */
export function LogoMark({ size = 32, className = "" }: { size?: number; className?: string }) {
  const id = useId();
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" className={`shrink-0 ${className}`} aria-hidden>
      <defs>
        <linearGradient id={id} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#fb8640" />
          <stop offset="1" stopColor="#e05510" />
        </linearGradient>
      </defs>
      <rect width="32" height="32" rx="9" fill={`url(#${id})`} />
      <path d="M11.6 12.2V11a4.4 4.4 0 0 1 8.8 0v1.2" fill="none" stroke="#fff" strokeWidth="2.1" strokeLinecap="round" />
      <path d="M8.6 12.2h14.8l-1.1 10.6a2.4 2.4 0 0 1-2.4 2.2h-7.8a2.4 2.4 0 0 1-2.4-2.2z" fill="#fff" />
      <path d="m12.9 18.4 2.2 2.2 4-4.2" fill="none" stroke="#e05510" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function Wordmark({ light, className = "" }: { light?: boolean; className?: string }) {
  return (
    <span className={`font-extrabold tracking-[-0.03em] ${light ? "text-white" : "text-navy"} ${className}`}>
      pesan<span className={light ? "text-brand-400" : "text-brand-500"}>in</span>
    </span>
  );
}

export function Logo({ light, small }: { light?: boolean; small?: boolean }) {
  return (
    <span className="flex items-center gap-2.5">
      <LogoMark size={small ? 28 : 32} />
      <Wordmark light={light} className={small ? "text-[19px]" : "text-[22px]"} />
    </span>
  );
}
