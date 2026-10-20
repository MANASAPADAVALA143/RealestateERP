import { Link } from "react-router-dom";
import { AiInsights } from "@/components/AiInsights";
import { Lede, Panel, StatusBadge } from "@/components/ui";
import { deLabel, ebitdaMargin, entities, group, inrCr, insights, pct } from "@/lib/demoData";

export function CompaniesPage() {
  const maxDe = Math.max(...entities.map((entity) => entity.debt / entity.equity));

  return (
    <div className="space-y-6">
      <Lede>
        Legal-entity register for Agarwal Group. Debt to equity on the group is {deLabel(group.debt, group.equity)}.
        Status is a management view: Healthy, Watch, or Stress.
      </Lede>

      <Panel
        title="Leverage map"
        subtitle="Debt divided by equity. LBH is the outlier. AFM is the lightest balance sheet in the group."
      >
        <ul className="space-y-3">
          {entities.map((entity) => {
            const ratio = entity.debt / entity.equity;
            return (
              <li key={entity.id} className="grid items-center gap-3 sm:grid-cols-[9rem_1fr_4.5rem]">
                <span className="text-sm font-medium text-navy">
                  {entity.code}
                  <span className="ml-2 text-xs font-normal text-navy/50">{entity.role}</span>
                </span>
                <div className="h-2.5 overflow-hidden rounded-full bg-navy/5">
                  <div
                    className="h-full rounded-full"
                    style={{
                      width: `${(ratio / (maxDe * 1.08)) * 100}%`,
                      backgroundColor: entity.status === "Watch" ? "#C79A2B" : "#0B1D33",
                    }}
                  />
                </div>
                <span className="text-sm font-semibold tabular-nums text-navy sm:text-right">
                  {deLabel(entity.debt, entity.equity)}
                </span>
              </li>
            );
          })}
        </ul>
      </Panel>

      <Panel title="Entity register" subtitle="Revenue, assets, debt, equity, leverage, cash, and status." bleed>
        <div className="overflow-x-auto">
          <table className="data-table min-w-[980px]">
            <thead>
              <tr>
                <th>Entity</th>
                <th className="text-right">Revenue</th>
                <th className="text-right">EBITDA</th>
                <th className="text-right">Assets</th>
                <th className="text-right">Debt</th>
                <th className="text-right">Equity</th>
                <th className="text-right">D/E</th>
                <th className="text-right">Cash</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {entities.map((entity) => (
                <tr key={entity.id} className={entity.status === "Watch" ? "bg-amber-50/40" : ""}>
                  <td>
                    <Link to={`/companies/${entity.id}`} className="font-semibold text-navy underline-offset-2 hover:underline">
                      {entity.code}
                    </Link>
                    <p className="text-xs text-navy/55">{entity.name}</p>
                  </td>
                  <td className="text-right tabular-nums">{inrCr(entity.revenue)}</td>
                  <td className="text-right tabular-nums">{pct(ebitdaMargin(entity))}</td>
                  <td className="text-right tabular-nums">{inrCr(entity.assets)}</td>
                  <td className="text-right tabular-nums">{inrCr(entity.debt)}</td>
                  <td className="text-right tabular-nums">{inrCr(entity.equity)}</td>
                  <td className="text-right tabular-nums">{deLabel(entity.debt, entity.equity)}</td>
                  <td className="text-right tabular-nums">{inrCr(entity.cash)}</td>
                  <td>
                    <StatusBadge status={entity.status} />
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr>
                <td>Group</td>
                <td className="text-right tabular-nums">{inrCr(group.revenue)}</td>
                <td className="text-right tabular-nums">{pct(group.ebitdaMargin)}</td>
                <td className="text-right tabular-nums">{inrCr(group.assets)}</td>
                <td className="text-right tabular-nums">{inrCr(group.debt)}</td>
                <td className="text-right tabular-nums">{inrCr(group.equity)}</td>
                <td className="text-right tabular-nums">{deLabel(group.debt, group.equity)}</td>
                <td className="text-right tabular-nums">{inrCr(group.cash)}</td>
                <td />
              </tr>
            </tfoot>
          </table>
        </div>
      </Panel>

      <AiInsights page="Companies" insights={insights.Companies} />
    </div>
  );
}
