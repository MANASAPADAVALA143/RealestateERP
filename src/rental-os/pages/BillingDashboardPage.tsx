/**
 * Rental OS — Billing Dashboard
 *
 * Provides a full billing-run workflow within the Rental OS shell:
 *   1. Sync Rental OS leases → AR engine (one-time, idempotent)
 *   2. Select period + preview eligible/skipped leases
 *   3. Review totals by property
 *   4. Generate draft invoices
 *   5. Approve + Post (one-click or individual)
 *   6. Navigate to AR invoice register / ageing
 *
 * STATUS: Production — calls the live ArService; requires AR data in IndexedDB.
 * Demo leases can be synced via the "Sync Leases to AR" button first.
 */

import { useState } from "react";
import { Link } from "react-router-dom";
import { RefreshCw, CheckCircle, AlertTriangle, FileText, ArrowRight, Zap, Info } from "lucide-react";
import type { ProposedInvoice, SkippedCharge } from "@/ar/engine/billing";
import { arService, today, useAction, useArBook } from "@/ar/ui/hooks";
import { leases as rosLeases, tenants as rosTenants } from "../data";
import { syncRosToAr, type SyncResult } from "../bridge";

function money(val: number, currency = "INR") {
  if (currency === "INR") {
    if (val >= 1e7) return `₹${(val / 1e7).toFixed(2)} Cr`;
    if (val >= 1e5) return `₹${(val / 1e5).toFixed(2)} L`;
    return `₹${val.toLocaleString("en-IN")}`;
  }
  return `${val.toLocaleString()} ${currency}`;
}

