import { useState } from "react";
import { Link } from "react-router-dom";
import { Plus } from "lucide-react";
import { useJournals, finService, usePeriods } from "../hooks.ts";
import { StatusBadge, EmptyState, LoadingSpinner, PageHeader, ActionButton, inr, SectionCard } from "./shared.tsx";
import type { JournalType, JournalLine } from "../types.ts";

// ─── List ─────────────────────────────────────────────────────────────────────

export function JournalsPage() {
  const { data: journals, loading } = useJournals();
  const [typeFilter, setTypeFilter] = useState<JournalType | "">("");
  const [statusFilter, setStatusFilter] = useState("");

  if (loading) return <LoadingSpinner />;

  const filtered = journals.filter((j) => {
    if (typeFilter && j.type !== typeFilter) return false;
    if (statusFilter && j.status !== statusFilter) return false;
    return true;
  });

  return (
    <div className="space-y-5">
      <PageHeader
        title="Journal Entries"
        action={
          <Link to="/rental-os/finance/journals/new">
            <ActionButton type="button"><Plus className="h-4 w-4" /> New Entry</ActionButton>
          </Link>
        }
      />

      <div className="flex flex-wrap gap-3">
        <select className="rounded-xl border border-navy/15 px-3 py-2 text-sm" value={typeFilter} onChange={(e) => setTypeFilter(e.target.value as JournalType | "")}>
          <option value="">All Types</option>
          {["Manual", "AP Invoice", "AP Payment", "AR Invoice", "AR Receipt", "Depreciation", "Accrual", "Reversal"].map((t) => <option key={t}>{t}</option>)}
        </select>
        <select className="rounded-xl border border-navy/15 px-3 py-2 text-sm" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
          <option value="">All Statuses</option>
          {["Draft", "Posted", "Reversed"].map((s) => <option key={s}>{s}</option>)}
        </select>
      </div>

      {filtered.length === 0 ? (
        <EmptyState message="No journal entries found." />
      ) : (
        <div className="shadow-card overflow-hidden rounded-2xl bg-white">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-[#F8F6F0]">
                <tr>
                  {["JE #", "Date", "Type", "Narration", "Debit", "Credit", "Status", ""].map((h) => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-navy/50">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-navy/5">
                {filtered.map((j) => (
                  <tr key={j.id} className="hover:bg-[#F8F6F0]/60 transition">
                    <td className="px-4 py-3 font-mono text-xs font-semibold text-navy">{j.entryNumber}</td>
                    <td className="px-4 py-3 text-navy/60">{j.date}</td>
                    <td className="px-4 py-3 text-navy/70">{j.type}</td>
                    <td className="px-4 py-3 text-navy max-w-xs truncate">{j.narration}</td>
                    <td className="px-4 py-3 text-right font-semibold text-navy">{inr(j.totalDebit)}</td>
                    <td className="px-4 py-3 text-right text-emerald-700 font-semibold">{inr(j.totalCredit)}</td>
                    <td className="px-4 py-3"><StatusBadge status={j.status} /></td>
                    <td className="px-4 py-3">
                      <Link to={`/rental-os/finance/journals/${j.id}`} className="text-xs text-[#C79A2B] hover:underline">View</Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="border-t border-navy/5 px-4 py-2 text-xs text-navy/40">{filtered.length} entr{filtered.length !== 1 ? "ies" : "y"}</p>
        </div>
      )}
    </div>
  );
}

// ─── New Journal Entry ────────────────────────────────────────────────────────

const ACCOUNTS_FOR_MANUAL = [
  { code: "1001", name: "HDFC Current Account" },
  { code: "1100", name: "Accounts Receivable" },
  { code: "2001", name: "Trade Payables" },
  { code: "2200", name: "GST Payable" },
  { code: "3000", name: "Owner Equity" },
  { code: "3100", name: "Retained Earnings" },
  { code: "4000", name: "Rental Income" },
  { code: "5000", name: "Maintenance & Repairs" },
  { code: "5100", name: "HVAC Expenses" },
  { code: "5300", name: "Utilities" },
  { code: "5500", name: "Depreciation" },
  { code: "5700", name: "Administrative Expenses" },
];

export function NewJournalPage() {
  const { data: periods } = usePeriods();
  const { refresh } = useJournals();
  const [form, setForm] = useState({ date: new Date().toISOString().slice(0, 10), narration: "", reference: "" });
  const [lines, setLines] = useState<Omit<JournalLine, "id">[]>([
    { accountCode: "5000", accountName: "Maintenance & Repairs", description: "", debit: 0, credit: 0 },
    { accountCode: "1001", accountName: "HDFC Current Account", description: "", debit: 0, credit: 0 },
  ]);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");

  const totalDebit = lines.reduce((s, l) => s + (l.debit || 0), 0);
  const totalCredit = lines.reduce((s, l) => s + (l.credit || 0), 0);
  const balanced = Math.abs(totalDebit - totalCredit) < 0.01;

  function updateLine(idx: number, field: string, val: string | number) {
    setLines(lines.map((l, i) => {
      if (i !== idx) return l;
      const updated = { ...l, [field]: val };
      if (field === "accountCode") {
        const acc = ACCOUNTS_FOR_MANUAL.find((a) => a.code === val);
        if (acc) updated.accountName = acc.name;
      }
      return updated;
    }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!balanced) { setError("Entry is not balanced. Total debits must equal total credits."); return; }
    setError("");
    setSaving(true);
    try {
      const openPeriod = periods?.find((p) => p.status === "Open" && form.date >= p.startDate && form.date <= p.endDate);
      if (!openPeriod) { setError(`No open accounting period for ${form.date}.`); setSaving(false); return; }

      const fullLines: JournalLine[] = lines.map((l, i) => ({ ...l, id: String(i + 1), debit: l.debit || 0, credit: l.credit || 0 }));
      await finService().createJournal({ ...form, periodId: openPeriod.id, type: "Manual", lines: fullLines, status: "Draft" });
      await refresh();
      setSaved(true);
    } catch (e) {
      setError(String(e));
    } finally {
      setSaving(false);
    }
  }

  if (saved) return (
    <div className="rounded-2xl bg-emerald-50 p-8 text-center">
      <p className="font-semibold text-emerald-700 text-lg">Journal entry created!</p>
      <Link to="/rental-os/finance/journals" className="mt-3 inline-block text-sm text-[#C79A2B] hover:underline">← Back to journals</Link>
    </div>
  );

  return (
    <div className="space-y-5">
      <PageHeader title="New Journal Entry" />
      <form onSubmit={handleSubmit} className="space-y-5">
        <SectionCard>
          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-semibold text-navy/60 mb-1">Date *</label>
              <input required type="date" className="w-full rounded-xl border border-navy/15 px-3 py-2 text-sm" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} />
            </div>
            <div>
              <label className="block text-xs font-semibold text-navy/60 mb-1">Reference</label>
              <input className="w-full rounded-xl border border-navy/15 px-3 py-2 text-sm" value={form.reference} onChange={(e) => setForm({ ...form, reference: e.target.value })} placeholder="Doc number…" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-navy/60 mb-1">Narration *</label>
              <input required className="w-full rounded-xl border border-navy/15 px-3 py-2 text-sm" value={form.narration} onChange={(e) => setForm({ ...form, narration: e.target.value })} />
            </div>
          </div>
        </SectionCard>

        <SectionCard title="Lines">
          {error && <p className="mb-3 text-sm text-red-600">{error}</p>}
          <table className="w-full text-sm">
            <thead><tr className="border-b border-navy/8">{["Account", "Description", "Debit (₹)", "Credit (₹)", ""].map((h) => <th key={h} className="pb-2 text-left text-xs font-semibold text-navy/50">{h}</th>)}</tr></thead>
            <tbody>
              {lines.map((line, idx) => (
                <tr key={idx} className="border-b border-navy/5">
                  <td className="py-1.5 pr-2">
                    <select className="rounded-lg border border-navy/15 px-2 py-1 text-sm w-full min-w-48" value={line.accountCode} onChange={(e) => updateLine(idx, "accountCode", e.target.value)}>
                      {ACCOUNTS_FOR_MANUAL.map((a) => <option key={a.code} value={a.code}>{a.code} — {a.name}</option>)}
                    </select>
                  </td>
                  <td className="py-1.5 pr-2"><input className="w-full min-w-32 rounded-lg border border-navy/15 px-2 py-1 text-sm" value={line.description} onChange={(e) => updateLine(idx, "description", e.target.value)} placeholder="Description…" /></td>
                  <td className="py-1.5 pr-2 w-28"><input type="number" min={0} step="0.01" className="w-full rounded-lg border border-navy/15 px-2 py-1 text-sm text-right" value={line.debit || ""} onChange={(e) => updateLine(idx, "debit", Number(e.target.value))} placeholder="0" /></td>
                  <td className="py-1.5 pr-2 w-28"><input type="number" min={0} step="0.01" className="w-full rounded-lg border border-navy/15 px-2 py-1 text-sm text-right" value={line.credit || ""} onChange={(e) => updateLine(idx, "credit", Number(e.target.value))} placeholder="0" /></td>
                  <td><button type="button" className="text-red-400 hover:text-red-600 text-xs" onClick={() => setLines(lines.filter((_, i) => i !== idx))}>✕</button></td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className={`border-t-2 ${balanced ? "border-emerald-400" : "border-red-400"}`}>
                <td colSpan={2} className="pt-3 text-right text-xs font-semibold text-navy/60">Total</td>
                <td className="pt-3 text-right font-bold text-navy">{inr(totalDebit)}</td>
                <td className="pt-3 text-right font-bold text-emerald-700">{inr(totalCredit)}</td>
                <td className="pt-3 pl-2">
                  {balanced ? <span className="text-xs text-emerald-600">✓ Balanced</span> : <span className="text-xs text-red-500">Δ {inr(Math.abs(totalDebit - totalCredit))}</span>}
                </td>
              </tr>
            </tfoot>
          </table>
          <button type="button" className="mt-3 text-xs text-[#C79A2B] hover:underline" onClick={() => setLines([...lines, { accountCode: "5000", accountName: "Maintenance & Repairs", description: "", debit: 0, credit: 0 }])}>+ Add Line</button>
        </SectionCard>

        <div className="flex gap-3">
          <ActionButton disabled={!balanced}>{saving ? "Saving…" : "Create Journal"}</ActionButton>
          <Link to="/rental-os/finance/journals"><ActionButton variant="secondary" type="button">Cancel</ActionButton></Link>
        </div>
      </form>
    </div>
  );
}

// ─── Journal Detail ───────────────────────────────────────────────────────────

export function JournalDetailPage({ id }: { id: string }) {
  const { data: journals, loading, refresh } = useJournals();
  const [acting, setActing] = useState(false);
  const [msg, setMsg] = useState("");

  if (loading) return <LoadingSpinner />;
  const j = journals.find((je) => je.id === id);
  if (!j) return <EmptyState message="Journal entry not found." />;

  async function post() {
    setActing(true);
    try {
      await finService().postJournal(id, "current-user");
      await refresh();
      setMsg("Journal posted.");
    } catch (e) {
      setMsg(`Error: ${e}`);
    } finally {
      setActing(false);
    }
  }

  async function reverse() {
    setActing(true);
    try {
      await finService().reverseJournal(id, new Date().toISOString().slice(0, 10), "current-user");
      await refresh();
      setMsg("Reversal journal created.");
    } catch (e) {
      setMsg(`Error: ${e}`);
    } finally {
      setActing(false);
    }
  }

  return (
    <div className="space-y-5">
      <PageHeader
        title={`Journal ${j.entryNumber}`}
        action={
          <div className="flex gap-2">
            {j.status === "Draft" && <ActionButton type="button" onClick={post}>{acting ? "Posting…" : "Post"}</ActionButton>}
            {j.status === "Posted" && <ActionButton type="button" onClick={reverse} variant="secondary">{acting ? "Reversing…" : "Reverse"}</ActionButton>}
          </div>
        }
      />

      {msg && <div className="rounded-xl bg-blue-50 p-3 text-sm text-blue-800">{msg}</div>}

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {[["Date", j.date], ["Type", j.type], ["Reference", j.reference ?? "—"], ["Status", null]].map(([label, value]) => (
          <SectionCard key={label as string}>
            <p className="text-xs text-navy/50">{label}</p>
            {label === "Status" ? <StatusBadge status={j.status} /> : <p className="font-semibold text-navy">{value as string}</p>}
          </SectionCard>
        ))}
      </div>

      <SectionCard title={j.narration}>
        <table className="w-full text-sm">
          <thead><tr className="border-b border-navy/8">{["Account", "Description", "Debit", "Credit"].map((h) => <th key={h} className="pb-2 text-left text-xs font-semibold text-navy/50">{h}</th>)}</tr></thead>
          <tbody>
            {j.lines.map((l) => (
              <tr key={l.id} className="border-b border-navy/5">
                <td className="py-2 font-mono text-xs">{l.accountCode} — {l.accountName}</td>
                <td className="py-2 text-navy/70">{l.description}</td>
                <td className="py-2 text-right font-semibold text-navy">{l.debit > 0 ? inr(l.debit) : "—"}</td>
                <td className="py-2 text-right font-semibold text-emerald-700">{l.credit > 0 ? inr(l.credit) : "—"}</td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="border-t-2 border-navy/10 font-bold">
              <td colSpan={2} className="pt-3 text-right text-sm text-navy/60">Total</td>
              <td className="pt-3 text-right text-navy">{inr(j.totalDebit)}</td>
              <td className="pt-3 text-right text-emerald-700">{inr(j.totalCredit)}</td>
            </tr>
          </tfoot>
        </table>
      </SectionCard>
    </div>
  );
}
