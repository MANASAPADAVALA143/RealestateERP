const COLORS = ["#0B1D33", "#1C3352", "#C79A2B", "#E8B84B", "#4A7B9D", "#8A9AB8"];

export function Donut({ slices }: { slices: { name: string; value: number }[] }) {
  const total = slices.reduce((sum, slice) => sum + Math.max(slice.value, 0), 0) || 1;
  const radius = 42;
  const circ = 2 * Math.PI * radius;
  let offset = 0;
  return (
    <div className="flex flex-wrap items-center gap-5">
      <svg viewBox="0 0 120 120" className="h-40 w-40 shrink-0" role="img">
        {slices.map((slice, index) => {
          const length = (Math.max(slice.value, 0) / total) * circ;
          const node = (
            <circle
              key={slice.name}
              cx="60"
              cy="60"
              r={radius}
              fill="none"
              stroke={COLORS[index % COLORS.length]}
              strokeWidth="16"
              strokeDasharray={`${length} ${circ - length}`}
              strokeDashoffset={-offset}
              transform="rotate(-90 60 60)"
            />
          );
          offset += length;
          return node;
        })}
      </svg>
      <ul className="min-w-[12rem] flex-1 space-y-1.5 text-sm">
        {slices.map((slice, index) => (
          <li key={slice.name} className="flex items-center justify-between gap-3">
            <span className="flex items-center gap-2">
              <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: COLORS[index % COLORS.length] }} />
              {slice.name}
            </span>
            <span className="tabular-nums text-navy/70">
              {((Math.max(slice.value, 0) / total) * 100).toFixed(1)}%
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function ComboChart({
  points,
}: {
  points: { label: string; bar: number; line: number }[];
}) {
  const width = 360;
  const height = 180;
  const max = Math.max(...points.map((point) => Math.max(point.bar, point.line)), 1);
  const slot = width / points.length;
  const line = points
    .map((point, index) => {
      const x = slot * index + slot / 2;
      const y = height - 24 - (point.line / max) * (height - 40);
      return `${x},${y}`;
    })
    .join(" ");
  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="h-52 w-full" role="img">
      {points.map((point, index) => {
        const barHeight = (point.bar / max) * (height - 40);
        const x = slot * index + slot * 0.22;
        return (
          <g key={point.label}>
            <rect x={x} y={height - 24 - barHeight} width={slot * 0.4} height={barHeight} rx="3" fill="#0B1D33" />
            <text x={slot * index + slot / 2} y={height - 6} textAnchor="middle" fontSize="11" fill="#0B1D33">
              {point.label}
            </text>
          </g>
        );
      })}
      <polyline fill="none" stroke="#C79A2B" strokeWidth="2.5" points={line} />
      {points.map((point, index) => {
        const x = slot * index + slot / 2;
        const y = height - 24 - (point.line / max) * (height - 40);
        return <circle key={`${point.label}-dot`} cx={x} cy={y} r="3.5" fill="#C79A2B" />;
      })}
    </svg>
  );
}

export function HBars({ rows }: { rows: { label: string; value: number; text: string }[] }) {
  const max = Math.max(...rows.map((row) => Math.abs(row.value)), 1);
  return (
    <ul className="space-y-3">
      {rows.map((row) => (
        <li key={row.label} className="grid items-center gap-3 sm:grid-cols-[7rem_1fr_6.5rem]">
          <span className="text-sm font-medium text-navy">{row.label}</span>
          <div className="h-2.5 overflow-hidden rounded-full bg-navy/5">
            <div className="h-full rounded-full bg-navy" style={{ width: `${(Math.abs(row.value) / (max * 1.08)) * 100}%` }} />
          </div>
          <span className="text-sm font-semibold tabular-nums text-navy sm:text-right">{row.text}</span>
        </li>
      ))}
    </ul>
  );
}

export function GroupedBars({
  rows,
}: {
  rows: { label: string; a: number; b: number; aText: string; bText: string }[];
}) {
  const max = Math.max(...rows.flatMap((row) => [row.a, row.b]), 1);
  return (
    <ul className="space-y-3">
      {rows.map((row) => (
        <li key={row.label}>
          <div className="mb-1 flex justify-between text-sm">
            <span className="font-medium text-navy">{row.label}</span>
            <span className="text-navy/60">
              {row.aText} · {row.bText}
            </span>
          </div>
          <div className="space-y-1">
            <div className="h-2 overflow-hidden rounded-full bg-navy/5">
              <div className="h-full rounded-full bg-navy" style={{ width: `${(row.a / (max * 1.08)) * 100}%` }} />
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-navy/5">
              <div className="h-full rounded-full bg-gold" style={{ width: `${(row.b / (max * 1.08)) * 100}%` }} />
            </div>
          </div>
        </li>
      ))}
    </ul>
  );
}

export function LineTrend({ points }: { points: { label: string; value: number }[] }) {
  const width = 360;
  const height = 160;
  const values = points.map((point) => point.value);
  const min = Math.min(...values, 0);
  const max = Math.max(...values, 0);
  const span = max - min || 1;
  const coords = points.map((point, index) => {
    const x = 16 + (index * (width - 32)) / Math.max(points.length - 1, 1);
    const y = 16 + ((max - point.value) / span) * (height - 40);
    return { x, y, ...point };
  });
  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="h-44 w-full" role="img">
      <polyline fill="none" stroke="#0B1D33" strokeWidth="2.5" points={coords.map((point) => `${point.x},${point.y}`).join(" ")} />
      {coords.map((point) => (
        <g key={point.label}>
          <circle cx={point.x} cy={point.y} r="3" fill={point.value < 0 ? "#C79A2B" : "#0B1D33"} />
          <text x={point.x} y={height - 6} textAnchor="middle" fontSize="10" fill="#0B1D33">
            {point.label}
          </text>
        </g>
      ))}
    </svg>
  );
}
