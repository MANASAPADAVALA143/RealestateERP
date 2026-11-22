import { useState } from "react";
import { Link } from "react-router-dom";
import { Plus } from "lucide-react";
import { useContracts } from "../hooks.ts";
import { StatusBadge, EmptyState, LoadingSpinner, PageHeader, ActionButton, inr } from "./shared.tsx";

export function ContractsPage() {
  const { data: contracts, loading } = useContracts();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");

  const expiringSoon = contracts.filter((c) => c.status === "Active" && c.endDate <= new Date(Date.now() + 30 * 86400000).toISOString().slice(0, 10));

  const filtered = contracts.filter((c) => {
    if (statusFilter && c.status !== statusFilter) return false;
    if (search && !`${c.contractNumber} ${c.vendorName} ${c.serviceCategory}`.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  if (loading) return <LoadingSpinner />;

  return (
    <div className="space-y-5">
      <PageHeader
        title="Vendor Contracts"
        action={
          <Link to="/rental-os/vendors/contracts/new">
            <ActionButton><Plus className="h-4 w-4" /> New Contract</ActionButton>
          </Link>
        }
      />

      {expiringSoon.length > 0 && (
        <div className="rounded-xl bg-amber-50 border border-amber-200 px-4 py-3 text-sm text-amber-800">
          ⚠ {expiringSoon.length} contract{expiringSoon.length !== 1 ? "s" : ""} expiring within 30 days:&nbsp;
          {expiringSoon.map((c) => c.contractNumber).join(", ")}
        </div>
      )}

      <div className="flex flex-wrap gap-3">
        <input
          className="flex-1 min-w-48 rounded-xl border border-navy/15 px-3 py-2 text-sm"
          placeholder="Search contracts…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <select className="rounded-xl border border-navy/15 px-3 py-2 text-sm" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
          <option value="">All Statuses</option>
          {["Draft", "Active", "Expired", "Terminated", "Renewed"].map((s) => <option key={s} value={s}>{s}</option>)}
        </select>
      </div>

      {filtered.length === 0 ? (
        <EmptyState message="No contracts found." />
      ) : (
        <div className="shadow-card overflow-hidden rounded-2xl bg-white">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-[#F8F6F0]">
                <tr>
                  {["Contract #", "Vendor", "Service Category", "Start", "End", "Value", "Status", ""].map((h) => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-navy/50">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-navy/5">
                {filtered.map((c) => {
                  const expiring = c.status === "Active" && c.endDate <= new Date(Date.now() + 30 * 86400000).toISOString().slice(0, 10);
                  return (
                    <tr key={c.id} className={`hover:bg-[#F8F6F0]/60 transition ${expiring ? "bg-amber-50/40" : ""}`}>
                      <td className="px-4 py-3 font-mono text-xs font-semibold text-navy">{c.contractNumber}</td>
                      <td className="px-4 py-3 font-medium text-navy">{c.vendorName}</td>
                      <td className="px-4 py-3 text-navy/70">{c.serviceCategory}</td>
                      <td className="px-4 py-3 text-navy/60">{c.startDate}</td>
                      <td className={`px-4 py-3 font-medium ${expiring ? "text-amber-700" : "text-navy/60"}`}>{c.endDate}</td>
                      <td className="px-4 py-3 text-right font-semibold text-[#C79A2B]">{inr(c.contractValue)}</td>
                      <td className="px-4 py-3"><StatusBadge status={c.status} /></td>
                      <td className="px-4 py-3">
                        <Link to={`/rental-os/vendors/contracts/${c.id}`} className="text-xs text-[#C79A2B] hover:underline">View</Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
