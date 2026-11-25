import { useState, useMemo, useCallback } from "react";
import {
  PlusCircle, Trash2, CheckCircle, RotateCcw, TrendingUp, TrendingDown,
  ArrowRight, Download, AlertTriangle,
} from "lucide-react";
import { useEntities, useICTransactions, useEliminations, budService } from "../hooks.ts";
import { computeConsolidation } from "../consolidationEngine.ts";
import { IndexedDbAdapter } from "../../integrations/service/storage.ts";
import type { ICTransaction, ICTransactionType } from "../types.ts";
import type { Account } from "../../fin/types.ts";

// ─── Helpers ──────────────────────────────────────────────────────────────────

const WS = "meridian-ventures";

function inr(v: number): string {
  const abs = Math.abs(v);
  const sign = v < 0 ? "-" : "";
  if (abs >= 1e7) return `${sign}₹${(abs / 1e7).toFixed(2)} Cr`;
  if (abs >= 1e5) return `${sign}₹${(abs / 1e5).toFixed(1)} L`;
  if (abs >= 1e3) return `${sign}₹${(abs / 1e3).toFixed(0)}K`;
  return `${sign}₹${abs.toLocaleString()}`;
}

const currentFY = () => new Date().getMonth() >= 3 ? new Date().getFullYear() : new Date().getFullYear() - 1;

const STATUS_PILL: Record<ICTransaction["status"], string> = {
  Open: "bg-amber-50 text-amber-700",
  Matched: "bg-sky-50 text-sky-700",
  Eliminated: "bg-emerald-50 text-emerald-700",
};

const IC_TYPES: ICTransactionType[] = ["Loan", "Management Fee", "Recharge", "Dividend", "Other"];

function inferAccountType(code: string): Account["type"] {
  if (code.startsWith("1")) return "Asset";
  if (code.startsWith("2")) return "Liability";
  if (code.startsWith("3")) return "Equity";
  if (code.startsWith("4")) return "Revenue";
  return "Expense";
}

const TH = "px-4 py-2.5 text-left text-xs font-semibold uppercase tracking-wider text-navy/40";
const TD = "px-4 py-2 text-sm";
const TDFIN = "px-4 py-2 text-sm tabular-nums text-right";

