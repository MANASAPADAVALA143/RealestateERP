import type { ReactNode } from "react";
import { AlertCircle } from "lucide-react";

export function inr(v: number): string {
  if (v >= 1e7) return `₹${(v / 1e7).toFixed(2)} Cr`;
  if (v >= 1e5) return `₹${(v / 1e5).toFixed(2)} L`;
  if (v >= 1e3) return `₹${(v / 1e3).toFixed(1)}K`;
  return `₹${v.toLocaleString("en-IN")}`;
}

export function StatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    Posted: "bg-emerald-100 text-emerald-800",
    Paid: "bg-emerald-100 text-emerald-800",
    Processed: "bg-emerald-100 text-emerald-800",
    Reconciled: "bg-emerald-100 text-emerald-800",
    Approved: "bg-emerald-100 text-emerald-800",
    Matched: "bg-emerald-100 text-emerald-800",
    Open: "bg-blue-100 text-blue-800",
    "In Progress": "bg-amber-100 text-amber-800",
    "Partially Paid": "bg-amber-100 text-amber-800",
    "Under Review": "bg-amber-100 text-amber-800",
    Submitted: "bg-blue-100 text-blue-800",
    Draft: "bg-gray-100 text-gray-700",
    Reversed: "bg-purple-100 text-purple-800",
    Variance: "bg-orange-100 text-orange-800",
    Disputed: "bg-red-100 text-red-800",
    Cancelled: "bg-red-100 text-red-800",
    Closed: "bg-gray-100 text-gray-600",
    Locked: "bg-gray-200 text-gray-700",
    "Not Checked": "bg-gray-100 text-gray-600",
  };
  return <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${map[status] ?? "bg-gray-100 text-gray-700"}`}>{status}</span>;
}

export function StatCard({ label, value, sub, icon: Icon, color = "gold" }: { label: string; value: string | number; sub?: string; icon?: React.ComponentType<{ className?: string }>; color?: "gold" | "navy" | "red" | "green" }) {
  const c = { gold: "text-[#C79A2B]", navy: "text-[#0A1628]", red: "text-red-600", green: "text-emerald-600" }[color];
  return (
    <div className="shadow-card rounded-2xl bg-white p-5">
      {Icon && <Icon className={`mb-2 h-5 w-5 ${c}`} />}
      <p className="text-2xl font-bold text-[#0A1628]">{value}</p>
      <p className="mt-0.5 text-sm font-medium text-[#0A1628]/70">{label}</p>
      {sub && <p className="mt-1 text-xs text-[#0A1628]/40">{sub}</p>}
    </div>
  );
}

export function PageHeader({ title, action }: { title: string; action?: ReactNode }) {
  return (
    <div className="mb-6 flex items-center justify-between gap-4">
      <h2 className="font-serif text-2xl text-[#0A1628]">{title}</h2>
      {action}
    </div>
  );
}

export function EmptyState({ message = "No records found." }: { message?: string }) {
  return (
    <div className="flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-navy/15 py-16 text-center">
      <AlertCircle className="mb-3 h-8 w-8 text-navy/20" />
      <p className="text-sm text-navy/40">{message}</p>
    </div>
  );
}

export function LoadingSpinner() {
  return (
    <div className="flex items-center justify-center py-16">
      <div className="h-8 w-8 animate-spin rounded-full border-4 border-[#C79A2B]/30 border-t-[#C79A2B]" />
    </div>
  );
}

export function ActionButton({ onClick, children, variant = "primary", type = "submit", disabled }: { onClick?: () => void; children: ReactNode; variant?: "primary" | "secondary" | "danger"; type?: "button" | "submit"; disabled?: boolean }) {
  const cls = {
    primary: "bg-[#0A1628] text-white hover:bg-[#C79A2B] hover:text-[#0A1628]",
    secondary: "border border-[#0A1628]/20 text-[#0A1628] hover:border-[#C79A2B] hover:text-[#C79A2B] bg-white",
    danger: "bg-red-600 text-white hover:bg-red-700",
  }[variant];
  return (
    <button type={type} onClick={onClick} disabled={disabled} className={`inline-flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-medium transition disabled:opacity-50 disabled:cursor-not-allowed ${cls}`}>
      {children}
    </button>
  );
}

export function SectionCard({ title, children }: { title?: string; children: ReactNode }) {
  return (
    <div className="shadow-card rounded-2xl bg-white p-6">
      {title && <h3 className="mb-4 font-semibold text-[#0A1628]">{title}</h3>}
      {children}
    </div>
  );
}

export function AmountCell({ amount, credit = false }: { amount: number; credit?: boolean }) {
  if (amount === 0) return <span className="text-navy/30">—</span>;
  return <span className={credit ? "text-emerald-700 font-semibold" : "font-semibold text-[#0A1628]"}>{inr(amount)}</span>;
}
