import { usePeriods, finService } from "../hooks.ts";
import { StatusBadge, LoadingSpinner, PageHeader, EmptyState } from "./shared.tsx";

export function PeriodClosingPage() {
  const { data: periods, loading, refresh } = usePeriods();

  async function closePeriod(id: string) {
    await finService().closePeriod(id, "current-user");
    await refresh();
  }

  if (loading) return <LoadingSpinner />;

  return (
    <div className="space-y-5">
      <PageHeader title="Period Management" />

      <div className="shadow-card rounded-2xl bg-white overflow-hidden">
        <div className="px-6 py-4 border-b border-navy/5 bg-amber-50">
          <p className="text-sm text-amber-800">
            <strong>⚠ Closing a period is irreversible.</strong> No new journal entries can be posted to a closed period. Ensure all transactions for the period are posted before closing.
          </p>
        </div>
        {(periods ?? []).length === 0 ? (
          <div className="p-8"><EmptyState message="No accounting periods found. Periods are auto-seeded when the Finance Dashboard loads." /></div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-[#F8F6F0]">
              <tr>{["Period", "Start Date", "End Date", "Fiscal Year", "Status", "Closed By", "Action"].map((h) => <th key={h} className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-navy/50">{h}</th>)}</tr>
            </thead>
            <tbody className="divide-y divide-navy/5">
              {(periods ?? []).map((p) => (
                <tr key={p.id} className="hover:bg-[#F8F6F0]/60">
                  <td className="px-4 py-3 font-semibold text-navy">{p.name}</td>
                  <td className="px-4 py-3 text-navy/60">{p.startDate}</td>
                  <td className="px-4 py-3 text-navy/60">{p.endDate}</td>
                  <td className="px-4 py-3 text-navy/60">FY{p.fiscalYear}</td>
                  <td className="px-4 py-3"><StatusBadge status={p.status} /></td>
                  <td className="px-4 py-3 text-navy/50 text-xs">{p.closedBy ?? "—"}</td>
                  <td className="px-4 py-3">
                    {p.status === "Open" ? (
                      <button
                        type="button"
                        className="text-xs font-medium text-red-600 hover:text-red-800 hover:underline"
                        onClick={() => {
                          if (window.confirm(`Close period "${p.name}"? This cannot be undone.`)) {
                            closePeriod(p.id);
                          }
                        }}
                      >
                        Close Period
                      </button>
                    ) : (
                      <span className="text-xs text-navy/30">—</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
