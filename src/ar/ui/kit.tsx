import type { ReactNode } from "react";
import { Link, NavLink } from "react-router-dom";
import { Crumb } from "@/components/drill";
import { Empty, ErrorNote, Notice } from "@/integrations/ui/components";
import type { ArBook } from "@/ar/engine/types";

export const arNav: { to: string; label: string }[] = [
  { to: "/estate/ar", label: "AR Dashboard" },
  { to: "/estate/ar/tenants", label: "Tenant Register" },
  { to: "/estate/ar/leases", label: "Lease Receivables" },
  { to: "/estate/ar/billing", label: "Rental Billing" },
  { to: "/estate/ar/invoices", label: "Invoice Register" },
  { to: "/estate/ar/payments", label: "Payment Allocation" },
  { to: "/estate/ar/ageing", label: "AR Ageing" },
  { to: "/estate/ar/collections", label: "Collections" },
  { to: "/estate/ar/disputes", label: "Disputes" },
  { to: "/estate/ar/reports", label: "AR Reports" },
  { to: "/estate/ar/settings", label: "AR Settings" },
];

export function ArPage({ title, subtitle, actions, children, crumbs }: { title: string; subtitle?: string; actions?: ReactNode; children: ReactNode; crumbs?: { label: string; to?: string }[] }) {
  return (
    <div className="space-y-5">
      <Crumb items={[{ label: "Real Estate ERP", to: "/estate/dashboard" }, { label: "Receivables", to: "/estate/ar" }, ...(crumbs ?? [{ label: title }])]} />
      <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h2 className="font-serif text-3xl text-navy">{title}</h2>
          {subtitle ? <p className="mt-1 max-w-3xl text-sm leading-relaxed text-navy/60">{subtitle}</p> : null}
        </div>
        {actions ? <div className="flex flex-wrap items-center gap-2">{actions}</div> : null}
      </div>
      <nav aria-label="Receivables sections" className="flex flex-wrap gap-1.5">
        {arNav.map((item) => (
          <NavLink key={item.to} to={item.to} end className={({ isActive }) => `rounded-full px-3 py-1 text-xs font-semibold ${isActive ? "bg-navy text-ivory" : "bg-white text-navy/70 ring-1 ring-inset ring-navy/10 hover:text-navy"}`}>
            {item.label}
          </NavLink>
        ))}
      </nav>
      {children}
    </div>
  );
}

export function money(value: number | null | undefined, currency = "USD"): string {
  if (value === null || value === undefined || !Number.isFinite(value)) return "—";
  try {
    return value.toLocaleString("en-US", { style: "currency", currency, minimumFractionDigits: 2, maximumFractionDigits: 2 });
  } catch {
    return `${currency} ${value.toFixed(2)}`;
  }
}

export function moneyShort(value: number, currency = "USD"): string {
  try {
    return value.toLocaleString("en-US", { style: "currency", currency, maximumFractionDigits: 0 });
  } catch {
    return `${currency} ${Math.round(value)}`;
  }
}

export function Field({ label, children, hint }: { label: string; children: ReactNode; hint?: string }) {
  return (
    <label className="block text-[11px] font-semibold uppercase tracking-[0.12em] text-navy/50">
      {label}
      <div className="mt-1 normal-case tracking-normal">{children}</div>
      {hint ? <span className="mt-1 block text-[11px] font-normal normal-case tracking-normal text-navy/45">{hint}</span> : null}
    </label>
  );
}

export function Feedback({ error, message }: { error: string | null; message: string | null }) {
  if (error) return <ErrorNote>{error}</ErrorNote>;
  if (message) return <Notice tone="green">{message}</Notice>;
  return null;
}

