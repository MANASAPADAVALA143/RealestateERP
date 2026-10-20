import type { ReactNode } from "react";
import type { AlertSeverity, EntityStatus, LoanStatus, PolicyStatus } from "@/lib/demoData";

const entityStyles: Record<EntityStatus, string> = {
  Healthy: "bg-emerald-50 text-emerald-800 ring-emerald-700/15",
  Watch: "bg-amber-50 text-amber-900 ring-amber-700/20",
  Stress: "bg-red-50 text-red-800 ring-red-700/15",
};

const loanStyles: Record<LoanStatus, string> = {
  Active: "bg-emerald-50 text-emerald-800 ring-emerald-700/15",
  Watch: "bg-amber-50 text-amber-900 ring-amber-700/20",
  Overdue: "bg-red-50 text-red-800 ring-red-700/15",
};

const policyStyles: Record<PolicyStatus, string> = {
  Active: "bg-emerald-50 text-emerald-800 ring-emerald-700/15",
  Expiring: "bg-amber-50 text-amber-900 ring-amber-700/20",
  Watch: "bg-orange-50 text-orange-900 ring-orange-700/20",
};

const severityStyles: Record<AlertSeverity, string> = {
  Critical: "bg-red-600 text-white",
  High: "bg-orange-600 text-white",
  Medium: "bg-gold text-navy",
  Low: "bg-navy/10 text-navy",
};

function Pill({ className, children }: { className: string; children: ReactNode }) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ring-1 ring-inset ${className}`}
    >
      {children}
    </span>
  );
}

export function StatusBadge({ status }: { status: EntityStatus }) {
  return <Pill className={entityStyles[status]}>{status}</Pill>;
}

export function LoanBadge({ status }: { status: LoanStatus }) {
  return <Pill className={loanStyles[status]}>{status}</Pill>;
}

export function PolicyBadge({ status }: { status: PolicyStatus }) {
  return <Pill className={policyStyles[status]}>{status}</Pill>;
}

export function SeverityBadge({ severity }: { severity: AlertSeverity }) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${severityStyles[severity]}`}
    >
      {severity}
    </span>
  );
}

export function ModuleBadge({ module }: { module: string }) {
  return (
    <span className="inline-flex items-center rounded-full bg-navy/5 px-2.5 py-0.5 text-xs font-medium text-navy/80">
      {module}
    </span>
  );
}

export function KpiCard({
  label,
  value,
  hint,
  accent = "navy",
}: {
  label: string;
  value: string;
  hint: string;
  accent?: "navy" | "gold" | "alert";
}) {
  const bar =
    accent === "gold" ? "border-t-gold" : accent === "alert" ? "border-t-red-700" : "border-t-navy";
  return (
    <article className={`rounded-2xl border border-navy/10 border-t-4 ${bar} bg-white p-4 shadow-card`}>
      <p className="text-[11px] font-medium uppercase tracking-[0.16em] text-navy/50">{label}</p>
      <p className="mt-2 font-serif text-[1.65rem] leading-none text-navy">{value}</p>
      <p className="mt-3 text-xs leading-relaxed text-navy/60">{hint}</p>
    </article>
  );
}

export function Panel({
  title,
  subtitle,
  children,
  bleed = false,
  className = "",
}: {
  title: string;
  subtitle?: string;
  children: ReactNode;
  bleed?: boolean;
  className?: string;
}) {
  return (
    <section className={`overflow-hidden rounded-2xl border border-navy/10 bg-white shadow-card ${className}`}>
      <div className="border-b border-navy/5 px-5 py-4">
        <h2 className="font-serif text-[1.35rem] leading-tight text-navy">{title}</h2>
        {subtitle ? <p className="mt-1 max-w-3xl text-sm leading-relaxed text-navy/60">{subtitle}</p> : null}
      </div>
      <div className={bleed ? "" : "p-5"}>{children}</div>
    </section>
  );
}

export function Lede({ children }: { children: ReactNode }) {
  return <p className="max-w-3xl text-sm leading-relaxed text-navy/70">{children}</p>;
}
