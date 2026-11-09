export function Loader({ type, color, size = 32 }: { type: string; color: string; size?: number }) {
  if (type === "dots") return <span className="flex gap-1">{[0, 1, 2].map((i) => <span key={i} className="animate-bounce rounded-full" style={{ width: size / 4, height: size / 4, background: color, animationDelay: `${i * 0.15}s` }} />)}</span>;
  if (type === "dots-ring") return <span className="relative animate-spin" style={{ width: size, height: size }}>{Array.from({ length: 8 }, (_, i) => <span key={i} className="absolute rounded-full" style={{ width: size / 7, height: size / 7, background: color, opacity: (i + 2) / 10, left: size / 2 + (size / 2.6) * Math.cos((i * Math.PI) / 4) - size / 14, top: size / 2 + (size / 2.6) * Math.sin((i * Math.PI) / 4) - size / 14 }} />)}</span>;
  if (type === "ring") return <span className="animate-spin rounded-full" style={{ width: size, height: size, border: `${size / 8}px solid ${color}33`, borderTopColor: color }} />;
  return <span className="animate-spin rounded-full" style={{ width: size, height: size, border: `${size / 10}px solid transparent`, borderTopColor: color, borderRightColor: color }} />;
}
