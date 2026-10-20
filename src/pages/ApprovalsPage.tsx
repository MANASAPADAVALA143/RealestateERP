import { useState, useSyncExternalStore } from "react";
import { AiInsights } from "@/components/AiInsights";
import { KpiCard, Lede, ModuleBadge, Panel } from "@/components/ui";
import {
  decideApproval,
  entityById,
  getApprovals,
  inrCr,
  insights,
  subscribeApprovals,
  type ApprovalState,
} from "@/lib/demoData";

const filters: { id: "all" | ApprovalState; label: string }[] = [
  { id: "all", label: "All" },
  { id: "pending", label: "Pending" },
  { id: "approved", label: "Approved" },
  { id: "rejected", label: "Rejected" },
];

const stateClass: Record<ApprovalState, string> = {
  pending: "bg-amber-50 text-amber-900 ring-amber-700/20",
  approved: "bg-emerald-50 text-emerald-800 ring-emerald-700/15",
  rejected: "bg-red-50 text-red-800 ring-red-700/15",
};

export function ApprovalsPage() {
  const items = useSyncExternalStore(subscribeApprovals, getApprovals, getApprovals);
  const [filter, setFilter] = useState<(typeof filters)[number]["id"]>("all");
  const pending = items.filter((item) => item.state === "pending");
  const pendingValue = pending.reduce((sum, item) => sum + item.amount, 0);
  const approved = items.filter((item) => item.state === "approved").length;
  const rejected = items.filter((item) => item.state === "rejected").length;
  const visible = items.filter((item) => filter === "all" || item.state === filter);

  return (
    <div className="space-y-6">
      <Lede>
        One desk for capex draws, purchase orders, pricing, hiring, and treasury support. Approve or Reject updates the sidebar badge.
      </Lede>

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard label="Pending" value={String(pending.length)} hint="Waiting on a decision" accent="alert" />
        <KpiCard label="Pending value" value={inrCr(pendingValue)} hint="Rupees still open in the queue" accent="gold" />
        <KpiCard label="Approved" value={String(approved)} hint="Decided in this session" />
        <KpiCard label="Rejected" value={String(rejected)} hint="Decided in this session" />
      </section>

      <Panel title="Queue" subtitle="A decided row locks. Reload the page to restore the original seven items.">
        <div className="mb-4 flex flex-wrap gap-2">
          {filters.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => setFilter(item.id)}
              className={`rounded-full px-3 py-1.5 text-xs font-semibold ${
                filter === item.id ? "bg-navy text-ivory" : "bg-navy/5 text-navy hover:bg-navy/10"
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>

        {visible.length === 0 ? (
          <p className="text-sm text-navy/60">Nothing in this filter.</p>
        ) : (
          <ul className="space-y-3">
            {visible.map((item) => {
              const entity = entityById(item.entityId);
              return (
                <li key={item.id} className="rounded-xl border border-navy/10 p-4">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className="font-semibold text-navy">{item.title}</p>
                      <p className="mt-1 text-xs text-navy/55">
                        {item.code} · {entity.code} · {item.owner}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <ModuleBadge module={item.module} />
                      <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold capitalize ring-1 ring-inset ${stateClass[item.state]}`}>
                        {item.state}
                      </span>
                    </div>
                  </div>
                  <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
                    <p className="font-serif text-xl text-navy">{inrCr(item.amount)}</p>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        disabled={item.state !== "pending"}
                        onClick={() => decideApproval(item.id, "approved")}
                        className="rounded-full bg-emerald-700 px-4 py-2 text-xs font-semibold text-white disabled:cursor-not-allowed disabled:opacity-40"
                      >
                        Approve
                      </button>
                      <button
                        type="button"
                        disabled={item.state !== "pending"}
                        onClick={() => decideApproval(item.id, "rejected")}
                        className="rounded-full bg-red-700 px-4 py-2 text-xs font-semibold text-white disabled:cursor-not-allowed disabled:opacity-40"
                      >
                        Reject
                      </button>
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </Panel>

      <AiInsights page="Approvals" insights={insights.Approvals} />
    </div>
  );
}
