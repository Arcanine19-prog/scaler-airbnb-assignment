/** Laurel branches framing the "Guest favourite" rating (mirrored for the right side). */
export function Laurel({ side, className = "h-9 w-5" }: { side: "left" | "right"; className?: string }) {
  return (
    <svg viewBox="0 0 20 36" className={className} style={side === "right" ? { transform: "scaleX(-1)" } : undefined} aria-hidden>
      <path d="M15 34C7 30 3 22 4 12" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
      {[
        [4, 13, -40], [5, 19, -30], [7, 25, -20], [11, 30, -5],
      ].map(([x, y, r], i) => (
        <g key={i}>
          <ellipse cx={x - 2.5} cy={y - 1} rx="1.8" ry="3.6" transform={`rotate(${r} ${x - 2.5} ${y - 1})`} fill="currentColor" />
          <ellipse cx={x + 2.5} cy={y - 2.5} rx="1.6" ry="3.2" transform={`rotate(${Number(r) + 70} ${x + 2.5} ${y - 2.5})`} fill="currentColor" />
        </g>
      ))}
      <ellipse cx="5" cy="6" rx="1.8" ry="3.8" fill="currentColor" />
    </svg>
  );
}