const tones: Record<string, string> = {
  Draft: "bg-navy/5 text-navy/70 ring-navy/10",
  Approved: "bg-sky-50 text-sky-800 ring-sky-700/20",
  Posted: "bg-emerald-50 text-emerald-800 ring-emerald-700/20",
  Paid: "bg-emerald-50 text-emerald-800 ring-emerald-700/20",
  "Partly paid": "bg-amber-50 text-amber-900 ring-amber-700/20",
  Open: "bg-amber-50 text-amber-900 ring-amber-700/20",
  Overdue: "bg-red-50 text-red-800 ring-red-700/20",
  "Reversal requested": "bg-violet-50 text-violet-800 ring-violet-700/20",
  Reversed: "bg-navy/5 text-navy/50 ring-navy/10",
  Rejected: "bg-navy/5 text-navy/50 ring-navy/10",
  Held: "bg-sky-50 text-sky-800 ring-sky-700/20",
  Refunded: "bg-navy/5 text-navy/60 ring-navy/10",
  Applied: "bg-emerald-50 text-emerald-800 ring-emerald-700/20",
  Active: "bg-emerald-50 text-emerald-800 ring-emerald-700/20",
  Inactive: "bg-navy/5 text-navy/50 ring-navy/10",
  Ended: "bg-navy/5 text-navy/50 ring-navy/10",
  "Under review": "bg-sky-50 text-sky-800 ring-sky-700/20",
  "Resolved — credit issued": "bg-emerald-50 text-emerald-800 ring-emerald-700/20",
  "Resolved — rejected": "bg-navy/5 text-navy/60 ring-navy/10",
  Current: "bg-emerald-50 text-emerald-800 ring-emerald-700/20",
  "1–30": "bg-amber-50 text-amber-900 ring-amber-700/20",
  "31–60": "bg-orange-50 text-orange-900 ring-orange-700/20",
  "61–90": "bg-red-50 text-red-800 ring-red-700/20",
  "90+": "bg-red-100 text-red-900 ring-red-700/30",
  high: "bg-red-50 text-red-800 ring-red-700/20",
  medium: "bg-amber-50 text-amber-900 ring-amber-700/20",
  low: "bg-sky-50 text-sky-800 ring-sky-700/20",
};

export function Tag({ children, tone }: { children: ReactNode; tone?: string }) {
  const cls = tones[tone ?? String(children)] ?? "bg-navy/5 text-navy/70 ring-navy/10";
  return <span className={`inline-flex items-center whitespace-nowrap rounded-full px-2.5 py-0.5 text-xs font-semibold ring-1 ring-inset ${cls}`}>{children}</span>;
}

export function EmptyLedger({ book }: { book: ArBook }) {
  if (book.tenants.length) return null;
  return (
    <Empty>
      The AR ledger is empty. <Link to="/estate/ar" className="font-semibold underline">Load the sample portfolio</Link>, add tenants in the <Link to="/estate/ar/tenants" className="font-semibold underline">Tenant Register</Link>, or bring tenants, leases, and open invoices in from <Link to="/estate/ar/settings" className="font-semibold underline">Data Integrations</Link>.
    </Empty>
  );
}

export function nameMaps(book: ArBook) {
  const tenants = new Map(book.tenants.map((tenant) => [tenant.id, tenant]));
  const leases = new Map(book.leases.map((lease) => [lease.id, lease]));
  const properties: Record<string, string> = {};
  for (const tenant of book.tenants) if (tenant.propertyName) properties[tenant.propertyId] = tenant.propertyName;
  for (const lease of book.leases) if (lease.propertyName) properties[lease.propertyId] = lease.propertyName;
  return { tenants, leases, properties, tenantName: (id: string) => tenants.get(id)?.name ?? id, propertyName: (id: string) => properties[id] ?? id };
}

export function Table({ children, min = 760 }: { children: ReactNode; min?: number }) {
  return (
    <div className="overflow-x-auto">
      <table className="data-table text-sm" style={{ minWidth: min }}>
        {children}
      </table>
    </div>
  );
}

export function SmallButton({ children, onClick, disabled, tone = "default", title }: { children: ReactNode; onClick: () => void; disabled?: boolean; tone?: "default" | "primary" | "danger"; title?: string }) {
  const cls = tone === "primary" ? "bg-navy text-ivory" : tone === "danger" ? "bg-white text-red-700 ring-1 ring-inset ring-red-300" : "bg-white text-navy ring-1 ring-inset ring-navy/20";
  return (
    <button type="button" onClick={onClick} disabled={disabled} title={title} className={`rounded-full px-3 py-1 text-xs font-semibold disabled:cursor-not-allowed disabled:opacity-40 ${cls}`}>
      {children}
    </button>
  );
}
