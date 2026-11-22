import { useState } from "react";
import { Link } from "react-router-dom";
import { Plus, Star } from "lucide-react";
import { useVendors, opsService } from "../hooks.ts";
import { StatusBadge, EmptyState, LoadingSpinner, PageHeader, ActionButton } from "./shared.tsx";
import type { VendorStatus } from "../types.ts";

export function VendorsPage() {
  const { data: vendors, loading } = useVendors();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<VendorStatus | "">("");

  const filtered = vendors.filter((v) => {
    if (statusFilter && v.status !== statusFilter) return false;
    if (search && !`${v.vendorCode} ${v.companyName} ${v.contactPerson}`.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  if (loading) return <LoadingSpinner />;

  return (
    <div className="space-y-5">
      <PageHeader
        title="Vendor Register"
        action={
          <Link to="/rental-os/vendors/new">
            <ActionButton><Plus className="h-4 w-4" /> Add Vendor</ActionButton>
          </Link>
        }
      />

      <div className="flex flex-wrap gap-3">
        <input
          className="flex-1 min-w-48 rounded-xl border border-navy/15 px-3 py-2 text-sm"
          placeholder="Search vendors…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <select className="rounded-xl border border-navy/15 px-3 py-2 text-sm" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value as any)}>
          <option value="">All Statuses</option>
          {["Draft", "Active", "Inactive", "Blacklisted", "Suspended"].map((s) => <option key={s} value={s}>{s}</option>)}
        </select>
      </div>

      {filtered.length === 0 ? (
        <EmptyState message="No vendors found. Add your first vendor." />
      ) : (
        <div className="shadow-card overflow-hidden rounded-2xl bg-white">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-[#F8F6F0]">
                <tr>
                  {["Code", "Company", "Categories", "Contact", "Payment Terms", "Rating", "Status", ""].map((h) => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-navy/50">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-navy/5">
                {filtered.map((v) => (
                  <tr key={v.id} className="hover:bg-[#F8F6F0]/60 transition">
                    <td className="px-4 py-3 font-mono text-xs font-semibold text-navy">{v.vendorCode}</td>
                    <td className="px-4 py-3 font-medium text-navy">{v.companyName}</td>
                    <td className="px-4 py-3 text-navy/70 max-w-xs">
                      <span className="line-clamp-1">{v.categories.join(", ")}</span>
                    </td>
                    <td className="px-4 py-3 text-navy/70">{v.contactPerson}</td>
                    <td className="px-4 py-3 text-navy/70">{v.paymentTermsDays} days</td>
                    <td className="px-4 py-3">
                      {v.rating ? (
                        <span className="flex items-center gap-0.5 text-amber-500">
                          {Array.from({ length: v.rating }).map((_, i) => <Star key={i} className="h-3 w-3 fill-current" />)}
                        </span>
                      ) : "—"}
                    </td>
                    <td className="px-4 py-3"><StatusBadge status={v.status} /></td>
                    <td className="px-4 py-3">
                      <Link to={`/rental-os/vendors/${v.id}`} className="text-xs text-[#C79A2B] hover:underline">View</Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="px-4 py-2 text-xs text-navy/40 border-t border-navy/5">{filtered.length} vendor{filtered.length !== 1 ? "s" : ""}</p>
        </div>
      )}
    </div>
  );
}

export function NewVendorPage() {
  const { refresh } = useVendors();
  const [form, setForm] = useState({
    companyName: "",
    contactPerson: "",
    phone: "",
    email: "",
    address: "",
    country: "India",
    categories: [] as string[],
    paymentTermsDays: 30,
    status: "Draft" as const,
  });
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      await opsService().createVendor({ ...form, categories: form.categories as any[] });
      await refresh();
      setSaved(true);
    } finally {
      setSaving(false);
    }
  }

  if (saved) return (
    <div className="rounded-2xl bg-emerald-50 p-8 text-center">
      <p className="font-semibold text-emerald-700 text-lg">Vendor created!</p>
      <Link to="/rental-os/vendors" className="mt-3 inline-block text-sm text-[#C79A2B] hover:underline">← Back to vendors</Link>
    </div>
  );

  return (
    <div className="space-y-5">
      <PageHeader title="New Vendor" />
      <form onSubmit={handleSubmit} className="shadow-card rounded-2xl bg-white p-6 space-y-4 max-w-2xl">
        <div className="grid grid-cols-2 gap-4">
          {[
            ["Company Name *", "companyName", "text"],
            ["Contact Person *", "contactPerson", "text"],
            ["Phone *", "phone", "tel"],
            ["Email *", "email", "email"],
            ["Payment Terms (days)", "paymentTermsDays", "number"],
            ["Country", "country", "text"],
          ].map(([label, key, type]) => (
            <div key={key as string}>
              <label className="block text-xs font-semibold text-navy/60 mb-1">{label}</label>
              <input
                required={String(label).endsWith("*")}
                type={type as string}
                className="w-full rounded-xl border border-navy/15 px-3 py-2 text-sm"
                value={(form as any)[key as string]}
                onChange={(e) => setForm({ ...form, [key as string]: type === "number" ? Number(e.target.value) : e.target.value })}
              />
            </div>
          ))}
        </div>
        <div>
          <label className="block text-xs font-semibold text-navy/60 mb-1">Address</label>
          <textarea rows={2} className="w-full rounded-xl border border-navy/15 px-3 py-2 text-sm" value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} />
        </div>
        <div className="flex gap-3 pt-2">
          <ActionButton>{saving ? "Saving…" : "Create Vendor"}</ActionButton>
          <Link to="/rental-os/vendors"><ActionButton variant="secondary" type="button">Cancel</ActionButton></Link>
        </div>
      </form>
    </div>
  );
}
