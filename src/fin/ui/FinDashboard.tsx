import { useEffect } from "react";
import { Link } from "react-router-dom";
import { FileText, AlertCircle, Banknote, BookOpen, Calendar } from "lucide-react";
import { useFinDashboard, finService } from "../hooks.ts";
import { StatCard, LoadingSpinner, inr } from "./shared.tsx";
import { AlertBanner } from "../../alerts/ui/AlertBanner.tsx";

export function FinDashboard() {
  const { data: summary, loading } = useFinDashboard();

  useEffect(() => {
    // Seed default chart of accounts and FY periods on first load
    finService().seedDefaultCoa().catch(console.error);
    finService().seedFy2627Periods().catch(console.error);
  }, []);

  if (loading || !summary) return <LoadingSpinner />;

  return (
    <div className="space-y-6">
      <AlertBanner module="Finance" />
      <div className="mb-6 flex items-center justify-between gap-4">
        <h2 className="font-serif text-2xl text-[#0A1628]">Finance Dashboard</h2>
        <div className="flex gap-2">
          <Link to="/rental-os/finance/invoices/new" className="inline-flex items-center gap-2 rounded-xl bg-[#0A1628] px-4 py-2 text-sm font-medium text-white hover:bg-[#C79A2B] hover:text-[#0A1628] transition">
            + New Invoice
          </Link>
          <Link to="/rental-os/finance/journals/new" className="inline-flex items-center gap-2 rounded-xl border border-[#0A1628]/20 bg-white px-4 py-2 text-sm font-medium text-[#0A1628] hover:border-[#C79A2B] hover:text-[#C79A2B] transition">
            + Journal Entry
          </Link>
        </div>
      </div>

      {/* KPI Grid */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard label="Open AP Invoices" value={summary.openInvoices} icon={FileText} color="navy" />
        <StatCard label="Total Amount Due" value={inr(summary.totalAmountDue)} icon={Banknote} color="gold" />
        <StatCard
          label="Overdue Invoices"
          value={summary.overdueInvoices}
          sub={summary.overdueAmount > 0 ? inr(summary.overdueAmount) + " overdue" : undefined}
          icon={AlertCircle}
          color={summary.overdueInvoices > 0 ? "red" : "green"}
        />
        <StatCard
          label="Journals This Month"
          value={summary.postedJournalsThisMonth}
          sub={summary.openPeriod ? `Period: ${summary.openPeriod.name}` : "No open period"}
          icon={BookOpen}
          color="navy"
        />
      </div>

      {/* Period status */}
      {summary.openPeriod && (
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 flex items-center gap-3">
          <Calendar className="h-5 w-5 text-emerald-600 flex-shrink-0" />
          <div>
            <p className="text-sm font-semibold text-emerald-800">Current Period: {summary.openPeriod.name}</p>
            <p className="text-xs text-emerald-600">{summary.openPeriod.startDate} to {summary.openPeriod.endDate} · Status: {summary.openPeriod.status}</p>
          </div>
          <Link to="/rental-os/finance/periods" className="ml-auto text-xs text-emerald-700 hover:underline">Manage Periods →</Link>
        </div>
      )}

      {/* Overdue alert */}
      {summary.overdueInvoices > 0 && (
        <div className="rounded-2xl border border-red-200 bg-red-50 p-4">
          <p className="text-sm font-semibold text-red-800">⚠ {summary.overdueInvoices} overdue invoice{summary.overdueInvoices !== 1 ? "s" : ""} — {inr(summary.overdueAmount)} outstanding</p>
          <Link to="/rental-os/finance/invoices?filter=overdue" className="mt-1 inline-block text-xs text-red-700 hover:underline">View overdue invoices →</Link>
        </div>
      )}

      {/* Quick links */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {[
          { label: "Vendor Invoices", to: "/rental-os/finance/invoices", icon: FileText },
          { label: "AP Payments", to: "/rental-os/finance/payments", icon: Banknote },
          { label: "Journal Entries", to: "/rental-os/finance/journals", icon: BookOpen },
          { label: "Chart of Accounts", to: "/rental-os/finance/accounts", icon: BookOpen },
        ].map(({ label, to, icon: Icon }) => (
          <Link key={to} to={to} className="shadow-card flex items-center gap-3 rounded-2xl bg-white p-4 hover:border-[#C79A2B] hover:shadow-md transition border border-transparent">
            <Icon className="h-5 w-5 text-[#C79A2B]" />
            <span className="text-sm font-medium text-[#0A1628]">{label}</span>
          </Link>
        ))}
      </div>

      {/* Reports quick links */}
      <div>
        <h3 className="mb-3 text-sm font-semibold uppercase tracking-wider text-[#0A1628]/50">Financial Reports</h3>
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          {[
            { label: "Trial Balance", to: "/rental-os/finance/reports/trial-balance" },
            { label: "P&L Statement", to: "/rental-os/finance/reports/pnl" },
            { label: "Balance Sheet", to: "/rental-os/finance/reports/balance-sheet" },
            { label: "Bank Reconciliation", to: "/rental-os/finance/bank-recon" },
          ].map(({ label, to }) => (
            <Link key={to} to={to} className="rounded-2xl border border-navy/10 bg-white px-4 py-3 text-center text-sm font-medium text-[#0A1628] hover:border-[#C79A2B] hover:text-[#C79A2B] transition">
              {label}
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
