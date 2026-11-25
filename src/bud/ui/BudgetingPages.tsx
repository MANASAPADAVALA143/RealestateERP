import { useState } from "react";
import { Link, useParams, useNavigate } from "react-router-dom";
import { Plus, ChevronRight, ArrowLeft, Trash2, TrendingUp, TrendingDown } from "lucide-react";
import { useBudgets, useBudget, useBudgetLines, useEntities, budService } from "../hooks.ts";
import type { Budget, BudgetType } from "../types.ts";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function inr(v: number): string {
  const abs = Math.abs(v);
  const sign = v < 0 ? "-" : "";
  if (abs >= 1e7) return `${sign}₹${(abs / 1e7).toFixed(2)} Cr`;
  if (abs >= 1e5) return `${sign}₹${(abs / 1e5).toFixed(1)} L`;
  if (abs >= 1e3) return `${sign}₹${(abs / 1e3).toFixed(0)}K`;
  return `${sign}₹${abs.toLocaleString()}`;
}

function statusColor(s: Budget["status"]) {
  if (s === "Approved") return "bg-emerald-50 text-emerald-800 ring-emerald-700/15";
  if (s === "Locked") return "bg-navy/5 text-navy ring-navy/10";
  if (s === "Under Review") return "bg-amber-50 text-amber-800 ring-amber-700/20";
  return "bg-blue-50 text-blue-700 ring-blue-700/15";
}

const MONTHS_LABEL = ["Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec","Jan","Feb","Mar"];

function fiscalMonths(fiscalYear: number): string[] {
  return Array.from({ length: 12 }, (_, i) => {
    const month = ((3 + i) % 12) + 1;
    const year = i < 9 ? fiscalYear : fiscalYear + 1;
    return `${year}-${String(month).padStart(2, "0")}-01`;
  });
}

// ─── Budget List ──────────────────────────────────────────────────────────────

