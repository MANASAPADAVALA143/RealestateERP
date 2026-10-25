import { Card, DemoButton, Kpi, Progress, RePage, StatusPill } from "@/realestate/ui";
import { capital, capitalCalls, usd } from "@/realestate/data";

export function ReCapitalCallsPage() {
  return (
    <RePage page="Capital Calls" title="Capital Calls" right={<DemoButton primary>+ New Capital Call</DemoButton>}>
      <section className="grid grid-cols-2 gap-3 xl:grid-cols-4">
        <Kpi label="Total called" value={usd(capital.called)} />
        <Kpi label="Funded" value={usd(capital.funded)} tone="green" hint="69.5%" />
        <Kpi label="Pending" value={usd(capital.pending)} tone="amber" hint="30.5%" />
        <Kpi label="Partners" value="2" />
      </section>
      <Card>
        <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
          <span className="font-semibold">69% funded</span>
          <span className="text-navy/60">$164,000 of $236,000</span>
        </div>
        <Progress pct={69} />
      </Card>
      <Card title="Calls">
        <div className="overflow-x-auto">
          <table className="data-table min-w-[860px]">
            <thead>
              <tr>
                <th>Call #</th>
                <th>Date</th>
                <th className="text-right">Amount</th>
                <th>Purpose</th>
                <th>Status</th>
                <th className="text-right">% funded</th>
              </tr>
            </thead>
            <tbody>
              {capitalCalls.map((row) => (
                <tr key={row.id}>
                  <td className="font-medium">{row.id}</td>
                  <td>{row.date}</td>
                  <td className="text-right tabular-nums">{usd(row.amount)}</td>
                  <td>{row.purpose}</td>
                  <td><StatusPill text={row.status} tone={row.status === "Funded" ? "green" : "amber"} /></td>
                  <td className="text-right tabular-nums">{row.funded}%</td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr>
                <td colSpan={2}>Total</td>
                <td className="text-right tabular-nums">{usd(capital.called)}</td>
                <td colSpan={3} />
              </tr>
            </tfoot>
          </table>
        </div>
      </Card>
    </RePage>
  );
}
