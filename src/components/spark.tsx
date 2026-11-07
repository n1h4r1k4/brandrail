// Tiny inline charts for stat cards (server-rendered SVG).

/** Rounded bars for a short series, newest on the right. */
export function SparkBars({ values, color = "#4338ca", height = 34 }: { values: number[]; color?: string; height?: number }) {
  const max = Math.max(1, ...values);
  const w = 8, gap = 5;
  return (
    <svg width={values.length * (w + gap) - gap} height={height} aria-hidden="true">
      {values.map((v, i) => {
        const h = Math.max(3, (v / max) * height);
        return <rect key={i} x={i * (w + gap)} y={height - h} width={w} height={h} rx={3} fill={color} opacity={i === values.length - 1 ? 1 : 0.35 + (0.4 * i) / values.length} />;
      })}
    </svg>
  );
}

/** Smooth line with a soft fill. */
export function SparkLine({ values, color = "#4338ca", width = 96, height = 34 }: { values: number[]; color?: string; width?: number; height?: number }) {
  const max = Math.max(1, ...values), n = Math.max(2, values.length);
  const pts = values.map((v, i) => [(i / (n - 1)) * width, height - 3 - (v / max) * (height - 6)] as const);
  const d = pts.map(([x, y], i) => `${i ? "L" : "M"}${x.toFixed(1)},${y.toFixed(1)}`).join(" ");
  const id = `sl-${color.replace("#", "")}`;
  return (
    <svg width={width} height={height} aria-hidden="true">
      <defs>
        <linearGradient id={id} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={color} stopOpacity="0.25" />
          <stop offset="1" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={`${d} L${width},${height} L0,${height} Z`} fill={`url(#${id})`} />
      <path d={d} fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      {pts.length > 0 && <circle cx={pts[pts.length - 1][0]} cy={pts[pts.length - 1][1]} r="3" fill={color} />}
    </svg>
  );
}

/** Small progress ring. */
export function MiniRing({ value, color = "#047857", size = 38 }: { value: number; color?: string; size?: number }) {
  const r = (size - 6) / 2, c = 2 * Math.PI * r;
  return (
    <svg width={size} height={size} className="-rotate-90" aria-hidden="true">
      <circle cx={size / 2} cy={size / 2} r={r} stroke="#e8ecf4" strokeWidth="5" fill="none" />
      <circle cx={size / 2} cy={size / 2} r={r} stroke={color} strokeWidth="5" fill="none" strokeLinecap="round" strokeDasharray={c} strokeDashoffset={c * (1 - value / 100)} />
    </svg>
  );
}