function csvDownload(rows: string[][], filename: string) {
  const blob = new Blob([rows.map((r) => r.map((c) => `"${c}"`).join(",")).join("\n")], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = filename; a.click();
  URL.revokeObjectURL(url);
}

// ─── New IC Transaction Form ──────────────────────────────────────────────────

interface NewICFormProps { onSaved: () => void; onCancel: () => void }

function NewICForm({ onSaved, onCancel }: NewICFormProps) {
  const { data: entities } = useEntities();
  const [form, setForm] = useState({
    fromEntityId: "", toEntityId: "", type: "Recharge" as ICTransactionType,
    description: "", amount: "", date: new Date().toISOString().slice(0, 10),
    fromAccountCode: "1310", fromAccountName: "IC Receivable",
    toAccountCode: "2310", toAccountName: "IC Payable",
    reference: "", notes: "",
  });
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState("");

  const set = (k: keyof typeof form, v: string) => setForm((f) => ({ ...f, [k]: v }));

  const save = async () => {
    if (!form.fromEntityId || !form.toEntityId || !form.amount || !form.description) {
      setErr("From entity, to entity, description and amount are required."); return;
    }
    if (form.fromEntityId === form.toEntityId) {
      setErr("From and To entities must be different."); return;
    }
    const parsedAmount = parseFloat(form.amount);
    if (!Number.isFinite(parsedAmount) || parsedAmount <= 0) {
      setErr("Amount must be a positive number greater than zero."); return;
    }
    setSaving(true); setErr("");
    const fromEntity = (entities ?? []).find((e) => e.id === form.fromEntityId);
    const toEntity   = (entities ?? []).find((e) => e.id === form.toEntityId);
    try {
      await budService().createICTransaction({
        fromEntityId: form.fromEntityId,
        fromEntityName: fromEntity?.name ?? form.fromEntityId,
        toEntityId: form.toEntityId,
        toEntityName: toEntity?.name ?? form.toEntityId,
        type: form.type,
        description: form.description,
        amount: parseFloat(form.amount),
        date: form.date,
        fromAccountCode: form.fromAccountCode,
        fromAccountName: form.fromAccountName,
        toAccountCode: form.toAccountCode,
        toAccountName: form.toAccountName,
        reference: form.reference || undefined,
        notes: form.notes || undefined,
      });
      onSaved();
    } catch (e) { setErr(String(e)); }
    finally { setSaving(false); }
  };

  const inp = "rounded-xl border border-navy/15 bg-[#F8F6F0] px-3 py-2 text-sm text-navy focus:outline-none focus:ring-2 focus:ring-[#C79A2B]/30 w-full";

  return (
    <div className="rounded-2xl border border-[#C79A2B]/30 bg-[#C79A2B]/5 p-5">
      <p className="mb-4 text-sm font-semibold text-navy">New Intercompany Transaction</p>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <div>
          <label className="block text-xs font-semibold text-navy/40 mb-1">From Entity *</label>
          <select className={inp} value={form.fromEntityId} onChange={(e) => set("fromEntityId", e.target.value)}>
            <option value="">Select…</option>
            {(entities ?? []).map((e) => <option key={e.id} value={e.id}>{e.code} — {e.name}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-xs font-semibold text-navy/40 mb-1">To Entity *</label>
          <select className={inp} value={form.toEntityId} onChange={(e) => set("toEntityId", e.target.value)}>
            <option value="">Select…</option>
            {(entities ?? []).map((e) => <option key={e.id} value={e.id}>{e.code} — {e.name}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-xs font-semibold text-navy/40 mb-1">Type</label>
          <select className={inp} value={form.type} onChange={(e) => set("type", e.target.value as ICTransactionType)}>
            {IC_TYPES.map((t) => <option key={t}>{t}</option>)}
          </select>
        </div>
        <div className="sm:col-span-2">
          <label className="block text-xs font-semibold text-navy/40 mb-1">Description *</label>
          <input className={inp} value={form.description} onChange={(e) => set("description", e.target.value)} placeholder="e.g. Management fee Q1 FY26" />
        </div>
        <div>
          <label className="block text-xs font-semibold text-navy/40 mb-1">Amount (₹) *</label>
          <input className={inp} type="number" min="0" value={form.amount} onChange={(e) => set("amount", e.target.value)} placeholder="0" />
        </div>
        <div>
          <label className="block text-xs font-semibold text-navy/40 mb-1">Date</label>
          <input className={inp} type="date" value={form.date} onChange={(e) => set("date", e.target.value)} />
        </div>
        <div>
          <label className="block text-xs font-semibold text-navy/40 mb-1">From Account Code</label>
          <input className={inp} value={form.fromAccountCode} onChange={(e) => set("fromAccountCode", e.target.value)} placeholder="1310" />
        </div>
        <div>
          <label className="block text-xs font-semibold text-navy/40 mb-1">To Account Code</label>
          <input className={inp} value={form.toAccountCode} onChange={(e) => set("toAccountCode", e.target.value)} placeholder="2310" />
        </div>
        <div>
          <label className="block text-xs font-semibold text-navy/40 mb-1">Reference</label>
          <input className={inp} value={form.reference} onChange={(e) => set("reference", e.target.value)} placeholder="Optional" />
        </div>
      </div>
      {err && <p className="mt-2 text-xs text-red-600">{err}</p>}
      <div className="mt-4 flex gap-3">
        <button onClick={save} disabled={saving}
          className="rounded-xl bg-[#0A1628] px-5 py-2 text-sm font-semibold text-white hover:bg-[#C79A2B] transition disabled:opacity-50">
          {saving ? "Saving…" : "Save Transaction"}
        </button>
        <button onClick={onCancel} className="rounded-xl border border-navy/15 px-4 py-2 text-sm text-navy/60 hover:text-navy">Cancel</button>
      </div>
    </div>
  );
}

// ─── Main Page ─────────────────────────────────────────────────────────────────

type Tab = "transactions" | "eliminations" | "adjusted";

export function ICPage() {
  const [tab, setTab] = useState<Tab>("transactions");
  const [showForm, setShowForm] = useState(false);
  const [fiscalYear, setFiscalYear] = useState(currentFY());
  const [adjRunning, setAdjRunning] = useState(false);
  const [adjError, setAdjError] = useState("");

  const { data: entities } = useEntities();
  const { data: txns, loading: loadingTxns, refresh: refreshTxns } = useICTransactions();
  const { data: elims, loading: loadingElims, refresh: refreshElims } = useEliminations();

  const fyTxns = useMemo(
    () => (txns ?? []).filter((t) => t.date.startsWith(String(fiscalYear)) || t.date.startsWith(String(fiscalYear + 1))),
    [txns, fiscalYear],
  );

  // Adjusted P&L: consolidation minus elimination adjustments
  const [adjPL, setAdjPL] = useState<{ totalRevenue: number; totalExpenses: number; netIncome: number; eliminations: { description: string; amount: number }[] } | null>(null);

  const runAdjusted = useCallback(async () => {
    setAdjRunning(true); setAdjError("");
    try {
      const adapter = new IndexedDbAdapter();
      const startDate = `${fiscalYear}-04-01`;
      const endDate   = `${fiscalYear + 1}-03-31`;
      const { pl } = await computeConsolidation(adapter, WS, [], startDate, endDate);

      // Load CoA to classify elimination entries by account type
      const accounts = await adapter.getByIndex<Account>("fin_accounts", "workspaceId", WS);
      const accountTypeMap = new Map<string, Account["type"]>(accounts.map((a) => [a.code, a.type]));

      const fyElims = (elims ?? []).filter((e) => e.fiscalYear === fiscalYear);
      let revElim = 0;
      let expElim = 0;
      const elimItems: { description: string; amount: number }[] = [];

      for (const e of fyElims) {
        // net impact of this elimination on P&L (credit − debit per entry)
        for (const entry of e.entries) {
          const aType = accountTypeMap.get(entry.accountCode) ?? inferAccountType(entry.accountCode);
          const net = entry.credit - entry.debit;
          if (aType === "Revenue") revElim += net;
          else if (aType === "Expense") expElim += net;
        }
        const amount = e.entries.reduce((s, entry) => s + entry.credit - entry.debit, 0);
        elimItems.push({ description: e.description, amount });
      }

      const adjRevenue  = pl.totalRevenue  - revElim;
      const adjExpenses = pl.totalExpenses - expElim;
      setAdjPL({
        totalRevenue: adjRevenue,
        totalExpenses: adjExpenses,
        netIncome: adjRevenue - adjExpenses,
        eliminations: elimItems,
      });
    } catch (e) { setAdjError(String(e)); }
    finally { setAdjRunning(false); }
  }, [fiscalYear, elims]);

  const eliminate = async (tx: ICTransaction) => {
    await budService().eliminateTransaction(tx, fiscalYear);
    refreshTxns(); refreshElims();
  };

  const reverseElim = async (elimId: string) => {
    await budService().reverseElimination(elimId);
    refreshTxns(); refreshElims();
  };

  const deleteTx = async (id: string) => {
    await budService().deleteICTransaction(id);
    refreshTxns(); refreshElims();
  };

  const exportTxns = () => {
    const rows: string[][] = [["IC#", "Date", "From", "To", "Type", "Description", "Amount", "Status"]];
    (txns ?? []).forEach((t) => rows.push([t.icNumber, t.date, t.fromEntityId, t.toEntityId, t.type, t.description, t.amount.toFixed(2), t.status]));
    csvDownload(rows, "ic_transactions.csv");
  };

  const entityName = (id: string) => (entities ?? []).find((e) => e.id === id)?.code ?? id;

  const TABS: { id: Tab; label: string }[] = [
    { id: "transactions", label: "IC Transactions" },
    { id: "eliminations", label: "Eliminations" },
    { id: "adjusted", label: "Adjusted P&L" },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-serif text-2xl text-[#0A1628]">Intercompany & Eliminations</h1>
          <p className="mt-1 text-sm text-navy/60">Record IC transactions, eliminate them on consolidation, view adjusted P&L</p>
        </div>
        <div className="flex items-center gap-3">
          <select
            className="rounded-xl border border-navy/15 bg-[#F8F6F0] px-3 py-2 text-sm text-navy"
            value={fiscalYear} onChange={(e) => setFiscalYear(Number(e.target.value))}>
            {[currentFY() - 1, currentFY(), currentFY() + 1].map((y) => (
              <option key={y} value={y}>FY{y}-{String(y + 1).slice(2)}</option>
            ))}
          </select>
          {tab === "transactions" && (
            <button onClick={exportTxns}
              className="inline-flex items-center gap-2 rounded-xl border border-navy/15 px-3 py-2 text-sm font-semibold text-navy/60 hover:border-[#C79A2B]/40 hover:text-[#C79A2B]">
              <Download className="h-4 w-4" /> Export
            </button>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b border-navy/10">
        {TABS.map(({ id, label }) => (
          <button key={id} onClick={() => setTab(id)}
            className={`pb-2.5 px-1 text-sm font-semibold transition border-b-2 mr-4 ${
              tab === id ? "border-[#C79A2B] text-navy" : "border-transparent text-navy/40 hover:text-navy/70"
            }`}>{label}</button>
        ))}
      </div>

      {/* ── Transactions tab ── */}
      {tab === "transactions" && (
        <div className="space-y-4">
          {!showForm && (
            <button onClick={() => setShowForm(true)}
              className="inline-flex items-center gap-2 rounded-xl bg-[#0A1628] px-4 py-2 text-sm font-semibold text-white hover:bg-[#C79A2B] transition">
              <PlusCircle className="h-4 w-4" /> New IC Transaction
            </button>
          )}
          {showForm && <NewICForm onSaved={() => { setShowForm(false); refreshTxns(); }} onCancel={() => setShowForm(false)} />}

          {loadingTxns ? (
            <div className="flex items-center justify-center py-16">
              <div className="h-5 w-5 animate-spin rounded-full border-2 border-[#C79A2B] border-t-transparent" />
            </div>
          ) : fyTxns.length === 0 ? (
            <div className="rounded-2xl border border-navy/10 bg-white py-16 text-center">
              <ArrowRight className="mx-auto h-10 w-10 text-navy/20" />
              <p className="mt-3 text-sm font-semibold text-navy">No IC transactions for this FY</p>
              <p className="mt-1 text-sm text-navy/50">Add intercompany loans, management fees or recharges above.</p>
            </div>
          ) : (
            <div className="rounded-2xl border border-navy/10 bg-white shadow-sm overflow-x-auto">
              <table className="w-full text-sm">
                <thead><tr className="border-b border-navy/5">
                  <th className={TH}>IC#</th>
                  <th className={TH}>Date</th>
                  <th className={TH}>From → To</th>
                  <th className={TH}>Type</th>
                  <th className={TH}>Description</th>
                  <th className={`${TH} text-right`}>Amount</th>
                  <th className={TH}>Status</th>
                  <th className={TH}>Actions</th>
                </tr></thead>
                <tbody>
                  {fyTxns.map((t) => (
                    <tr key={t.id} className="border-b border-navy/5 last:border-0 hover:bg-[#F8F6F0]/30">
                      <td className={`${TD} font-mono text-navy/60`}>{t.icNumber}</td>
                      <td className={TD}>{t.date}</td>
                      <td className={TD}>
                        <span className="inline-flex items-center gap-1 text-xs">
                          <span className="font-semibold">{entityName(t.fromEntityId)}</span>
                          <ArrowRight className="h-3 w-3 text-navy/30" />
                          <span className="font-semibold">{entityName(t.toEntityId)}</span>
                        </span>
                      </td>
                      <td className={TD}><span className="rounded-full bg-navy/8 px-2 py-0.5 text-xs">{t.type}</span></td>
                      <td className={`${TD} max-w-xs truncate`}>{t.description}</td>
                      <td className={`${TDFIN} font-semibold`}>{inr(t.amount)}</td>
                      <td className={TD}>
                        <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${STATUS_PILL[t.status]}`}>{t.status}</span>
                      </td>
                      <td className={TD}>
                        <div className="flex items-center gap-2">
                          {t.status === "Open" && (
                            <button onClick={() => eliminate(t)} title="Eliminate"
                              className="rounded-lg bg-emerald-50 p-1.5 text-emerald-700 hover:bg-emerald-100 transition">
                              <CheckCircle className="h-3.5 w-3.5" />
                            </button>
                          )}
                          {t.status === "Eliminated" && t.eliminationId && (
                            <button onClick={() => reverseElim(t.eliminationId!)} title="Reverse elimination"
                              className="rounded-lg bg-amber-50 p-1.5 text-amber-700 hover:bg-amber-100 transition">
                              <RotateCcw className="h-3.5 w-3.5" />
                            </button>
                          )}
                          <button onClick={() => deleteTx(t.id)} title="Delete"
                            className="rounded-lg bg-red-50 p-1.5 text-red-600 hover:bg-red-100 transition">
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ── Eliminations tab ── */}
      {tab === "eliminations" && (
        <div className="space-y-4">
          {loadingElims ? (
            <div className="flex items-center justify-center py-16">
              <div className="h-5 w-5 animate-spin rounded-full border-2 border-[#C79A2B] border-t-transparent" />
            </div>
          ) : (elims ?? []).filter((e) => e.fiscalYear === fiscalYear).length === 0 ? (
            <div className="rounded-2xl border border-navy/10 bg-white py-16 text-center">
              <CheckCircle className="mx-auto h-10 w-10 text-navy/20" />
              <p className="mt-3 text-sm font-semibold text-navy">No eliminations yet</p>
              <p className="mt-1 text-sm text-navy/50">Eliminate IC transactions from the Transactions tab first.</p>
            </div>
          ) : (
            <div className="rounded-2xl border border-navy/10 bg-white shadow-sm overflow-x-auto">
              <table className="w-full text-sm">
                <thead><tr className="border-b border-navy/5">
                  <th className={TH}>Date</th>
                  <th className={TH}>Description</th>
                  <th className={TH}>Entries</th>
                  <th className={TH}>Actions</th>
                </tr></thead>
                <tbody>
                  {(elims ?? []).filter((e) => e.fiscalYear === fiscalYear).map((e) => (
                    <tr key={e.id} className="border-b border-navy/5 last:border-0 hover:bg-[#F8F6F0]/30">
                      <td className={TD}>{e.eliminationDate}</td>
                      <td className={`${TD} max-w-xs`}>{e.description}</td>
                      <td className={TD}>
                        <div className="space-y-0.5">
                          {e.entries.map((entry, i) => (
                            <div key={i} className="text-xs text-navy/60">
                              {entityName(entry.entityId)} · {entry.accountCode}
                              {entry.debit > 0 ? <span className="ml-1 text-red-600">Dr {inr(entry.debit)}</span> : <span className="ml-1 text-emerald-700">Cr {inr(entry.credit)}</span>}
                            </div>
                          ))}
                        </div>
                      </td>
                      <td className={TD}>
                        <button onClick={() => reverseElim(e.id)} title="Reverse"
                          className="inline-flex items-center gap-1.5 rounded-lg bg-amber-50 px-2 py-1 text-xs font-semibold text-amber-700 hover:bg-amber-100">
                          <RotateCcw className="h-3 w-3" /> Reverse
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ── Adjusted P&L tab ── */}
      {tab === "adjusted" && (
        <div className="space-y-5">
          <button onClick={runAdjusted} disabled={adjRunning}
            className="inline-flex items-center gap-2 rounded-xl bg-[#0A1628] px-5 py-2 text-sm font-semibold text-white hover:bg-[#C79A2B] transition disabled:opacity-50">
            {adjRunning ? "Computing…" : "Run Adjusted P&L"}
          </button>
          {adjError && <p className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{adjError}</p>}

          {adjPL && (
            <>
              <div className="grid grid-cols-3 gap-4">
                {[
                  { label: "Adjusted Revenue", value: adjPL.totalRevenue, color: "text-emerald-700", Icon: TrendingUp },
                  { label: "Adjusted Expenses", value: adjPL.totalExpenses, color: "text-red-600", Icon: TrendingDown },
                  { label: "Adjusted Net Income", value: adjPL.netIncome, color: adjPL.netIncome >= 0 ? "text-navy" : "text-red-600", Icon: adjPL.netIncome >= 0 ? TrendingUp : TrendingDown },
                ].map(({ label, value, color, Icon }) => (
                  <div key={label} className="rounded-2xl border border-navy/10 bg-white p-5 shadow-sm">
                    <div className="flex items-center gap-2">
                      <Icon className={`h-4 w-4 ${color}`} />
                      <p className="text-xs font-semibold uppercase tracking-widest text-navy/40">{label}</p>
                    </div>
                    <p className={`mt-2 text-2xl font-semibold ${color}`}>{inr(value)}</p>
                  </div>
                ))}
              </div>

              {adjPL.eliminations.length > 0 ? (
                <div className="rounded-2xl border border-navy/10 bg-white shadow-sm">
                  <div className="border-b border-navy/8 px-5 py-3 flex items-center gap-2">
                    <AlertTriangle className="h-4 w-4 text-amber-500" />
                    <p className="text-sm font-semibold text-navy">Applied Eliminations ({adjPL.eliminations.length})</p>
                  </div>
                  <table className="w-full text-sm">
                    <thead><tr className="border-b border-navy/5">
                      <th className={TH}>Description</th>
                      <th className={`${TH} text-right`}>Elimination Amount</th>
                    </tr></thead>
                    <tbody>
                      {adjPL.eliminations.map((e, i) => (
                        <tr key={i} className="border-b border-navy/5 last:border-0">
                          <td className={TD}>{e.description}</td>
                          <td className={`${TDFIN} font-semibold text-amber-700`}>{inr(e.amount)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="rounded-xl border border-navy/10 bg-[#F8F6F0] px-5 py-4 text-sm text-navy/60">
                  No eliminations applied for this FY — P&L matches the unadjusted consolidated figure.
                </div>
              )}
            </>
          )}

          {!adjPL && !adjRunning && (
            <div className="rounded-2xl border border-navy/10 bg-white py-20 text-center">
              <TrendingUp className="mx-auto h-10 w-10 text-navy/20" />
              <p className="mt-3 text-sm font-semibold text-navy">Run the adjusted P&L</p>
              <p className="mt-1 text-sm text-navy/50">Consolidates all posted journals and subtracts eliminated IC transactions.</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
