import { useState } from "react";
import { Link } from "react-router-dom";
import { Plus, CheckCircle2 } from "lucide-react";
import { usePmSchedules, opsService } from "../hooks.ts";
import { StatusBadge, EmptyState, LoadingSpinner, PageHeader, ActionButton, inr } from "./shared.tsx";

const today = new Date().toISOString().slice(0, 10);

export function PreventiveMaintenancePage() {
  const { data: schedules, loading, refresh } = usePmSchedules();
  const [filter, setFilter] = useState<"all" | "due" | "active">("all");

  const filtered = schedules.filter((s) => {
    if (filter === "due") return s.status === "Active" && s.nextDue <= today;
    if (filter === "active") return s.status === "Active";
    return true;
  });

  if (loading) return <LoadingSpinner />;

  async function handleComplete(id: string) {
    const cost = Number(prompt("Enter actual cost (₹):") ?? 0);
    if (isNaN(cost)) return;
    await opsService().completePmSchedule(id, cost);
    await refresh();
  }

  return (
    <div className="space-y-5">
      <PageHeader
        title="Preventive Maintenance"
        action={
          <Link to="/rental-os/maintenance/preventive/new">
            <ActionButton><Plus className="h-4 w-4" /> New Schedule</ActionButton>
          </Link>
        }
      />

      <div className="flex gap-2">
        {(["all", "active", "due"] as const).map((f) => (
          <button
            key={f}
            type="button"
            onClick={() => setFilter(f)}
            className={`rounded-xl px-4 py-2 text-sm font-medium transition ${filter === f ? "bg-[#0A1628] text-white" : "border border-navy/15 text-navy hover:border-[#C79A2B]/30"}`}
          >
            {f === "all" ? "All" : f === "active" ? "Active" : "Due / Overdue"}
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <EmptyState message="No PM schedules found." />
      ) : (
        <div className="shadow-card overflow-hidden rounded-2xl bg-white">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-[#F8F6F0]">
                <tr>
                  {["Schedule Name", "Property", "Category", "Frequency", "Last Done", "Next Due", "Est. Cost", "Status", ""].map((h) => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-navy/50">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-navy/5">
                {filtered.map((s) => {
                  const overdue = s.status === "Active" && s.nextDue < today;
                  return (
                    <tr key={s.id} className={`hover:bg-[#F8F6F0]/60 transition ${overdue ? "bg-red-50/50" : ""}`}>
                      <td className="px-4 py-3 font-medium text-navy">{s.name}</td>
                      <td className="px-4 py-3 text-navy/70">{s.propertyName}</td>
                      <td className="px-4 py-3 text-navy/70">{s.category}</td>
                      <td className="px-4 py-3 text-navy/70">{s.frequency}</td>
                      <td className="px-4 py-3 text-navy/60">{s.lastDone ?? "—"}</td>
                      <td className={`px-4 py-3 font-medium ${overdue ? "text-red-600" : "text-navy"}`}>{s.nextDue}</td>
                      <td className="px-4 py-3 text-right font-semibold text-[#C79A2B]">{inr(s.estimatedCost)}</td>
                      <td className="px-4 py-3"><StatusBadge status={s.status} /></td>
                      <td className="px-4 py-3">
                        {s.status === "Active" && (
                          <button
                            type="button"
                            onClick={() => handleComplete(s.id)}
                            className="flex items-center gap-1 text-xs text-emerald-600 hover:underline"
                          >
                            <CheckCircle2 className="h-3.5 w-3.5" /> Mark Done
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
