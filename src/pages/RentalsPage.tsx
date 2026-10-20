import { Link } from "react-router-dom";
import { Attention } from "@/components/drill";
import { useSort } from "@/components/drill";
import { KpiCard, Lede, Panel } from "@/components/ui";
import { inrLakh, rentalKpis, rentalProperties, type RentalProperty } from "@/lib/drillData";

const statusClass = {
  Healthy: "bg-emerald-50 text-emerald-800 ring-emerald-700/15",
  "At Risk": "bg-amber-50 text-amber-900 ring-amber-700/20",
  Critical: "bg-red-50 text-red-800 ring-red-700/15",
};

export function RentalsPage() {
  const { sorted, toggle } = useSort<RentalProperty>(rentalProperties);
  return (
    <div className="space-y-6">
      <Lede>
        Leased stock across Jaipur and Ajmer. Occupancy is occupied units divided by the 284 unit register.
      </Lede>
      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard label="Total properties" value={String(rentalKpis.properties)} hint={`${rentalKpis.units} units on the register`} />
        <KpiCard label="Occupied" value={String(rentalKpis.occupied)} hint={`${rentalKpis.vacant} vacant`} />
        <KpiCard label="Occupancy rate" value={`${rentalKpis.occupancy.toFixed(1)}%`} hint="261 of 284 units" accent="gold" />
        <KpiCard label="Monthly rent roll" value={inrLakh(rentalKpis.rentRoll)} hint={`Collected ${inrLakh(rentalKpis.collected)} · ${rentalKpis.collection.toFixed(1)}%`} accent="alert" />
      </section>
      <Panel title="Needs attention">
        <Attention
          items={[
            { text: "3 units with rent overdue more than 30 days", value: "₹2.1 L outstanding" },
            { text: "2 leases expiring within 60 days" },
            { text: "1 property below 80% occupancy — Indore facility" },
          ]}
        />
      </Panel>
      <Panel title="Rental insights">
        <ul className="space-y-2 text-sm text-navy/80">
          <li>Best performing: ARL — Rajpur Road (₹9.2 L/mo, 96% occupancy)</li>
          <li>Highest vacancy loss: LBH — MG Road (₹1.8 L/mo)</li>
          <li>Average lease term: 24 months</li>
        </ul>
      </Panel>
      <Panel title="Property performance" subtitle="Open a row for the unit register." bleed>
        <div className="overflow-x-auto">
          <table className="data-table min-w-[980px]">
            <thead>
              <tr>
                <th><button type="button" onClick={() => toggle("name")}>Property</button></th>
                <th><button type="button" onClick={() => toggle("entityId")}>Entity</button></th>
                <th className="text-right"><button type="button" onClick={() => toggle("units")}>Units</button></th>
                <th className="text-right">Occupied</th>
                <th className="text-right">Occ%</th>
                <th className="text-right"><button type="button" onClick={() => toggle("expected")}>Expected rent</button></th>
                <th className="text-right"><button type="button" onClick={() => toggle("collected")}>Collected rent</button></th>
                <th className="text-right">Vacancy loss</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {sorted.map((property) => {
                const occ = (property.occupied / property.units) * 100;
                const loss = property.expected - property.collected;
                return (
                  <tr key={property.id}>
                    <td>
                      <Link to={`/rentals/${property.id}`} className="font-semibold text-navy underline-offset-2 hover:underline">
                        {property.name}, {property.place}
                      </Link>
                    </td>
                    <td>
                      <Link to={`/companies/${property.entityId}`} className="font-semibold">
                        {property.entityId}
                      </Link>
                    </td>
                    <td className="text-right tabular-nums">{property.units}</td>
                    <td className="text-right tabular-nums">{property.occupied}</td>
                    <td className="text-right tabular-nums">{occ.toFixed(1)}%</td>
                    <td className="text-right tabular-nums">{inrLakh(property.expected)}</td>
                    <td className="text-right tabular-nums">{inrLakh(property.collected)}</td>
                    <td className="text-right tabular-nums">{inrLakh(loss)}</td>
                    <td>
                      <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold ring-1 ring-inset ${statusClass[property.status]}`}>
                        {property.status}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Panel>
    </div>
  );
}
