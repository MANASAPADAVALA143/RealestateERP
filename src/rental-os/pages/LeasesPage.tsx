import { useState } from "react";
import { Link, useParams } from "react-router-dom";
import { FileText, ArrowLeft, ChevronRight, Calendar } from "lucide-react";
import { leases } from "../data";
import type { LeaseStatus } from "../types";

function daysLeft(endDate: string) {
  return Math.ceil((new Date(endDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
}

function LeaseDetail({ id }: { id: string }) {
  const lease = leases.find((l) => l.id === id);
  if (!lease) return <div className="p-8 text-navy/50">Lease not found.</div>;
  const days = daysLeft(lease.endDate);
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <Link to="/rental-os/leases" className="flex items-center gap-1 text-sm text-[#C79A2B] hover:underline">
          <ArrowLeft className="h-4 w-4" /> Leases
        </Link>
        <ChevronRight className="h-4 w-4 text-navy/30" />
        <span className="text-sm text-navy">{lease.code}</span>
      </div>

      <div className="rounded-2xl border border-navy/10 bg-white p-6 shadow-card">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-[#C79A2B]">{lease.code}</p>
            <h1 className="mt-1 font-serif text-2xl text-navy">{lease.tenantName}</h1>
            <p className="mt-1 text-sm text-navy/60">
              {lease.propertyName} · Unit {lease.unitNumber}
            </p>
          </div>
          <div className="flex items-center gap-3">
            {lease.status === "Active" && (
              <span className={`text-xs font-semibold ${days <= 30 ? "text-red-600" : days <= 90 ? "text-amber-600" : "text-emerald-600"}`}>
                {days > 0 ? `${days}d remaining` : "Expired"}
              </span>
            )}
            <span className={`rounded-full px-3 py-1 text-xs font-semibold ring-1 ring-inset ${
              lease.status === "Active" ? "bg-emerald-50 text-emerald-800 ring-emerald-700/15"
              : lease.status === "Expired" ? "bg-navy/5 text-navy/60 ring-navy/10"
              : "bg-amber-50 text-amber-900 ring-amber-700/20"
            }`}>{lease.status}</span>
          </div>
        </div>

        <div className="mt-5 grid grid-cols-2 gap-5 border-t border-navy/5 pt-5 sm:grid-cols-3">
          {[
            { label: "Start Date", value: new Date(lease.startDate).toLocaleDateString("en-IN") },
            { label: "End Date", value: new Date(lease.endDate).toLocaleDateString("en-IN") },
            { label: "Monthly Rent", value: `₹${lease.monthlyRent.toLocaleString()}` },
            { label: "Security Deposit", value: `₹${lease.securityDeposit.toLocaleString()}` },
            { label: "CAM Charges", value: `₹${lease.camCharges.toLocaleString()}` },
            { label: "Parking Charges", value: lease.parkingCharges > 0 ? `₹${lease.parkingCharges.toLocaleString()}` : "—" },
            { label: "Utilities Deposit", value: lease.utilitiesDeposit > 0 ? `₹${lease.utilitiesDeposit.toLocaleString()}` : "—" },
            { label: "Escalation", value: `${lease.escalationPct}% p.a.` },
            { label: "Notice Period", value: `${lease.noticePeriodDays} days` },
            { label: "Rent-free Period", value: lease.rentFreePeriodDays > 0 ? `${lease.rentFreePeriodDays} days` : "—" },
            { label: "Currency", value: lease.currency },
          ].map((f) => (
            <div key={f.label}>
              <p className="text-[10px] uppercase tracking-widest text-navy/40">{f.label}</p>
              <p className="mt-0.5 text-sm font-semibold text-navy">{f.value}</p>
            </div>
          ))}
        </div>

        <div className="mt-6 flex gap-3 border-t border-navy/5 pt-5">
          <Link to={`/rental-os/tenants/${lease.tenantId}`} className="rounded-xl border border-[#C79A2B]/30 px-4 py-2 text-xs font-semibold text-[#C79A2B] hover:bg-[#C79A2B]/5">
            View Tenant
          </Link>
          <Link to={`/rental-os/properties/${lease.propertyId}`} className="rounded-xl border border-navy/15 px-4 py-2 text-xs font-semibold text-navy/70 hover:bg-ivory">
            View Property
          </Link>
          <Link to="/estate/ar/billing" className="rounded-xl bg-[#C79A2B] px-4 py-2 text-xs font-semibold text-white hover:bg-[#b8891e]">
            Run Billing →
          </Link>
        </div>
      </div>
    </div>
  );
}

export function LeasesPage() {
  const { id } = useParams<{ id?: string }>();
  if (id && id !== "renewals" && id !== "create") return <LeaseDetail id={id} />;

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<LeaseStatus | "All">("All");

  const filtered = leases.filter((l) => {
    const matchSearch =
      l.tenantName.toLowerCase().includes(search.toLowerCase()) ||
      l.code.toLowerCase().includes(search.toLowerCase()) ||
      l.propertyName.toLowerCase().includes(search.toLowerCase());
    const matchStatus = statusFilter === "All" || l.status === statusFilter;
    return matchSearch && matchStatus;
  });

  const isRenewals = id === "renewals";
  const displayLeases = isRenewals
    ? leases.filter((l) => { const d = daysLeft(l.endDate); return l.status === "Active" && d <= 90 && d >= 0; })
    : filtered;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-serif text-2xl text-navy">{isRenewals ? "Lease Renewals" : "Lease Register"}</h1>
          <p className="mt-1 text-sm text-navy/60">
            {isRenewals ? `${displayLeases.length} leases expiring within 90 days` : `${leases.length} leases · ${leases.filter((l) => l.status === "Active").length} active`}
          </p>
        </div>
        {!isRenewals && (
          <div className="flex gap-2">
            <Link to="/rental-os/leases/renewals" className="inline-flex items-center gap-2 rounded-xl border border-[#C79A2B]/30 px-4 py-2 text-sm font-semibold text-[#C79A2B] hover:bg-[#C79A2B]/5">
              <Calendar className="h-4 w-4" /> Renewals
            </Link>
            <button className="inline-flex items-center gap-2 rounded-xl bg-[#C79A2B] px-4 py-2 text-sm font-semibold text-white shadow hover:bg-[#b8891e]">
              <FileText className="h-4 w-4" /> New Lease
            </button>
          </div>
        )}
      </div>

      {!isRenewals && (
        <div className="rounded-2xl border border-navy/10 bg-white px-5 py-3 shadow-card">
          <div className="flex flex-wrap gap-3">
            <input
              type="search"
              placeholder="Search leases…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full max-w-xs rounded-xl border border-navy/15 bg-ivory px-3 py-2 text-sm text-navy placeholder:text-navy/40 focus:outline-none focus:ring-2 focus:ring-[#C79A2B]/30"
            />
            {(["All", "Active", "Draft", "Expired", "Terminated", "Renewed"] as const).map((s) => (
              <button
                key={s}
                onClick={() => setStatusFilter(s)}
                className={`rounded-full px-3 py-1 text-xs font-semibold transition ${statusFilter === s ? "bg-[#C79A2B] text-white" : "bg-ivory border border-navy/15 text-navy/60 hover:border-[#C79A2B]/40"}`}
              >
                {s}
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="rounded-2xl border border-navy/10 bg-white shadow-card">
        <div className="overflow-x-auto">
          <table className="data-table min-w-[900px]">
            <thead>
              <tr>
                <th>Code</th>
                <th>Tenant</th>
                <th>Property · Unit</th>
                <th>Start</th>
                <th>End</th>
                <th className="text-right">Monthly Rent</th>
                <th className="text-right">Security Dep.</th>
                {isRenewals && <th className="text-right">Days Left</th>}
                <th>Status</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {displayLeases.map((l) => {
                const days = daysLeft(l.endDate);
                return (
                  <tr key={l.id}>
                    <td className="font-mono text-xs text-navy/50">{l.code}</td>
                    <td>
                      <Link to={`/rental-os/tenants/${l.tenantId}`} className="font-semibold text-navy hover:text-[#C79A2B] hover:underline">{l.tenantName}</Link>
                    </td>
                    <td className="text-sm text-navy/70">
                      <Link to={`/rental-os/properties/${l.propertyId}`} className="hover:text-[#C79A2B] hover:underline">{l.propertyName}</Link>
                      <span className="text-navy/40"> · </span>{l.unitNumber}
                    </td>
                    <td>{new Date(l.startDate).toLocaleDateString("en-IN")}</td>
                    <td>{new Date(l.endDate).toLocaleDateString("en-IN")}</td>
                    <td className="text-right tabular-nums font-medium">₹{l.monthlyRent.toLocaleString()}</td>
                    <td className="text-right tabular-nums">₹{l.securityDeposit.toLocaleString()}</td>
                    {isRenewals && (
                      <td className={`text-right tabular-nums font-semibold ${days <= 30 ? "text-red-600" : "text-amber-600"}`}>{days}d</td>
                    )}
                    <td>
                      <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ring-1 ring-inset ${
                        l.status === "Active" ? "bg-emerald-50 text-emerald-800 ring-emerald-700/15"
                        : l.status === "Expired" ? "bg-navy/5 text-navy/60 ring-navy/10"
                        : "bg-amber-50 text-amber-900 ring-amber-700/20"
                      }`}>{l.status}</span>
                    </td>
                    <td><Link to={`/rental-os/leases/${l.id}`} className="text-xs font-medium text-[#C79A2B] hover:underline">View →</Link></td>
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
