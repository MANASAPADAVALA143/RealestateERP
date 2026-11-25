import { useState, useMemo, useCallback } from "react";
import { Download, TrendingUp, TrendingDown, Scale, CheckCircle, AlertTriangle } from "lucide-react";
import { useEntities } from "../hooks.ts";
import { computeConsolidation } from "../consolidationEngine.ts";
import { IndexedDbAdapter } from "../../integrations/service/storage.ts";
import type { PLResult, BSResult, TBResult } from "../consolidationEngine.ts";

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

function fiscalDateRange(fiscalYear: number): { startDate: string; endDate: string } {
  return { startDate: `${fiscalYear}-04-01`, endDate: `${fiscalYear + 1}-03-31` };
}

function csvDownload(rows: string[][], filename: string) {
  const blob = new Blob([rows.map((r) => r.map((c) => `"${c}"`).join(",")).join("\n")], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

// ─── Shared Controls ──────────────────────────────────────────────────────────

interface ControlsProps {
  fiscalYear: number;
  setFiscalYear: (y: number) => void;
  selectedEntities: string[];
  setSelectedEntities: (ids: string[]) => void;
  onRun: () => void;
  running: boolean;
}

function ReportControls({ fiscalYear, setFiscalYear, selectedEntities, setSelectedEntities, onRun, running }: ControlsProps) {
  const { data: entities } = useEntities();
  const currentFY = new Date().getMonth() >= 3 ? new Date().getFullYear() : new Date().getFullYear() - 1;

  const toggleEntity = (id: string) => {
    setSelectedEntities(
      selectedEntities.includes(id) ? selectedEntities.filter((e) => e !== id) : [...selectedEntities, id],
    );
  };

  return (
    <div className="rounded-2xl border border-navy/10 bg-white px-5 py-4 shadow-sm">
      <div className="flex flex-wrap items-end gap-4">
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
          <label className="block text-xs font-semibold uppercase tracking-widest text-navy/40 mb-1">Entities</label>
          <div className="flex flex-wrap gap-2">
            {(entities ?? []).map((e) => (
              <button key={e.id}
                onClick={() => toggleEntity(e.id)}
                className={`rounded-full px-3 py-1 text-xs font-semibold transition border ${
                  selectedEntities.includes(e.id)
                    ? "bg-[#0A1628] text-white border-[#0A1628]"
                    : "bg-[#F8F6F0] text-navy/60 border-navy/15 hover:border-[#C79A2B]/40"
                }`}>
                {e.code}
              </button>
            ))}
          </div>
        </div>
        <button
          onClick={onRun}
          disabled={running}
          className="inline-flex items-center gap-2 rounded-xl bg-[#0A1628] px-5 py-2 text-sm font-semibold text-white hover:bg-[#C79A2B] transition disabled:opacity-50">
          {running ? "Computing…" : "Run Report"}
        </button>
      </div>
    </div>
  );
}

// ─── Shared table styles ──────────────────────────────────────────────────────

const TH = "px-4 py-2.5 text-left text-xs font-semibold uppercase tracking-wider text-navy/40";
const TD = "px-4 py-2 text-sm";
const TDFIN = "px-4 py-2 text-sm tabular-nums text-right";
const TOTAL_ROW = "border-t-2 border-navy/15 bg-[#F8F6F0]/50 font-semibold";

// ─── Consolidated P&L ─────────────────────────────────────────────────────────

export function ConsolPLPage() {
  const currentFY = new Date().getMonth() >= 3 ? new Date().getFullYear() : new Date().getFullYear() - 1;
  const { data: entities } = useEntities();
  const [fiscalYear, setFiscalYear] = useState(currentFY);
  const [selectedEntities, setSelectedEntities] = useState<string[]>([]);
  const [running, setRunning] = useState(false);
  const [result, setResult] = useState<PLResult | null>(null);
  const [error, setError] = useState("");

  const runReport = useCallback(async () => {
    setRunning(true);
    setError("");
    try {
      const adapter = new IndexedDbAdapter();
      const { startDate, endDate } = fiscalDateRange(fiscalYear);
      const { pl } = await computeConsolidation(adapter, WS, selectedEntities, startDate, endDate);
      setResult(pl);
    } catch (e) {
      setError(String(e));
    } finally {
      setRunning(false);
    }
  }, [fiscalYear, selectedEntities]);

  const exportCsv = () => {
    if (!result) return;
    const rows: string[][] = [["Section", "Account Code", "Account Name", "Amount (₹)"]];
    result.revenue.forEach((l) => rows.push(["Revenue", l.accountCode, l.accountName, l.net.toFixed(2)]));
    rows.push(["", "", "Total Revenue", result.totalRevenue.toFixed(2)]);
    result.expenses.forEach((l) => rows.push(["Expense", l.accountCode, l.accountName, l.net.toFixed(2)]));
    rows.push(["", "", "Total Expenses", result.totalExpenses.toFixed(2)]);
    rows.push(["", "", "Net Income", result.netIncome.toFixed(2)]);
    csvDownload(rows, `pl_fy${fiscalYear}.csv`);
  };

  const entityColumns = useMemo(() => {
    if (!result) return [];
    return Object.keys(result.byEntity).map((eid) => ({
      id: eid,
      name: (entities ?? []).find((e) => e.id === eid)?.code ?? eid,
    }));
  }, [result, entities]);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-serif text-2xl text-[#0A1628]">Consolidated P&L</h1>
          <p className="mt-1 text-sm text-navy/60">Multi-entity profit & loss statement</p>
        </div>
        {result && (
          <button onClick={exportCsv}
            className="inline-flex items-center gap-2 rounded-xl border border-navy/15 px-4 py-2 text-sm font-semibold text-navy/60 hover:border-[#C79A2B]/40 hover:text-[#C79A2B]">
            <Download className="h-4 w-4" /> Export CSV
          </button>
        )}
      </div>

      <ReportControls fiscalYear={fiscalYear} setFiscalYear={setFiscalYear}
        selectedEntities={selectedEntities} setSelectedEntities={setSelectedEntities}
        onRun={runReport} running={running} />

      {error && <p className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>}

      {result && (
        <>
          {/* KPIs */}
          <div className="grid grid-cols-3 gap-4">
            {[
              { label: "Total Revenue", value: result.totalRevenue, color: "text-emerald-700", Icon: TrendingUp },
              { label: "Total Expenses", value: result.totalExpenses, color: "text-red-600", Icon: TrendingDown },
              { label: "Net Income", value: result.netIncome, color: result.netIncome >= 0 ? "text-navy" : "text-red-600", Icon: result.netIncome >= 0 ? TrendingUp : TrendingDown },
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

          {/* Per-entity summary */}
          {entityColumns.length > 1 && (
            <div className="rounded-2xl border border-navy/10 bg-white shadow-sm overflow-x-auto">
              <div className="border-b border-navy/8 px-5 py-3">
                <p className="text-sm font-semibold text-navy">Entity Breakdown</p>
              </div>
              <table className="w-full text-sm">
                <thead><tr className="border-b border-navy/5">
                  <th className={TH}>Entity</th>
                  <th className={`${TH} text-right`}>Revenue</th>
                  <th className={`${TH} text-right`}>Expenses</th>
                  <th className={`${TH} text-right`}>Net Income</th>
                </tr></thead>
                <tbody>
                  {entityColumns.map(({ id, name }) => {
                    const r = result.byEntity[id];
                    return (
                      <tr key={id} className="border-b border-navy/5 last:border-0 hover:bg-[#F8F6F0]/30">
                        <td className={TD}>{name}</td>
                        <td className={`${TDFIN} text-emerald-700`}>{inr(r.revenue)}</td>
                        <td className={`${TDFIN} text-red-600`}>{inr(r.expenses)}</td>
                        <td className={`${TDFIN} ${r.netIncome >= 0 ? "text-navy" : "text-red-600"}`}>{inr(r.netIncome)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          {/* Detail table */}
          <div className="rounded-2xl border border-navy/10 bg-white shadow-sm overflow-x-auto">
            <table className="w-full text-sm">
              <thead><tr className="border-b border-navy/5">
                <th className={TH}>Account</th>
                <th className={TH}>Name</th>
                <th className={`${TH} text-right`}>Amount</th>
              </tr></thead>
              <tbody>
                <tr className="bg-emerald-50/60">
                  <td colSpan={3} className="px-4 py-2 text-xs font-bold uppercase tracking-wider text-emerald-700">Revenue</td>
                </tr>
                {result.revenue.map((l) => (
                  <tr key={l.accountCode} className="border-b border-navy/5 hover:bg-[#F8F6F0]/30">
                    <td className={`${TD} font-mono text-navy/60`}>{l.accountCode}</td>
                    <td className={TD}>{l.accountName}</td>
                    <td className={`${TDFIN} text-emerald-700`}>{inr(l.net)}</td>
                  </tr>
                ))}
                <tr className={TOTAL_ROW}>
                  <td colSpan={2} className="px-4 py-2">Total Revenue</td>
                  <td className={`${TDFIN} text-emerald-700`}>{inr(result.totalRevenue)}</td>
                </tr>

                <tr className="bg-red-50/60">
                  <td colSpan={3} className="px-4 py-2 text-xs font-bold uppercase tracking-wider text-red-600">Expenses</td>
                </tr>
                {result.expenses.map((l) => (
                  <tr key={l.accountCode} className="border-b border-navy/5 hover:bg-[#F8F6F0]/30">
                    <td className={`${TD} font-mono text-navy/60`}>{l.accountCode}</td>
                    <td className={TD}>{l.accountName}</td>
                    <td className={`${TDFIN} text-red-600`}>{inr(l.net)}</td>
                  </tr>
                ))}
                <tr className={TOTAL_ROW}>
                  <td colSpan={2} className="px-4 py-2">Total Expenses</td>
                  <td className={`${TDFIN} text-red-600`}>{inr(result.totalExpenses)}</td>
                </tr>

                <tr className="border-t-2 border-navy/20 bg-[#0A1628]/5 font-bold">
                  <td colSpan={2} className="px-4 py-3 text-navy">Net Income</td>
                  <td className={`${TDFIN} text-lg font-bold ${result.netIncome >= 0 ? "text-navy" : "text-red-600"}`}>{inr(result.netIncome)}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </>
      )}

      {!result && !running && (
        <div className="rounded-2xl border border-navy/10 bg-white py-20 text-center">
          <TrendingUp className="mx-auto h-10 w-10 text-navy/20" />
          <p className="mt-3 text-sm font-semibold text-navy">No report yet</p>
          <p className="mt-1 text-sm text-navy/50">Select entities and fiscal year, then click <strong>Run Report</strong>.</p>
        </div>
      )}
    </div>
  );
}

// ─── Balance Sheet ────────────────────────────────────────────────────────────

export function ConsolBSPage() {
  const currentFY = new Date().getMonth() >= 3 ? new Date().getFullYear() : new Date().getFullYear() - 1;
  const [fiscalYear, setFiscalYear] = useState(currentFY);
  const [selectedEntities, setSelectedEntities] = useState<string[]>([]);
  const [running, setRunning] = useState(false);
  const [result, setResult] = useState<BSResult | null>(null);
  const [error, setError] = useState("");

  const runReport = useCallback(async () => {
    setRunning(true);
    setError("");
    try {
      const adapter = new IndexedDbAdapter();
      const { startDate, endDate } = fiscalDateRange(fiscalYear);
      const { bs } = await computeConsolidation(adapter, WS, selectedEntities, startDate, endDate);
      setResult(bs);
    } catch (e) {
      setError(String(e));
    } finally {
      setRunning(false);
    }
  }, [fiscalYear, selectedEntities]);

  const exportCsv = () => {
    if (!result) return;
    const rows: string[][] = [["Section", "Account Code", "Account Name", "Amount (₹)"]];
    result.assets.forEach((l) => rows.push(["Asset", l.accountCode, l.accountName, l.net.toFixed(2)]));
    rows.push(["", "", "Total Assets", result.totalAssets.toFixed(2)]);
    result.liabilities.forEach((l) => rows.push(["Liability", l.accountCode, l.accountName, l.net.toFixed(2)]));
    rows.push(["", "", "Total Liabilities", result.totalLiabilities.toFixed(2)]);
    result.equity.forEach((l) => rows.push(["Equity", l.accountCode, l.accountName, l.net.toFixed(2)]));
    rows.push(["", "", "Total Equity", result.totalEquity.toFixed(2)]);
    csvDownload(rows, `balance_sheet_fy${fiscalYear}.csv`);
  };

  const Section = ({ title, lines, total, color }: { title: string; lines: BSResult["assets"]; total: number; color: string }) => (
    <>
      <tr className="border-t border-navy/5">
        <td colSpan={3} className={`px-4 py-2 text-xs font-bold uppercase tracking-wider ${color}`}>{title}</td>
      </tr>
      {lines.map((l) => (
        <tr key={l.accountCode} className="border-b border-navy/5 hover:bg-[#F8F6F0]/30">
          <td className={`${TD} font-mono text-navy/60`}>{l.accountCode}</td>
          <td className={TD}>{l.accountName}</td>
          <td className={TDFIN}>{inr(l.net)}</td>
        </tr>
      ))}
      <tr className={TOTAL_ROW}>
        <td colSpan={2} className="px-4 py-2">Total {title}</td>
        <td className={TDFIN}>{inr(total)}</td>
      </tr>
    </>
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-serif text-2xl text-[#0A1628]">Balance Sheet</h1>
          <p className="mt-1 text-sm text-navy/60">Consolidated statement of financial position</p>
        </div>
        {result && (
          <div className="flex items-center gap-3">
            {result.balanced
              ? <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700"><CheckCircle className="h-3.5 w-3.5" />Balanced</span>
              : <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-700"><AlertTriangle className="h-3.5 w-3.5" />Out of Balance</span>}
            <button onClick={exportCsv}
              className="inline-flex items-center gap-2 rounded-xl border border-navy/15 px-4 py-2 text-sm font-semibold text-navy/60 hover:border-[#C79A2B]/40 hover:text-[#C79A2B]">
              <Download className="h-4 w-4" /> Export CSV
            </button>
          </div>
        )}
      </div>

      <ReportControls fiscalYear={fiscalYear} setFiscalYear={setFiscalYear}
        selectedEntities={selectedEntities} setSelectedEntities={setSelectedEntities}
        onRun={runReport} running={running} />

      {error && <p className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>}

      {result && (
        <>
          <div className="grid grid-cols-3 gap-4">
            {[
              { label: "Total Assets", value: result.totalAssets, color: "text-navy" },
              { label: "Total Liabilities", value: result.totalLiabilities, color: "text-red-600" },
              { label: "Total Equity", value: result.totalEquity, color: "text-emerald-700" },
            ].map(({ label, value, color }) => (
              <div key={label} className="rounded-2xl border border-navy/10 bg-white p-5 shadow-sm">
                <p className="text-xs font-semibold uppercase tracking-widest text-navy/40">{label}</p>
                <p className={`mt-2 text-2xl font-semibold ${color}`}>{inr(value)}</p>
              </div>
            ))}
          </div>

          <div className="rounded-2xl border border-navy/10 bg-white shadow-sm overflow-x-auto">
            <table className="w-full text-sm">
              <thead><tr className="border-b border-navy/5">
                <th className={TH}>Account</th><th className={TH}>Name</th><th className={`${TH} text-right`}>Amount</th>
              </tr></thead>
              <tbody>
                <Section title="Assets" lines={result.assets} total={result.totalAssets} color="text-navy" />
                <Section title="Liabilities" lines={result.liabilities} total={result.totalLiabilities} color="text-red-600" />
                <Section title="Equity" lines={result.equity} total={result.totalEquity} color="text-emerald-700" />
                <tr className="border-t-2 border-navy/20 bg-[#0A1628]/5 font-bold">
                  <td colSpan={2} className="px-4 py-3 text-navy">Liabilities + Equity</td>
                  <td className="px-4 py-3 text-right tabular-nums text-navy">{inr(result.liabilitiesAndEquity)}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </>
      )}

      {!result && !running && (
        <div className="rounded-2xl border border-navy/10 bg-white py-20 text-center">
          <Scale className="mx-auto h-10 w-10 text-navy/20" />
          <p className="mt-3 text-sm font-semibold text-navy">No report yet</p>
          <p className="mt-1 text-sm text-navy/50">Select entities and fiscal year, then click <strong>Run Report</strong>.</p>
        </div>
      )}
    </div>
  );
}

// ─── Trial Balance ────────────────────────────────────────────────────────────

const TYPE_COLOR: Record<string, string> = {
  Asset: "text-sky-700", Liability: "text-red-600", Equity: "text-purple-700",
  Revenue: "text-emerald-700", Expense: "text-orange-600",
};

export function ConsolTBPage() {
  const currentFY = new Date().getMonth() >= 3 ? new Date().getFullYear() : new Date().getFullYear() - 1;
  const [fiscalYear, setFiscalYear] = useState(currentFY);
  const [selectedEntities, setSelectedEntities] = useState<string[]>([]);
  const [running, setRunning] = useState(false);
  const [result, setResult] = useState<TBResult | null>(null);
  const [error, setError] = useState("");
  const [typeFilter, setTypeFilter] = useState<string>("All");

  const runReport = useCallback(async () => {
    setRunning(true);
    setError("");
    try {
      const adapter = new IndexedDbAdapter();
      const { startDate, endDate } = fiscalDateRange(fiscalYear);
      const { tb } = await computeConsolidation(adapter, WS, selectedEntities, startDate, endDate);
      setResult(tb);
    } catch (e) {
      setError(String(e));
    } finally {
      setRunning(false);
    }
  }, [fiscalYear, selectedEntities]);

  const filtered = useMemo(() => {
    if (!result) return [];
    if (typeFilter === "All") return result.rows;
    return result.rows.filter((r) => r.accountType === typeFilter);
  }, [result, typeFilter]);

  const exportCsv = () => {
    if (!result) return;
    const rows: string[][] = [["Account Code", "Account Name", "Type", "Debit (₹)", "Credit (₹)"]];
    result.rows.forEach((r) => rows.push([r.accountCode, r.accountName, r.accountType, r.debit.toFixed(2), r.credit.toFixed(2)]));
    rows.push(["", "", "TOTAL", result.totalDebit.toFixed(2), result.totalCredit.toFixed(2)]);
    csvDownload(rows, `trial_balance_fy${fiscalYear}.csv`);
  };

  const TYPES = ["All", "Asset", "Liability", "Equity", "Revenue", "Expense"];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-serif text-2xl text-[#0A1628]">Trial Balance</h1>
          <p className="mt-1 text-sm text-navy/60">All accounts with debit and credit totals</p>
        </div>
        {result && (
          <div className="flex items-center gap-3">
            {result.balanced
              ? <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700"><CheckCircle className="h-3.5 w-3.5" />Balanced</span>
              : <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-700"><AlertTriangle className="h-3.5 w-3.5" />Unbalanced</span>}
            <button onClick={exportCsv}
              className="inline-flex items-center gap-2 rounded-xl border border-navy/15 px-4 py-2 text-sm font-semibold text-navy/60 hover:border-[#C79A2B]/40 hover:text-[#C79A2B]">
              <Download className="h-4 w-4" /> Export CSV
            </button>
          </div>
        )}
      </div>

      <ReportControls fiscalYear={fiscalYear} setFiscalYear={setFiscalYear}
        selectedEntities={selectedEntities} setSelectedEntities={setSelectedEntities}
        onRun={runReport} running={running} />

      {error && <p className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>}

      {result && (
        <>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex gap-2">
              {TYPES.map((t) => (
                <button key={t}
                  onClick={() => setTypeFilter(t)}
                  className={`rounded-full px-3 py-1 text-xs font-semibold transition border ${
                    typeFilter === t ? "bg-[#C79A2B] text-white border-[#C79A2B]" : "bg-[#F8F6F0] text-navy/60 border-navy/15 hover:border-[#C79A2B]/40"
                  }`}>{t}</button>
              ))}
            </div>
            <div className="flex gap-6 text-sm">
              <span>Total Debit: <strong>{inr(result.totalDebit)}</strong></span>
              <span>Total Credit: <strong>{inr(result.totalCredit)}</strong></span>
            </div>
          </div>

          <div className="rounded-2xl border border-navy/10 bg-white shadow-sm overflow-x-auto">
            <table className="w-full text-sm">
              <thead><tr className="border-b border-navy/5">
                <th className={TH}>Account</th>
                <th className={TH}>Name</th>
                <th className={TH}>Type</th>
                <th className={`${TH} text-right`}>Debit</th>
                <th className={`${TH} text-right`}>Credit</th>
                <th className={`${TH} text-right`}>Net</th>
              </tr></thead>
              <tbody>
                {filtered.map((r) => (
                  <tr key={r.accountCode} className="border-b border-navy/5 last:border-0 hover:bg-[#F8F6F0]/30">
                    <td className={`${TD} font-mono text-navy/60`}>{r.accountCode}</td>
                    <td className={TD}>{r.accountName}</td>
                    <td className={`${TD} ${TYPE_COLOR[r.accountType] ?? "text-navy"}`}>
                      <span className="rounded-full bg-current/10 px-2 py-0.5 text-[11px] font-semibold">{r.accountType}</span>
                    </td>
                    <td className={TDFIN}>{r.debit > 0 ? inr(r.debit) : "—"}</td>
                    <td className={TDFIN}>{r.credit > 0 ? inr(r.credit) : "—"}</td>
                    <td className={`${TDFIN} font-semibold ${r.net >= 0 ? "text-navy" : "text-red-600"}`}>{inr(r.net)}</td>
                  </tr>
                ))}
                <tr className={`${TOTAL_ROW} border-t-2 border-navy/20`}>
                  <td colSpan={3} className="px-4 py-2.5">Total</td>
                  <td className={TDFIN}>{inr(result.totalDebit)}</td>
                  <td className={TDFIN}>{inr(result.totalCredit)}</td>
                  <td className={TDFIN}></td>
                </tr>
              </tbody>
            </table>
          </div>
        </>
      )}

      {!result && !running && (
        <div className="rounded-2xl border border-navy/10 bg-white py-20 text-center">
          <Scale className="mx-auto h-10 w-10 text-navy/20" />
          <p className="mt-3 text-sm font-semibold text-navy">No report yet</p>
          <p className="mt-1 text-sm text-navy/50">Select entities and fiscal year, then click <strong>Run Report</strong>.</p>
        </div>
      )}
    </div>
  );
}
