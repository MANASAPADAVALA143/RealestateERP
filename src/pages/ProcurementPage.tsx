import { AiInsights } from "@/components/AiInsights";
import { KpiCard, Lede, Panel } from "@/components/ui";
import {
  entityById,
  inrCr,
  insights,
  procurementOpen,
  procurementSavings,
  procurementSpend,
  procurementVendors,
  purchaseCategories,
  purchaseOrders,
} from "@/lib/demoData";

const statusClass: Record<string, string> = {
  Open: "bg-amber-50 text-amber-900 ring-amber-700/20",
  Partial: "bg-gold/15 text-navy ring-gold/30",
  Closed: "bg-emerald-50 text-emerald-800 ring-emerald-700/15",
};

export function ProcurementPage() {
  const maxCategory = Math.max(...purchaseCategories.map((row) => row.value));

  return (
    <div className="space-y-6">
      <Lede>
        FY26 purchase book for materials, contracts, and fees. Open purchase orders are the part not yet received.
      </Lede>

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard label="Spend" value={inrCr(procurementSpend)} hint="FY26 purchase book" accent="gold" />
        <KpiCard label="Open POs" value={inrCr(procurementOpen)} hint="Raised and not fully received" accent="alert" />
        <KpiCard label="Active vendors" value={String(procurementVendors)} hint="Three-way match is running at 94%" />
        <KpiCard label="Savings" value={inrCr(procurementSavings)} hint="Against the approved budget, 2.7%" />
      </section>

      <Panel title="Spend by category" subtitle="Cement and steel is the largest class, which matches the land and tower programme.">
        <ul className="space-y-3">
          {purchaseCategories.map((row) => (
            <li key={row.name} className="grid items-center gap-3 sm:grid-cols-[11rem_1fr_5.5rem]">
              <span className="text-sm font-medium text-navy">{row.name}</span>
              <div className="h-2.5 overflow-hidden rounded-full bg-navy/5">
                <div
                  className="h-full rounded-full bg-navy"
                  style={{ width: `${(row.value / (maxCategory * 1.08)) * 100}%` }}
                />
              </div>
              <span className="text-sm font-semibold tabular-nums text-navy sm:text-right">{inrCr(row.value)}</span>
            </li>
          ))}
        </ul>
      </Panel>

      <Panel title="Priority purchase orders" subtitle="The lines a CFO should read before the weekly buy review." bleed>
        <div className="overflow-x-auto">
          <table className="data-table min-w-[860px]">
            <thead>
              <tr>
                <th>PO</th>
                <th>Vendor</th>
                <th>Entity</th>
                <th className="text-right">Value</th>
                <th className="text-right">Received</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {purchaseOrders.map((order) => (
                <tr key={order.id}>
                  <td className="font-semibold">{order.id}</td>
                  <td>{order.vendor}</td>
                  <td>{entityById(order.entityId).code}</td>
                  <td className="text-right tabular-nums">{inrCr(order.value)}</td>
                  <td className="text-right tabular-nums">{order.received}%</td>
                  <td>
                    <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold ring-1 ring-inset ${statusClass[order.status]}`}>
                      {order.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Panel>

      <AiInsights page="Procurement" insights={insights.Procurement} />
    </div>
  );
}
