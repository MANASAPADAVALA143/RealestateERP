import { AiInsights } from "@/components/AiInsights";
import { KpiCard, Lede, Panel } from "@/components/ui";
import {
  entityById,
  group,
  inrCr,
  insights,
  pipelineByEntity,
  pipelineCycleDays,
  pipelineDeals,
  pipelineOpen,
  pipelineStages,
  pipelineWeighted,
  pipelineWinRate,
  pipelineWon,
  pct,
} from "@/lib/demoData";

export function SalesPipelinePage() {
  const maxStage = Math.max(...pipelineStages.map((row) => row.value));

  return (
    <div className="space-y-6">
      <Lede>
        Open bookings and bids across the six entities. Won bookings of {inrCr(pipelineWon)} are not the{" "}
        {inrCr(group.revenue)} of recognised group revenue.
      </Lede>

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard label="Open pipeline" value={inrCr(pipelineOpen)} hint="Priority deals are listed below the entity split." />
        <KpiCard label="Weighted" value={inrCr(pipelineWeighted)} hint="Each stage times its close probability" accent="gold" />
        <KpiCard label="Win rate" value={pct(pipelineWinRate)} hint="Closed-won divided by closed, FY26" />
        <KpiCard label="Average cycle" value={`${pipelineCycleDays} days`} hint="Lead to a signed booking" />
      </section>

      <Panel title="Pipeline by stage" subtitle="Lead through verbal commit. The bar length is rupees, not probability.">
        <ul className="space-y-3">
          {pipelineStages.map((row) => (
            <li key={row.stage} className="grid items-center gap-3 sm:grid-cols-[9rem_1fr_5.5rem]">
              <span className="text-sm font-medium text-navy">{row.stage}</span>
              <div className="h-2.5 overflow-hidden rounded-full bg-navy/5">
                <div
                  className="h-full rounded-full bg-navy"
                  style={{ width: `${(row.value / (maxStage * 1.08)) * 100}%`, backgroundColor: row.stage === "Verbal" ? "#C79A2B" : "#0B1D33" }}
                />
              </div>
              <span className="text-sm font-semibold tabular-nums text-navy sm:text-right">{inrCr(row.value)}</span>
            </li>
          ))}
        </ul>
      </Panel>

      <Panel title="Open pipeline by entity" subtitle="Same ₹124.00 Cr, split by the entity that would recognise the booking." bleed>
        <div className="overflow-x-auto">
          <table className="data-table min-w-[640px]">
            <thead>
              <tr>
                <th>Entity</th>
                <th className="text-right">Open</th>
                <th className="text-right">Share</th>
              </tr>
            </thead>
            <tbody>
              {pipelineByEntity.map((row) => {
                const entity = entityById(row.entityId);
                return (
                  <tr key={row.entityId}>
                    <td>
                      <p className="font-semibold">{entity.code}</p>
                      <p className="text-xs text-navy/55">{entity.name}</p>
                    </td>
                    <td className="text-right tabular-nums">{inrCr(row.value)}</td>
                    <td className="text-right tabular-nums">{pct((row.value / pipelineOpen) * 100)}</td>
                  </tr>
                );
              })}
            </tbody>
            <tfoot>
              <tr>
                <td>Group</td>
                <td className="text-right tabular-nums">{inrCr(pipelineOpen)}</td>
                <td className="text-right tabular-nums">100.0%</td>
              </tr>
            </tfoot>
          </table>
        </div>
      </Panel>

      <Panel title="Priority deals" subtitle="A working list, not every lead in the CRM." bleed>
        <div className="overflow-x-auto">
          <table className="data-table min-w-[920px]">
            <thead>
              <tr>
                <th>Deal</th>
                <th>Entity</th>
                <th>Stage</th>
                <th className="text-right">Value</th>
                <th className="text-right">Probability</th>
                <th>Owner</th>
                <th>Close</th>
              </tr>
            </thead>
            <tbody>
              {pipelineDeals.map((deal) => (
                <tr key={deal.id}>
                  <td className="font-medium">{deal.name}</td>
                  <td>{entityById(deal.entityId).code}</td>
                  <td>{deal.stage}</td>
                  <td className="text-right tabular-nums">{inrCr(deal.value)}</td>
                  <td className="text-right tabular-nums">{deal.probability}%</td>
                  <td>{deal.owner}</td>
                  <td>{deal.close}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Panel>

      <AiInsights page="Sales Pipeline" insights={insights["Sales Pipeline"]} />
    </div>
  );
}
