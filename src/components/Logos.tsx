/** Brand-coloured wordmarks for couriers, banks and payment channels (stylised, not official artwork). */
const COURIER: Record<string, { text: string; cls: string }> = {
  jne: { text: "JNE", cls: "bg-white text-[#1f3a93] italic tracking-tight ring-1 ring-slate-200 [&>i]:text-[#e2231a]" },
  sicepat: { text: "SC", cls: "bg-[#c8102e] text-white" },
  sap: { text: "SAP", cls: "bg-white text-[#e8541b] ring-1 ring-slate-200" },
  idexpress: { text: "iD", cls: "bg-[#d71e28] text-white" },
  jnt: { text: "J&T", cls: "bg-[#e3001b] text-white" },
  lion: { text: "LP", cls: "bg-[#e31e24] text-white" },
  spx: { text: "SPX", cls: "bg-[#ee4d2d] text-white" },
  anteraja: { text: "AJ", cls: "bg-[#e6007e] text-white" },
  ninja: { text: "NJ", cls: "bg-[#c8102e] text-white" },
  pos: { text: "POS", cls: "bg-[#f47920] text-white" },
  tiki: { text: "TIKI", cls: "bg-[#0a4a9f] text-white" },
};

export function CourierLogo({ code, size = "md" }: { code: string; size?: "sm" | "md" }) {
  const c = COURIER[code] ?? { text: code.slice(0, 3).toUpperCase(), cls: "bg-slate-500 text-white" };
  return (
    <span className={`inline-flex shrink-0 items-center justify-center rounded-md font-black ${size === "sm" ? "h-5 w-8 text-[9px]" : "h-7 w-10 text-[11px]"} ${c.cls}`}>
      {c.text === "JNE" ? <>JN<i className="not-italic">E</i></> : c.text}
    </span>
  );
}

const BANK: Record<string, string> = {
  BCA: "bg-[#0060af] text-white italic", MANDIRI: "bg-[#003d79] text-[#ffb700] italic", BRI: "bg-[#00529c] text-white",
  BNI: "bg-[#f15a23] text-white", BSI: "bg-[#00a39d] text-white", CIMB: "bg-[#7a1315] text-white", PERMATA: "bg-[#0a7b3e] text-white",
  QRIS: "bg-white text-slate-900 ring-1 ring-slate-300", DANA: "bg-[#118eea] text-white", OVO: "bg-[#4c2a86] text-white", GOPAY: "bg-[#00aed6] text-white", SHOPEEPAY: "bg-[#ee4d2d] text-white",
};

export function BankLogo({ bank, small }: { bank: string; small?: boolean }) {
  const key = bank.toUpperCase().replace(/[^A-Z]/g, "");
  const label = key === "MANDIRI" ? "mandiri" : key === "SHOPEEPAY" ? "SPay" : bank.length > 7 ? bank.slice(0, 7) : bank.toUpperCase();
  return <span className={`inline-flex shrink-0 items-center justify-center rounded font-extrabold ${small ? "h-6 w-10 text-[9px]" : "h-8 w-14 text-[11px]"} ${BANK[key] ?? "bg-slate-500 text-white"}`}>{label}</span>;
}
