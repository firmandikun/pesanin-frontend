/** Flat illustrations in the style of the reference dashboard (original drawings). */
export function SellerIllustration({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 360 260" className={className} aria-hidden>
      <defs>
        <pattern id="grid" width="36" height="36" patternUnits="userSpaceOnUse"><path d="M36 0H0V36" fill="none" stroke="#eef0f7" strokeWidth="2" /></pattern>
      </defs>
      <rect width="360" height="260" fill="url(#grid)" />
      <rect x="10" y="95" width="80" height="90" rx="6" fill="#5ec5d6" />
      <rect x="40" y="150" width="200" height="16" rx="3" fill="#e9837e" />
      <rect x="60" y="166" width="160" height="80" fill="#dc6f6a" />
      <rect x="18" y="200" width="56" height="50" rx="3" fill="#4253c4" /><rect x="40" y="200" width="10" height="18" fill="#f3c66b" />
      <rect x="236" y="200" width="56" height="50" rx="3" fill="#4253c4" /><rect x="258" y="200" width="10" height="18" fill="#f3c66b" />
      <path d="M70 120 L180 120 L190 150 L60 150 Z" fill="#e05510" />
      <circle cx="118" cy="70" r="18" fill="#f2b9a0" /><path d="M100 64 q18-26 36 0 q-6-20-18-20 q-14 0-18 20z" fill="#7b4a2a" />
      <rect x="98" y="88" width="40" height="44" rx="10" fill="#f6c25b" /><rect x="104" y="94" width="28" height="38" rx="4" fill="#fbe2a0" />
      <rect x="120" y="98" width="30" height="22" rx="4" fill="#e9837e" />
      <rect x="235" y="60" width="78" height="140" rx="14" fill="#f56a1b" /><rect x="243" y="72" width="62" height="104" rx="8" fill="#fff5ed" />
      <rect x="258" y="96" width="32" height="34" rx="6" fill="#ffffff" /><path d="M264 104 l8-5 h4 l8 5 -4 5 v14 h-12 v-14z" fill="#e05656" />
      <rect x="252" y="140" width="22" height="8" rx="4" fill="#46c2b7" /><rect x="278" y="140" width="22" height="8" rx="4" fill="#f56a1b" />
      <rect x="252" y="20" width="42" height="40" rx="8" fill="#8c9cf0" /><path d="M262 34h22l-3 12h-16z" fill="#fff" />
      <rect x="200" y="40" width="36" height="34" rx="6" fill="#f0a9a6" />
      <path d="M190 30l3 7 7 3-7 3-3 7-3-7-7-3 7-3z" fill="#5b6be0" /><path d="M330 90l2 5 5 2-5 2-2 5-2-5-5-2 5-2z" fill="#f6c25b" />
    </svg>
  );
}

export function ShippingIllustration({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 260 200" className={className} aria-hidden>
      <rect x="20" y="20" width="230" height="170" rx="10" fill="#e9edfb" />
      <rect x="30" y="30" width="210" height="16" rx="4" fill="#f56a1b" />
      {[0, 1, 2, 3].map((i) => <rect key={i} x="40" y={60 + i * 24} width="40" height="8" rx="4" fill="#fecdab" />)}
      <rect x="100" y="60" width="120" height="40" rx="6" fill="#fff" /><rect x="110" y="72" width="70" height="10" rx="5" fill="#f56a1b" />
      <circle cx="150" cy="130" r="38" fill="#f2b9a0" /><path d="M118 120 q32-48 64 0 q-10-34-32-34 q-22 0-32 34z" fill="#7b4a2a" />
      <rect x="110" y="160" width="80" height="40" rx="18" fill="#e05510" />
      <rect x="100" y="150" width="56" height="34" rx="6" fill="#e9837e" transform="rotate(-12 128 167)" />
      <circle cx="96" cy="78" r="22" fill="#f6c25b" /><path d="M88 78a8 8 0 0116 0" stroke="#fff" strokeWidth="5" fill="none" />
      <circle cx="232" cy="74" r="22" fill="#e05510" /><path d="M222 74a10 10 0 1020 0" stroke="#fff" strokeWidth="4" fill="none" />
    </svg>
  );
}

export function SuccessIllustration({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 120 100" className={className} aria-hidden>
      <circle cx="60" cy="54" r="40" fill="#eef1fb" />
      <rect x="40" y="26" width="40" height="52" rx="5" fill="#fff" stroke="#fecdab" />
      <rect x="46" y="34" width="20" height="4" rx="2" fill="#f56a1b" /><rect x="46" y="42" width="28" height="3" rx="1.5" fill="#fecdab" />
      <rect x="50" y="50" width="20" height="14" rx="3" fill="#f7a072" /><text x="60" y="61" fontSize="9" textAnchor="middle" fill="#fff" fontWeight="700">$</text>
      <rect x="46" y="68" width="16" height="3" rx="1.5" fill="#fecdab" />
      <circle cx="78" cy="30" r="9" fill="#2fb36d" /><path d="M74 30l3 3 6-6" stroke="#fff" strokeWidth="2.5" fill="none" strokeLinecap="round" />
      {[[20, 20, "#e05656"], [100, 18, "#2fb36d"], [16, 60, "#f56a1b"], [104, 56, "#e05656"], [30, 84, "#2fb36d"], [92, 86, "#f56a1b"], [60, 8, "#f6c25b"]].map(([x, y, c], i) => (
        <rect key={i} x={x as number} y={y as number} width="5" height="3" rx="1" fill={c as string} transform={`rotate(${i * 37} ${x} ${y})`} />
      ))}
    </svg>
  );
}

export function BoxIcon({ tone = "orange" }: { tone?: "orange" | "green" }) {
  return (
    <svg viewBox="0 0 40 40" className="h-10 w-10" aria-hidden>
      <circle cx="20" cy="20" r="20" fill="#eef1fb" />
      <path d="M10 15l10-5 10 5v11l-10 5-10-5z" fill="#f7a072" /><path d="M10 15l10 5 10-5" stroke="#e0784a" fill="none" /><path d="M20 20v11" stroke="#e0784a" />
      {tone === "green" ? <><circle cx="29" cy="12" r="5" fill="#2fb36d" /><path d="M27 12l1.5 1.5 3-3" stroke="#fff" strokeWidth="1.5" fill="none" /></>
        : <circle cx="29" cy="28" r="4" fill="#f6c25b" />}
    </svg>
  );
}
