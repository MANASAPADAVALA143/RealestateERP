import { useState, type ReactNode } from "react";
import { Cell, Pie, PieChart, ResponsiveContainer } from "recharts";
import { Crumb } from "@/components/drill";
import { balance, company, companyOptions, usd } from "@/realestate/data";

export function RePage({
  page,
  title,
  subtitle,
  right,
  children,
}: {
  page: string;
  title: string;
  subtitle?: string;
  right?: ReactNode;
  children: ReactNode;
}) {
  return (
    <div className="space-y-5">
      <Crumb items={[{ label: "Group CFO", to: "/" }, { label: "Real Estate Portfolio", to: "/gnanova/realestate/dashboard" }, { label: page }]} />
      <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h2 className="font-serif text-3xl text-navy">{title}</h2>
          {subtitle ? <p className="mt-1 text-sm text-navy/60">{subtitle}</p> : null}
        </div>
        {right ? <div className="flex flex-wrap items-center gap-2">{right}</div> : null}
      </div>
      {children}
    </div>
  );
}

export function CompanySelect() {
  const [value, setValue] = useState(company);
  return (
    <label className="flex flex-wrap items-center gap-2 text-xs text-navy/60">
      <span className="uppercase tracking-[0.14em]">Company</span>
      <select value={value} onChange={(event) => setValue(event.target.value)} className="rounded-xl border border-navy/15 bg-white px-3 py-2 text-sm text-navy">
        {companyOptions.map((option) => (
          <option key={option.value} value={option.value}>{option.label}</option>
        ))}
      </select>
      {value !== company ? <span className="text-navy/50">Demo figures are loaded for {company} only.</span> : null}
    </label>
  );
}

export function Toggle({ options, initial }: { options: string[]; initial?: string }) {
  const [active, setActive] = useState(initial ?? options[0]);
  return (
    <div className="inline-flex rounded-full bg-white p-1 ring-1 ring-inset ring-navy/10">
      {options.map((option) => (
        <button
          key={option}
          type="button"
          onClick={() => setActive(option)}
          className={`rounded-full px-3 py-1 text-xs font-semibold ${active === option ? "bg-navy text-ivory" : "text-navy/70"}`}
        >
          {option}
        </button>
      ))}
    </div>
  );
}

export function YearSelect() {
  return (
    <label className="flex items-center gap-2 text-xs uppercase tracking-[0.14em] text-navy/50">
      Year
      <select className="rounded-xl border border-navy/15 bg-white px-3 py-1.5 text-sm normal-case tracking-normal text-navy" defaultValue="2026">
        <option>2026</option>
      </select>
    </label>
  );
}

export function Kpi({
  label,
  value,
  hint,
  tone = "navy",
  children,
}: {
  label: string;
  value: string;
  hint?: ReactNode;
  tone?: "navy" | "blue" | "green" | "red" | "amber";
  children?: ReactNode;
}) {
  const color = {
    navy: "text-navy",
    blue: "text-blue-700",
    green: "text-emerald-700",
    red: "text-red-700",
    amber: "text-amber-700",
  }[tone];
  return (
    <article className="rounded-2xl border border-navy/10 bg-white p-4 shadow-card">
      <p className="text-[11px] font-medium uppercase tracking-[0.14em] text-navy/50">{label}</p>
      <p className={`mt-2 font-serif text-2xl leading-none ${color}`}>{value}</p>
      {hint ? <p className="mt-2 text-xs text-navy/60">{hint}</p> : null}
      {children}
    </article>
  );
}

export function Card({ title, right, children, className = "" }: { title?: string; right?: ReactNode; children: ReactNode; className?: string }) {
  return (
    <section className={`rounded-2xl border border-navy/10 bg-white p-5 shadow-card ${className}`}>
      {title || right ? (
        <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
          {title ? <h3 className="font-serif text-xl text-navy">{title}</h3> : <span />}
          {right}
        </div>
      ) : null}
      {children}
    </section>
  );
}

export function Mini({ label, value, red, green }: { label: string; value: string; red?: boolean; green?: boolean }) {
  return (
    <div className="rounded-xl border border-navy/10 bg-ivory/60 p-3">
      <p className="text-[10px] uppercase tracking-[0.14em] text-navy/50">{label}</p>
      <p className={`mt-1 font-semibold tabular-nums ${red ? "text-red-700" : green ? "text-emerald-700" : "text-navy"}`}>{value}</p>
    </div>
  );
}

export function Line({ label, value, red, blue, bold }: { label: string; value: string; red?: boolean; blue?: boolean; bold?: boolean }) {
  return (
    <div className="flex items-center justify-between gap-3 border-b border-navy/5 pb-2">
      <dt className="text-navy/60">{label}</dt>
      <dd className={`tabular-nums ${red ? "text-red-700" : blue ? "text-blue-700" : "text-navy"} ${bold ? "font-bold" : "font-medium"}`}>{value}</dd>
    </div>
  );
}

