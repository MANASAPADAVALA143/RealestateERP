import { useState } from "react";
import {
  AlertTriangle, AlertCircle, Info, CheckCircle, XCircle,
  RefreshCw, Bell,
} from "lucide-react";
import { useAlerts } from "../hooks.ts";
import type { AlertModule, AlertSeverity } from "../types.ts";

// ── Helpers ───────────────────────────────────────────────────────────────────
const SEVERITY_CONFIG = {
  Critical: { icon: AlertCircle,  bg: "bg-red-50",    border: "border-red-200",   text: "text-red-700",    badge: "bg-red-100 text-red-700"    },
  Warning:  { icon: AlertTriangle,bg: "bg-amber-50",  border: "border-amber-200", text: "text-amber-700",  badge: "bg-amber-100 text-amber-700" },
  Info:     { icon: Info,         bg: "bg-blue-50",   border: "border-blue-200",  text: "text-blue-700",   badge: "bg-blue-100 text-blue-700"   },
};

const MODULE_COLORS: Record<string, string> = {
  AR:        "bg-purple-100 text-purple-700",
  Leasing:   "bg-blue-100 text-blue-700",
  Finance:   "bg-emerald-100 text-emerald-700",
  Ops:       "bg-orange-100 text-orange-700",
  Contracts: "bg-pink-100 text-pink-700",
  Portfolio: "bg-indigo-100 text-indigo-700",
};

const MODULES: Array<AlertModule | "All"> = ["All", "AR", "Leasing", "Finance", "Ops", "Contracts", "Portfolio"];
const SEVERITIES: Array<AlertSeverity | "All"> = ["All", "Critical", "Warning", "Info"];

function fmt(iso: string) {
  return new Date(iso).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
}