export function BudgetsListPage() {
  const { data: budgets, loading } = useBudgets();
  const { data: entities } = useEntities();
  const [entityFilter, setEntityFilter] = useState("All");

  const filtered = (budgets ?? []).filter((b) => entityFilter === "All" || b.entityId === entityFilter);

  if (loading) return (
    <div className="flex items-center justify-center py-20">
      <div className="h-6 w-6 animate-spin rounded-full border-2 border-[#C79A2B] border-t-transparent" />
    </div>
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-serif text-2xl text-[#0A1628]">Budgets</h1>
          <p className="mt-1 text-sm text-navy/60">{filtered.length} budget{filtered.length !== 1 ? "s" : ""}</p>
        </div>
        <Link to="/rental-os/budgeting/new"
          className="inline-flex items-center gap-2 rounded-xl bg-[#C79A2B] px-4 py-2 text-sm font-semibold text-white hover:bg-[#b8891e]">
          <Plus className="h-4 w-4" /> New Budget
        </Link>
      </div>

      {/* Entity filter pills */}
      <div className="flex flex-wrap gap-2">
        {["All", ...(entities ?? []).map((e) => e.id)].map((id) => (
          <button key={id}
            onClick={() => setEntityFilter(id)}
            className={`rounded-full px-3 py-1 text-xs font-semibold transition ${entityFilter === id ? "bg-[#C79A2B] text-white" : "bg-[#F8F6F0] border border-navy/15 text-navy/60 hover:border-[#C79A2B]/40"}`}>
            {id === "All" ? "All Entities" : (entities ?? []).find((e) => e.id === id)?.code ?? id}
          </button>
        ))}
      </div>

      <div className="rounded-2xl border border-navy/10 bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-navy/8">
                {["Number","Name","Entity","FY","Type","Revenue","Expense","NOI","Status",""].map((h) => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-navy/50">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map((b) => (
                <tr key={b.id} className="border-b border-navy/5 last:border-0 hover:bg-[#F8F6F0]/50">
                  <td className="px-4 py-3 font-mono text-xs text-navy/50">{b.budgetNumber}</td>
                  <td className="px-4 py-3 font-semibold text-navy">{b.name}</td>
                  <td className="px-4 py-3 text-navy/70">{b.entityName}</td>
                  <td className="px-4 py-3 text-navy/70">FY{b.fiscalYear}-{String(b.fiscalYear + 1).slice(2)}</td>
                  <td className="px-4 py-3 text-navy/70">{b.type}</td>
                  <td className="px-4 py-3 tabular-nums text-emerald-700 font-medium">{inr(b.totalRevenueBudget)}</td>
                  <td className="px-4 py-3 tabular-nums text-red-600 font-medium">{inr(b.totalExpenseBudget)}</td>
                  <td className={`px-4 py-3 tabular-nums font-semibold ${b.totalNoiBudget >= 0 ? "text-emerald-700" : "text-red-600"}`}>{inr(b.totalNoiBudget)}</td>
                  <td className="px-4 py-3">
                    <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ring-1 ring-inset ${statusColor(b.status)}`}>{b.status}</span>
                  </td>
                  <td className="px-4 py-3">
                    <Link to={`/rental-os/budgeting/${b.id}`} className="text-xs font-medium text-[#C79A2B] hover:underline">Open →</Link>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr><td colSpan={10} className="py-12 text-center text-sm text-navy/40">No budgets yet. Create your first annual budget.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

// ─── New Budget Form ───────────────────────────────────────────────────────────

export function NewBudgetPage() {
  const navigate = useNavigate();
  const { data: entities } = useEntities();
  const [form, setForm] = useState({
    entityId: "",
    name: "",
    type: "Annual" as BudgetType,
    fiscalYear: new Date().getFullYear(),
    notes: "",
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const f = (field: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
    setForm((s) => ({ ...s, [field]: e.target.value }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.entityId) { setError("Select an entity."); return; }
    if (!form.name.trim()) { setError("Name is required."); return; }
    setSaving(true);
    try {
      const entity = (entities ?? []).find((en) => en.id === form.entityId);
      const fy = Number(form.fiscalYear);
      const budget = await budService().createBudget({
        entityId: form.entityId,
        entityName: entity?.name ?? form.entityId,
        name: form.name.trim(),
        type: form.type,
        fiscalYear: fy,
        startDate: `${fy}-04-01`,
        endDate: `${fy + 1}-03-31`,
        status: "Draft",
        notes: form.notes,
      });
      navigate(`/rental-os/budgeting/${budget.id}`);
    } catch (err) {
      setError(String(err));
      setSaving(false);
    }
  };

  const inp = "w-full rounded-xl border border-navy/15 bg-[#F8F6F0] px-3 py-2 text-sm text-navy focus:outline-none focus:ring-2 focus:ring-[#C79A2B]/30";
  const lbl = "block text-xs font-semibold uppercase tracking-widest text-navy/50 mb-1";

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <Link to="/rental-os/budgeting" className="flex items-center gap-1 text-sm text-[#C79A2B] hover:underline">
          <ArrowLeft className="h-4 w-4" /> Budgets
        </Link>
        <ChevronRight className="h-4 w-4 text-navy/30" />
        <span className="text-sm text-navy">New Budget</span>
      </div>

      <div>
        <h1 className="font-serif text-2xl text-[#0A1628]">New Budget</h1>
        <p className="mt-1 text-sm text-navy/60">Create an annual budget for a legal entity. Add line items after creation.</p>
      </div>

      <div className="rounded-2xl border border-navy/10 bg-white p-6 shadow-sm max-w-xl">
        {error && <p className="mb-4 rounded-xl bg-red-50 border border-red-200 px-4 py-2 text-sm text-red-700">{error}</p>}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className={lbl}>Legal Entity *</label>
            <select className={inp} value={form.entityId} onChange={f("entityId")}>
              <option value="">Select entity…</option>
              {(entities ?? []).map((e) => <option key={e.id} value={e.id}>{e.name} ({e.code})</option>)}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={lbl}>Fiscal Year</label>
              <input type="number" className={inp} value={form.fiscalYear} onChange={f("fiscalYear")} min={2020} max={2040} />
            </div>
            <div>
              <label className={lbl}>Budget Type</label>
              <select className={inp} value={form.type} onChange={f("type")}>
                {["Annual","Revised","Supplementary"].map((t) => <option key={t}>{t}</option>)}
              </select>
            </div>
          </div>
          <div>
            <label className={lbl}>Budget Name *</label>
            <input className={inp} value={form.name} onChange={f("name")} placeholder={`FY${form.fiscalYear}-${String(Number(form.fiscalYear) + 1).slice(2)} Annual Budget`} />
          </div>
          <div>
            <label className={lbl}>Notes</label>
            <textarea className={inp} value={form.notes} onChange={f("notes")} rows={2} />
          </div>
          <div className="flex gap-3 pt-2">
            <button type="submit" disabled={saving}
              className="rounded-xl bg-[#C79A2B] px-5 py-2 text-sm font-semibold text-white hover:bg-[#b8891e] disabled:opacity-50">
              {saving ? "Creating…" : "Create Budget"}
            </button>
            <Link to="/rental-os/budgeting"
              className="rounded-xl border border-navy/15 px-5 py-2 text-sm font-semibold text-navy/60 hover:border-navy/30">
              Cancel
            </Link>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── Budget Detail ────────────────────────────────────────────────────────────

function AddLineForm({ budgetId, entityId, fiscalYear, onSave }: {
  budgetId: string; entityId: string; fiscalYear: number; onSave: () => void;
}) {
  const months = fiscalMonths(fiscalYear);
  const [form, setForm] = useState({
    accountCode: "",
    accountName: "",
    propertyId: "",
    propertyName: "",
    costCentre: "",
    month: months[0],
    amount: "",
    notes: "",
  });
  const [saving, setSaving] = useState(false);
  const inp = "rounded-xl border border-navy/15 bg-[#F8F6F0] px-3 py-2 text-sm text-navy focus:outline-none focus:ring-2 focus:ring-[#C79A2B]/30";

  const handleSave = async () => {
    if (!form.accountCode || !form.amount) return;
    setSaving(true);
    try {
      await budService().upsertBudgetLine({
        budgetId,
        entityId,
        accountCode: form.accountCode.trim(),
        accountName: form.accountName.trim() || form.accountCode.trim(),
        propertyId: form.propertyId || undefined,
        propertyName: form.propertyName || undefined,
        costCentre: form.costCentre || undefined,
        month: form.month,
        amount: parseFloat(form.amount) || 0,
        notes: form.notes || undefined,
      });
      setForm((s) => ({ ...s, accountCode: "", accountName: "", amount: "", notes: "" }));
      onSave();
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="rounded-xl border border-[#C79A2B]/20 bg-[#C79A2B]/5 p-4">
      <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-[#C79A2B]">Add Budget Line</p>
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <input className={inp} placeholder="Account code (e.g. 4000)" value={form.accountCode}
          onChange={(e) => setForm((s) => ({ ...s, accountCode: e.target.value }))} />
        <input className={inp} placeholder="Account name" value={form.accountName}
          onChange={(e) => setForm((s) => ({ ...s, accountName: e.target.value }))} />
        <select className={inp} value={form.month}
          onChange={(e) => setForm((s) => ({ ...s, month: e.target.value }))}>
          {months.map((m, i) => <option key={m} value={m}>{MONTHS_LABEL[i]} {m.slice(0, 4)}</option>)}
        </select>
        <input className={inp} placeholder="Amount (₹)" type="number" value={form.amount}
          onChange={(e) => setForm((s) => ({ ...s, amount: e.target.value }))} />
        <input className={inp} placeholder="Property ID (optional)" value={form.propertyId}
          onChange={(e) => setForm((s) => ({ ...s, propertyId: e.target.value }))} />
        <input className={inp} placeholder="Cost centre (optional)" value={form.costCentre}
          onChange={(e) => setForm((s) => ({ ...s, costCentre: e.target.value }))} />
        <input className={inp} placeholder="Notes (optional)" value={form.notes}
          onChange={(e) => setForm((s) => ({ ...s, notes: e.target.value }))} />
        <button onClick={handleSave} disabled={saving || !form.accountCode || !form.amount}
          className="rounded-xl bg-[#C79A2B] px-4 py-2 text-sm font-semibold text-white hover:bg-[#b8891e] disabled:opacity-50">
          {saving ? "Adding…" : "Add Line"}
        </button>
      </div>
    </div>
  );
}

export function BudgetDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { data: budget, loading: loadingBudget, refresh: refreshBudget } = useBudget(id);
  const { data: lines, loading: loadingLines, refresh: refreshLines } = useBudgetLines(id);
  const [promoting, setPromoting] = useState(false);

  const refresh = () => { refreshBudget(); refreshLines(); };

  const promoteStatus = async (next: Budget["status"]) => {
    if (!id) return;
    setPromoting(true);
    try { await budService().updateBudgetStatus(id, next, "Current User"); refresh(); }
    finally { setPromoting(false); }
  };

  const deleteLine = async (lineId: string) => {
    if (!id) return;
    await budService().deleteBudgetLine(lineId, id);
    refresh();
  };

  if (loadingBudget || loadingLines) return (
    <div className="flex items-center justify-center py-20">
      <div className="h-6 w-6 animate-spin rounded-full border-2 border-[#C79A2B] border-t-transparent" />
    </div>
  );

  if (!budget) return <div className="py-16 text-center text-sm text-navy/40">Budget not found.</div>;

  const revenueLines = (lines ?? []).filter((l) => l.accountCode.startsWith("4"));
  const expenseLines = (lines ?? []).filter((l) => l.accountCode.startsWith("5"));
  const otherLines = (lines ?? []).filter((l) => !l.accountCode.startsWith("4") && !l.accountCode.startsWith("5"));
  const canEdit = budget.status === "Draft" || budget.status === "Under Review";

  return (
    <div className="space-y-6">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2">
        <Link to="/rental-os/budgeting" className="flex items-center gap-1 text-sm text-[#C79A2B] hover:underline">
          <ArrowLeft className="h-4 w-4" /> Budgets
        </Link>
        <ChevronRight className="h-4 w-4 text-navy/30" />
        <span className="text-sm text-navy">{budget.budgetNumber}</span>
      </div>

      {/* Header */}
      <div className="rounded-2xl border border-navy/10 bg-white p-6 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-[#C79A2B]">{budget.budgetNumber}</p>
            <h1 className="mt-1 font-serif text-2xl text-navy">{budget.name}</h1>
            <p className="mt-1 text-sm text-navy/60">
              {budget.entityName} · FY{budget.fiscalYear}-{String(budget.fiscalYear + 1).slice(2)} · {budget.type}
            </p>
          </div>
          <span className={`rounded-full px-3 py-1 text-xs font-semibold ring-1 ring-inset ${statusColor(budget.status)}`}>
            {budget.status}
          </span>
        </div>

        {/* KPI strip */}
        <div className="mt-5 grid grid-cols-3 gap-4 border-t border-navy/5 pt-5">
          <div>
            <p className="text-xs text-navy/40 uppercase tracking-widest">Revenue Budget</p>
            <p className="mt-1 text-xl font-semibold text-emerald-700">{inr(budget.totalRevenueBudget)}</p>
          </div>
          <div>
            <p className="text-xs text-navy/40 uppercase tracking-widest">Expense Budget</p>
            <p className="mt-1 text-xl font-semibold text-red-600">{inr(budget.totalExpenseBudget)}</p>
          </div>
          <div>
            <p className="text-xs text-navy/40 uppercase tracking-widest">Budgeted NOI</p>
            <p className={`mt-1 text-xl font-semibold flex items-center gap-1 ${budget.totalNoiBudget >= 0 ? "text-navy" : "text-red-600"}`}>
              {budget.totalNoiBudget >= 0 ? <TrendingUp className="h-4 w-4 text-emerald-500" /> : <TrendingDown className="h-4 w-4 text-red-500" />}
              {inr(budget.totalNoiBudget)}
            </p>
          </div>
        </div>

        {/* Status actions */}
        {canEdit && (
          <div className="mt-4 flex gap-2 border-t border-navy/5 pt-4">
            {budget.status === "Draft" && (
              <button onClick={() => promoteStatus("Under Review")} disabled={promoting}
                className="rounded-xl border border-navy/15 px-4 py-1.5 text-xs font-semibold text-navy/60 hover:border-navy/30 disabled:opacity-50">
                Submit for Review
              </button>
            )}
            {budget.status === "Under Review" && (
              <>
                <button onClick={() => promoteStatus("Approved")} disabled={promoting}
                  className="rounded-xl bg-emerald-600 px-4 py-1.5 text-xs font-semibold text-white hover:bg-emerald-700 disabled:opacity-50">
                  Approve
                </button>
                <button onClick={() => promoteStatus("Draft")} disabled={promoting}
                  className="rounded-xl border border-navy/15 px-4 py-1.5 text-xs font-semibold text-navy/60 hover:border-navy/30 disabled:opacity-50">
                  Return to Draft
                </button>
              </>
            )}
          </div>
        )}
        {budget.status === "Approved" && (
          <div className="mt-4 flex gap-2 border-t border-navy/5 pt-4">
            <button onClick={() => promoteStatus("Locked")} disabled={promoting}
              className="rounded-xl bg-navy px-4 py-1.5 text-xs font-semibold text-white hover:bg-navy/80 disabled:opacity-50">
              Lock Budget
            </button>
          </div>
        )}
      </div>

      {/* Add line form */}
      {canEdit && (
        <AddLineForm budgetId={budget.id} entityId={budget.entityId} fiscalYear={budget.fiscalYear} onSave={refresh} />
      )}

      {/* Budget lines */}
      {[{ title: "Revenue Lines", items: revenueLines }, { title: "Expense Lines", items: expenseLines }, { title: "Other Lines", items: otherLines }]
        .filter((section) => section.items.length > 0)
        .map((section) => (
          <div key={section.title} className="rounded-2xl border border-navy/10 bg-white shadow-sm">
            <div className="border-b border-navy/8 px-5 py-3">
              <p className="text-sm font-semibold text-navy">{section.title} ({section.items.length})</p>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-navy/5">
                    {["Account","Property","Cost Centre","Month","Amount","Notes",""].map((h) => (
                      <th key={h} className="px-4 py-2 text-left text-xs font-semibold uppercase tracking-wider text-navy/40">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {section.items.map((line) => (
                    <tr key={line.id} className="border-b border-navy/5 last:border-0 hover:bg-[#F8F6F0]/30">
                      <td className="px-4 py-2">
                        <span className="font-mono text-xs text-navy/50">{line.accountCode}</span>
                        <span className="ml-2 text-navy">{line.accountName}</span>
                      </td>
                      <td className="px-4 py-2 text-navy/60">{line.propertyName ?? line.propertyId ?? "—"}</td>
                      <td className="px-4 py-2 text-navy/60">{line.costCentre ?? "—"}</td>
                      <td className="px-4 py-2 text-navy/60">
                        {new Date(line.month).toLocaleDateString("en-IN", { month: "short", year: "numeric" })}
                      </td>
                      <td className="px-4 py-2 tabular-nums font-semibold text-navy">{inr(line.amount)}</td>
                      <td className="px-4 py-2 text-navy/50 text-xs">{line.notes ?? ""}</td>
                      <td className="px-4 py-2">
                        {canEdit && (
                          <button onClick={() => deleteLine(line.id)} className="text-navy/30 hover:text-red-500 transition-colors">
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ))}

      {(lines ?? []).length === 0 && (
        <div className="rounded-2xl border border-navy/10 bg-white py-12 text-center">
          <p className="text-sm text-navy/40">No budget lines yet. Add your first line above.</p>
        </div>
      )}
    </div>
  );
}
