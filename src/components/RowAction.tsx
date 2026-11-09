"use client";
import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import { Loader2 } from "lucide-react";

const TONE = {
  shopee: "bg-[#ee4d2d] text-white hover:bg-[#d73f22]",
  primary: "bg-navy text-white hover:bg-navy/90",
  ghost: "bg-slate-100 text-slate-700 hover:bg-slate-200",
} as const;

type Props = { icon: LucideIcon; children: React.ReactNode; tone?: keyof typeof TONE; busy?: boolean; disabled?: boolean; title?: string; wide?: boolean };

/** One size for every row action, so stacked buttons line up in the Aksi column. */
export function RowAction({ icon: Icon, children, tone = "ghost", busy, disabled, title, wide = true, ...rest }: Props & ({ onClick: () => void; href?: never } | { href: string; onClick?: never })) {
  const cls = `inline-flex h-8 ${wide ? "w-full" : ""} items-center justify-center gap-1.5 whitespace-nowrap rounded-lg px-3 text-xs font-semibold transition disabled:opacity-60 ${TONE[tone]}`;
  const inner = <>{busy ? <Loader2 size={14} className="animate-spin" /> : <Icon size={14} />}{children}</>;
  if ("href" in rest && rest.href) return <Link href={rest.href} target="_blank" title={title} className={cls} onClick={(e) => e.stopPropagation()}>{inner}</Link>;
  return <button type="button" title={title} disabled={disabled || busy} className={cls} onClick={(e) => { e.stopPropagation(); rest.onClick?.(); }}>{inner}</button>;
}

/** Sticky right-hand column so actions stay visible on wide tables. */
export const actionCell = "sticky right-0 z-[1] w-[156px] min-w-[156px] border-l border-slate-100 bg-white px-3 py-3";
