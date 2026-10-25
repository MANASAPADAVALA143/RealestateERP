import { useState } from "react";
import { ChevronDown } from "lucide-react";
import { Card, Kpi, Progress, RePage, StatusPill } from "@/realestate/ui";
import { balance, loanBook, loans, usd, type RealLoan } from "@/realestate/data";

export function ReLoansPage() {
  const [open, setOpen] = useState<string | null>("OSB-2947");

  return (
    <RePage page="Loans & Notes" title="Loans & Notes">
      <section className="grid gap-3 lg:grid-cols-2">
        <Kpi label="Outstanding" value={usd(loanBook.outstanding)} hint={`Figures as of ${loanBook.asOf} · ${loanBook.repaidPct}% repaid · $56,829 of $1,650,000`}>
          <Progress pct={loanBook.repaidPct} />
        </Kpi>
        <article className="grid grid-cols-3 gap-3 rounded-2xl border border-navy/10 bg-white p-4 shadow-card">
          <Stat label="Net debt position" value={usd(-loanBook.outstanding)} red />
          <Stat label="Borrowed" value={usd(loanBook.borrowed)} />
          <Stat label="Lent" value={usd(loanBook.lent)} />
        </article>
      </section>

      <section className="grid grid-cols-2 gap-3 xl:grid-cols-4">
        <Kpi label="Monthly obligation" value={usd(loanBook.monthly)} />
        <Kpi label="Total interest paid" value="$0" />
        <Kpi label="Interest receivable" value="$0" />
        <Kpi label="Debt / equity" value={`${balance.deRatio.toFixed(2)}×`} />
      </section>
      <section className="grid grid-cols-2 gap-3 xl:grid-cols-4">
        <Kpi label="Owed to us" value="$0" />
        <Kpi label="Total principal paid" value={usd(loanBook.principalPaid)} />
        <Kpi label="Active loans" value="2" />
        <Kpi label="Closed loans" value="0" />
      </section>

      <section className="grid gap-3 lg:grid-cols-2">
        <Kpi label="Business loans" value={usd(loanBook.outstanding)} hint={`2 active loans · ${usd(loanBook.monthly)}/month · Avg rate: ${loanBook.avgRate}%`} />
        <Kpi label="Personal loans" value="$0" hint="0 active loans" />
      </section>

      <div className="space-y-3">
        {loans.map((loan) => {
          const expanded = open === loan.id;
          return (
            <article key={loan.id} className="rounded-2xl border border-navy/10 bg-white shadow-card">
              <button
                type="button"
                onClick={() => setOpen(expanded ? null : loan.id)}
                className="flex w-full flex-wrap items-center justify-between gap-3 px-5 py-4 text-left"
              >
                <span className="font-serif text-lg text-navy">{loan.lender} – {loan.code}</span>
                <span className="flex flex-wrap items-center gap-4 text-sm">
                  <span>Balance <b className="tabular-nums">{usd(loan.balance)}</b></span>
                  <span>Rate <b>{loan.rate}%</b></span>
                  <span>Monthly <b className="tabular-nums">{usd(loan.monthly)}</b></span>
                  <span>Term <b>{loan.termMonths} mo</b></span>
                  <StatusPill text={loan.status} tone="green" />
                  <ChevronDown className={`h-4 w-4 transition ${expanded ? "rotate-180" : ""}`} aria-hidden="true" />
                </span>
              </button>
              {expanded ? (
                <div className="space-y-4 border-t border-navy/5 px-5 py-4">
                  <dl className="grid gap-3 text-sm sm:grid-cols-3">
                    <div><dt className="text-navy/50">Maturity</dt><dd className="font-semibold">{loan.maturity}</dd></div>
                    <div><dt className="text-navy/50">Payment day</dt><dd className="font-semibold">{loan.dueDay}</dd></div>
                    <div><dt className="text-navy/50">Linked property</dt><dd className="font-semibold">{loan.property ?? "—"}</dd></div>
                  </dl>
                  <Schedule loan={loan} />
                </div>
              ) : null}
            </article>
          );
        })}
      </div>

      <Card title="Linked property">
        <div className="overflow-x-auto">
          <table className="data-table min-w-[640px]">
            <thead>
              <tr>
                <th>Property</th>
                <th className="text-right">Market value</th>
                <th className="text-right">Equity deployed</th>
                <th className="text-right">LTV</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td className="font-medium">1790 Meridian Blvd</td>
                <td className="text-right">—</td>
                <td className="text-right">—</td>
                <td className="text-right">—</td>
              </tr>
            </tbody>
          </table>
        </div>
      </Card>
    </RePage>
  );
}

function Schedule({ loan }: { loan: RealLoan }) {
  const rows = loan.rows.slice(0, 36);
  return (
    <div>
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <h4 className="font-serif text-lg text-navy">Amortization schedule · {loan.code}</h4>
        <span className="text-xs text-navy/50">
          Showing first {rows.length} of {loan.termMonths} months · {loan.rate}% annual
        </span>
      </div>
      <div className="mb-4 grid gap-3 sm:grid-cols-3">
        <article className="rounded-2xl border-t-4 border-gold bg-navy p-4 text-ivory shadow-card">
          <p className="text-[11px] uppercase tracking-[0.14em] text-ivory/60">EMI / month</p>
          <p className="mt-2 font-serif text-2xl">{usd(loan.monthly)}</p>
        </article>
        <article className="rounded-2xl border-t-4 border-gold bg-navy p-4 text-ivory shadow-card">
          <p className="text-[11px] uppercase tracking-[0.14em] text-ivory/60">Total interest</p>
          <p className="mt-2 font-serif text-2xl text-gold">{usd(loan.totalInterest)}</p>
        </article>
        <article className="rounded-2xl border-t-4 border-gold bg-navy p-4 text-ivory shadow-card">
          <p className="text-[11px] uppercase tracking-[0.14em] text-ivory/60">Total cost</p>
          <p className="mt-2 font-serif text-2xl">{usd(loan.totalCost)}</p>
        </article>
      </div>
      <div className="max-h-96 overflow-auto rounded-xl border border-navy/10">
        <table className="data-table min-w-[640px]">
          <thead className="sticky top-0">
            <tr>
              <th>Month</th>
              <th className="text-right">Payment</th>
              <th className="text-right">Principal</th>
              <th className="text-right">Interest</th>
              <th className="text-right">Balance</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.month} className="even:bg-ivory">
                <td>{row.month}</td>
                <td className="text-right tabular-nums">{usd(row.payment)}</td>
                <td className="text-right tabular-nums !text-blue-700">{usd(row.principal)}</td>
                <td className="text-right tabular-nums !text-red-700">{usd(row.interest)}</td>
                <td className="text-right font-semibold tabular-nums !text-gold">{usd(row.balance)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function Stat({ label, value, red }: { label: string; value: string; red?: boolean }) {
  return (
    <div>
      <p className="text-[10px] uppercase tracking-[0.14em] text-navy/50">{label}</p>
      <p className={`mt-2 font-serif text-xl ${red ? "text-red-700" : "text-navy"}`}>{value}</p>
    </div>
  );
}
