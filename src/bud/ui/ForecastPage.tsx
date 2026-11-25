import { useState, useEffect, useMemo } from "react";
import { RefreshCw, Download, TrendingUp, TrendingDown, Zap } from "lucide-react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  Legend, ResponsiveContainer, ReferenceLine,
} from "recharts";
import { useEntities, useForecasts, useForecastLines, budService } from "../hooks.ts";
import { IndexedDbAdapter } from "../../integrations/service/storage.ts";
import type { ArLease } from "../../ar/engine/types.ts";
import type { VendorInvoice } from "../../fin/types.ts";
import { properties } from "../../rental-os/data.ts";
import type { Forecast } from "../types.ts";

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

const MONTH_LABELS = ["Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec","Jan","Feb","Mar"];

function fiscalMonths(fiscalYear: number): string[] {
  return Array.from({ length: 12 }, (_, i) => {
    const month = ((3 + i) % 12) + 1;
    const year = i < 9 ? fiscalYear : fiscalYear + 1;
    return `${year}-${String(month).padStart(2, "0")}-01`;
  });
}

function exportCsv(data: { month: string; label: string; rental: number; opex: number; noi: number }[]) {
  const header = "Month,Rental Income,Operating Expense,NOI";
  const rows = data.map((r) => `${r.label},${r.rental.toFixed(2)},${r.opex.toFixed(2)},${r.noi.toFixed(2)}`);
  const blob = new Blob([[header, ...rows].join("\n")], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "noi_forecast.csv";
  a.click();
  URL.revokeObjectURL(url);
}

// ─── Main Page ─────────────────────────────────────────────────────────────────

export function ForecastPage() {
  const { data: entities, loading: loadingEntities } = useEntities();
  const currentFY = new Date().getMonth() >= 3 ? new Date().getFullYear() : new Date().getFullYear() - 1;
  const [entityId, setEntityId] = useState("");
  const [fiscalYear, setFiscalYear] = useState(currentFY);
  const [generating, setGenerating] = useState(false);
  const [genMsg, setGenMsg] = useState("");
  const [viewType, setViewType] = useState<"NOI" | "RentalIncome" | "OpEx">("NOI");

  const { data: forecasts, loading: loadingForecasts, refresh: refreshForecasts } = useForecasts(entityId || undefined);

  // Set first entity on load
  useEffect(() => {
    if (!entityId && (entities ?? []).length > 0) setEntityId(entities![0].id);
  }, [entities, entityId]);

  // Find forecasts for selected FY
  const fyForecasts = useMemo(
    () => (forecasts ?? []).filter((f) => f.fiscalYear === fiscalYear),
    [forecasts, fiscalYear],
  );

  const rentalForecast = fyForecasts.find((f) => f.type === "RentalIncome");
  const opexForecast   = fyForecasts.find((f) => f.type === "OpEx");
  const noiForecast    = fyForecasts.find((f) => f.type === "NOI");

  const activeForecast = fyForecasts.find((f) => f.type === viewType) ?? fyForecasts[0];
  const { data: lines, loading: loadingLines } = useForecastLines(activeForecast?.id);

  const months = fiscalMonths(fiscalYear);

  // Build chart data combining rental + opex + NOI by month
  const { data: rentalLines } = useForecastLines(rentalForecast?.id);
  const { data: opexLines }   = useForecastLines(opexForecast?.id);
  const { data: noiLines }    = useForecastLines(noiForecast?.id);

  const chartData = useMemo(() => {
    const rentalMap = new Map((rentalLines ?? []).map((l) => [l.month, l.projected]));
    const opexMap   = new Map((opexLines ?? []).map((l) => [l.month, l.projected]));
    const noiMap    = new Map((noiLines ?? []).map((l) => [l.month, l.projected]));

    return months.map((month, i) => ({
      month,
      label: MONTH_LABELS[i] + " " + month.slice(2, 4),
      rental: rentalMap.get(month) ?? 0,
      opex: opexMap.get(month) ?? 0,
      noi: noiMap.get(month) ?? 0,
    }));
  }, [rentalLines, opexLines, noiLines, months]);

  // ── Generation ────────────────────────────────────────────────────────────────

  const generate = async () => {
    if (!entityId) return;
    setGenerating(true);
    setGenMsg("");
    try {
      const entity = (entities ?? []).find((e) => e.id === entityId);
      const entityName = entity?.name ?? entityId;

      // Delete existing forecasts for this entity+FY before regenerating
      await budService().deleteForecastsForEntityFY(entityId, fiscalYear);

      // Load AR leases from IndexedDB
      const adapter = new IndexedDbAdapter();
      const allLeases = await adapter.getByIndex<ArLease>("ar_leases", "workspaceId", WS);

      // Map entity properties
      const entityPropertyIds = new Set(properties.filter((p) => p.entityId === entityId).map((p) => p.id));

      // Filter leases belonging to this entity's properties
      const entityLeases = allLeases.filter(
        (l) => l.entityId === entityId || entityPropertyIds.has(l.propertyId),
      );

      // Build lease inputs: sum all monthly charges per lease
      const leaseInputs = entityLeases.map((l) => {
        const monthlyRent = l.charges
          .filter((c) => c.frequency === "monthly" || !c.frequency)
          .reduce((s, c) => s + c.amount, 0);
        return {
          id: l.id,
          propertyId: l.propertyId,
          propertyName: l.propertyId,
          monthlyRent,
          startDate: l.start,
          endDate: l.end,
          status: l.status === "Active" ? "Active" : "Ended",
          entityId: l.entityId,
        };
      });

      // 1. Rental Income forecast
      const rentalF = await budService().generateRentalForecast(entityId, entityName, fiscalYear, leaseInputs);

      // Load vendor invoices for OpEx
      const allInvoices = await adapter.getByIndex<VendorInvoice>("fin_vendor_invoices", "workspaceId", WS);

      // 2. OpEx forecast
      const opexF = await budService().generateOpExForecast(entityId, entityName, fiscalYear, allInvoices);

      // 3. NOI forecast
      await budService().generateNoiForecast(entityId, entityName, fiscalYear, rentalF.id, opexF.id);

      setGenMsg(`Generated: ${leaseInputs.length} lease(s) · Rental, OpEx & NOI forecasts ready.`);
      refreshForecasts();
    } catch (err) {
      setGenMsg(`Error: ${String(err)}`);
    } finally {
      setGenerating(false);
    }
  };

  const loading = loadingEntities || loadingForecasts;

  const totalProjected = (lines ?? []).reduce((s, l) => s + l.projected, 0);
  const totalRental = (rentalLines ?? []).reduce((s, l) => s + l.projected, 0);
  const totalOpEx   = (opexLines ?? []).reduce((s, l) => s + l.projected, 0);
  const totalNOI    = (noiLines ?? []).reduce((s, l) => s + l.projected, 0);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-serif text-2xl text-[#0A1628]">Financial Forecasting</h1>
          <p className="mt-1 text-sm text-navy/60">Rental income, operating expense and NOI projections</p>
        </div>
        {chartData.some((r) => r.rental > 0 || r.noi !== 0) && (
          <button onClick={() => exportCsv(chartData)}
            className="inline-flex items-center gap-2 rounded-xl border border-navy/15 px-4 py-2 text-sm font-semibold text-navy/60 hover:border-[#C79A2B]/40 hover:text-[#C79A2B]">
            <Download className="h-4 w-4" /> Export CSV
          </button>
        )}
      </div>

      {/* Controls */}
      <div className="rounded-2xl border border-navy/10 bg-white px-5 py-4 shadow-sm">
        <div className="flex flex-wrap items-end gap-4">
          <div>
            <label className="block text-xs font-semibold uppercase tracking-widest text-navy/40 mb-1">Entity</label>
            <select
              className="rounded-xl border border-navy/15 bg-[#F8F6F0] px-3 py-2 text-sm text-navy focus:outline-none focus:ring-2 focus:ring-[#C79A2B]/30"
              value={entityId}
              onChange={(e) => setEntityId(e.target.value)}>
              {(entities ?? []).map((e) => <option key={e.id} value={e.id}>{e.name}</option>)}
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
          <button
            onClick={generate}
            disabled={generating || !entityId}
            className="inline-flex items-center gap-2 rounded-xl bg-[#0A1628] px-5 py-2 text-sm font-semibold text-white hover:bg-[#C79A2B] transition disabled:opacity-50">
            {generating
              ? <><RefreshCw className="h-4 w-4 animate-spin" /> Generating…</>
              : <><Zap className="h-4 w-4" /> Generate Forecast</>}
          </button>
          {genMsg && (
            <p className={`text-xs ${genMsg.startsWith("Error") ? "text-red-600" : "text-emerald-600"}`}>{genMsg}</p>
          )}
        </div>
      </div>

      {loading && (
        <div className="flex items-center justify-center py-20">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-[#C79A2B] border-t-transparent" />
        </div>
      )}

      {!loading && fyForecasts.length === 0 && (
        <div className="rounded-2xl border border-navy/10 bg-white py-20 text-center">
          <Zap className="mx-auto h-10 w-10 text-navy/20" />
          <p className="mt-3 text-sm font-semibold text-navy">No forecasts yet</p>
          <p className="mt-1 text-sm text-navy/50">
            Click <strong>Generate Forecast</strong> to build rental income, operating expense<br />and NOI projections from your live leases and invoice history.
          </p>
        </div>
      )}

      {!loading && fyForecasts.length > 0 && (
        <>
          {/* KPI strip */}
          <div className="grid grid-cols-3 gap-4">
            {[
              { label: "Projected Rental Income", value: totalRental, color: "text-emerald-700", icon: TrendingUp },
              { label: "Projected Operating Expense", value: totalOpEx, color: "text-red-600", icon: TrendingDown },
              { label: "Projected NOI", value: totalNOI, color: totalNOI >= 0 ? "text-navy" : "text-red-600", icon: totalNOI >= 0 ? TrendingUp : TrendingDown },
            ].map(({ label, value, color, icon: Icon }) => (
              <div key={label} className="rounded-2xl border border-navy/10 bg-white p-5 shadow-sm">
                <div className="flex items-center gap-2">
                  <Icon className={`h-4 w-4 ${color}`} />
                  <p className="text-xs font-semibold uppercase tracking-widest text-navy/40">{label}</p>
                </div>
                <p className={`mt-2 text-2xl font-semibold ${color}`}>{inr(value)}</p>
                <p className="mt-0.5 text-xs text-navy/40">Full year FY{fiscalYear}-{String(fiscalYear + 1).slice(2)}</p>
              </div>
            ))}
          </div>

          {/* Stacked chart */}
          <div className="rounded-2xl border border-navy/10 bg-white p-5 shadow-sm">
            <p className="mb-4 text-sm font-semibold text-navy">Monthly Forecast — Rental Income vs OpEx vs NOI</p>
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                  <XAxis dataKey="label" tick={{ fontSize: 11 }} />
                  <YAxis tickFormatter={(v) => inr(Number(v))} tick={{ fontSize: 11 }} width={72} />
                  <Tooltip formatter={(v) => inr(Number(v))} />
                  <Legend wrapperStyle={{ fontSize: 11 }} />
                  <ReferenceLine y={0} stroke="#94A3B8" strokeDasharray="4 4" />
                  <Bar dataKey="rental" name="Rental Income" fill="#059669" radius={[3, 3, 0, 0]} />
                  <Bar dataKey="opex"   name="OpEx"          fill="#DC2626" radius={[3, 3, 0, 0]} />
                  <Bar dataKey="noi"    name="NOI"           fill="#0A1628" radius={[3, 3, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Forecast selector tabs */}
          <div className="flex gap-2">
            {(["NOI", "RentalIncome", "OpEx"] as const).filter((t) => fyForecasts.some((f) => f.type === t)).map((t) => (
              <button key={t}
                onClick={() => setViewType(t)}
                className={`rounded-full px-3 py-1 text-xs font-semibold transition ${viewType === t ? "bg-[#C79A2B] text-white" : "bg-[#F8F6F0] border border-navy/15 text-navy/60 hover:border-[#C79A2B]/40"}`}>
                {t === "RentalIncome" ? "Rental Income" : t === "OpEx" ? "OpEx" : "NOI"}
              </button>
            ))}
          </div>

          {/* Monthly line table */}
          {activeForecast && (
            <div className="rounded-2xl border border-navy/10 bg-white shadow-sm">
              <div className="border-b border-navy/8 px-5 py-3">
                <p className="text-sm font-semibold text-navy">{activeForecast.name}</p>
                <p className="text-xs text-navy/40 mt-0.5">{activeForecast.basis} · Total: {inr(activeForecast.totalProjected)}</p>
              </div>
              {loadingLines ? (
                <div className="flex items-center justify-center py-10">
                  <div className="h-5 w-5 animate-spin rounded-full border-2 border-[#C79A2B] border-t-transparent" />
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-navy/5">
                        {["Month","Projected","Basis"].map((h) => (
                          <th key={h} className="px-4 py-2.5 text-left text-xs font-semibold uppercase tracking-wider text-navy/40">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {(lines ?? []).map((line) => (
                        <tr key={line.id} className="border-b border-navy/5 last:border-0 hover:bg-[#F8F6F0]/30">
                          <td className="px-4 py-2.5 font-medium text-navy">
                            {new Date(line.month).toLocaleDateString("en-IN", { month: "long", year: "numeric" })}
                          </td>
                          <td className={`px-4 py-2.5 tabular-nums font-semibold ${line.projected >= 0 ? "text-navy" : "text-red-600"}`}>
                            {inr(line.projected)}
                          </td>
                          <td className="px-4 py-2.5 text-xs text-navy/40 max-w-xs truncate">{line.basisDetail ?? "—"}</td>
                        </tr>
                      ))}
                      {/* Total row */}
                      <tr className="border-t border-navy/10 bg-[#F8F6F0]/50 font-semibold">
                        <td className="px-4 py-2.5 text-navy">Total</td>
                        <td className={`px-4 py-2.5 tabular-nums ${totalProjected >= 0 ? "text-navy" : "text-red-600"}`}>
                          {inr(totalProjected)}
                        </td>
                        <td />
                      </tr>
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* Forecast metadata cards */}
          <div className="grid gap-4 md:grid-cols-3">
            {fyForecasts.map((f: Forecast) => (
              <div key={f.id} className="rounded-xl border border-navy/10 bg-white p-4 text-xs">
                <p className="font-semibold text-navy">{f.name}</p>
                <p className="mt-1 text-navy/50">{f.forecastNumber} · {f.basis}</p>
                <p className="mt-2 text-lg font-semibold text-[#C79A2B]">{inr(f.totalProjected)}</p>
                {f.notes && <p className="mt-1 text-navy/40 text-[11px]">{f.notes}</p>}
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
