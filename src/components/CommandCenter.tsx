import { useState, useSyncExternalStore } from "react";
import { Link } from "react-router-dom";
import { Sunrise } from "lucide-react";
import {
  fmtCr,
  fmtLakh,
  getDecisions,
  groupPulse,
  overdueByEntity,
  pendingCount,
  periods,
  pulseIds,
  pulses,
  scaleFlow,
  subscribeDecisions,
  type Period,
  type PulseId,
} from "@/lib/commandData";

const toneClass = {
  green: "text-emerald-700",
  amber: "text-amber-700",
  red: "text-red-700",
  grey: "text-navy/50",
};

export function CommandCenter() {
  const [entity, setEntity] = useState<PulseId | "ALL">("ALL");
  const [period, setPeriod] = useState<Period>("MTD");
  useSyncExternalStore(subscribeDecisions, getDecisions, getDecisions);
  const rows = entity === "ALL" ? pulses : pulses.filter((row) => row.id === entity);
  const selected = entity === "ALL" ? undefined : pulses.find((row) => row.id === entity);
  const revenue = scaleFlow(selected ? selected.revenue : groupPulse.revenue, period);
  const profit = scaleFlow(selected ? (selected.revenue * selected.margin) / 100 : groupPulse.profit, period);
  const margin = selected ? selected.margin : groupPulse.margin;
  const cash = selected ? selected.cash : groupPulse.cash;
  const exceptions = selected ? selected.exceptions : groupPulse.exceptions;
  const overdue = selected ? overdueByEntity[selected.id] : 74;
  const pending = pendingCount(selected?.id);
  const revenueDigits = period === "Today" ? 2 : revenue >= 10 ? 1 : 1;

  return (
    <section className="space-y-5">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-navy">Group command center</p>
          <p className="mt-1 text-xs text-navy/50">Illustrative demo data · 20 Oct 2026</p>
        </div>
        <div className="flex flex-wrap gap-1">
          <Tab active={entity === "ALL"} onClick={() => setEntity("ALL")}>All entities</Tab>
          {pulseIds.map((id) => (
            <Tab key={id} active={entity === id} onClick={() => setEntity(id)}>{id}</Tab>
          ))}
        </div>
        <div className="flex gap-1">
          {periods.map((item) => (
            <Tab key={item} active={period === item} onClick={() => setPeriod(item)}>{item}</Tab>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 xl:grid-cols-6">
        <NavyKpi to="/companies" label={`Group revenue ${period}`} value={fmtCr(revenue, revenueDigits)} hint={selected ? `${selected.vs > 0 ? "+" : ""}${selected.vs.toFixed(1)}% vs target` : "+8.2% vs target"} />
        <NavyKpi to="/companies" label={`Operating profit ${period}`} value={fmtCr(profit, 2)} hint={`${margin.toFixed(1)}% margin`} />
        <NavyKpi to="/cash" label="Available group cash" value={fmtCr(cash, 1)} hint="Subject to reconciliation" />
        <NavyKpi to="/receivables" label="Overdue receivables" value={fmtLakh(overdue)} hint="Needs follow-up" />
        <NavyKpi to="/alerts" label="Critical exceptions" value={String(exceptions)} hint="Across finance and ops" />
        <NavyKpi to="/actions" label="Decisions pending" value={String(pending)} hint="Approvals and actions" />
      </div>
      <p className="text-xs text-navy/50">
        This briefing is an illustrative operating cut. The FY26 consolidation further down the page is unchanged.
        {period === "QTD" ? " QTD matches MTD because the quarter opened on 1 October." : ""}
        {period === "YTD" ? " YTD applies a 6.5 month run-rate to the MTD cut." : ""}
        {period === "Today" ? " Today is the MTD cut divided by 20 days." : ""}
      </p>

      <article className="rounded-2xl border border-navy/10 border-l-4 border-l-gold bg-white p-5 shadow-card">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="flex items-center gap-2 font-serif text-2xl text-navy">
            <Sunrise className="h-5 w-5 text-gold" aria-hidden="true" />
            AI Morning Briefing
          </h2>
          <p className="text-xs text-navy/50">20 Oct 2026 · 09:00 IST</p>
        </div>
        <div className="mt-4 grid gap-3 lg:grid-cols-3">
          <Brief tone="amber" title="Collections need attention" href="/receivables" link="View receivables">
            ₹74 lakh in overdue receivables requires review. LBH and PCS are the primary contributors. Identify largest overdue customers, responsible BU and promised payment dates.
          </Brief>
          <Brief tone="red" title="Underperforming entity flagged" href="/companies/LBH" link="Open LBH dashboard">
            LBH operating margin at 8.2% vs 15% target. MG Road property vacancy at 75% is the primary driver. Review cost structure and tenant pipeline immediately.
          </Brief>
          <Brief tone="blue" title="Decision requested" href="/actions" link="Go to Action Centre">
            Review ₹45 L vendor payment (PCS) and ₹28 L capital expenditure (AHS) before approving. Cash buffer post-payments: ₹2.47 Cr. 4 approvals pending total.
          </Brief>
        </div>
      </article>

      <div className="overflow-hidden rounded-2xl border border-navy/10 bg-white shadow-card">
        <div className="border-b border-navy/10 px-5 py-4">
          <h2 className="font-serif text-2xl text-navy">Entity performance · {period}</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="data-table min-w-[860px]">
            <thead>
              <tr>
                <th>Entity</th>
                <th>Sector</th>
                <th className="text-right">Revenue</th>
                <th className="text-right">Op. margin</th>
                <th className="text-right">Cash</th>
                <th className="text-right">Exceptions</th>
                <th className="text-right">vs target</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.id} className="even:bg-ivory/60">
                  <td><Link to={`/companies/${row.id}`} className="font-semibold underline-offset-2 hover:underline">{row.id}</Link></td>
                  <td>{row.sector}</td>
                  <td className="text-right tabular-nums">{fmtCr(scaleFlow(row.revenue, period), period === "Today" ? 2 : 1)}</td>
                  <td className="text-right tabular-nums">{row.margin.toFixed(1)}%</td>
                  <td className="text-right tabular-nums">{fmtCr(row.cash, 1)}</td>
                  <td className="text-right">
                    <span className={`inline-flex min-w-6 justify-center rounded-full px-2 py-0.5 text-xs font-semibold ${row.exceptions >= 3 ? "bg-red-100 text-red-800" : row.exceptions > 0 ? "bg-amber-100 text-amber-900" : "bg-navy/5 text-navy/60"}`}>
                      {row.exceptions}
                    </span>
                  </td>
                  <td className={`text-right font-semibold tabular-nums ${toneClass[row.tone]}`}>
                    {row.vs > 0 ? "+" : ""}{row.vs.toFixed(1)}% {row.arrow}
                  </td>
                </tr>
              ))}
            </tbody>
            {entity === "ALL" ? (
              <tfoot>
                <tr>
                  <td>Total</td>
                  <td>Group</td>
                  <td className="text-right tabular-nums">{fmtCr(revenue, revenueDigits)}</td>
                  <td className="text-right tabular-nums">15.0%</td>
                  <td className="text-right tabular-nums">{fmtCr(groupPulse.cash, 1)}</td>
                  <td className="text-right">{groupPulse.exceptions}</td>
                  <td className="text-right text-emerald-700">+0.9% ↑</td>
                </tr>
              </tfoot>
            ) : null}
          </table>
        </div>
      </div>
    </section>
  );
}

