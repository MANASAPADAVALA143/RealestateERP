import { useState, useMemo } from "react";
import { Download, TrendingUp, TrendingDown, Minus } from "lucide-react";
import { useEntities, useVariance } from "../hooks.ts";
import { properties } from "../../rental-os/data.ts";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function inr(v: number): string {
  const abs = Math.abs(v);
  const sign = v < 0 ? "-" : "";
  if (abs >= 1e7) return `${sign}₹${(abs / 1e7).toFixed(2)} Cr`;
  if (abs >= 1e5) return `${sign}₹${(abs / 1e5).toFixed(1)} L`;
  if (abs >= 1e3) return `${sign}₹${(abs / 1e3).toFixed(0)}K`;
  return `${sign}₹${abs.toLocaleString()}`;
}

function pct(v: number | null): string {
  if (v === null) return "—";
  return `${v >= 0 ? "+" : ""}${v.toFixed(1)}%`;
}

function FavIcon({ fav, zero }: { fav: boolean; zero: boolean }) {
  if (zero) return <Minus className="h-3.5 w-3.5 text-navy/30" />;
  return fav
    ? <TrendingUp className="h-3.5 w-3.5 text-emerald-500" />
    : <TrendingDown className="h-3.5 w-3.5 text-red-500" />;
}

function KpiCard({ label, budget, actual, fav }: { label: string; budget: number; actual: number; fav: boolean }) {
  const diff = actual - budget;
  return (
    <div className="rounded-2xl border border-navy/10 bg-white p-5 shadow-sm">
      <p className="text-xs font-semibold uppercase tracking-widest text-navy/40">{label}</p>
      <p className="mt-2 text-2xl font-semibold text-navy">{inr(actual)}</p>
      <div className="mt-1 flex items-center gap-1.5 text-xs">
        <span className="text-navy/50">Budget {inr(budget)}</span>
        <span className={`flex items-center gap-0.5 font-semibold ${fav ? "text-emerald-600" : diff === 0 ? "text-navy/40" : "text-red-600"}`}>
          <FavIcon fav={fav} zero={diff === 0} />
          {diff === 0 ? "On target" : `${fav ? "+" : ""}${inr(diff)}`}
        </span>
      </div>
    </div>
  );
}