// ── Component ─────────────────────────────────────────────────────────────────
export function AlertsCentrePage() {
  const { alerts, loading, scanning, criticalCount, warningCount, totalActive, scan, dismiss, resolve } = useAlerts();

  const [moduleFilter, setModuleFilter] = useState<AlertModule | "All">("All");
  const [severityFilter, setSeverityFilter] = useState<AlertSeverity | "All">("All");
  const [dismissNote, setDismissNote] = useState<Record<string, string>>({});

  const filtered = alerts
    .filter((a) => moduleFilter === "All" || a.module === moduleFilter)
    .filter((a) => severityFilter === "All" || a.severity === severityFilter);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h2 className="font-serif text-2xl text-[#0A1628]">Alerts Centre</h2>
          <p className="mt-0.5 text-sm text-[#0A1628]/50">
            {totalActive} active alert{totalActive !== 1 ? "s" : ""}
            {criticalCount > 0 && <span className="ml-2 font-semibold text-red-600">· {criticalCount} critical</span>}
            {warningCount > 0 && <span className="ml-1 font-semibold text-amber-600">· {warningCount} warnings</span>}
          </p>
        </div>
        <button
          onClick={scan}
          disabled={scanning}
          className="flex items-center gap-2 rounded-xl bg-[#0A1628] px-4 py-2 text-sm font-medium text-white hover:bg-[#C79A2B] hover:text-[#0A1628] disabled:opacity-50 transition-colors"
        >
          <RefreshCw className={`h-4 w-4 ${scanning ? "animate-spin" : ""}`} />
          {scanning ? "Scanning…" : "Run Scan"}
        </button>
      </div>

      {/* KPI strip */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: "Critical", count: criticalCount, color: "text-red-600", bg: "bg-red-50 border-red-100" },
          { label: "Warning",  count: warningCount,  color: "text-amber-600", bg: "bg-amber-50 border-amber-100" },
          { label: "Info",     count: totalActive - criticalCount - warningCount, color: "text-blue-600", bg: "bg-blue-50 border-blue-100" },
        ].map((k) => (
          <div key={k.label} className={`rounded-2xl border ${k.bg} p-4 text-center`}>
            <p className={`text-2xl font-bold ${k.color}`}>{k.count}</p>
            <p className="text-xs text-[#0A1628]/50">{k.label}</p>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-2">
        <div className="flex gap-1 rounded-xl bg-[#0A1628]/5 p-1">
          {MODULES.map((m) => (
            <button
              key={m}
              onClick={() => setModuleFilter(m)}
              className={`rounded-lg px-3 py-1.5 text-xs font-medium transition ${
                moduleFilter === m ? "bg-[#0A1628] text-white shadow-sm" : "text-[#0A1628]/60 hover:text-[#0A1628]"
              }`}
            >
              {m}
            </button>
          ))}
        </div>
        <div className="flex gap-1 rounded-xl bg-[#0A1628]/5 p-1">
          {SEVERITIES.map((s) => (
            <button
              key={s}
              onClick={() => setSeverityFilter(s)}
              className={`rounded-lg px-3 py-1.5 text-xs font-medium transition ${
                severityFilter === s ? "bg-[#0A1628] text-white shadow-sm" : "text-[#0A1628]/60 hover:text-[#0A1628]"
              }`}
            >
              {s}
            </button>
          ))}
        </div>
      </div>

      {/* Alert list */}
      {loading ? (
        <div className="flex justify-center py-16">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-[#C79A2B]/30 border-t-[#C79A2B]" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-[#0A1628]/10 py-16 text-center">
          <Bell className="mb-3 h-8 w-8 text-[#0A1628]/20" />
          <p className="text-sm font-medium text-[#0A1628]/50">No active alerts</p>
          <p className="mt-1 text-xs text-[#0A1628]/30">Click Run Scan to check for new alerts</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((alert) => {
            const cfg = SEVERITY_CONFIG[alert.severity];
            const SevIcon = cfg.icon;
            return (
              <div
                key={alert.id}
                className={`rounded-2xl border ${cfg.border} ${cfg.bg} p-4`}
              >
                <div className="flex items-start gap-3">
                  <SevIcon className={`mt-0.5 h-5 w-5 shrink-0 ${cfg.text}`} />
                  <div className="min-w-0 flex-1 space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide ${cfg.badge}`}>
                        {alert.severity}
                      </span>
                      <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${MODULE_COLORS[alert.module] ?? "bg-gray-100 text-gray-700"}`}>
                        {alert.module}
                      </span>
                      <span className="text-xs text-[#0A1628]/40">{fmt(alert.createdAt)}</span>
                    </div>
                    <p className="text-sm font-medium text-[#0A1628]">{alert.message}</p>
                    <p className="text-xs text-[#0A1628]/50">{alert.entityRef}</p>

                    {/* Dismiss note input */}
                    <div className="mt-2 flex flex-wrap items-center gap-2">
                      <input
                        type="text"
                        placeholder="Optional note…"
                        value={dismissNote[alert.id] ?? ""}
                        onChange={(e) => setDismissNote((prev) => ({ ...prev, [alert.id]: e.target.value }))}
                        className="rounded-lg border border-[#0A1628]/15 bg-white px-3 py-1.5 text-xs text-[#0A1628] placeholder-[#0A1628]/30 focus:outline-none focus:ring-1 focus:ring-[#C79A2B]"
                      />
                      <button
                        onClick={() => dismiss(alert.id, dismissNote[alert.id])}
                        className="flex items-center gap-1 rounded-lg border border-[#0A1628]/20 bg-white px-3 py-1.5 text-xs font-medium text-[#0A1628] hover:border-[#C79A2B] hover:text-[#C79A2B] transition-colors"
                      >
                        <XCircle className="h-3.5 w-3.5" /> Dismiss
                      </button>
                      <button
                        onClick={() => resolve(alert.id)}
                        className="flex items-center gap-1 rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-emerald-700 transition-colors"
                      >
                        <CheckCircle className="h-3.5 w-3.5" /> Resolve
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
