// Phase 9.2 — Actual vs Budget variance engine

import type { StorageAdapter } from "../integrations/service/storage.ts";
import type { JournalEntry } from "../fin/types.ts";
import type { BudgetLine, VarianceRow } from "./types.ts";

export interface ActualLine {
  accountCode: string;
  accountName: string;
  propertyId?: string;
  costCentre?: string;
  month: string;      // "YYYY-MM-01"
  netAmount: number;  // debit - credit for expense accounts; credit - debit for revenue
}

export interface VarianceSummary {
  entityId: string;
  periodLabel: string;
  totalBudgetRevenue: number;
  totalActualRevenue: number;
  totalBudgetExpense: number;
  totalActualExpense: number;
  budgetedNOI: number;
  actualNOI: number;
  noiVariance: number;
  rows: VarianceRow[];
}

// Determine if account is revenue (4xxx) or expense (5xxx)
function accountType(code: string): "Revenue" | "Expense" | null {
  if (code.startsWith("4")) return "Revenue";
  if (code.startsWith("5")) return "Expense";
  return null;
}

// For revenue: positive = credit side (income); for expense: positive = debit side (cost)
// JournalLine: debit and credit are always positive amounts on their respective sides
function netForAccount(type: "Revenue" | "Expense", debit: number, credit: number): number {
  return type === "Revenue" ? credit - debit : debit - credit;
}

export async function computeVariance(
  adapter: StorageAdapter,
  workspaceId: string,
  entityId: string,
  fiscalYear: number,
  // properties in this entity, used to attribute untagged journals
  propertyIds: Set<string>,
): Promise<VarianceSummary> {
  const startDate = `${fiscalYear}-04-01`;
  const endDate = `${fiscalYear + 1}-03-31`;

  // 1. Fetch budget lines for this entity + fiscal year
  const allBudgetLines = await adapter.getByIndex<BudgetLine>("bud_budget_lines", "workspaceId", workspaceId);
  const budgetLines = allBudgetLines.filter(
    (l) => l.entityId === entityId && l.month >= startDate && l.month <= endDate,
  );

  // 2. Fetch posted journals in this period
  const allJournals = await adapter.getByIndex<JournalEntry>("fin_journals", "workspaceId", workspaceId);
  const journals = allJournals.filter(
    (j) => j.status === "Posted" && j.date >= startDate && j.date <= endDate,
  );

  // 3. Build actuals map: key = "accountCode|month|propertyId|costCentre"
  const actualsMap = new Map<string, ActualLine>();

  for (const journal of journals) {
    // Attribute journal to entity by propertyId (if set and belongs to this entity's properties)
    for (const line of journal.lines) {
      const type = accountType(line.accountCode);
      if (!type) continue;

      // Property attribution: include if propertyId matches this entity, or if no propertyId (unattributed)
      const propId = line.propertyId;
      if (propId && !propertyIds.has(propId)) continue;

      const month = journal.date.slice(0, 7) + "-01";
      const key = `${line.accountCode}|${month}|${propId ?? ""}|${line.costCentre ?? ""}`;

      const existing = actualsMap.get(key);
      const net = netForAccount(type, line.debit, line.credit);
      if (existing) {
        existing.netAmount += net;
      } else {
        actualsMap.set(key, {
          accountCode: line.accountCode,
          accountName: line.accountName,
          propertyId: propId,
          costCentre: line.costCentre,
          month,
          netAmount: net,
        });
      }
    }
  }

  // 4. Build budget map for quick lookup
  const budgetMap = new Map<string, { amount: number; accountName: string }>();
  for (const bl of budgetLines) {
    const key = `${bl.accountCode}|${bl.month}|${bl.propertyId ?? ""}|${bl.costCentre ?? ""}`;
    const existing = budgetMap.get(key);
    if (existing) {
      existing.amount += bl.amount;
    } else {
      budgetMap.set(key, { amount: bl.amount, accountName: bl.accountName });
    }
  }

  // 5. Collect all unique keys (union of budget + actuals)
  const allKeys = new Set([...budgetMap.keys(), ...actualsMap.keys()]);

  const rows: VarianceRow[] = [];

  for (const key of allKeys) {
    const [accountCode, month, propertyId, costCentre] = key.split("|");
    const type = accountType(accountCode);
    if (!type) continue;

    const budgetEntry = budgetMap.get(key);
    const actualEntry = actualsMap.get(key);

    const budget = budgetEntry?.amount ?? 0;
    const actual = actualEntry?.netAmount ?? 0;
    const accountName = budgetEntry?.accountName ?? actualEntry?.accountName ?? accountCode;
    const variance = actual - budget;
    const variancePct = budget !== 0 ? (variance / budget) * 100 : null;

    // Favourable: for revenue actual > budget (more income); for expense actual < budget (less cost)
    const isFavourable = type === "Revenue" ? actual >= budget : actual <= budget;

    rows.push({
      accountCode,
      accountName,
      propertyId: propertyId || undefined,
      propertyName: undefined, // resolved in UI layer
      costCentre: costCentre || undefined,
      month,
      budget,
      actual,
      variance,
      variancePct,
      isFavourable,
      accountType: type,
    });
  }

  // Sort: Revenue first, then Expense; within each by accountCode then month
  rows.sort((a, b) => {
    if (a.accountType !== b.accountType) return a.accountType === "Revenue" ? -1 : 1;
    return a.accountCode.localeCompare(b.accountCode) || a.month.localeCompare(b.month);
  });

  // 6. Compute summary totals
  const totalBudgetRevenue = rows.filter((r) => r.accountType === "Revenue").reduce((s, r) => s + r.budget, 0);
  const totalActualRevenue = rows.filter((r) => r.accountType === "Revenue").reduce((s, r) => s + r.actual, 0);
  const totalBudgetExpense = rows.filter((r) => r.accountType === "Expense").reduce((s, r) => s + r.budget, 0);
  const totalActualExpense = rows.filter((r) => r.accountType === "Expense").reduce((s, r) => s + r.actual, 0);

  return {
    entityId,
    periodLabel: `FY${fiscalYear}-${String(fiscalYear + 1).slice(2)}`,
    totalBudgetRevenue,
    totalActualRevenue,
    totalBudgetExpense,
    totalActualExpense,
    budgetedNOI: totalBudgetRevenue - totalBudgetExpense,
    actualNOI: totalActualRevenue - totalActualExpense,
    noiVariance: (totalActualRevenue - totalActualExpense) - (totalBudgetRevenue - totalBudgetExpense),
    rows,
  };
}
