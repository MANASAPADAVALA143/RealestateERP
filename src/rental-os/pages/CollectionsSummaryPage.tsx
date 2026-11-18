/**
 * Rental OS — Collections Summary
 *
 * Shows live AR data: tenant balances, ageing buckets, overdue invoices.
 * Reads directly from the AR engine (IndexedDB via ArService).
 *
 * STATUS: Production — reads live AR data. Requires leases to be synced (Step 1 in Billing).
 */

import { Link } from "react-router-dom";
import { ArrowRight } from "lucide-react";
import { balances } from "@/ar/engine/analytics";
import { ageBuckets, type AgeBucket } from "@/ar/engine/types";
import { useArBook } from "@/ar/ui/hooks";

function money(val: number) {
  if (val >= 1e7) return `₹${(val / 1e7).toFixed(2)} Cr`;
  if (val >= 1e5) return `₹${(val / 1e5).toFixed(2)} L`;
  return `₹${val.toLocaleString("en-IN")}`;
}

function ageBucket(invoice: { dueDate: string; status: string }): AgeBucket {
  if (invoice.status !== "Posted") return "Current";
  const days = Math.floor((Date.now() - new Date(invoice.dueDate).getTime()) / (1000 * 60 * 60 * 24));
  if (days <= 0) return "Current";
  if (days <= 30) return "1–30";
  if (days <= 60) return "31–60";
  if (days <= 90) return "61–90";
  return "90+";
}

const BUCKET_COLOR: Record<AgeBucket, string> = {
  Current: "text-emerald-600",
  "1–30": "text-amber-600",
  "31–60": "text-orange-600",
  "61–90": "text-red-600",
  "90+": "text-red-800 font-bold",
};

