import { Card, DemoButton, Kpi, RePage, StatusPill } from "@/realestate/ui";
import { partners, portfolio, usd, usdSigned } from "@/realestate/data";

export function ReOwnershipPage() {
  return (
    <RePage page="Ownership Detail" title="Ownership Detail" right={<DemoButton primary>+ Add Partner</DemoButton>}>
      <section className="grid grid-cols-2 gap-3 xl:grid-cols-4">
        <Kpi label="Capital invested" value={usd(portfolio.landCost)} hint="2 partners" />
        <Kpi label="Investment value" value={usd(portfolio.marketValue)} />
        <Kpi label="Returns" value={usdSigned(portfolio.unrealized)} tone="green" hint="105.4% ROI" />
        <Kpi label="Ownership" value="2" hint="active partners" />
      </section>
      <Card title="Partners">
        <div className="overflow-x-auto">
          <table className="data-table min-w-[980px]">
            <thead>
              <tr>
                <th>Partner</th>
                <th>Property</th>
                <th className="text-right">Share</th>
                <th className="text-right">Invested</th>
                <th className="text-right">Value</th>
                <th className="text-right">Gain</th>
                <th className="text-right">ROI</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {partners.map((row) => (
                <tr key={row.name}>
                  <td className="font-medium">{row.name}</td>
                  <td>{row.name === "Alex Meridian" ? "1790 Meridian Blvd, Carrollton TX" : row.property}</td>
                  <td className="text-right tabular-nums">{row.share.toFixed(1)}%</td>
                  <td className="text-right tabular-nums">{usd(row.invested)}</td>
                  <td className="text-right tabular-nums">{usd(row.value)}</td>
                  <td className="text-right tabular-nums text-blue-700">{usdSigned(row.gain)}</td>
                  <td className="text-right tabular-nums">{row.roi.toFixed(1)}%</td>
                  <td><StatusPill text="Active" tone="green" /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </RePage>
  );
}
