import { useParams } from "react-router-dom";
import { Crumb, useSort } from "@/components/drill";
import { Lede, Panel } from "@/components/ui";
import { rentalById, unitsFor, type UnitRow } from "@/lib/drillData";

export function RentalPropertyPage() {
  const { propertyId = "" } = useParams();
  const property = rentalById(propertyId);
  const units = property ? unitsFor(property) : [];
  const { sorted, toggle } = useSort<UnitRow>(units);
  if (!property) return <p className="text-sm text-navy/70">That property is not on the rental register.</p>;
  return (
    <div className="space-y-6">
      <Crumb
        items={[
          { label: "Group CFO", to: "/" },
          { label: "Rentals", to: "/rentals" },
          { label: property.name },
        ]}
      />
      <Lede>
        {property.name}, {property.place}. {property.occupied} of {property.units} units are occupied. Entity {property.entityId}.
      </Lede>
      <Panel title="Unit register" bleed>
        <div className="max-h-[32rem] overflow-auto">
          <table className="data-table min-w-[820px]">
            <thead className="sticky top-0">
              <tr>
                <th><button type="button" onClick={() => toggle("name")}>Unit name</button></th>
                <th><button type="button" onClick={() => toggle("status")}>Status</button></th>
                <th>Tenant</th>
                <th>Lease start</th>
                <th>Lease end</th>
                <th className="text-right">Rent/mo</th>
                <th className="text-right">Vacancy loss</th>
              </tr>
            </thead>
            <tbody>
              {sorted.map((unit) => (
                <tr key={unit.name} className={unit.status === "Vacant" ? "bg-amber-50/50" : ""}>
                  <td className="font-medium">{unit.name}</td>
                  <td>{unit.status}</td>
                  <td>{unit.tenant}</td>
                  <td>{unit.start}</td>
                  <td>{unit.end}</td>
                  <td className="text-right tabular-nums">{unit.rent}</td>
                  <td className="text-right tabular-nums">{unit.loss}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Panel>
    </div>
  );
}
