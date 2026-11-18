import { useState } from "react";
import { Link, useParams } from "react-router-dom";
import { Users, ArrowLeft, ChevronRight, Mail, Phone } from "lucide-react";
import { tenants, leases } from "../data";

function TenantDetail({ id }: { id: string }) {
  const tenant = tenants.find((t) => t.id === id);
  if (!tenant) return <div className="p-8 text-navy/50">Tenant not found.</div>;
  const tenantLeases = leases.filter((l) => l.tenantId === id);
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <Link to="/rental-os/tenants" className="flex items-center gap-1 text-sm text-[#C79A2B] hover:underline">
          <ArrowLeft className="h-4 w-4" /> Tenants
        </Link>
        <ChevronRight className="h-4 w-4 text-navy/30" />
        <span className="text-sm text-navy">{tenant.name}</span>
      </div>

      <div className="rounded-2xl border border-navy/10 bg-white p-6 shadow-card">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-[#C79A2B]">{tenant.code} · {tenant.type}</p>
            <h1 className="mt-1 font-serif text-2xl text-navy">{tenant.name}</h1>
            <div className="mt-2 flex flex-wrap items-center gap-4 text-sm text-navy/60">
              <span className="flex items-center gap-1"><Mail className="h-3.5 w-3.5" /> {tenant.email}</span>
              <span className="flex items-center gap-1"><Phone className="h-3.5 w-3.5" /> {tenant.phone}</span>
            </div>
          </div>
          <span className={`rounded-full px-3 py-1 text-xs font-semibold ring-1 ring-inset ${
            tenant.status === "Active" ? "bg-emerald-50 text-emerald-800 ring-emerald-700/15"
            : tenant.status === "Blacklisted" ? "bg-red-50 text-red-800 ring-red-700/15"
            : "bg-navy/5 text-navy/60 ring-navy/10"
          }`}>{tenant.status}</span>
        </div>
        <div className="mt-5 grid grid-cols-2 gap-4 border-t border-navy/5 pt-5 sm:grid-cols-3">
          {[
            { label: "Contact Person", value: tenant.contactPerson },
            { label: "ID Type", value: tenant.idType },
            { label: "ID Number", value: tenant.idNumber },
            { label: "Nationality", value: tenant.nationality },
            { label: "Address", value: tenant.address },
            { label: "Entity", value: tenant.entityId },
          ].map((f) => (
            <div key={f.label}>
              <p className="text-[10px] uppercase tracking-widest text-navy/40">{f.label}</p>
              <p className="mt-0.5 text-sm font-medium text-navy">{f.value}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="rounded-2xl border border-navy/10 bg-white shadow-card">
        <div className="border-b border-navy/5 px-5 py-4">
          <h2 className="font-serif text-lg text-navy">Leases ({tenantLeases.length})</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="data-table">
            <thead><tr><th>Code</th><th>Property</th><th>Unit</th><th>Start</th><th>End</th><th className="text-right">Monthly Rent</th><th>Status</th></tr></thead>
            <tbody>
              {tenantLeases.map((l) => (
                <tr key={l.id}>
                  <td className="font-mono text-xs text-navy/50">{l.code}</td>
                  <td>
                    <Link to={`/rental-os/properties/${l.propertyId}`} className="text-sm font-medium text-navy hover:text-[#C79A2B] hover:underline">{l.propertyName}</Link>
                  </td>
                  <td>{l.unitNumber}</td>
                  <td>{new Date(l.startDate).toLocaleDateString("en-IN")}</td>
                  <td>{new Date(l.endDate).toLocaleDateString("en-IN")}</td>
                  <td className="text-right tabular-nums font-medium">₹{l.monthlyRent.toLocaleString()}</td>
                  <td>
                    <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${l.status === "Active" ? "bg-emerald-50 text-emerald-700" : "bg-navy/5 text-navy/50"}`}>
                      {l.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

export function TenantsPage() {
  const { id } = useParams<{ id?: string }>();
  if (id) return <TenantDetail id={id} />;

  const [search, setSearch] = useState("");
  const filtered = tenants.filter((t) =>
    t.name.toLowerCase().includes(search.toLowerCase()) ||
    t.code.toLowerCase().includes(search.toLowerCase()) ||
    t.email.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-serif text-2xl text-navy">Tenant Register</h1>
          <p className="mt-1 text-sm text-navy/60">{tenants.length} tenants · {tenants.filter((t) => t.status === "Active").length} active</p>
        </div>
        <button className="inline-flex items-center gap-2 rounded-xl bg-[#C79A2B] px-4 py-2 text-sm font-semibold text-white shadow hover:bg-[#b8891e]">
          <Users className="h-4 w-4" /> Add Tenant
        </button>
      </div>

      <div className="rounded-2xl border border-navy/10 bg-white shadow-card">
        <div className="border-b border-navy/5 px-5 py-3">
          <input
            type="search"
            placeholder="Search tenants…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full max-w-xs rounded-xl border border-navy/15 bg-ivory px-3 py-2 text-sm text-navy placeholder:text-navy/40 focus:outline-none focus:ring-2 focus:ring-[#C79A2B]/30"
          />
        </div>
        <div className="overflow-x-auto">
          <table className="data-table min-w-[800px]">
            <thead>
              <tr><th>Tenant</th><th>Type</th><th>Contact</th><th>Email</th><th>Phone</th><th>Active Leases</th><th>Status</th><th></th></tr>
            </thead>
            <tbody>
              {filtered.map((t) => {
                const activeLeases = leases.filter((l) => l.tenantId === t.id && l.status === "Active").length;
                return (
                  <tr key={t.id}>
                    <td>
                      <p className="font-semibold text-navy">{t.name}</p>
                      <p className="font-mono text-[10px] text-navy/40">{t.code}</p>
                    </td>
                    <td><span className="rounded bg-navy/5 px-1.5 py-0.5 text-xs text-navy/70">{t.type}</span></td>
                    <td className="text-sm text-navy/70">{t.contactPerson}</td>
                    <td className="text-sm text-navy/70">{t.email}</td>
                    <td className="text-sm text-navy/70">{t.phone}</td>
                    <td className="text-center tabular-nums font-medium text-navy">{activeLeases || "—"}</td>
                    <td>
                      <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ring-1 ring-inset ${
                        t.status === "Active" ? "bg-emerald-50 text-emerald-800 ring-emerald-700/15"
                        : t.status === "Blacklisted" ? "bg-red-50 text-red-800 ring-red-700/15"
                        : "bg-navy/5 text-navy/60 ring-navy/10"
                      }`}>{t.status}</span>
                    </td>
                    <td><Link to={`/rental-os/tenants/${t.id}`} className="text-xs font-medium text-[#C79A2B] hover:underline">View →</Link></td>
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