export function Progress({ pct, color = "bg-blue-600" }: { pct: number; color?: string }) {
  return (
    <div className="mt-3 h-2 overflow-hidden rounded-full bg-navy/10">
      <div className={`h-full rounded-full ${color}`} style={{ width: `${Math.min(Math.max(pct, 0), 100)}%` }} />
    </div>
  );
}

export function StatusPill({ text, tone }: { text: string; tone: "green" | "amber" | "red" | "grey" }) {
  const cls = {
    green: "bg-emerald-50 text-emerald-800 ring-emerald-700/15",
    amber: "bg-amber-50 text-amber-900 ring-amber-700/20",
    red: "bg-red-50 text-red-800 ring-red-700/15",
    grey: "bg-navy/5 text-navy/70 ring-navy/10",
  }[tone];
  return <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold ring-1 ring-inset ${cls}`}>{text}</span>;
}

export function DonutChart({
  slices,
  center,
  centerSub,
}: {
  slices: { name: string; value: number; color: string; label?: string }[];
  center?: string;
  centerSub?: string;
}) {
  return (
    <div className="flex flex-wrap items-center gap-5">
      <div className="relative h-44 w-44 shrink-0">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie data={slices} dataKey="value" nameKey="name" innerRadius="62%" outerRadius="95%" stroke="none" isAnimationActive={false}>
              {slices.map((slice) => (
                <Cell key={slice.name} fill={slice.color} />
              ))}
            </Pie>
          </PieChart>
        </ResponsiveContainer>
        {center ? (
          <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center text-center">
            <span className="font-serif text-lg text-navy">{center}</span>
            {centerSub ? <span className="text-[10px] uppercase tracking-[0.14em] text-navy/50">{centerSub}</span> : null}
          </div>
        ) : null}
      </div>
      <ul className="min-w-[12rem] flex-1 space-y-2 text-sm">
        {slices.map((slice) => (
          <li key={slice.name} className="flex items-center justify-between gap-3">
            <span className="flex items-center gap-2">
              <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: slice.color }} />
              {slice.name}
            </span>
            <span className="tabular-nums text-navy/70">{slice.label}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function DemoButton({ children, primary }: { children: ReactNode; primary?: boolean }) {
  const [note, setNote] = useState(false);
  return (
    <span className="relative inline-flex">
      <button
        type="button"
        onClick={() => {
          setNote(true);
          window.setTimeout(() => setNote(false), 2000);
        }}
        className={`rounded-full px-4 py-2 text-xs font-semibold ${primary ? "bg-blue-700 text-white" : "bg-white text-navy ring-1 ring-inset ring-navy/15"}`}
      >
        {children}
      </button>
      {note ? <span className="absolute right-0 top-full z-10 mt-1 whitespace-nowrap rounded-lg bg-navy px-2 py-1 text-[11px] text-ivory">Demo only</span> : null}
    </span>
  );
}

export function AllocationCard() {
  return (
    <Card title="AI visualizations — asset allocation">
      <DonutChart
        slices={[
          { name: "Land", value: 2_550_193, color: "#2563EB", label: "$2,550,193 — 19%" },
          { name: "Commercial building", value: 7_637_622, color: "#1E3A8A", label: "$7,637,622 — 57%" },
          { name: "Residential property", value: 3_132_435, color: "#7C3AED", label: "$3,132,435 — 24%" },
        ]}
      />
    </Card>
  );
}

export function BalanceTrend() {
  return (
    <Card title="Multi-year balance sheet trends">
      <div className="overflow-x-auto">
        <table className="data-table min-w-[860px]">
          <thead>
            <tr>
              <th>Year</th>
              <th className="text-right">Total assets</th>
              <th className="text-right">Total liabilities</th>
              <th className="text-right">Equity</th>
              <th className="text-right">Working capital</th>
              <th className="text-right">Cash</th>
              <th className="text-right">Receivables</th>
              <th className="text-right">Payables</th>
              <th className="text-right">D/E</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>2026</td>
              <td className="text-right tabular-nums">$4,792,100</td>
              <td className="text-right tabular-nums !text-red-700">{usd(balance.liabilities)}</td>
              <td className="text-right tabular-nums">{usd(balance.equity)}</td>
              <td className="text-right">—</td>
              <td className="text-right tabular-nums">$14,100</td>
              <td className="text-right">—</td>
              <td className="text-right">—</td>
              <td className="text-right tabular-nums">{balance.deRatio.toFixed(2)}x</td>
            </tr>
          </tbody>
        </table>
      </div>
    </Card>
  );
}
