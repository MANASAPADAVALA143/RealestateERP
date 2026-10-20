import { AiInsights } from "@/components/AiInsights";
import { KpiCard, Lede, Panel } from "@/components/ui";
import { balanceSheet, entityById, inrCr, insights, inventoryClasses, pct } from "@/lib/demoData";

const classOrder = ["Land held for development", "Work in progress", "Finished stock", "Materials", "Stores"] as const;

export function InventoryPage() {
  const total = balanceSheet.reduce((sum, line) => sum + line.inventory, 0);
  const byClass = classOrder.map((name) => ({
    name,
    value: inventoryClasses.filter((row) => row.name === name).reduce((sum, row) => sum + row.value, 0),
  }));
  const finished = byClass.find((row) => row.name === "Finished stock")?.value ?? 0;
  const wip = byClass.find((row) => row.name === "Work in progress")?.value ?? 0;
  const maxClass = Math.max(...byClass.map((row) => row.value));

  return (
    <div className="space-y-6">
      <Lede>
        Stock, work in progress, land, and stores. The entity totals are the inventory column on the Assets page, so the two screens cannot drift.
      </Lede>

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard label="Total inventory" value={inrCr(total)} hint="Ties to the asset register" />
        <KpiCard label="Work in progress" value={inrCr(wip)} hint="Towers and housing still under construction" accent="gold" />
        <KpiCard label="Finished stock" value={inrCr(finished)} hint="Ready units, mostly ARL and AHS" />
        <KpiCard label="Days on hand" value="186" hint="Finished stock only. Land is excluded." accent="alert" />
      </section>

      <Panel title="Inventory classes" subtitle="Land at LBH is strategic stock. Do not treat it as a stores balance.">
        <ul className="space-y-3">
          {byClass.map((row) => (
            <li key={row.name} className="grid items-center gap-3 sm:grid-cols-[14rem_1fr_5.5rem]">
              <span className="text-sm font-medium text-navy">{row.name}</span>
              <div className="h-2.5 overflow-hidden rounded-full bg-navy/5">
                <div className="h-full rounded-full bg-navy" style={{ width: `${(row.value / (maxClass * 1.08)) * 100}%` }} />
              </div>
              <span className="text-sm font-semibold tabular-nums text-navy sm:text-right">{inrCr(row.value)}</span>
            </li>
          ))}
        </ul>
      </Panel>

      <Panel title="By entity" subtitle="PHC is zero because the holdco does not carry stock." bleed>
        <div className="overflow-x-auto">
          <table className="data-table min-w-[640px]">
            <thead>
              <tr>
                <th>Entity</th>
                <th className="text-right">Inventory</th>
                <th className="text-right">Share</th>
              </tr>
            </thead>
            <tbody>
              {balanceSheet.map((line) => {
                const entity = entityById(line.entityId);
                return (
                  <tr key={line.entityId}>
                    <td>
                      <p className="font-semibold">{entity.code}</p>
                      <p className="text-xs text-navy/55">{entity.name}</p>
                    </td>
                    <td className="text-right tabular-nums">{inrCr(line.inventory)}</td>
                    <td className="text-right tabular-nums">{total === 0 ? "0.0%" : pct((line.inventory / total) * 100)}</td>
                  </tr>
                );
              })}
            </tbody>
            <tfoot>
              <tr>
                <td>Group</td>
                <td className="text-right tabular-nums">{inrCr(total)}</td>
                <td className="text-right tabular-nums">100.0%</td>
              </tr>
            </tfoot>
          </table>
        </div>
      </Panel>

      <AiInsights page="Inventory" insights={insights.Inventory} />
    </div>
  );
}
