import { Link } from "react-router-dom";
import { AiInsights } from "@/components/AiInsights";
import { KpiCard, Lede, LoanBadge, Panel } from "@/components/ui";
import { group, inrCr, insights, loans, pct, rateLabel } from "@/lib/demoData";

export function LoansPage() {
  const sanctioned = loans.reduce((sum, loan) => sum + loan.sanctioned, 0);
  const outstanding = loans.reduce((sum, loan) => sum + loan.outstanding, 0);
  const monthlyEmi = loans.reduce((sum, loan) => sum + loan.emi, 0);
  const weighted =
    loans.reduce((sum, loan) => sum + loan.outstanding * loan.rate, 0) / outstanding;
  const overdue = loans.filter((loan) => loan.status === "Overdue").length;
  const outside = group.debt - outstanding;

  return (
    <div className="space-y-6">
      <Lede>
        Eight tracked facilities. Outstanding on this schedule is {inrCr(outstanding)} of group debt{" "}
        {inrCr(group.debt)}. The balance of {inrCr(outside)} sits in vehicle, project, and related-party lines.
      </Lede>

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard label="Sanctioned" value={inrCr(sanctioned)} hint="Limits on the eight facilities" />
        <KpiCard label="Outstanding" value={inrCr(outstanding)} hint={`${inrCr(sanctioned - outstanding)} still undrawn`} accent="alert" />
        <KpiCard label="Monthly EMI" value={inrCr(monthlyEmi)} hint="Contracted debt service on this book" />
        <KpiCard
          label="Weighted rate"
          value={rateLabel(weighted)}
          hint={`${overdue} facility is Overdue · ${loans.filter((loan) => loan.status === "Watch").length} on Watch`}
          accent="gold"
        />
      </section>

      <Panel title="Loan book" subtitle="Lender, entity, type, limits, price, service, maturity, LTV, and status." bleed>
        <div className="overflow-x-auto">
          <table className="data-table min-w-[1180px]">
            <thead>
              <tr>
                <th>Lender</th>
                <th>Entity</th>
                <th>Type</th>
                <th className="text-right">Sanctioned</th>
                <th className="text-right">Outstanding</th>
                <th className="text-right">Rate</th>
                <th className="text-right">EMI</th>
                <th>Maturity</th>
                <th className="text-right">LTV</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {loans.map((loan) => (
                <tr key={loan.id} className={loan.status === "Overdue" ? "bg-red-50/60" : loan.status === "Watch" ? "bg-amber-50/50" : ""}>
                  <td className="font-medium">
                    <Link to={`/loans/${loan.id}`} className="underline-offset-2 hover:underline">{loan.lender}</Link>
                  </td>
                  <td>
                    <span className="font-semibold">{loan.entityId}</span>
                    <span className="mt-0.5 block text-xs text-navy/55">{loan.entityName}</span>
                  </td>
                  <td>{loan.type}</td>
                  <td className="text-right tabular-nums">{inrCr(loan.sanctioned)}</td>
                  <td className="text-right tabular-nums">{inrCr(loan.outstanding)}</td>
                  <td className="text-right tabular-nums">{rateLabel(loan.rate)}</td>
                  <td className="text-right tabular-nums">{inrCr(loan.emi)}</td>
                  <td className="whitespace-nowrap">{loan.maturity}</td>
                  <td className="text-right tabular-nums">{pct(loan.ltv)}</td>
                  <td>
                    <LoanBadge status={loan.status} />
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr>
                <td colSpan={3}>Tracked book</td>
                <td className="text-right tabular-nums">{inrCr(sanctioned)}</td>
                <td className="text-right tabular-nums">{inrCr(outstanding)}</td>
                <td className="text-right tabular-nums">{rateLabel(weighted)}</td>
                <td className="text-right tabular-nums">{inrCr(monthlyEmi)}</td>
                <td colSpan={3} />
              </tr>
            </tfoot>
          </table>
        </div>
      </Panel>

      <AiInsights page="Loans" insights={insights.Loans} />
    </div>
  );
}