export function CollectionsSummaryPage() {
  const { book } = useArBook();

  if (!book) {
    return <div className="flex h-64 items-center justify-center rounded-2xl border border-navy/10 bg-white"><p className="text-sm text-navy/50">Loading…</p></div>;
  }

  const balanceMap = balances(book);
  const postedInvoices = book.invoices.filter((i) => i.status === "Posted");
  const totalOutstanding = [...balanceMap.values()].reduce((s, b) => s + b.outstanding, 0);
  const totalOverdue = [...balanceMap.values()].filter((b) => ageBucket(b.invoice) !== "Current").reduce((s, b) => s + b.outstanding, 0);

  // Ageing buckets
  const bucketTotals: Record<AgeBucket, number> = { Current: 0, "1–30": 0, "31–60": 0, "61–90": 0, "90+": 0 };
  for (const b of balanceMap.values()) {
    if (b.outstanding <= 0) continue;
    bucketTotals[ageBucket(b.invoice)] += b.outstanding;
  }

  // Per-tenant outstanding
  const tenantBalances = new Map<string, { name: string; outstanding: number; overdue: number; invoices: number }>();
  for (const b of balanceMap.values()) {
    if (b.outstanding <= 0) continue;
    const t = book.tenants.find((t) => t.id === b.invoice.tenantId);
    const name = t?.name ?? b.invoice.tenantId;
    const entry = tenantBalances.get(b.invoice.tenantId) ?? { name, outstanding: 0, overdue: 0, invoices: 0 };
    entry.outstanding += b.outstanding;
    if (ageBucket(b.invoice) !== "Current") entry.overdue += b.outstanding;
    entry.invoices++;
    tenantBalances.set(b.invoice.tenantId, entry);
  }

  const tenantList = [...tenantBalances.entries()]
    .map(([id, v]) => ({ id, ...v }))
    .sort((a, b) => b.outstanding - a.outstanding);

  if (book.tenants.length === 0) {
    return (
      <div className="rounded-2xl border border-navy/10 bg-white p-8 text-center shadow-card">
        <p className="text-sm text-navy/60">No AR data yet. Use <Link to="/rental-os/billing" className="text-[#C79A2B] underline">Rental Billing</Link> to sync leases and post invoices first.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="font-serif text-2xl text-navy">Collections</h1>
          <p className="mt-1 text-sm text-navy/60">Live AR balances from the AR engine · {postedInvoices.length} posted invoices</p>
        </div>
        <div className="flex gap-2">
          <Link to="/estate/ar/collections" className="inline-flex items-center gap-1.5 rounded-xl border border-navy/15 px-3 py-2 text-xs font-semibold text-navy/70 hover:bg-ivory">
            Full Collections <ArrowRight className="h-3.5 w-3.5" />
          </Link>
          <Link to="/estate/ar/ageing" className="inline-flex items-center gap-1.5 rounded-xl border border-navy/15 px-3 py-2 text-xs font-semibold text-navy/70 hover:bg-ivory">
            Ageing Report <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>
      </div>

      {/* Ageing buckets */}
      <div className="grid gap-4 sm:grid-cols-5">
        {ageBuckets.map((bucket) => (
          <div key={bucket} className={`rounded-2xl border border-navy/10 bg-white p-4 shadow-card ${bucket !== "Current" && bucketTotals[bucket] > 0 ? "border-t-4 border-t-red-400" : "border-t-4 border-t-emerald-500"}`}>
            <p className="text-[11px] uppercase tracking-widest text-navy/50">{bucket} days</p>
            <p className={`mt-2 font-serif text-xl ${BUCKET_COLOR[bucket]}`}>{money(bucketTotals[bucket])}</p>
            <p className="mt-1 text-xs text-navy/40">{((bucketTotals[bucket] / (totalOutstanding || 1)) * 100).toFixed(1)}% of total</p>
          </div>
        ))}
      </div>

      {/* Summary row */}
      <div className="flex flex-wrap gap-4 rounded-2xl border border-navy/10 bg-white p-5 shadow-card">
        <div>
          <p className="text-xs uppercase tracking-widest text-navy/50">Total Outstanding</p>
          <p className="mt-1 font-serif text-2xl text-navy">{money(totalOutstanding)}</p>
        </div>
        <div>
          <p className="text-xs uppercase tracking-widest text-navy/50">Overdue</p>
          <p className="mt-1 font-serif text-2xl text-red-600">{money(totalOverdue)}</p>
        </div>
        <div>
          <p className="text-xs uppercase tracking-widest text-navy/50">On Time</p>
          <p className="mt-1 font-serif text-2xl text-emerald-600">{money(bucketTotals.Current)}</p>
        </div>
        <div className="ml-auto self-center">
          <Link to="/estate/ar/payments" className="inline-flex items-center gap-2 rounded-xl bg-[#C79A2B] px-4 py-2 text-sm font-semibold text-white hover:bg-[#b8891e]">
            Record Receipt →
          </Link>
        </div>
      </div>

      {/* Tenant balances */}
      {tenantList.length > 0 ? (
        <div className="rounded-2xl border border-navy/10 bg-white shadow-card">
          <div className="border-b border-navy/5 px-5 py-4">
            <h2 className="font-serif text-xl text-navy">Tenant Balances</h2>
            <p className="mt-1 text-sm text-navy/60">{tenantList.length} tenants with open balances</p>
          </div>
          <div className="overflow-x-auto">
            <table className="data-table">
              <thead>
                <tr><th>Tenant</th><th className="text-right">Open Invoices</th><th className="text-right">Outstanding</th><th className="text-right">Overdue</th><th></th></tr>
              </thead>
              <tbody>
                {tenantList.map((t) => (
                  <tr key={t.id}>
                    <td className="font-semibold text-navy">{t.name}</td>
                    <td className="text-right tabular-nums">{t.invoices}</td>
                    <td className="text-right tabular-nums font-medium">{money(t.outstanding)}</td>
                    <td className={`text-right tabular-nums font-medium ${t.overdue > 0 ? "text-red-600" : "text-emerald-600"}`}>{t.overdue > 0 ? money(t.overdue) : "—"}</td>
                    <td>
                      <Link to={`/estate/ar/tenants/${t.id}`} className="text-xs font-medium text-[#C79A2B] hover:underline">View →</Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div className="rounded-2xl border border-navy/10 bg-white p-8 text-center shadow-card">
          <p className="text-sm text-navy/50">No open balances — all invoices collected.</p>
        </div>
      )}
    </div>
  );
}
