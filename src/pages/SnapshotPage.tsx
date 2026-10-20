import { useSyncExternalStore } from "react";
import { AiInsights } from "@/components/AiInsights";
import { BookYearSelect } from "@/components/BookYearSelect";
import { Lede, Panel } from "@/components/ui";
import type { Insight } from "@/lib/demoData";
import {
  getBookYear,
  netIncomeTrend,
  propertyBookName,
  revenueExpense,
  snapshotFixed,
  snapshots,
  subscribeBookYear,
  summaryYears,
} from "@/lib/propertyBook";

const insights: Insight[] = [
  {
    title: "FY26 leverage is the high reading",
    body: "Debt to assets is 91.9% and D/E is 6.75x. D/E here is interest-bearing bank loans divided by equity.",
  },
  {
    title: "Four ratios stay on the FY26 print",
    body: "LTV 38.9%, debt yield 2.7%, current ratio 0.08x, and cap rate 1.1% do not change when the year selector moves.",
  },
  {
    title: "Equity is still positive",
    body: "Book equity is +₹4.0 Cr in FY26 and +₹3.3 Cr in FY25, after the drop from +₹15.9 Cr in FY24.",
  },
  {
    title: "Revenue has stepped down",
    body: "Printed revenue falls from ₹6.5 Cr in FY23 to ₹1.9 Cr in FY26. Net income turns positive only in FY26.",
  },
];

function toneClass(tone?: "pos" | "neg"): string {
  if (tone === "pos") return "text-emerald-700";
  if (tone === "neg") return "text-red-700";
  return "";
}

export function SnapshotPage() {
  const year = useSyncExternalStore(subscribeBookYear, getBookYear, getBookYear);
  const snap = snapshots[year];
  const maxFlow = Math.max(...revenueExpense.flatMap((row) => [row.revenue, row.expense]));
  const maxNi = Math.max(...netIncomeTrend.map((row) => Math.abs(row.value)));

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <Lede>
          Financial snapshot for {propertyBookName}. Net income, debt to assets, D/E, and book equity follow the year. The other four ratios stay on the FY26 print.
        </Lede>
        <BookYearSelect />
      </div>

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Ratio label={snap.label} value={snap.ni} note={snap.niNote} tone={snap.niTone} />
        <Ratio label="Debt/Assets" value={snap.da} note={snap.daNote} />
        <Ratio label="LTV" value={snapshotFixed.ltv} note={snapshotFixed.ltvNote} />
        <Ratio label="Debt Yield" value={snapshotFixed.dy} note={snapshotFixed.dyNote} />
        <Ratio label="Current Ratio" value={snapshotFixed.cr} note="" />
        <Ratio label="D/E" value={snap.de} note={snap.deNote} />
        <Ratio label="Cap Rate" value={snapshotFixed.cap} note="" />
        <Ratio label="Book Equity" value={snap.eq} note={snap.eqNote} tone="good" />
      </section>

      <div className="grid gap-6 xl:grid-cols-2">
        <Panel title="Revenue vs operating expenses" subtitle="Printed total revenue and total expenses.">
          <ul className="space-y-3">
            {revenueExpense.map((row) => (
              <li key={row.year} className="grid items-center gap-3 sm:grid-cols-[3.5rem_1fr]">
                <span className="text-sm font-medium text-navy">{row.year}</span>
                <div className="space-y-1">
                  <div className="h-2 overflow-hidden rounded-full bg-navy/5">
                    <div className="h-full rounded-full bg-navy" style={{ width: `${(row.revenue / (maxFlow * 1.08)) * 100}%` }} />
                  </div>
                  <div className="h-2 overflow-hidden rounded-full bg-navy/5">
                    <div className="h-full rounded-full bg-gold" style={{ width: `${(row.expense / (maxFlow * 1.08)) * 100}%` }} />
                  </div>
                </div>
              </li>
            ))}
          </ul>
          <p className="mt-3 text-xs text-navy/50">Navy is revenue. Gold is operating expenses.</p>
        </Panel>
        <Panel title="Net income trend" subtitle="Loss years sit on the gold bar. FY26 is the profit year.">
          <ul className="space-y-3">
            {netIncomeTrend.map((row) => (
              <li key={row.year} className="grid items-center gap-3 sm:grid-cols-[3.5rem_1fr_6rem]">
                <span className="text-sm font-medium text-navy">{row.year}</span>
                <div className="h-2.5 overflow-hidden rounded-full bg-navy/5">
                  <div
                    className="h-full rounded-full"
                    style={{
                      width: `${(Math.abs(row.value) / (maxNi * 1.08)) * 100}%`,
                      backgroundColor: row.value > 0 ? "#0B1D33" : "#C79A2B",
                    }}
                  />
                </div>
                <span className={`text-sm font-semibold tabular-nums sm:text-right ${row.value > 0 ? "text-emerald-700" : "text-red-700"}`}>
                  {row.label}
                </span>
              </li>
            ))}
          </ul>
        </Panel>
      </div>

      <Panel title="Multi-year summary" subtitle="The selected year is highlighted. FY22 and FY23 stay in the table." bleed>
        <div className="overflow-x-auto">
          <table className="data-table min-w-[860px]">
            <thead>
              <tr>
                <th>Year</th>
                <th className="text-right">Revenue</th>
                <th className="text-right">Net income</th>
                <th className="text-right">Total assets</th>
                <th className="text-right">Liabilities</th>
                <th className="text-right">Equity</th>
                <th className="text-right">Operating CF</th>
              </tr>
            </thead>
            <tbody>
              {summaryYears.map((row) => {
                const on = row.id === year;
                return (
                  <tr key={row.id} className={on ? "bg-gold/15" : ""}>
                    <td className="font-semibold">{row.year}</td>
                    <td className="text-right tabular-nums">{row.revenue}</td>
                    <td className={`text-right tabular-nums ${toneClass(row.ni.tone)}`}>{row.ni.text}</td>
                    <td className="text-right tabular-nums">{row.assets}</td>
                    <td className="text-right tabular-nums">{row.liabilities}</td>
                    <td className="text-right tabular-nums">{row.equity}</td>
                    <td className={`text-right tabular-nums ${toneClass(row.operatingCf.tone)}`}>{row.operatingCf.text}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Panel>

      <AiInsights page="Financial Snapshot" insights={insights} />
    </div>
  );
}

function Ratio({
  label,
  value,
  note,
  tone,
}: {
  label: string;
  value: string;
  note: string;
  tone?: "good" | "bad";
}) {
  const color = tone === "good" ? "text-emerald-700" : tone === "bad" ? "text-red-700" : "text-navy";
  return (
    <article className="rounded-2xl border border-navy/10 bg-white p-4 shadow-card">
      <p className="text-[11px] font-medium uppercase tracking-[0.16em] text-navy/50">{label}</p>
      <p className={`mt-2 font-serif text-[1.65rem] leading-none ${color}`}>{value}</p>
      <p className="mt-3 min-h-4 text-xs leading-relaxed text-navy/60">{note || "\u00a0"}</p>
    </article>
  );
}
