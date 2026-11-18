import { useState } from "react";
import { Link, useParams } from "react-router-dom";
import { Building2, MapPin, ArrowLeft, ChevronRight } from "lucide-react";
import { properties, buildings, computeKpis, inrL, inrCr } from "../data";

function StatusPill({ status }: { status: string }) {
  const cls =
    status === "Active" ? "bg-emerald-50 text-emerald-800 ring-emerald-700/15"
    : status === "Under Development" ? "bg-amber-50 text-amber-900 ring-amber-700/20"
    : "bg-navy/5 text-navy/60 ring-navy/10";
  return (
    <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold ring-1 ring-inset ${cls}`}>
      {status}
    </span>
  );
}

function PropertyDetail({ id }: { id: string }) {
  const prop = properties.find((p) => p.id === id);
  if (!prop) return <div className="p-8 text-navy/50">Property not found.</div>;
  const kpi = computeKpis(prop.id);
  const propBuildings = buildings.filter((b) => b.propertyId === prop.id);
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <Link to="/rental-os/properties" className="flex items-center gap-1 text-sm text-[#C79A2B] hover:underline">
          <ArrowLeft className="h-4 w-4" /> Properties
        </Link>
        <ChevronRight className="h-4 w-4 text-navy/30" />
        <span className="text-sm text-navy">{prop.name}</span>
      </div>

      <div className="rounded-2xl border border-navy/10 bg-white p-6 shadow-card">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-[#C79A2B]">{prop.code}</p>
            <h1 className="mt-1 font-serif text-2xl text-navy">{prop.name}</h1>
            <p className="mt-1 flex items-center gap-1 text-sm text-navy/60">
              <MapPin className="h-3.5 w-3.5" /> {prop.address}, {prop.city}, {prop.state}
            </p>
          </div>
          <StatusPill status={prop.status} />
        </div>
        <div className="mt-5 grid grid-cols-2 gap-4 border-t border-navy/5 pt-5 sm:grid-cols-4">
          {[
            { label: "Category", value: prop.category },
            { label: "Entity", value: prop.entityName },
            { label: "Manager", value: prop.propertyManager },
            { label: "Currency", value: prop.currency },
            { label: "Land Area", value: `${prop.landAreaSqft.toLocaleString()} sq ft` },
            { label: "Built-up Area", value: `${prop.builtUpAreaSqft.toLocaleString()} sq ft` },
            { label: "Acquisition Cost", value: inrCr(prop.acquisitionCost) },
            { label: "Current Valuation", value: inrCr(prop.currentValuation) },
          ].map((f) => (
            <div key={f.label}>
              <p className="text-[10px] uppercase tracking-widest text-navy/40">{f.label}</p>
              <p className="mt-0.5 text-sm font-medium text-navy">{f.value}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {[
          { label: "Total Units", value: String(kpi.totalUnits), color: "border-t-[#C79A2B]" },
          { label: "Occupied", value: `${kpi.occupied} (${kpi.occupancyPct.toFixed(1)}%)`, color: "border-t-emerald-500" },
          { label: "Vacant", value: String(kpi.vacant), color: "border-t-red-400" },
          { label: "Monthly Potential", value: inrL(kpi.monthlyPotential), color: "border-t-blue-500" },
        ].map((k) => (
          <div key={k.label} className={`rounded-2xl border border-navy/10 border-t-4 ${k.color} bg-white p-4 shadow-card`}>
            <p className="text-[11px] uppercase tracking-widest text-navy/50">{k.label}</p>
            <p className="mt-2 font-serif text-2xl text-navy">{k.value}</p>
          </div>
        ))}
      </div>

      <div className="rounded-2xl border border-navy/10 bg-white shadow-card">
        <div className="border-b border-navy/5 px-5 py-4">
          <h2 className="font-serif text-lg text-navy">Buildings</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="data-table">
            <thead><tr><th>Code</th><th>Name</th><th>Floors</th><th className="text-right">Units</th><th>Year Built</th><th>Status</th><th></th></tr></thead>
            <tbody>
              {propBuildings.map((b) => (
                <tr key={b.id}>
                  <td className="font-mono text-xs text-navy/50">{b.code}</td>
                  <td className="font-medium text-navy">{b.name}</td>
                  <td>{b.floors}</td>
                  <td className="text-right tabular-nums">{b.totalUnits}</td>
                  <td>{b.yearBuilt ?? "—"}</td>
                  <td><span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${b.status === "Active" ? "bg-emerald-50 text-emerald-700" : "bg-navy/5 text-navy/50"}`}>{b.status}</span></td>
                  <td><Link to={`/rental-os/buildings/${b.id}`} className="text-xs text-[#C79A2B] hover:underline">View</Link></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

export function PropertiesPage() {
  const { id } = useParams<{ id?: string }>();
  if (id) return <PropertyDetail id={id} />;

  const [search, setSearch] = useState("");
  const filtered = properties.filter(
    (p) => p.name.toLowerCase().includes(search.toLowerCase()) || p.city.toLowerCase().includes(search.toLowerCase()) || p.code.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-serif text-2xl text-navy">Property Register</h1>
          <p className="mt-1 text-sm text-navy/60">{properties.length} properties across {new Set(properties.map((p) => p.entityId)).size} entities</p>
        </div>
        <button className="inline-flex items-center gap-2 rounded-xl bg-[#C79A2B] px-4 py-2 text-sm font-semibold text-white shadow hover:bg-[#b8891e]">
          <Building2 className="h-4 w-4" /> Add Property
        </button>
      </div>

      <div className="rounded-2xl border border-navy/10 bg-white shadow-card">
        <div className="border-b border-navy/5 px-5 py-3">
          <input
            type="search"
            placeholder="Search properties…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full max-w-xs rounded-xl border border-navy/15 bg-ivory px-3 py-2 text-sm text-navy placeholder:text-navy/40 focus:outline-none focus:ring-2 focus:ring-[#C79A2B]/30"
          />
        </div>
        <div className="overflow-x-auto">
          <table className="data-table min-w-[900px]">
            <thead>
              <tr>
                <th>Property</th>
                <th>Category</th>
                <th>Entity</th>
                <th>City</th>
                <th className="text-right">Units</th>
                <th className="text-right">Occ%</th>
                <th className="text-right">Valuation</th>
                <th>Status</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((prop) => {
                const kpi = computeKpis(prop.id);
                return (
                  <tr key={prop.id}>
                    <td>
                      <p className="font-semibold text-navy">{prop.name}</p>
                      <p className="font-mono text-[10px] text-navy/40">{prop.code}</p>
                    </td>
                    <td><span className="rounded-full bg-navy/5 px-2 py-0.5 text-xs text-navy/70">{prop.category}</span></td>
                    <td className="text-sm text-navy/70">{prop.entityId}</td>
                    <td className="text-sm text-navy/70">{prop.city}</td>
                    <td className="text-right tabular-nums">{kpi.totalUnits}</td>
                    <td className="text-right tabular-nums">
                      <span className={kpi.occupancyPct >= 85 ? "text-emerald-600 font-medium" : kpi.occupancyPct >= 70 ? "text-amber-600 font-medium" : "text-red-600 font-medium"}>
                        {kpi.occupancyPct.toFixed(1)}%
                      </span>
                    </td>
                    <td className="text-right tabular-nums text-sm">{inrCr(prop.currentValuation)}</td>
                    <td><StatusPill status={prop.status} /></td>
                    <td>
                      <Link to={`/rental-os/properties/${prop.id}`} className="text-xs font-medium text-[#C79A2B] hover:underline">
                        View →
                      </Link>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