function exportCsv(rows: ReturnType<typeof useVariance>["data"] extends { rows: infer R } | null ? R : never) {
  if (!rows) return;
  const header = "Account Code,Account Name,Type,Property,Cost Centre,Month,Budget,Actual,Variance,Variance %,Favourable";
  const lines = rows.map((r) =>
    [
      r.accountCode, r.accountName, r.accountType,
      r.propertyId ?? "", r.costCentre ?? "",
      r.month.slice(0, 7),
      r.budget.toFixed(2), r.actual.toFixed(2), r.variance.toFixed(2),
      r.variancePct !== null ? r.variancePct.toFixed(1) : "",
      r.isFavourable ? "Yes" : "No",
    ].join(","),
  );
  const blob = new Blob([[header, ...lines].join("\n")], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "variance_report.csv";
  a.click();
  URL.revokeObjectURL(url);
}

// ─── Page ──────────────────────────────────────────────────────────────────────

export function VariancePage() {
  const { data: entities, loading: loadingEntities } = useEntities();
  const currentFY = new Date().getMonth() >= 3 ? new Date().getFullYear() : new Date().getFullYear() - 1;
  const [entityId, setEntityId] = useState<string>("");
  const [fiscalYear, setFiscalYear] = useState(currentFY);
  const [filterType, setFilterType] = useState<"All" | "Revenue" | "Expense">("All");
  const [filterFav, setFilterFav] = useState<"All" | "Favourable" | "Adverse">("All");

  // Derive property IDs for the selected entity
  const propertyIds = useMemo(
    () => properties.filter((p) => p.entityId === entityId).map((p) => p.id),
    [entityId],
  );

  const { data: summary, loading: loadingVariance } = useVariance(
    entityId || undefined,
    fiscalYear,
    propertyIds,
  );

  // Set first entity as default once loaded
  if (!entityId && (entities ?? []).length > 0) {
    setEntityId(entities![0].id);
  }

  const rows = useMemo(() => {
    if (!summary) return [];
    return summary.rows.filter((r) => {
      if (filterType !== "All" && r.accountType !== filterType) return false;
      if (filterFav === "Favourable" && !r.isFavourable) return false;
      if (filterFav === "Adverse" && r.isFavourable) return false;
      return true;
    });
  }, [summary, filterType, filterFav]);

  // Group by account for a collapsed summary
  const accountGroups = useMemo(() => {
    const map = new Map<string, { code: string; name: string; type: string; budget: number; actual: number; variance: number; fav: boolean }>();
    for (const r of rows) {
      const key = r.accountCode;
      const e = map.get(key);
      if (e) {
        e.budget += r.budget;
        e.actual += r.actual;
        e.variance += r.variance;
      } else {
        map.set(key, { code: r.accountCode, name: r.accountName, type: r.accountType, budget: r.budget, actual: r.actual, variance: r.variance, fav: r.isFavourable });
      }
    }
    // Recalculate fav after aggregation
    for (const [, v] of map) {
      v.fav = v.type === "Revenue" ? v.actual >= v.budget : v.actual <= v.budget;
    }
    return [...map.values()].sort((a, b) => a.type === b.type ? a.code.localeCompare(b.code) : a.type === "Revenue" ? -1 : 1);
  }, [rows]);

  const loading = loadingEntities || loadingVariance;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-serif text-2xl text-[#0A1628]">Actual vs Budget</h1>
          <p className="mt-1 text-sm text-navy/60">Variance analysis across accounts and properties</p>
        </div>
        {summary && (
          <button
            onClick={() => exportCsv(summary.rows)}
            className="inline-flex items-center gap-2 rounded-xl border border-navy/15 px-4 py-2 text-sm font-semibold text-navy/60 hover:border-[#C79A2B]/40 hover:text-[#C79A2B]">
            <Download className="h-4 w-4" /> Export CSV
          </button>
        )}
      </div>

      {/* Filters */}
      <div className="rounded-2xl border border-navy/10 bg-white px-5 py-4 shadow-sm">
        <div className="flex flex-wrap gap-4">
          <div>
            <label className="block text-xs font-semibold uppercase tracking-widest text-navy/40 mb-1">Entity</label>
            <select
              className="rounded-xl border border-navy/15 bg-[#F8F6F0] px-3 py-2 text-sm text-navy focus:outline-none focus:ring-2 focus:ring-[#C79A2B]/30"
              value={entityId}
              onChange={(e) => setEntityId(e.target.value)}>
              {(entities ?? []).map((en) => (
                <option key={en.id} value={en.id}>{en.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-semibold uppercase tracking-widest text-navy/40 mb-1">Fiscal Year</label>
            <select
              className="rounded-xl border border-navy/15 bg-[#F8F6F0] px-3 py-2 text-sm text-navy focus:outline-none focus:ring-2 focus:ring-[#C79A2B]/30"
              value={fiscalYear}
              onChange={(e) => setFiscalYear(Number(e.target.value))}>
              {[currentFY - 1, currentFY, currentFY + 1].map((y) => (
                <option key={y} value={y}>FY{y}-{String(y + 1).slice(2)}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-semibold uppercase tracking-widest text-navy/40 mb-1">Account Type</label>
            <div className="flex gap-1">
              {(["All", "Revenue", "Expense"] as const).map((t) => (
                <button key={t} onClick={() => setFilterType(t)}
                  className={`rounded-full px-3 py-1 text-xs font-semibold transition ${filterType === t ? "bg-[#C79A2B] text-white" : "bg-[#F8F6F0] border border-navy/15 text-navy/60 hover:border-[#C79A2B]/40"}`}>
                  {t}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="block text-xs font-semibold uppercase tracking-widest text-navy/40 mb-1">Variance</label>
            <div className="flex gap-1">
              {(["All", "Favourable", "Adverse"] as const).map((t) => (
                <button key={t} onClick={() => setFilterFav(t)}
                  className={`rounded-full px-3 py-1 text-xs font-semibold transition ${filterFav === t ? "bg-[#C79A2B] text-white" : "bg-[#F8F6F0] border border-navy/15 text-navy/60 hover:border-[#C79A2B]/40"}`}>
                  {t}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {loading && (
        <div className="flex items-center justify-center py-20">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-[#C79A2B] border-t-transparent" />
        </div>
      )}

      {!loading && summary && (
        <>
          {/* KPI strip */}
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
            <KpiCard label="Revenue" budget={summary.totalBudgetRevenue} actual={summary.totalActualRevenue} fav={summary.totalActualRevenue >= summary.totalBudgetRevenue} />
            <KpiCard label="Expenses" budget={summary.totalBudgetExpense} actual={summary.totalActualExpense} fav={summary.totalActualExpense <= summary.totalBudgetExpense} />
            <div className="rounded-2xl border border-navy/10 bg-white p-5 shadow-sm">
              <p className="text-xs font-semibold uppercase tracking-widest text-navy/40">Budgeted NOI</p>
              <p className="mt-2 text-2xl font-semibold text-navy">{inr(summary.budgetedNOI)}</p>
            </div>
            <div className="rounded-2xl border border-navy/10 bg-white p-5 shadow-sm">
              <p className="text-xs font-semibold uppercase tracking-widest text-navy/40">Actual NOI</p>
              <p className={`mt-2 text-2xl font-semibold ${summary.actualNOI >= 0 ? "text-navy" : "text-red-600"}`}>{inr(summary.actualNOI)}</p>
              <p className={`mt-1 text-xs font-semibold flex items-center gap-1 ${summary.noiVariance >= 0 ? "text-emerald-600" : "text-red-600"}`}>
                <FavIcon fav={summary.noiVariance >= 0} zero={summary.noiVariance === 0} />
                {summary.noiVariance === 0 ? "On target" : `NOI ${summary.noiVariance >= 0 ? "+" : ""}${inr(summary.noiVariance)}`}
              </p>
            </div>
          </div>

          {/* Variance table */}
          <div className="rounded-2xl border border-navy/10 bg-white shadow-sm">
            <div className="border-b border-navy/8 px-5 py-3 flex items-center justify-between">
              <p className="text-sm font-semibold text-navy">
                Account Summary — {summary.periodLabel}
                <span className="ml-2 text-xs font-normal text-navy/40">{accountGroups.length} accounts · {rows.length} rows</span>
              </p>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-navy/5">
                    {["Account","Type","Budget","Actual","Variance","Var %",""].map((h) => (
                      <th key={h} className="px-4 py-2.5 text-left text-xs font-semibold uppercase tracking-wider text-navy/40">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {accountGroups.map((g) => {
                    const varPct = g.budget !== 0 ? (g.variance / g.budget) * 100 : null;
                    return (
                      <tr key={g.code} className="border-b border-navy/5 last:border-0 hover:bg-[#F8F6F0]/30">
                        <td className="px-4 py-2.5">
                          <span className="font-mono text-xs text-navy/40">{g.code}</span>
                          <span className="ml-2 font-medium text-navy">{g.name}</span>
                        </td>
                        <td className="px-4 py-2.5">
                          <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ring-1 ring-inset ${g.type === "Revenue" ? "bg-emerald-50 text-emerald-800 ring-emerald-700/15" : "bg-red-50 text-red-700 ring-red-700/15"}`}>
                            {g.type}
                          </span>
                        </td>
                        <td className="px-4 py-2.5 tabular-nums text-navy/60">{inr(g.budget)}</td>
                        <td className="px-4 py-2.5 tabular-nums font-semibold text-navy">{inr(g.actual)}</td>
                        <td className={`px-4 py-2.5 tabular-nums font-semibold ${g.fav ? "text-emerald-600" : g.variance === 0 ? "text-navy/40" : "text-red-600"}`}>
                          {g.variance >= 0 ? "+" : ""}{inr(g.variance)}
                        </td>
                        <td className={`px-4 py-2.5 tabular-nums text-xs ${g.fav ? "text-emerald-600" : g.variance === 0 ? "text-navy/40" : "text-red-600"}`}>
                          {pct(varPct)}
                        </td>
                        <td className="px-4 py-2.5">
                          <FavIcon fav={g.fav} zero={g.variance === 0} />
                        </td>
                      </tr>
                    );
                  })}
                  {accountGroups.length === 0 && (
                    <tr>
                      <td colSpan={7} className="py-16 text-center text-sm text-navy/40">
                        No variance data for this entity and period.<br />
                        <span className="text-xs">Create a budget and post journals to see variance.</span>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Detailed row table (collapsed by default) */}
          {rows.length > 0 && (
            <details className="group">
              <summary className="cursor-pointer rounded-2xl border border-navy/10 bg-white px-5 py-3 text-sm font-semibold text-navy/60 hover:text-navy list-none flex items-center gap-2 shadow-sm">
                <span className="group-open:hidden">▶</span>
                <span className="hidden group-open:inline">▼</span>
                Detailed Line View ({rows.length} rows)
              </summary>
              <div className="mt-2 rounded-2xl border border-navy/10 bg-white shadow-sm overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-navy/5">
                      {["Account","Type","Property","Month","Budget","Actual","Variance","Var %","Fav"].map((h) => (
                        <th key={h} className="px-3 py-2 text-left text-xs font-semibold uppercase tracking-wider text-navy/40">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((r, i) => {
                      const propName = r.propertyId
                        ? (properties.find((p) => p.id === r.propertyId)?.name ?? r.propertyId)
                        : "Unattributed";
                      return (
                        <tr key={i} className="border-b border-navy/5 last:border-0 hover:bg-[#F8F6F0]/30 text-xs">
                          <td className="px-3 py-1.5">
                            <span className="font-mono text-navy/40">{r.accountCode}</span>
                            <span className="ml-1.5 text-navy">{r.accountName}</span>
                          </td>
                          <td className="px-3 py-1.5 text-navy/60">{r.accountType}</td>
                          <td className="px-3 py-1.5 text-navy/60">{propName}</td>
                          <td className="px-3 py-1.5 text-navy/60">
                            {new Date(r.month).toLocaleDateString("en-IN", { month: "short", year: "numeric" })}
                          </td>
                          <td className="px-3 py-1.5 tabular-nums text-navy/50">{inr(r.budget)}</td>
                          <td className="px-3 py-1.5 tabular-nums font-medium text-navy">{inr(r.actual)}</td>
                          <td className={`px-3 py-1.5 tabular-nums font-semibold ${r.isFavourable ? "text-emerald-600" : r.variance === 0 ? "text-navy/40" : "text-red-600"}`}>
                            {r.variance >= 0 ? "+" : ""}{inr(r.variance)}
                          </td>
                          <td className={`px-3 py-1.5 tabular-nums ${r.isFavourable ? "text-emerald-600" : r.variance === 0 ? "text-navy/40" : "text-red-600"}`}>
                            {pct(r.variancePct)}
                          </td>
                          <td className="px-3 py-1.5">
                            <FavIcon fav={r.isFavourable} zero={r.variance === 0} />
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </details>
          )}
        </>
      )}

      {!loading && !summary && entityId && (
        <div className="rounded-2xl border border-navy/10 bg-white py-16 text-center">
          <p className="text-sm font-semibold text-navy">No data yet</p>
          <p className="mt-1 text-sm text-navy/50">Create a budget for {entityId} and post journals to see variance.</p>
        </div>
      )}
    </div>
  );
}
