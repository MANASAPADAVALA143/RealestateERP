import type { IndexedDbAdapter } from "../integrations/service/storage.ts";
import type { JournalEntry, Account } from "../fin/types.ts";
import { properties } from "../rental-os/data.ts";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface ConsolLine {
  accountCode: string;
  accountName: string;
  accountType: "Asset" | "Liability" | "Equity" | "Revenue" | "Expense";
  subType?: string;
  debit: number;
  credit: number;
  net: number;        // credit − debit for Cr-normal accounts; debit − credit for Dr-normal
  byEntity: Record<string, number>; // entityId → net
}

export interface TrialBalanceRow extends ConsolLine {
  openingDebit: number;
  openingCredit: number;
  closingDebit: number;
  closingCredit: number;
}

export interface PLResult {
  revenue: ConsolLine[];
  expenses: ConsolLine[];
  totalRevenue: number;
  totalExpenses: number;
  grossProfit: number;
  netIncome: number;
  byEntity: Record<string, { revenue: number; expenses: number; netIncome: number }>;
}

export interface BSResult {
  assets: ConsolLine[];
  liabilities: ConsolLine[];
  equity: ConsolLine[];
  totalAssets: number;
  totalLiabilities: number;
  totalEquity: number;
  liabilitiesAndEquity: number;
  balanced: boolean;
}

export interface TBResult {
  rows: TrialBalanceRow[];
  totalDebit: number;
  totalCredit: number;
  balanced: boolean;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function inferType(code: string): "Asset" | "Liability" | "Equity" | "Revenue" | "Expense" {
  const prefix = code.charAt(0);
  if (prefix === "1") return "Asset";
  if (prefix === "2") return "Liability";
  if (prefix === "3") return "Equity";
  if (prefix === "4") return "Revenue";
  return "Expense";
}

function isCreditNormal(type: "Asset" | "Liability" | "Equity" | "Revenue" | "Expense"): boolean {
  return type === "Liability" || type === "Equity" || type === "Revenue";
}

// Build a map: propertyId → entityId from the static property data
function buildPropertyEntityMap(): Map<string, string> {
  const m = new Map<string, string>();
  for (const p of properties) {
    if (p.entityId) m.set(p.id, p.entityId);
  }
  return m;
}

// ─── Main computation ─────────────────────────────────────────────────────────

export async function computeConsolidation(
  adapter: IndexedDbAdapter,
  workspaceId: string,
  entityIds: string[],   // empty = all entities
  startDate: string,     // YYYY-MM-DD inclusive
  endDate: string,       // YYYY-MM-DD inclusive
): Promise<{ pl: PLResult; bs: BSResult; tb: TBResult }> {
  const propEntityMap = buildPropertyEntityMap();
  const entitySet = new Set(entityIds);

  // Load all posted journals in date range
  const allJournals = await adapter.getByIndex<JournalEntry>("fin_journals", "workspaceId", workspaceId);
  const journals = allJournals.filter(
    (j) => j.status === "Posted" && j.date >= startDate && j.date <= endDate,
  );

  // Load accounts for display names (best-effort)
  const allAccounts = await adapter.getByIndex<Account>("fin_accounts", "workspaceId", workspaceId);
  const accountMap = new Map(allAccounts.map((a) => [a.code, a]));

  // Accumulate per accountCode
  const acc = new Map<string, { debit: number; credit: number; byEntity: Record<string, number> }>();

  for (const journal of journals) {
    for (const line of journal.lines) {
      // Determine entity for this line via property bridge
      let lineEntityId: string | undefined;
      if (line.propertyId) {
        lineEntityId = propEntityMap.get(line.propertyId);
      }

      // Filter by entity if requested
      if (entitySet.size > 0 && lineEntityId && !entitySet.has(lineEntityId)) continue;

      const key = line.accountCode;
      if (!acc.has(key)) acc.set(key, { debit: 0, credit: 0, byEntity: {} });
      const entry = acc.get(key)!;
      entry.debit += line.debit;
      entry.credit += line.credit;

      if (lineEntityId) {
        entry.byEntity[lineEntityId] = (entry.byEntity[lineEntityId] ?? 0) + (line.credit - line.debit);
      }
    }
  }

  // Build ConsolLine array
  const lines: ConsolLine[] = [];
  for (const [code, { debit, credit, byEntity }] of acc) {
    const account = accountMap.get(code);
    const accountType = account ? (account.type as ConsolLine["accountType"]) : inferType(code);
    const accountName = account?.name ?? `Account ${code}`;
    const creditNormal = isCreditNormal(accountType);
    const net = creditNormal ? credit - debit : debit - credit;
    lines.push({ accountCode: code, accountName, accountType, subType: account?.subType, debit, credit, net, byEntity });
  }

  lines.sort((a, b) => a.accountCode.localeCompare(b.accountCode));

  // ── P&L ──────────────────────────────────────────────────────────────────────
  const revLines = lines.filter((l) => l.accountType === "Revenue");
  const expLines = lines.filter((l) => l.accountType === "Expense");
  const totalRevenue = revLines.reduce((s, l) => s + l.net, 0);
  const totalExpenses = expLines.reduce((s, l) => s + l.net, 0);

  // Per-entity P&L
  const entityPL: PLResult["byEntity"] = {};
  for (const eid of entityIds.length > 0 ? entityIds : [...new Set([...revLines, ...expLines].flatMap((l) => Object.keys(l.byEntity)))]) {
    const rev = revLines.reduce((s, l) => s + (l.byEntity[eid] ?? 0), 0);
    const exp = expLines.reduce((s, l) => s + (l.byEntity[eid] ?? 0), 0);
    entityPL[eid] = { revenue: rev, expenses: exp, netIncome: rev - exp };
  }

  const pl: PLResult = {
    revenue: revLines, expenses: expLines,
    totalRevenue, totalExpenses,
    grossProfit: totalRevenue - totalExpenses,
    netIncome: totalRevenue - totalExpenses,
    byEntity: entityPL,
  };

  // ── Balance Sheet ─────────────────────────────────────────────────────────────
  const assetLines = lines.filter((l) => l.accountType === "Asset");
  const liabLines  = lines.filter((l) => l.accountType === "Liability");
  const equityLines = lines.filter((l) => l.accountType === "Equity");
  const totalAssets = assetLines.reduce((s, l) => s + l.net, 0);
  const totalLiab   = liabLines.reduce((s, l) => s + l.net, 0);
  const totalEquity = equityLines.reduce((s, l) => s + l.net, 0);
  const liabAndEq   = totalLiab + totalEquity;

  const bs: BSResult = {
    assets: assetLines, liabilities: liabLines, equity: equityLines,
    totalAssets, totalLiabilities: totalLiab, totalEquity,
    liabilitiesAndEquity: liabAndEq,
    balanced: Math.abs(totalAssets - liabAndEq) < 0.01,
  };

  // ── Trial Balance ─────────────────────────────────────────────────────────────
  const tbRows: TrialBalanceRow[] = lines.map((l) => ({
    ...l,
    openingDebit: 0,   // opening balance not tracked in this model
    openingCredit: 0,
    closingDebit: l.debit,
    closingCredit: l.credit,
  }));
  const totalDebit  = tbRows.reduce((s, r) => s + r.debit, 0);
  const totalCredit = tbRows.reduce((s, r) => s + r.credit, 0);

  const tb: TBResult = {
    rows: tbRows, totalDebit, totalCredit,
    balanced: Math.abs(totalDebit - totalCredit) < 0.01,
  };

  return { pl, bs, tb };
}
