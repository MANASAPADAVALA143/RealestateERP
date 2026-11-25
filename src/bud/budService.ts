// Phase 9 — Budget & Entity service

import type { StorageAdapter } from "../integrations/service/storage.ts";
import type {
  LegalEntity, Budget, BudgetLine, Forecast, ForecastLine,
  ISODateTime,
} from "./types.ts";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function uid(): string { return crypto.randomUUID(); }
function now(): ISODateTime { return new Date().toISOString(); }

function pad(n: number): string { return String(n).padStart(4, "0"); }

async function nextSeq(
  adapter: StorageAdapter,
  ws: string,
  store: "bud_budgets" | "bud_forecasts",
  prefix: string,
): Promise<string> {
  const all = await adapter.getAll<{ workspaceId: string; budgetNumber?: string; forecastNumber?: string }>(store);
  const nums = all
    .filter((r) => r.workspaceId === ws)
    .map((r) => {
      const raw = r.budgetNumber ?? r.forecastNumber ?? "";
      return parseInt(raw.replace(prefix + "-", ""), 10) || 0;
    });
  return `${prefix}-${pad(nums.length > 0 ? Math.max(...nums) + 1 : 1)}`;
}

// ─── Service ──────────────────────────────────────────────────────────────────

export class BudService {
  constructor(
    private readonly adapter: StorageAdapter,
    private readonly workspaceId: string,
  ) {}

  private ws = () => this.workspaceId;

  // ── Legal Entities ──────────────────────────────────────────────────────────

  async listEntities(): Promise<LegalEntity[]> {
    return (await this.adapter.getByIndex<LegalEntity>("entities", "workspaceId", this.ws()))
      .sort((a, b) => a.code.localeCompare(b.code));
  }

  async getEntity(id: string): Promise<LegalEntity | undefined> {
    return this.adapter.get<LegalEntity>("entities", id);
  }

  async upsertEntity(data: Omit<LegalEntity, "id" | "workspaceId" | "createdAt" | "updatedAt"> & { id?: string }): Promise<LegalEntity> {
    const existing = data.id ? await this.getEntity(data.id) : undefined;
    const entity: LegalEntity = {
      ...data,
      id: existing?.id ?? (data.id ?? uid()),
      workspaceId: this.ws(),
      createdAt: existing?.createdAt ?? now(),
      updatedAt: now(),
    };
    await this.adapter.put("entities", entity);
    return entity;
  }

  async seedDefaultEntities(): Promise<void> {
    const existing = await this.listEntities();
    if (existing.length > 0) return;

    const defaults: Omit<LegalEntity, "workspaceId" | "createdAt" | "updatedAt">[] = [
      {
        id: "GNV-RE",
        code: "GNV-RE",
        name: "Gnanova Real Estate Pvt Ltd",
        type: "Private Limited",
        currency: "INR",
        country: "India",
        registrationNumber: "U70100TG2015PTC099001",
        taxId: "36AABCG1234F1Z5",
        fiscalYearStartMonth: 4,
        isHoldingCompany: false,
        status: "Active",
      },
      {
        id: "GNV-PROP",
        code: "GNV-PROP",
        name: "Gnanova Properties LLP",
        type: "LLP",
        currency: "INR",
        country: "India",
        registrationNumber: "AAD-1234",
        taxId: "36AABCG5678G1Z5",
        fiscalYearStartMonth: 4,
        isHoldingCompany: false,
        status: "Active",
      },
      {
        id: "GNV-INFRA",
        code: "GNV-INFRA",
        name: "Gnanova Infrastructure Ltd",
        type: "Public Limited",
        currency: "INR",
        country: "India",
        registrationNumber: "U45200TG2010PLC070001",
        taxId: "36AABCG9012H1Z5",
        fiscalYearStartMonth: 4,
        isHoldingCompany: true,
        consolidationGroup: "Gnanova Group",
        status: "Active",
      },
    ];

    for (const d of defaults) {
      await this.upsertEntity(d);
    }
  }

  // ── Budgets ─────────────────────────────────────────────────────────────────

