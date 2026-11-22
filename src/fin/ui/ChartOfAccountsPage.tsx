import { useEffect } from "react";
import { useAccounts, finService } from "../hooks.ts";
import { LoadingSpinner, PageHeader, EmptyState, SectionCard } from "./shared.tsx";
import type { AccountType } from "../types.ts";

const TYPE_ORDER: AccountType[] = ["Asset", "Liability", "Equity", "Revenue", "Expense"];
const TYPE_COLORS: Record<AccountType, string> = {
  Asset: "text-blue-700",
  Liability: "text-red-700",
  Equity: "text-purple-700",
  Revenue: "text-emerald-700",
  Expense: "text-orange-700",
};

export function ChartOfAccountsPage() {
  const { data: accounts, loading, refresh } = useAccounts();

  useEffect(() => {
    finService().seedDefaultCoa().then(refresh).catch(console.error);
  }, [refresh]);

  if (loading) return <LoadingSpinner />;

  const grouped = TYPE_ORDER.reduce<Record<string, typeof accounts>>((acc, type) => {
    acc[type] = (accounts ?? []).filter((a) => a.type === type);
    return acc;
  }, {} as Record<string, typeof accounts>);

  return (
    <div className="space-y-5">
      <PageHeader title="Chart of Accounts" />
      {(accounts ?? []).length === 0 ? (
        <EmptyState message="No accounts found. The default chart of accounts will be seeded automatically." />
      ) : (
        TYPE_ORDER.map((type) => (
          grouped[type].length > 0 && (
            <SectionCard key={type} title={type}>
              <table className="w-full text-sm">
                <thead><tr className="border-b border-navy/8">{["Code", "Name", "Sub-Type", "Normal Balance", "Active"].map((h) => <th key={h} className="pb-2 text-left text-xs font-semibold text-navy/50">{h}</th>)}</tr></thead>
                <tbody className="divide-y divide-navy/5">
                  {grouped[type].map((a) => (
                    <tr key={a.id} className="hover:bg-[#F8F6F0]/60">
                      <td className={`py-2 font-mono text-xs font-semibold ${TYPE_COLORS[type]} ${a.parentCode ? "pl-4" : ""}`}>{a.code}</td>
                      <td className={`py-2 ${a.isControl ? "font-semibold text-navy" : "text-navy/80"} ${a.parentCode ? "pl-4" : ""}`}>
                        {a.isControl ? "▸ " : ""}{a.name}
                      </td>
                      <td className="py-2 text-navy/60 text-xs">{a.subType}</td>
                      <td className={`py-2 text-xs font-medium ${a.nature === "Debit" ? "text-blue-700" : "text-emerald-700"}`}>{a.nature}</td>
                      <td className="py-2 text-xs">{a.isActive ? <span className="text-emerald-600">✓ Active</span> : <span className="text-red-500">Inactive</span>}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </SectionCard>
          )
        ))
      )}
    </div>
  );
}
