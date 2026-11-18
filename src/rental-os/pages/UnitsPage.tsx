import { useState } from "react";
import { Link } from "react-router-dom";
import { Home } from "lucide-react";
import { units, properties, inrK } from "../data";
import type { UnitStatus } from "../types";

const STATUS_COLORS: Record<UnitStatus, string> = {
  Occupied: "bg-emerald-50 text-emerald-800 ring-emerald-700/15",
  Available: "bg-blue-50 text-blue-800 ring-blue-700/15",
  Reserved: "bg-purple-50 text-purple-800 ring-purple-700/15",
  Vacant: "bg-amber-50 text-amber-900 ring-amber-700/20",
  "Under Maintenance": "bg-orange-50 text-orange-800 ring-orange-700/15",
  Offline: "bg-navy/5 text-navy/60 ring-navy/10",
};

export function UnitsPage() {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<UnitStatus | "All">("All");
  const [propertyFilter, setPropertyFilter] = useState("All");

  const filtered = units.filter((u) => {
    const matchSearch =
      u.unitNumber.toLowerCase().includes(search.toLowerCase()) ||
      (u.tenantName ?? "").toLowerCase().includes(search.toLowerCase());
    const matchStatus = statusFilter === "All" || u.status === statusFilter;
    const matchProp = propertyFilter === "All" || u.propertyId === propertyFilter;
    return matchSearch && matchStatus && matchProp;
  });

  const statCounts: Record<string, number> = {};
  units.forEach((u) => { statCounts[u.status] = (statCounts[u.status] ?? 0) + 1; });

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-serif text-2xl text-navy">Unit Register</h1>
          <p className="mt-1 text-sm text-navy/60">{units.length} units across {properties.length} properties</p>
        </div>
        <button className="inline-flex items-center gap-2 rounded-xl bg-[#C79A2B] px-4 py-2 text-sm font-semibold text-white shadow hover:bg-[#b8891e]">
          <Home className="h-4 w-4" /> Add Unit
        </button>
      </div>

      {/* Status pills */}
      <div className="flex flex-wrap gap-2">
        {(["All", "Occupied", "Available", "Vacant", "Reserved", "Under Maintenance", "Offline"] as const).map((s) => (
          <button
            key={s}
            onClick={() => setStatusFilter(s)}
            className={`rounded-full px-3 py-1 text-xs font-semibold transition ${
              statusFilter === s
                ? "bg-[#C79A2B] text-white"
                : "bg-white border border-navy/15 text-navy/60 hover:border-[#C79A2B]/40"
            }`}
          >
            {s} {s !== "All" && statCounts[s] !== undefined ? `(${statCounts[s]})` : s === "All" ? `(${units.length})` : ""}
          </button>
        ))}
      </div>

      <div className="rounded-2xl border border-navy/10 bg-white shadow-card">
        <div className="flex flex-wrap items-center gap-3 border-b border-navy/5 px-5 py-3">
          <input
            type="search"
            placeholder="Search unit / tenant…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full max-w-xs rounded-xl border border-navy/15 bg-ivory px-3 py-2 text-sm text-navy placeholder:text-navy/40 focus:outline-none focus:ring-2 focus:ring-[#C79A2B]/30"
          />
          <select
            value={propertyFilter}
            onChange={(e) => setPropertyFilter(e.target.value)}
            className="rounded-xl border border-navy/15 bg-ivory px-3 py-2 text-sm text-navy focus:outline-none focus:ring-2 focus:ring-[#C79A2B]/30"
          >
            <option value="All">All Properties</option>
            {properties.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
          <span className="ml-auto text-sm text-navy/50">{filtered.length} units</span>
        </div>
        <div className="overflow-x-auto">
          <table className="data-table min-w-[900px]">
            <thead>
              <tr>
                <th>Unit</th>
                <th>Property</th>
                <th>Type</th>
                <th className="text-right">Floor</th>
                <th className="text-right">Area (sqft)</th>
                <th className="text-right">Market Rent</th>
                <th className="text-right">Current Rent</th>
                <th>Tenant</th>
                <th>Status</th>
                <th>Lease End</th>
              </tr>
            </thead>
            <tbody>
              {filtered.slice(0, 100).map((unit) => {
                const prop = properties.find((p) => p.id === unit.propertyId);
                return (
                  <tr key={unit.id}>
                    <td className="font-semibold text-navy">{unit.unitNumber}</td>
                    <td className="text-sm text-navy/70">
                      <Link to={`/rental-os/properties/${unit.propertyId}`} className="hover:text-[#C79A2B] hover:underline">
                        {prop?.name ?? unit.propertyId}
                      </Link>
                    </td>
                    <td><span className="rounded bg-navy/5 px-1.5 py-0.5 text-xs text-navy/70">{unit.type}</span></td>
                    <td className="text-right tabular-nums">{unit.floor}</td>
                    <td className="text-right tabular-nums">{unit.areaSqft.toLocaleString()}</td>
                    <td className="text-right tabular-nums">{inrK(unit.marketRent)}</td>
                    <td className="text-right tabular-nums font-medium text-emerald-600">{unit.currentRent > 0 ? inrK(unit.currentRent) : "—"}</td>
                    <td className="text-sm text-navy/70">{unit.tenantName ?? <span className="text-navy/30">—</span>}</td>
                    <td>
                      <span className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-semibold ring-1 ring-inset ${STATUS_COLORS[unit.status]}`}>
                        {unit.status}
                      </span>
                    </td>
                    <td className="text-sm text-navy/60">
                      {unit.leaseEnd ? new Date(unit.leaseEnd).toLocaleDateString("en-IN") : "—"}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {filtered.length > 100 && (
            <p className="p-3 text-center text-xs text-navy/40">Showing 100 of {filtered.length} — use filters to narrow</p>
          )}
        </div>
      </div>
    </div>
  );
}