  async listBudgets(entityId?: string): Promise<Budget[]> {
    const all = await this.adapter.getByIndex<Budget>("bud_budgets", "workspaceId", this.ws());
    return (entityId ? all.filter((b) => b.entityId === entityId) : all)
      .sort((a, b) => b.fiscalYear - a.fiscalYear || a.budgetNumber.localeCompare(b.budgetNumber));
  }

  async getBudget(id: string): Promise<Budget | undefined> {
    return this.adapter.get<Budget>("bud_budgets", id);
  }

  async createBudget(data: Omit<Budget, "id" | "workspaceId" | "budgetNumber" | "totalRevenueBudget" | "totalExpenseBudget" | "totalNoiBudget" | "createdAt" | "updatedAt">): Promise<Budget> {
    const budgetNumber = await nextSeq(this.adapter, this.ws(), "bud_budgets", "BUD");
    const budget: Budget = {
      ...data,
      id: uid(),
      workspaceId: this.ws(),
      budgetNumber,
      totalRevenueBudget: 0,
      totalExpenseBudget: 0,
      totalNoiBudget: 0,
      createdAt: now(),
      updatedAt: now(),
    };
    await this.adapter.put("bud_budgets", budget);
    return budget;
  }

  async updateBudgetStatus(id: string, status: Budget["status"], approvedBy?: string): Promise<Budget> {
    const budget = await this.getBudget(id);
    if (!budget) throw new Error("Budget not found");
    const updated: Budget = {
      ...budget,
      status,
      approvedBy: approvedBy ?? budget.approvedBy,
      approvedAt: status === "Approved" ? now() : budget.approvedAt,
      updatedAt: now(),
    };
    await this.adapter.put("bud_budgets", updated);
    return updated;
  }

  // ── Budget Lines ────────────────────────────────────────────────────────────

  async listBudgetLines(budgetId: string): Promise<BudgetLine[]> {
    const all = await this.adapter.getByIndex<BudgetLine>("bud_budget_lines", "workspaceId", this.ws());
    return all
      .filter((l) => l.budgetId === budgetId)
      .sort((a, b) => a.accountCode.localeCompare(b.accountCode) || a.month.localeCompare(b.month));
  }

  async upsertBudgetLine(data: Omit<BudgetLine, "id" | "workspaceId">): Promise<BudgetLine> {
    // Find existing line matching budgetId + accountCode + month + propertyId + costCentre
    const existing = (await this.listBudgetLines(data.budgetId)).find(
      (l) =>
        l.accountCode === data.accountCode &&
        l.month === data.month &&
        (l.propertyId ?? "") === (data.propertyId ?? "") &&
        (l.costCentre ?? "") === (data.costCentre ?? ""),
    );
    const line: BudgetLine = {
      ...data,
      id: existing?.id ?? uid(),
      workspaceId: this.ws(),
    };
    await this.adapter.put("bud_budget_lines", line);
    await this.recalcBudgetTotals(data.budgetId);
    return line;
  }

  async deleteBudgetLine(id: string, budgetId: string): Promise<void> {
    await this.adapter.delete("bud_budget_lines", id);
    await this.recalcBudgetTotals(budgetId);
  }

  private async recalcBudgetTotals(budgetId: string): Promise<void> {
    const budget = await this.getBudget(budgetId);
    if (!budget) return;
    const lines = await this.listBudgetLines(budgetId);
    // Determine if account is revenue or expense by name pattern (simplified — will refine with CoA in 9.2)
    const rev = lines.filter((l) => l.accountCode.startsWith("4")).reduce((s, l) => s + l.amount, 0);
    const exp = lines.filter((l) => l.accountCode.startsWith("5")).reduce((s, l) => s + l.amount, 0);
    await this.adapter.put("bud_budgets", {
      ...budget,
      totalRevenueBudget: rev,
      totalExpenseBudget: exp,
      totalNoiBudget: rev - exp,
      updatedAt: now(),
    });
  }

  // ── Forecasts ───────────────────────────────────────────────────────────────

  async listForecasts(entityId?: string): Promise<Forecast[]> {
    const all = await this.adapter.getByIndex<Forecast>("bud_forecasts", "workspaceId", this.ws());
    return (entityId ? all.filter((f) => f.entityId === entityId) : all)
      .sort((a, b) => b.fiscalYear - a.fiscalYear);
  }

