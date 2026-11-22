import { useState } from "react";
import { Link } from "react-router-dom";
import { Plus } from "lucide-react";
import { useAssets } from "../hooks.ts";
import { StatusBadge, EmptyState, LoadingSpinner, PageHeader, ActionButton, inr } from "./shared.tsx";
import type { AssetCategory, AssetCondition } from "../types.ts";

const CONDITIONS: AssetCondition[] = ["Excellent", "Good", "Fair", "Poor", "Decommissioned"];
const conditionColor: Record<AssetCondition, string> = {
  Excellent: "text-emerald-600",
  Good: "text-blue-600",
  Fair: "text-amber-600",
  Poor: "text-red-600",
  Decommissioned: "text-gray-500",
};

export function AssetRegisterPage() {
  const { data: assets, loading } = useAssets();
  const [search, setSearch] = useState("");
  const [catFilter, setCatFilter] = useState<AssetCategory | "">("");
  const [condFilter, setCondFilter] = useState<AssetCondition | "">("");

  const filtered = assets.filter((a) => {
    if (catFilter && a.category !== catFilter) return false;
    if (condFilter && a.condition !== condFilter) return false;
    if (search && !`${a.assetCode} ${a.name} ${a.propertyName}`.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  if (loading) return <LoadingSpinner />;

  return (
    <div className="space-y-5">
      <PageHeader
        title="Asset Register"
        action={
          <Link to="/rental-os/facilities/assets/new">
            <ActionButton><Plus className="h-4 w-4" /> Add Asset</ActionButton>
          </Link>
        }
      />

      <div className="flex flex-wrap gap-3">
        <input
          className="flex-1 min-w-48 rounded-xl border border-navy/15 px-3 py-2 text-sm"
          placeholder="Search assets…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <select className="rounded-xl border border-navy/15 px-3 py-2 text-sm" value={catFilter} onChange={(e) => setCatFilter(e.target.value as any)}>
          <option value="">All Categories</option>
          {["HVAC", "Elevator", "Generator", "Pump", "Electrical", "Fire Safety", "Water System", "Security", "Common Area"].map((c) => <option key={c} value={c}>{c}</option>)}
        </select>
        <select className="rounded-xl border border-navy/15 px-3 py-2 text-sm" value={condFilter} onChange={(e) => setCondFilter(e.target.value as any)}>
          <option value="">All Conditions</option>
          {CONDITIONS.map((c) => <option key={c} value={c}>{c}</option>)}
        </select>
      </div>

      {filtered.length === 0 ? (
        <EmptyState message="No assets found. Add your first facility asset." />
      ) : (
        <div className="shadow-card overflow-hidden rounded-2xl bg-white">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-[#F8F6F0]">
                <tr>
                  {["Asset Code", "Name", "Category", "Property / Location", "Condition", "Status", "Warranty", "Acq. Cost", ""].map((h) => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-navy/50">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-navy/5">
                {filtered.map((a) => (
                  <tr key={a.id} className="hover:bg-[#F8F6F0]/60 transition">
                    <td className="px-4 py-3 font-mono text-xs font-semibold text-navy">{a.assetCode}</td>
                    <td className="px-4 py-3 font-medium text-navy">{a.name}</td>
                    <td className="px-4 py-3 text-navy/70">{a.category}</td>
                    <td className="px-4 py-3 text-navy/70">{a.propertyName} · {a.location}</td>
                    <td className={`px-4 py-3 font-medium ${conditionColor[a.condition]}`}>{a.condition}</td>
                    <td className="px-4 py-3"><StatusBadge status={a.status} /></td>
                    <td className="px-4 py-3 text-navy/60">{a.warrantyExpiry ?? "—"}</td>
                    <td className="px-4 py-3 text-right font-semibold text-[#C79A2B]">{a.acquisitionCost ? inr(a.acquisitionCost) : "—"}</td>
                    <td className="px-4 py-3">
                      <Link to={`/rental-os/facilities/assets/${a.id}`} className="text-xs text-[#C79A2B] hover:underline">View</Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="px-4 py-2 text-xs text-navy/40 border-t border-navy/5">{filtered.length} asset{filtered.length !== 1 ? "s" : ""}</p>
        </div>
      )}
    </div>
  );
}