function Tab({ active, onClick, children }: { active: boolean; onClick: () => void; children: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-full px-3 py-1.5 text-xs font-semibold ${active ? "bg-navy text-ivory" : "bg-white text-navy ring-1 ring-inset ring-navy/10"}`}
    >
      {children}
    </button>
  );
}

function NavyKpi({ to, label, value, hint }: { to: string; label: string; value: string; hint: string }) {
  return (
    <Link to={to} className="block rounded-2xl border-t-4 border-gold bg-navy p-4 text-white shadow-card transition hover:-translate-y-0.5 hover:shadow-lg">
      <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-white/60">{label}</p>
      <p className="mt-2 font-serif text-2xl">{value}</p>
      <p className="mt-1 text-xs text-gold">{hint}</p>
    </Link>
  );
}

function Brief({ tone, title, href, link, children }: { tone: "amber" | "red" | "blue"; title: string; href: string; link: string; children: string }) {
  const shell = tone === "amber" ? "border-amber-200 bg-amber-50" : tone === "red" ? "border-red-200 bg-red-50" : "border-sky-200 bg-sky-50";
  const mark = tone === "amber" ? "!" : tone === "red" ? "●" : "☰";
  return (
    <article className={`rounded-xl border p-4 ${shell}`}>
      <p className="text-sm font-semibold text-navy"><span className="mr-2" aria-hidden="true">{mark}</span>{title}</p>
      <p className="mt-2 text-sm leading-relaxed text-navy/80">{children}</p>
      <Link to={href} className="mt-3 inline-block text-sm font-semibold text-navy">→ {link}</Link>
    </article>
  );
}