  async getForecast(id: string): Promise<Forecast | undefined> {
    return this.adapter.get<Forecast>("bud_forecasts", id);
  }

  async createForecast(data: Omit<Forecast, "id" | "workspaceId" | "forecastNumber" | "totalProjected" | "createdAt" | "updatedAt">): Promise<Forecast> {
    const forecastNumber = await nextSeq(this.adapter, this.ws(), "bud_forecasts", "FCT");
    const forecast: Forecast = {
      ...data,
      id: uid(),
      workspaceId: this.ws(),
      forecastNumber,
      totalProjected: 0,
      createdAt: now(),
      updatedAt: now(),
    };
    await this.adapter.put("bud_forecasts", forecast);
    return forecast;
  }

  async listForecastLines(forecastId: string): Promise<ForecastLine[]> {
    const all = await this.adapter.getByIndex<ForecastLine>("bud_forecast_lines", "workspaceId", this.ws());
    return all
      .filter((l) => l.forecastId === forecastId)
      .sort((a, b) => a.month.localeCompare(b.month));
  }

  async upsertForecastLine(data: Omit<ForecastLine, "id" | "workspaceId">): Promise<ForecastLine> {
    const existing = (await this.listForecastLines(data.forecastId)).find(
      (l) => l.month === data.month && (l.propertyId ?? "") === (data.propertyId ?? ""),
    );
    const line: ForecastLine = {
      ...data,
      id: existing?.id ?? uid(),
      workspaceId: this.ws(),
    };
    await this.adapter.put("bud_forecast_lines", line);
    await this.recalcForecastTotal(data.forecastId);
    return line;
  }

  private async recalcForecastTotal(forecastId: string): Promise<void> {
    const forecast = await this.getForecast(forecastId);
    if (!forecast) return;
    const lines = await this.listForecastLines(forecastId);
    const total = lines.reduce((s, l) => s + l.projected, 0);
    await this.adapter.put("bud_forecasts", { ...forecast, totalProjected: total, updatedAt: now() });
  }

  // ── Utility: generate rental income forecast from active leases ─────────────

  async generateRentalForecast(
    entityId: string,
    entityName: string,
    fiscalYear: number,
    leases: Array<{ id: string; propertyId: string; propertyName: string; monthlyRent: number; startDate: string; endDate: string; status: string; entityId?: string }>,
  ): Promise<Forecast> {
    const startDate = `${fiscalYear}-04-01`;
    const endDate = `${fiscalYear + 1}-03-31`;

    const forecast = await this.createForecast({
      entityId,
      entityName,
      name: `FY${fiscalYear}-${String(fiscalYear + 1).slice(2)} Rental Income Forecast`,
      type: "RentalIncome",
      fiscalYear,
      startDate,
      endDate,
      basis: "Lease-derived",
      notes: `Auto-generated from ${leases.length} active lease(s)`,
    });

    // Generate 12 monthly lines
    const months = Array.from({ length: 12 }, (_, i) => {
      const d = new Date(startDate);
      d.setMonth(d.getMonth() + i);
      return d.toISOString().slice(0, 7) + "-01";
    });

    for (const month of months) {
      const monthStart = new Date(month);
      const monthEnd = new Date(monthStart.getFullYear(), monthStart.getMonth() + 1, 0);

      let projected = 0;
      const details: string[] = [];

      for (const lease of leases) {
        if (lease.status !== "Active") continue;
        const leaseStart = new Date(lease.startDate);
        const leaseEnd = new Date(lease.endDate);
        // Lease overlaps this month
        if (leaseStart <= monthEnd && leaseEnd >= monthStart) {
          projected += lease.monthlyRent;
          details.push(`${lease.id}: ₹${lease.monthlyRent.toLocaleString()}`);
        }
      }

      await this.upsertForecastLine({
        forecastId: forecast.id,
        entityId,
        month,
        projected,
        isManualOverride: false,
        basisDetail: details.join(", ") || "No active leases",
      });
    }

    return await this.getForecast(forecast.id) as Forecast;
  }
}

// ─── Singleton ────────────────────────────────────────────────────────────────

let _service: BudService | null = null;

export function getBudService(adapter: StorageAdapter, workspaceId: string): BudService {
  if (!_service) _service = new BudService(adapter, workspaceId);
  return _service;
}
