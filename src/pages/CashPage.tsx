import { AiInsights } from "@/components/AiInsights";
import { KpiCard, Lede, Panel } from "@/components/ui";
import {
  entityById,
  entities,
  forecast,
  group,
  inrCr,
  insights,
  intercompany,
  loans,
  pct,
  signedInr,
} from "@/lib/demoData";

export function CashPage() {
  const monthlyEmi = loans.reduce((sum, loan) => sum + loan.emi, 0);
  const cashToDebt = (group.cash / group.debt) * 100;
  const maxCash = Math.max(...entities.map((entity) => entity.cash));
  const coverMonths = group.cash / monthlyEmi;
  const grossFlows = intercompany.reduce((sum, flow) => sum + flow.amount, 0);

  return (
    <div className="space-y-6">
      <Lede>
        Treasury view as on 17 Oct 2026. Opening cash is {inrCr(group.cash)}. The rolling forecast covers eight
        weeks of collections, construction outflows, and debt service.
      </Lede>

      <section className="grid gap-4 md:grid-cols-3">
        <KpiCard label="Total cash" value={inrCr(group.cash)} hint="Sum of cash across six entities" accent="gold" />
        <KpiCard
          label="Monthly EMI outflow"
          value={inrCr(monthlyEmi)}
          hint={`${coverMonths.toFixed(1)} months of cover on the tracked book`}
          accent="alert"
        />
        <KpiCard
          label="Cash to debt"
          value={pct(cashToDebt)}
          hint={`${inrCr(group.cash)} of cash against ${inrCr(group.debt)} of debt`}
        />
      </section>

      <Panel title="Cash by entity" subtitle="Horizontal share of group cash. ARL holds the operating reserve.">
        <ul className="space-y-4">
          {entities.map((entity) => (
            <li key={entity.id}>
              <div className="mb-1.5 flex items-baseline justify-between gap-3 text-sm">
                <span className="font-medium text-navy">
                  {entity.code}
                  <span className="ml-2 font-normal text-navy/55">{entity.name}</span>
                </span>
                <span className="shrink-0 tabular-nums text-navy">
                  {inrCr(entity.cash)}
                  <span className="ml-2 text-xs text-navy/50">{pct((entity.cash / group.cash) * 100)}</span>
                </span>
              </div>
              <div className="h-3 overflow-hidden rounded-full bg-navy/5" aria-hidden="true">
                <div
                  className="h-full rounded-full"
                  style={{
                    width: `${(entity.cash / maxCash) * 100}%`,
                    backgroundColor: entity.color,
                  }}
                />
              </div>
            </li>
          ))}
        </ul>
      </Panel>

      <Panel
        title="8-week rolling forecast"
        subtitle={`Opening balance ${inrCr(group.cash)} on 17 Oct 2026. The trough is the week of 23 Nov.`}
        bleed
      >
        <div className="overflow-x-auto">
          <table className="data-table min-w-[760px]">
            <thead>
              <tr>
                <th>Week</th>
                <th className="text-right">Inflows</th>
                <th className="text-right">Outflows</th>
                <th className="text-right">Net</th>
                <th className="text-right">Closing balance</th>
              </tr>
            </thead>
            <tbody>
              {forecast.map((week) => (
                <tr key={week.id} className={week.closing === 40.6 ? "bg-amber-50/70" : ""}>
                  <td>
                    <span className="font-semibold">{week.week}</span>
                    <span className="ml-2 text-navy/55">{week.label}</span>
                  </td>
                  <td className="text-right tabular-nums">{inrCr(week.inflows)}</td>
                  <td className="text-right tabular-nums">{inrCr(week.outflows)}</td>
                  <td className={`text-right tabular-nums ${week.net < 0 ? "text-red-700" : "text-emerald-800"}`}>
                    {signedInr(week.net)}
                  </td>
                  <td className="text-right font-medium tabular-nums">{inrCr(week.closing)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Panel>

      <Panel
        title="Intercompany flows"
        subtitle={`Open and recurring flows. Gross movement on this schedule is ${inrCr(grossFlows)}.`}
        bleed
      >
        <div className="overflow-x-auto">
          <table className="data-table min-w-[760px]">
            <thead>
              <tr>
                <th>From</th>
                <th>To</th>
                <th>Nature</th>
                <th>Timing</th>
                <th className="text-right">Amount</th>
              </tr>
            </thead>
            <tbody>
              {intercompany.map((flow) => {
                const from = entityById(flow.fromId);
                const to = entityById(flow.toId);
                return (
                  <tr key={flow.id}>
                    <td>
                      <span className="font-semibold">{from.code}</span>
                      <span className="mt-0.5 block text-xs text-navy/55">{from.name}</span>
                    </td>
                    <td>
                      <span className="font-semibold">{to.code}</span>
                      <span className="mt-0.5 block text-xs text-navy/55">{to.name}</span>
                    </td>
                    <td>{flow.nature}</td>
                    <td className="text-navy/70">{flow.timing}</td>
                    <td className="text-right font-medium tabular-nums">{inrCr(flow.amount)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Panel>

      <AiInsights page="Cash" insights={insights.Cash} />
    </div>
  );
}