function Badge({ label, color }: { label: string; color: "green" | "amber" | "red" | "navy" }) {
  const cls = {
    green: "bg-emerald-50 text-emerald-800 ring-emerald-700/15",
    amber: "bg-amber-50 text-amber-900 ring-amber-700/20",
    red: "bg-red-50 text-red-800 ring-red-700/15",
    navy: "bg-navy/5 text-navy/60 ring-navy/10",
  }[color];
  return <span className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-semibold ring-1 ring-inset ${cls}`}>{label}</span>;
}

function SectionCard({ title, subtitle, children }: { title: string; subtitle?: string; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-navy/10 bg-white shadow-card">
      <div className="border-b border-navy/5 px-5 py-4">
        <h2 className="font-serif text-xl text-navy">{title}</h2>
        {subtitle && <p className="mt-0.5 text-sm text-navy/60">{subtitle}</p>}
      </div>
      <div className="p-5">{children}</div>
    </div>
  );
}

export function BillingDashboardPage() {
  const { book, workspaceId } = useArBook();
  const action = useAction();

  const [period, setPeriod] = useState(today().slice(0, 7));
  const [preview, setPreview] = useState<{ proposals: ProposedInvoice[]; skipped: SkippedCharge[] } | null>(null);
  const [selected, setSelected] = useState<Record<string, boolean>>({});
  const [syncResult, setSyncResult] = useState<SyncResult | null>(null);
  const [postResult, setPostResult] = useState<{ drafted: number; approved: number; posted: number } | null>(null);

  if (!book || !workspaceId) {
    return (
      <div className="flex h-64 items-center justify-center rounded-2xl border border-navy/10 bg-white">
        <p className="text-sm text-navy/50">Loading AR ledger…</p>
      </div>
    );
  }

  const activeArLeases = book.leases.filter((l) => l.status === "Active");
  const draftInvoices = book.invoices.filter((i) => i.status === "Draft" || i.status === "Approved");
  const postedThisPeriod = book.invoices.filter((i) => i.status === "Posted" && i.billingPeriod === period);

  async function handleSync() {
    setSyncResult(null);
    setPreview(null);
    await action.run(async () => {
      const result = await syncRosToAr(arService, workspaceId!, rosTenants, rosLeases);
      setSyncResult(result);
    }, undefined);
  }

  async function handlePreview() {
    setPreview(null);
    setPostResult(null);
    await action.run(async () => {
      const result = await arService.billingPreview(workspaceId!, period);
      setPreview(result);
      setSelected(Object.fromEntries(result.proposals.map((p) => [p.leaseId ?? p.tenantId, true])));
    });
  }

  async function handleDraft() {
    if (!preview) return;
    await action.run(async () => {
      const leaseIds = preview.proposals
        .filter((p) => selected[p.leaseId ?? p.tenantId])
        .map((p) => p.leaseId!)
        .filter(Boolean);
      await arService.createDrafts(workspaceId!, period, { leaseIds });
      const refreshed = await arService.billingPreview(workspaceId!, period);
      setPreview(refreshed);
    }, `Draft invoices created for ${period}.`);
  }

  async function handleApproveAll() {
    const drafts = book!.invoices.filter((i) => i.status === "Draft" && i.billingPeriod === period);
    await action.run(async () => {
      for (const inv of drafts) await arService.approveInvoice(inv.id);
    }, `${drafts.length} invoice(s) approved.`);
  }

  async function handlePostAll() {
    const approved = book!.invoices.filter((i) => i.status === "Approved" && i.billingPeriod === period);
    const draftNoApproval = book!.invoices.filter((i) => i.status === "Draft" && i.billingPeriod === period && !book!.settings.approvals.invoices);
    const toPost = [...approved, ...draftNoApproval];
    await action.run(async () => {
      let posted = 0;
      for (const inv of toPost) {
        await arService.postInvoice(inv.id);
        posted++;
      }
      setPostResult({ drafted: 0, approved: approved.length, posted });
    }, `${toPost.length} invoice(s) posted to AR.`);
  }

  const selectedCount = Object.values(selected).filter(Boolean).length;
  const totalSelected = preview?.proposals.filter((p) => selected[p.leaseId ?? p.tenantId]).reduce((s, p) => s + p.total, 0) ?? 0;

  // Group proposals by property for the summary
  const byProperty = new Map<string, { name: string; count: number; total: number }>();
  for (const p of preview?.proposals ?? []) {
    if (!selected[p.leaseId ?? p.tenantId]) continue;
    const entry = byProperty.get(p.propertyId) ?? { name: p.propertyId, count: 0, total: 0 };
    entry.count++;
    entry.total += p.total;
    byProperty.set(p.propertyId, entry);
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="font-serif text-2xl text-navy">Rental Billing</h1>
          <p className="mt-1 text-sm text-navy/60">
            Generate and post recurring rent invoices to the AR ledger ·{" "}
            <span className="font-medium text-navy">{activeArLeases.length} active leases</span> in AR
          </p>
        </div>
        <div className="flex gap-2">
          <Link to="/estate/ar/invoices" className="inline-flex items-center gap-1.5 rounded-xl border border-navy/15 px-3 py-2 text-xs font-semibold text-navy/70 hover:bg-ivory">
            AR Invoice Register <ArrowRight className="h-3.5 w-3.5" />
          </Link>
          <Link to="/estate/ar/ageing" className="inline-flex items-center gap-1.5 rounded-xl border border-navy/15 px-3 py-2 text-xs font-semibold text-navy/70 hover:bg-ivory">
            Ageing <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>
      </div>

      {/* Status bar */}
      {action.error && (
        <div className="flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
          <p>{action.error}</p>
        </div>
      )}
      {action.message && (
        <div className="flex items-start gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
          <CheckCircle className="mt-0.5 h-4 w-4 shrink-0" />
          <p>{action.message}</p>
        </div>
      )}

      {/* KPI tiles */}
      <div className="grid gap-4 sm:grid-cols-4">
        {[
          { label: "Active AR Leases", value: String(activeArLeases.length), accent: "border-t-[#C79A2B]", note: "in AR ledger" },
          { label: "Invoices This Period", value: String(postedThisPeriod.length), accent: "border-t-emerald-500", note: period },
          { label: "Pending Action", value: String(draftInvoices.length), accent: draftInvoices.length > 0 ? "border-t-amber-500" : "border-t-navy/20", note: "draft or approved" },
          { label: "Posted Revenue", value: money(postedThisPeriod.reduce((s, i) => s + i.total, 0)), accent: "border-t-blue-500", note: `for ${period}` },
        ].map((k) => (
          <div key={k.label} className={`rounded-2xl border border-navy/10 border-t-4 ${k.accent} bg-white p-4 shadow-card`}>
            <p className="text-[11px] uppercase tracking-widest text-navy/50">{k.label}</p>
            <p className="mt-2 font-serif text-2xl text-navy">{k.value}</p>
            <p className="mt-1 text-xs text-navy/40">{k.note}</p>
          </div>
        ))}
      </div>

      {/* Step 1 — Sync */}
      <SectionCard
        title="Step 1 — Sync Rental OS to AR"
        subtitle="Creates ArTenant + ArLease records in the live AR ledger from Rental OS lease data. Idempotent: existing records are skipped."
      >
        <div className="flex flex-wrap items-center gap-3">
          <div className="rounded-xl border border-navy/10 bg-ivory px-4 py-3 text-sm text-navy/70">
            <span className="font-semibold text-navy">{book.tenants.length}</span> tenants · <span className="font-semibold text-navy">{book.leases.length}</span> leases currently in AR
          </div>
          <button
            onClick={handleSync}
            disabled={action.busy}
            className="inline-flex items-center gap-2 rounded-xl bg-navy px-4 py-2.5 text-sm font-semibold text-white hover:bg-navy/90 disabled:opacity-50"
          >
            <RefreshCw className={`h-4 w-4 ${action.busy ? "animate-spin" : ""}`} />
            Sync Rental OS Leases → AR
          </button>
        </div>

        {syncResult && (
          <div className="mt-4 rounded-xl border border-navy/10 bg-ivory p-4 text-sm">
            <p className="font-semibold text-navy">Sync complete</p>
            <ul className="mt-2 space-y-1 text-navy/70">
              <li className="flex items-center gap-2"><CheckCircle className="h-3.5 w-3.5 text-emerald-500" /> {syncResult.tenantsCreated} tenant(s) created · {syncResult.tenantsSkipped} skipped</li>
              <li className="flex items-center gap-2"><CheckCircle className="h-3.5 w-3.5 text-emerald-500" /> {syncResult.leasesCreated} lease(s) created · {syncResult.leasesSkipped} skipped</li>
            </ul>
            {syncResult.errors.length > 0 && (
              <ul className="mt-2 space-y-1 text-red-600">
                {syncResult.errors.map((e, i) => <li key={i} className="flex items-start gap-1"><AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />{e}</li>)}
              </ul>
            )}
          </div>
        )}
      </SectionCard>

      {/* Step 2 — Preview */}
      <SectionCard
        title="Step 2 — Billing Preview"
        subtitle="Select a billing month and preview eligible leases. Duplicate charges are blocked automatically."
      >
        <div className="flex flex-wrap items-end gap-3">
          <div>
            <label className="text-xs font-semibold uppercase tracking-widest text-navy/50">Billing Month</label>
            <input
              type="month"
              value={period}
              onChange={(e) => { setPeriod(e.target.value); setPreview(null); setPostResult(null); }}
              className="mt-1 block rounded-xl border border-navy/15 bg-ivory px-3 py-2 text-sm text-navy focus:outline-none focus:ring-2 focus:ring-[#C79A2B]/30"
            />
          </div>
          <button
            onClick={handlePreview}
            disabled={action.busy || !period || activeArLeases.length === 0}
            className="inline-flex items-center gap-2 rounded-xl bg-[#C79A2B] px-4 py-2.5 text-sm font-semibold text-white shadow hover:bg-[#b8891e] disabled:opacity-50"
          >
            <Zap className="h-4 w-4" />
            Preview Billing
          </button>
        </div>

        {activeArLeases.length === 0 && (
          <div className="mt-4 flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
            <Info className="mt-0.5 h-4 w-4 shrink-0" />
            No active leases in AR. Run Step 1 to sync leases from Rental OS first.
          </div>
        )}

        {preview && (
          <div className="mt-5 space-y-4">
            {/* Summary row */}
            <div className="flex flex-wrap items-center gap-4 rounded-xl bg-ivory p-4">
              <div className="text-sm"><span className="font-semibold text-navy">{preview.proposals.length}</span> <span className="text-navy/60">eligible leases</span></div>
              <div className="text-sm"><span className="font-semibold text-emerald-600">{selectedCount}</span> <span className="text-navy/60">selected</span></div>
              <div className="text-sm font-semibold text-navy">{money(totalSelected)} total</div>
              {preview.skipped.length > 0 && <div className="text-sm text-amber-700">{preview.skipped.length} skipped</div>}
              <div className="ml-auto flex gap-2">
                <button onClick={() => setSelected(Object.fromEntries(preview.proposals.map((p) => [p.leaseId ?? p.tenantId, true])))} className="text-xs font-medium text-[#C79A2B] hover:underline">Select all</button>
                <span className="text-navy/30">|</span>
                <button onClick={() => setSelected({})} className="text-xs font-medium text-navy/50 hover:underline">Clear</button>
              </div>
            </div>

            {/* Property summary */}
            {byProperty.size > 0 && (
              <div className="overflow-x-auto rounded-xl border border-navy/10">
                <table className="data-table">
                  <thead><tr><th>Property</th><th className="text-right">Leases</th><th className="text-right">Total Rent</th></tr></thead>
                  <tbody>
                    {[...byProperty.entries()].map(([id, row]) => (
                      <tr key={id}>
                        <td className="font-medium text-navy">{row.name}</td>
                        <td className="text-right tabular-nums">{row.count}</td>
                        <td className="text-right tabular-nums font-semibold text-emerald-600">{money(row.total)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* Eligible leases table */}
            {preview.proposals.length > 0 ? (
              <div className="overflow-x-auto rounded-xl border border-navy/10">
                <table className="data-table min-w-[800px]">
                  <thead>
                    <tr>
                      <th className="w-8"></th>
                      <th>Tenant</th>
                      <th>Lease · Unit</th>
                      <th>Invoice Date</th>
                      <th>Due Date</th>
                      <th>Charges</th>
                      <th className="text-right">Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {preview.proposals.map((p) => {
                      const key = p.leaseId ?? p.tenantId;
                      return (
                        <tr key={key}>
                          <td>
                            <input
                              type="checkbox"
                              checked={Boolean(selected[key])}
                              onChange={(e) => setSelected({ ...selected, [key]: e.target.checked })}
                              className="rounded border-navy/30"
                            />
                          </td>
                          <td className="font-semibold text-navy">{p.tenantName}</td>
                          <td className="text-sm text-navy/70">
                            <span className="font-mono text-xs">{p.leaseId?.slice(-6) ?? "—"}</span> · {p.unit}
                          </td>
                          <td className="text-sm">{p.invoiceDate}</td>
                          <td className="text-sm">{p.dueDate}</td>
                          <td className="text-xs text-navy/60 max-w-[200px]">
                            {p.lines.map((l, i) => (
                              <span key={i} className="block truncate">{l.description}: {money(l.amount, p.currency)}{l.note ? <span className="text-navy/40"> · {l.note}</span> : null}</span>
                            ))}
                          </td>
                          <td className="text-right tabular-nums font-semibold text-emerald-600">{money(p.total, p.currency)}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="text-sm text-navy/50">Nothing to bill for {period} — either no active leases or all charges already billed.</p>
            )}

            {/* Skipped */}
            {preview.skipped.length > 0 && (
              <div className="rounded-xl border border-amber-200 bg-amber-50 p-4">
                <p className="text-sm font-semibold text-amber-900">{preview.skipped.length} charge(s) not billed</p>
                <ul className="mt-2 space-y-1 text-xs text-amber-800">
                  {preview.skipped.map((s, i) => (
                    <li key={i} className="flex items-start gap-1">
                      <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                      {s.tenant}{s.charge ? ` · ${s.charge}` : ""}: {s.reason}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Draft button */}
            {preview.proposals.length > 0 && selectedCount > 0 && (
              <button
                onClick={handleDraft}
                disabled={action.busy}
                className="inline-flex items-center gap-2 rounded-xl bg-navy px-4 py-2.5 text-sm font-semibold text-white hover:bg-navy/90 disabled:opacity-50"
              >
                <FileText className="h-4 w-4" />
                Create {selectedCount} Draft Invoice(s) — {money(totalSelected)}
              </button>
            )}
          </div>
        )}
      </SectionCard>

      {/* Step 3 — Approve & Post */}
      {draftInvoices.length > 0 && (
        <SectionCard
          title="Step 3 — Approve & Post"
          subtitle="Review draft invoices and post them to the AR ledger. Each posted invoice generates a journal entry."
        >
          <div className="overflow-x-auto rounded-xl border border-navy/10">
            <table className="data-table min-w-[700px]">
              <thead>
                <tr><th>Number</th><th>Tenant</th><th>Period</th><th>Due</th><th className="text-right">Total</th><th>Status</th><th>Action</th></tr>
              </thead>
              <tbody>
                {draftInvoices.slice(0, 50).map((inv) => {
                  const tenant = book.tenants.find((t) => t.id === inv.tenantId);
                  return (
                    <tr key={inv.id}>
                      <td className="font-mono text-xs text-navy/60">{inv.number}</td>
                      <td className="font-semibold text-navy">{tenant?.name ?? inv.tenantId}</td>
                      <td className="text-sm text-navy/60">{inv.billingPeriod}</td>
                      <td className="text-sm">{inv.dueDate}</td>
                      <td className="text-right tabular-nums font-medium text-emerald-600">{money(inv.total, inv.currency)}</td>
                      <td>
                        <Badge label={inv.status} color={inv.status === "Approved" ? "green" : "amber"} />
                      </td>
                      <td>
                        <div className="flex gap-2">
                          {inv.status === "Draft" && book.settings.approvals.invoices && (
                            <button
                              onClick={() => action.run(() => arService.approveInvoice(inv.id), `${inv.number} approved.`)}
                              disabled={action.busy}
                              className="text-xs font-medium text-[#C79A2B] hover:underline disabled:opacity-40"
                            >
                              Approve
                            </button>
                          )}
                          {(inv.status === "Approved" || (inv.status === "Draft" && !book.settings.approvals.invoices)) && (
                            <button
                              onClick={() => action.run(() => arService.postInvoice(inv.id), `${inv.number} posted.`)}
                              disabled={action.busy}
                              className="text-xs font-semibold text-emerald-600 hover:underline disabled:opacity-40"
                            >
                              Post
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div className="mt-4 flex flex-wrap gap-3">
            {book.settings.approvals.invoices && draftInvoices.some((i) => i.status === "Draft") && (
              <button
                onClick={handleApproveAll}
                disabled={action.busy}
                className="inline-flex items-center gap-2 rounded-xl border border-[#C79A2B]/30 px-4 py-2 text-sm font-semibold text-[#C79A2B] hover:bg-[#C79A2B]/5 disabled:opacity-50"
              >
                <CheckCircle className="h-4 w-4" />
                Approve All ({draftInvoices.filter((i) => i.status === "Draft" && i.billingPeriod === period).length})
              </button>
            )}
            {draftInvoices.some((i) => i.status === "Approved" || (!book.settings.approvals.invoices && i.status === "Draft")) && (
              <button
                onClick={handlePostAll}
                disabled={action.busy}
                className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-50"
              >
                <CheckCircle className="h-4 w-4" />
                Post All to AR ({draftInvoices.filter((i) => i.status === "Approved" || (!book.settings.approvals.invoices && i.status === "Draft")).length})
              </button>
            )}
          </div>

          {postResult && (
            <div className="mt-4 flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
              <CheckCircle className="h-4 w-4 shrink-0" />
              {postResult.posted} invoice(s) posted to AR · journals generated · tenant balances updated
            </div>
          )}
        </SectionCard>
      )}

      {/* Posted summary */}
      {postedThisPeriod.length > 0 && (
        <SectionCard title="Posted This Period" subtitle={`${period} — invoices in AR ledger`}>
          <div className="mb-4 flex flex-wrap gap-4 rounded-xl bg-ivory p-4">
            <div className="text-sm"><span className="font-semibold text-navy">{postedThisPeriod.length}</span> <span className="text-navy/60">invoices</span></div>
            <div className="text-sm font-semibold text-emerald-600">{money(postedThisPeriod.reduce((s, i) => s + i.total, 0))}</div>
          </div>
          <div className="overflow-x-auto rounded-xl border border-navy/10">
            <table className="data-table min-w-[700px]">
              <thead><tr><th>Number</th><th>Tenant</th><th>Posting Date</th><th className="text-right">Total</th><th>Status</th><th></th></tr></thead>
              <tbody>
                {postedThisPeriod.slice(0, 20).map((inv) => {
                  const tenant = book.tenants.find((t) => t.id === inv.tenantId);
                  return (
                    <tr key={inv.id}>
                      <td className="font-mono text-xs text-navy/60">{inv.number}</td>
                      <td className="font-semibold text-navy">{tenant?.name ?? inv.tenantId}</td>
                      <td className="text-sm">{inv.postingDate}</td>
                      <td className="text-right tabular-nums font-medium text-emerald-600">{money(inv.total, inv.currency)}</td>
                      <td><Badge label={inv.status} color="green" /></td>
                      <td>
                        <Link to={`/estate/ar/invoices/${inv.id}`} className="text-xs font-medium text-[#C79A2B] hover:underline">View →</Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </SectionCard>
      )}
    </div>
  );
}
