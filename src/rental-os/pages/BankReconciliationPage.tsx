/**
 * Rental OS — Bank Reconciliation Workspace
 *
 * Reads staged bank lines from localStorage (written by BankImportPage).
 * Uses suggestMatch() from the AR engine to suggest tenant + invoice matches.
 * User approves or rejects each match — ambiguous lines are never auto-allocated.
 * Confirmed matches call arService.matchBankLine() which records a receipt + journal.
 *
 * STATUS: Production — calls live AR engine. Requires staged lines from Bank Import.
 */

import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { CheckCircle, XCircle, ArrowRight, Upload } from "lucide-react";
import { balances } from "@/ar/engine/analytics";
import { suggestMatch } from "@/ar/engine/importer";
import { arService, today, useAction, useArBook } from "@/ar/ui/hooks";
import type { StagedLine } from "./BankImportPage";
import { STAGED_KEY } from "./BankImportPage";

function money(val: number) {
  if (val >= 1e5) return `₹${(val / 1e5).toFixed(2)} L`;
  return `₹${val.toLocaleString("en-IN")}`;
}

function confidencePill(c: string) {
  const styles = c === "high" ? "bg-emerald-100 text-emerald-700" : c === "medium" ? "bg-amber-100 text-amber-700" : "bg-red-100 text-red-600";
  return <span className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-semibold ${styles}`}>{c}</span>;
}

export function BankReconciliationPage() {
  const { book, workspaceId } = useArBook();
  const action = useAction();
  const [lines, setLines] = useState<StagedLine[]>([]);
  const [matched, setMatched] = useState<Set<string>>(new Set());
  const [skipped, setSkipped] = useState<Set<string>>(new Set());
  const [overrides, setOverrides] = useState<Record<string, { tenantId: string; invoiceId: string }>>({});

  useEffect(() => {
    if (!workspaceId) return;
    try {
      const stored = localStorage.getItem(STAGED_KEY(workspaceId));
      if (stored) setLines(JSON.parse(stored));
    } catch { /* ignore */ }
  }, [workspaceId]);

  const suggestions = useMemo(() => {
    if (!book) return new Map<string, ReturnType<typeof suggestMatch>>();
    const map = new Map<string, ReturnType<typeof suggestMatch>>();
    for (const line of lines) {
      map.set(line.key, suggestMatch(book, { key: line.key, date: line.date, amount: line.amount, description: line.description, reference: line.reference, kind: "Bank transaction", bankAccount: line.bankAccount, tenantCode: "", invoiceRef: line.reference, entityId: "", source: { system: "Bank import" } }, today()));
    }
    return map;
  }, [book, lines]);

  if (!book || !workspaceId) return null;

  const tenantMap = new Map(book.tenants.map((t) => [t.id, t.name]));
  const invoiceMap = new Map(book.invoices.map((inv) => [inv.id, inv]));
  const openInvoicesByTenant = new Map<string, { id: string; number: string; outstanding: number }[]>();
  for (const [id, b] of balances(book)) {
    if (b.outstanding <= 0) continue;
    const list = openInvoicesByTenant.get(b.invoice.tenantId) ?? [];
    list.push({ id, number: b.invoice.number, outstanding: b.outstanding });
    openInvoicesByTenant.set(b.invoice.tenantId, list);
  }

  const pending = lines.filter((l) => !matched.has(l.key) && !skipped.has(l.key));
  const unmatchedCount = pending.filter((l) => {
    const s = suggestions.get(l.key);
    return !s?.tenantId;
  }).length;

  async function handleMatch(line: StagedLine) {
    const s = suggestions.get(line.key)!;
    const override = overrides[line.key];
    const tenantId = override?.tenantId || s.tenantId;
    if (!tenantId) { action.run(async () => { throw new Error("No tenant identified. Use the override below or skip this line."); }); return; }
    const allocations = override
      ? (override.invoiceId ? [{ invoiceId: override.invoiceId, amount: line.amount }] : [])
      : s.allocations;
    await action.run(
      () => arService.matchBankLine(workspaceId!, { key: line.key, date: line.date, amount: line.amount, description: line.description, reference: line.reference, kind: "Bank transaction", bankAccount: line.bankAccount, tenantCode: "", invoiceRef: line.reference, entityId: "", source: { system: "Bank import" } }, { tenantId, allocations, bankAccount: line.bankAccount }),
      `${money(line.amount)} matched to ${tenantMap.get(tenantId) ?? tenantId}.`,
    );
    setMatched((prev) => new Set([...prev, line.key]));
  }

  function clearStaged() {
    try { localStorage.removeItem(STAGED_KEY(workspaceId!)); } catch { /* ignore */ }
    setLines([]);
    setMatched(new Set());
    setSkipped(new Set());
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="font-serif text-2xl text-navy">Bank Reconciliation</h1>
          <p className="mt-1 text-sm text-navy/60">Match imported bank lines to tenants and invoices. You confirm every match.</p>
        </div>
        <div className="flex gap-2">
          <Link to="/rental-os/bank" className="inline-flex items-center gap-1.5 rounded-xl border border-navy/15 px-3 py-2 text-xs font-semibold text-navy/70 hover:bg-ivory">
            <Upload className="h-3.5 w-3.5" /> Import more lines
          </Link>
          {lines.length > 0 && (
            <button onClick={clearStaged} className="rounded-xl border border-red-200 px-3 py-2 text-xs font-semibold text-red-600 hover:bg-red-50">Clear staged</button>
          )}
        </div>
      </div>

      {action.error && <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{action.error}</div>}
      {action.message && <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">{action.message}</div>}

      {lines.length === 0 ? (
        <div className="rounded-2xl border border-navy/10 bg-white p-10 text-center shadow-card">
          <Upload className="mx-auto h-10 w-10 text-navy/20 mb-3" />
          <p className="text-sm font-semibold text-navy/60">No staged bank lines</p>
          <p className="mt-1 text-xs text-navy/45">Import a bank statement first, then stage the transactions here.</p>
          <Link to="/rental-os/bank" className="mt-4 inline-flex items-center gap-2 rounded-xl bg-[#C79A2B] px-4 py-2 text-sm font-semibold text-white hover:bg-[#b8891e]">
            Import Bank Statement <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      ) : (
        <>
          {/* Stats */}
          <div className="grid gap-4 sm:grid-cols-4">
            {[
              { label: "Total Lines", value: lines.length },
              { label: "Pending", value: pending.length, tone: pending.length > 0 ? "gold" : "green" },
              { label: "Matched", value: matched.size, tone: "green" },
              { label: "Unidentified", value: unmatchedCount, tone: unmatchedCount > 0 ? "red" : "green" },
            ].map(({ label, value, tone }) => (
              <div key={label} className="rounded-2xl border border-navy/10 bg-white p-4 shadow-card">
                <p className="text-[11px] uppercase tracking-widest text-navy/50">{label}</p>
                <p className={`mt-2 font-serif text-2xl ${tone === "gold" ? "text-[#C79A2B]" : tone === "red" ? "text-red-600" : tone === "green" ? "text-emerald-600" : "text-navy"}`}>{value}</p>
              </div>
            ))}
          </div>

          {/* Pending lines */}
          {pending.length > 0 && (
            <div className="rounded-2xl border border-navy/10 bg-white shadow-card">
              <div className="border-b border-navy/5 px-5 py-4">
                <h2 className="font-serif text-xl text-navy">Pending Matches</h2>
                <p className="text-xs text-navy/55 mt-0.5">Review each suggestion and confirm or skip. Ambiguous lines are never matched automatically.</p>
              </div>
              <div className="divide-y divide-navy/5">
                {pending.map((line) => {
                  const s = suggestions.get(line.key);
                  const override = overrides[line.key];
                  const activeTenantId = override?.tenantId || s?.tenantId;
                  const tenantInvoices = activeTenantId ? (openInvoicesByTenant.get(activeTenantId) ?? []) : [];
                  return (
                    <div key={line.key} className="px-5 py-4">
                      <div className="flex flex-wrap items-start justify-between gap-4">
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-baseline gap-3">
                            <span className="font-semibold text-navy">{money(line.amount)}</span>
                            <span className="text-xs text-navy/55">{line.date}</span>
                            {s && confidencePill(s.confidence)}
                          </div>
                          <p className="mt-1 text-xs text-navy/70 truncate">{line.description || "—"} · {line.reference || "—"}</p>
                          {s?.reason && <p className="mt-1 text-[11px] text-navy/50">{s.reason}</p>}

                          {/* Suggestion */}
                          {s?.tenantId && !override && (
                            <div className="mt-2 flex flex-wrap items-center gap-3 text-xs">
                              <span className="text-navy/60">Suggested: <span className="font-medium text-navy">{tenantMap.get(s.tenantId)}</span></span>
                              {s.allocations.length > 0 && (
                                <span className="text-navy/60">→ {s.allocations.map((a) => `${invoiceMap.get(a.invoiceId)?.number ?? a.invoiceId} ${money(a.amount)}`).join(", ")}</span>
                              )}
                            </div>
                          )}

                          {/* Manual override */}
                          <div className="mt-2 flex flex-wrap gap-2 items-center">
                            <select
                              className="rounded-xl border border-navy/20 bg-white px-2 py-1 text-xs focus:border-[#C79A2B] focus:outline-none"
                              value={override?.tenantId ?? s?.tenantId ?? ""}
                              onChange={(e) => setOverrides({ ...overrides, [line.key]: { tenantId: e.target.value, invoiceId: "" } })}
                            >
                              <option value="">Override tenant…</option>
                              {book.tenants.map((t) => <option key={t.id} value={t.id}>{t.code} · {t.name}</option>)}
                            </select>
                            {activeTenantId && tenantInvoices.length > 0 && (
                              <select
                                className="rounded-xl border border-navy/20 bg-white px-2 py-1 text-xs focus:border-[#C79A2B] focus:outline-none"
                                value={override?.invoiceId ?? s?.allocations[0]?.invoiceId ?? ""}
                                onChange={(e) => setOverrides({ ...overrides, [line.key]: { tenantId: activeTenantId, invoiceId: e.target.value } })}
                              >
                                <option value="">No specific invoice (advance)</option>
                                {tenantInvoices.map((inv) => <option key={inv.id} value={inv.id}>{inv.number} · {money(inv.outstanding)} outstanding</option>)}
                              </select>
                            )}
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => handleMatch(line)}
                            disabled={action.busy || (!s?.tenantId && !overrides[line.key]?.tenantId)}
                            className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-emerald-700 disabled:opacity-40"
                          >
                            <CheckCircle className="h-3.5 w-3.5" /> Match
                          </button>
                          <button
                            type="button"
                            onClick={() => setSkipped((prev) => new Set([...prev, line.key]))}
                            className="inline-flex items-center gap-1.5 rounded-xl border border-navy/15 px-3 py-1.5 text-xs font-semibold text-navy/60 hover:bg-ivory"
                          >
                            <XCircle className="h-3.5 w-3.5" /> Skip
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Skipped / unmatched exceptions */}
          {skipped.size > 0 && (
            <div className="rounded-2xl border border-amber-200 bg-amber-50 p-5 shadow-card">
              <h2 className="font-serif text-lg text-navy mb-2">Skipped / Exceptions ({skipped.size})</h2>
              <p className="text-xs text-navy/60 mb-3">These lines were skipped and will not be matched. Import or stage them again to retry.</p>
              <div className="space-y-2">
                {lines.filter((l) => skipped.has(l.key)).map((line) => (
                  <div key={line.key} className="flex items-center justify-between rounded-xl bg-white px-4 py-2 text-sm">
                    <span>{money(line.amount)} · {line.date} · {line.description || line.reference || "—"}</span>
                    <button type="button" onClick={() => setSkipped((prev) => { const n = new Set(prev); n.delete(line.key); return n; })} className="text-xs text-[#C79A2B] hover:underline">Retry</button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* All matched */}
          {pending.length === 0 && matched.size > 0 && (
            <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-6 text-center shadow-card">
              <CheckCircle className="mx-auto h-10 w-10 text-emerald-500 mb-3" />
              <p className="font-semibold text-emerald-800">All {matched.size} line{matched.size !== 1 ? "s" : ""} matched!</p>
              <p className="text-xs text-emerald-700 mt-1">Receipts and journals posted to the AR ledger.</p>
              <div className="mt-4 flex justify-center gap-3">
                <Link to="/estate/ar/payments" className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700">
                  View Receipts <ArrowRight className="h-4 w-4" />
                </Link>
                <button onClick={clearStaged} className="rounded-xl border border-navy/15 px-4 py-2 text-sm font-semibold text-navy/60 hover:bg-white">Clear staged lines</button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
