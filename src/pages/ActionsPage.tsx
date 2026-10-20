import { useState, useSyncExternalStore } from "react";
import { Crumb } from "@/components/drill";
import {
  approveDecision,
  completedActions,
  getDecisions,
  rejectDecision,
  subscribeDecisions,
  type DecisionItem,
} from "@/lib/commandData";

const priorityMark = { High: "● High", Medium: "● Medium", Normal: "● Normal" };
const priorityClass = { High: "text-red-700", Medium: "text-amber-700", Normal: "text-emerald-700" };

export function ActionsPage() {
  const items = useSyncExternalStore(subscribeDecisions, getDecisions, getDecisions);
  const [openId, setOpenId] = useState<string | null>(null);
  const [rejecting, setRejecting] = useState<string | null>(null);
  const [reason, setReason] = useState("");
  const pending = items.filter((item) => item.status === "Pending").length;
  const review = items.filter((item) => item.status === "In Review").length;

  return (
    <div className="space-y-6">
      <Crumb items={[{ label: "Group CFO", to: "/" }, { label: "Action Centre" }]} />
      <div>
        <h2 className="font-serif text-3xl text-navy">Action Centre</h2>
        <p className="mt-1 text-sm text-navy/60">Decisions, approvals and assigned tasks</p>
      </div>
      <div className="flex flex-wrap gap-2">
        <Chip dot="bg-red-600" label={`${pending} Pending`} />
        <Chip dot="bg-amber-500" label={`${review} In review`} />
        <Chip dot="bg-emerald-600" label="6 Completed this week" />
      </div>
      <div className="overflow-hidden rounded-2xl border border-navy/10 bg-white shadow-card">
        <div className="border-b border-navy/10 px-5 py-4">
          <h3 className="font-serif text-xl text-navy">Pending decisions</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="data-table min-w-[980px]">
            <thead>
              <tr>
                <th>#</th>
                <th>Action</th>
                <th>Entity</th>
                <th>Type</th>
                <th>Amount</th>
                <th>Owner</th>
                <th>Due</th>
                <th>Priority</th>
                <th>Status</th>
                <th>Decision</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item) => (
                <DecisionRow
                  key={item.id}
                  item={item}
                  open={openId === item.id}
                  rejecting={rejecting === item.id}
                  reason={reason}
                  onToggle={() => setOpenId((current) => (current === item.id ? null : item.id))}
                  onApprove={() => approveDecision(item.id)}
                  onStartReject={() => {
                    setRejecting(item.id);
                    setReason("");
                  }}
                  onReason={setReason}
                  onConfirmReject={() => {
                    if (!reason.trim()) return;
                    rejectDecision(item.id, reason.trim());
                    setRejecting(null);
                  }}
                />
              ))}
            </tbody>
          </table>
        </div>
      </div>
      <details className="rounded-2xl border border-navy/10 bg-white shadow-card">
        <summary className="cursor-pointer px-5 py-4 font-serif text-xl text-navy">Completed this week</summary>
        <ul className="divide-y divide-navy/5 px-5 pb-4">
          {completedActions.map((item) => (
            <li key={item.action} className="flex items-center justify-between gap-3 py-3 text-sm text-navy/45">
              <span>✓ {item.action}</span>
              <span className="shrink-0">{item.entity} · {item.date}</span>
            </li>
          ))}
        </ul>
      </details>
    </div>
  );
}

function DecisionRow({
  item,
  open,
  rejecting,
  reason,
  onToggle,
  onApprove,
  onStartReject,
  onReason,
  onConfirmReject,
}: {
  item: DecisionItem;
  open: boolean;
  rejecting: boolean;
  reason: string;
  onToggle: () => void;
  onApprove: () => void;
  onStartReject: () => void;
  onReason: (value: string) => void;
  onConfirmReject: () => void;
}) {
  const closed = item.status === "Approved" || item.status === "Rejected";
  return (
    <>
      <tr className="even:bg-ivory/60">
        <td>{item.n}</td>
        <td className="font-medium">{item.action}</td>
        <td>{item.entity}</td>
        <td>{item.type}</td>
        <td className="tabular-nums">{item.amount}</td>
        <td>{item.owner}</td>
        <td>{item.due}</td>
        <td className={priorityClass[item.priority]}>{priorityMark[item.priority]}</td>
        <td>
          {item.status === "Approved" ? <span className="font-semibold text-emerald-700">Approved ✓</span> : null}
          {item.status === "Rejected" ? <span className="font-semibold text-red-700">Rejected</span> : null}
          {item.status === "Pending" ? <span className="text-red-700">Pending</span> : null}
          {item.status === "In Review" ? <span className="text-amber-700">In review</span> : null}
          {item.reason ? <p className="mt-1 text-xs text-navy/50">{item.reason}</p> : null}
        </td>
        <td>
          {item.status === "Pending" && !closed ? (
            <div className="flex flex-wrap gap-2">
              <button type="button" onClick={onApprove} className="rounded-full bg-emerald-600 px-3 py-1 text-xs font-semibold text-white">Approve</button>
              <button type="button" onClick={onStartReject} className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-red-700 ring-1 ring-inset ring-red-300">Reject</button>
            </div>
          ) : null}
          {item.status === "In Review" ? (
            <button type="button" onClick={onToggle} className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-navy ring-1 ring-inset ring-navy/20">View details</button>
          ) : null}
        </td>
      </tr>
      {rejecting ? (
        <tr>
          <td colSpan={10}>
            <div className="flex flex-wrap items-center gap-2">
              <input value={reason} onChange={(event) => onReason(event.target.value)} placeholder="Reason for rejection" className="min-w-64 rounded-xl border border-navy/15 px-3 py-2 text-sm" />
              <button type="button" onClick={onConfirmReject} className="rounded-full bg-red-700 px-3 py-1.5 text-xs font-semibold text-white">Confirm reject</button>
            </div>
          </td>
        </tr>
      ) : null}
      {open ? (
        <tr>
          <td colSpan={10} className="text-sm text-navy/80">{item.detail}</td>
        </tr>
      ) : null}
    </>
  );
}

function Chip({ dot, label }: { dot: string; label: string }) {
  return (
    <span className="inline-flex items-center gap-2 rounded-full bg-white px-3 py-1.5 text-xs font-semibold ring-1 ring-inset ring-navy/10">
      <span className={`h-2 w-2 rounded-full ${dot}`} />
      {label}
    </span>
  );
}
