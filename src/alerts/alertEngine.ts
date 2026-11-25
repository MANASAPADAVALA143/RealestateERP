import type { StorageAdapter } from "../integrations/service/storage.ts";
import type { Alert, AlertRuleId } from "./types.ts";

const OCCUPANCY_THRESHOLD = 80; // percent
const WO_SLA_DAYS = 7;
const JOURNAL_STALE_DAYS = 3;
const ESCALATION_WARN_DAYS = 30;

function uid(): string {
  return Math.random().toString(36).slice(2, 10) + Date.now().toString(36);
}

function today(): string {
  return new Date().toISOString().slice(0, 10);
}

function daysFromNow(date: string): number {
  return Math.floor((new Date(date).getTime() - Date.now()) / 86400000);
}

function daysSince(date: string): number {
  return Math.floor((Date.now() - new Date(date).getTime()) / 86400000);
}

// ── Deduplication key ─────────────────────────────────────────────────────────
function dedupKey(ruleId: AlertRuleId, entityId: string): string {
  return `${ruleId}::${entityId}`;
}

// ── Main scan function ────────────────────────────────────────────────────────
export async function runAlertScan(adapter: StorageAdapter, workspaceId: string): Promise<Alert[]> {
  const now = new Date().toISOString();
  const todayStr = today();

  // Load all relevant stores in parallel
  const [
    arInvoices, arLeases,
    finInvoices, finJournals,
    workOrders, pmSchedules,
    contracts,
    existingAlerts,
  ] = await Promise.all([
    adapter.getAll<any>("ar_invoices"),
    adapter.getAll<any>("ar_leases"),
    adapter.getAll<any>("fin_vendor_invoices"),
    adapter.getAll<any>("fin_journals"),
    adapter.getAll<any>("ops_work_orders"),
    adapter.getAll<any>("ops_pm_schedules"),
    adapter.getAll<any>("ops_contracts"),
    adapter.getAll<Alert>("alerts"),
  ]);

  // Index existing active alerts by dedup key to prevent duplicates
  const activeKeys = new Set(
    existingAlerts
      .filter((a) => a.workspaceId === workspaceId && a.status === "Active")
      .map((a) => dedupKey(a.ruleId, a.entityId))
  );

  const newAlerts: Alert[] = [];

  function emit(
    ruleId: AlertRuleId,
    module: Alert["module"],
    severity: Alert["severity"],
    entityId: string,
    entityRef: string,
    message: string
  ) {
    const key = dedupKey(ruleId, entityId);
    if (activeKeys.has(key)) return; // already alerted — skip
    activeKeys.add(key);
    newAlerts.push({
      id: `ALT-${uid()}`,
      workspaceId,
      module,
      severity,
      ruleId,
      entityId,
      entityRef,
      message,
      createdAt: now,
      status: "Active",
    });
  }

  // ── Rule 1: Overdue AR invoices ───────────────────────────────────────────
  for (const inv of arInvoices) {
    if (inv.workspaceId !== workspaceId) continue;
    if (inv.status !== "Posted") continue;
    if ((inv.amountDue ?? 0) <= 0) continue;
    if (!inv.dueDate || inv.dueDate >= todayStr) continue;
    const overdueDays = daysSince(inv.dueDate);
    emit(
      "overdue_ar_invoice", "AR", "Critical",
      inv.id,
      `${inv.number ?? inv.id}`,
      `AR invoice ${inv.number ?? inv.id} is ${overdueDays} day${overdueDays !== 1 ? "s" : ""} overdue — ₹${(inv.amountDue ?? 0).toLocaleString("en-IN")} outstanding`
    );
  }

  // ── Rules 2–4: Lease expiry ────────────────────────────────────────────────
  for (const lease of arLeases) {
    if (lease.workspaceId !== workspaceId) continue;
    if (lease.status !== "Active") continue;
    if (!lease.end) continue;
    const days = daysFromNow(lease.end);
    const ref = `${lease.code ?? lease.id} · ${lease.tenantId}`;
    if (days >= 0 && days <= 30) {
      emit("lease_expiry_30", "Leasing", "Critical", lease.id, ref,
        `Lease ${lease.code ?? lease.id} expires in ${days} day${days !== 1 ? "s" : ""} (${lease.end})`);
    } else if (days > 30 && days <= 60) {
      emit("lease_expiry_60", "Leasing", "Warning", lease.id, ref,
        `Lease ${lease.code ?? lease.id} expires in ${days} days (${lease.end})`);
    } else if (days > 60 && days <= 90) {
      emit("lease_expiry_90", "Leasing", "Info", lease.id, ref,
        `Lease ${lease.code ?? lease.id} expires in ${days} days (${lease.end})`);
    }
  }

  // ── Rule 5: Rent escalation due ───────────────────────────────────────────
  for (const lease of arLeases) {
    if (lease.workspaceId !== workspaceId) continue;
    if (lease.status !== "Active") continue;
    if (!lease.escalationPct || lease.escalationPct <= 0) continue;
    if (!lease.start) continue;
    // Find next annual anniversary from lease start
    const start = new Date(lease.start);
    const now2 = new Date();
    const nextAnniversary = new Date(start);
    nextAnniversary.setFullYear(now2.getFullYear());
    if (nextAnniversary <= now2) nextAnniversary.setFullYear(now2.getFullYear() + 1);
    const daysToAnniversary = Math.floor((nextAnniversary.getTime() - now2.getTime()) / 86400000);
    if (daysToAnniversary <= ESCALATION_WARN_DAYS) {
      emit(
        "rent_escalation_due", "Leasing", "Warning",
        `${lease.id}::escalation`,
        `${lease.code ?? lease.id}`,
        `Rent escalation of ${lease.escalationPct}% due in ${daysToAnniversary} day${daysToAnniversary !== 1 ? "s" : ""} for lease ${lease.code ?? lease.id}`
      );
    }
  }

  // ── Rule 6: Vacant units ──────────────────────────────────────────────────
  const activeUnitIds = new Set(
    arLeases
      .filter((l) => l.workspaceId === workspaceId && l.status === "Active" && l.end >= todayStr)
      .map((l) => l.unitId)
      .filter(Boolean)
  );
  const allUnitIds = new Set(
    arLeases
      .filter((l) => l.workspaceId === workspaceId && l.unitId)
      .map((l) => l.unitId)
  );
  for (const unitId of allUnitIds) {
    if (activeUnitIds.has(unitId)) continue;
    emit(
      "vacant_unit", "Leasing", "Info",
      `vacant::${unitId}`,
      unitId,
      `Unit ${unitId} has no active lease`
    );
  }

  // ── Rule 7: Overdue AP invoices ───────────────────────────────────────────
  for (const inv of finInvoices) {
    if (inv.workspaceId !== workspaceId) continue;
    if (!["Approved", "Partially Paid"].includes(inv.status)) continue;
    if ((inv.amountDue ?? 0) <= 0) continue;
    if (!inv.dueDate || inv.dueDate >= todayStr) continue;
    const overdueDays = daysSince(inv.dueDate);
    emit(
      "overdue_ap_invoice", "Finance", "Critical",
      inv.id,
      `${inv.invoiceNumber ?? inv.id} · ${inv.vendorName ?? ""}`,
      `AP invoice ${inv.invoiceNumber ?? inv.id} (${inv.vendorName ?? ""}) is ${overdueDays} day${overdueDays !== 1 ? "s" : ""} overdue — ₹${(inv.amountDue ?? 0).toLocaleString("en-IN")} outstanding`
    );
  }

  // ── Rule 8: Unposted journals (Draft > 3 days) ────────────────────────────
  for (const jnl of finJournals) {
    if (jnl.workspaceId !== workspaceId) continue;
    if (jnl.status !== "Draft") continue;
    const age = daysSince(jnl.createdAt ?? jnl.date ?? todayStr);
    if (age < JOURNAL_STALE_DAYS) continue;
    emit(
      "unposted_journal", "Finance", "Warning",
      jnl.id,
      `${jnl.number ?? jnl.id}`,
      `Journal ${jnl.number ?? jnl.id} has been in Draft for ${age} day${age !== 1 ? "s" : ""} — post or discard`
    );
  }

  // ── Rule 9: Work order SLA breach ────────────────────────────────────────
  for (const wo of workOrders) {
    if (wo.workspaceId !== workspaceId) continue;
    if (!["Open", "In Progress"].includes(wo.status)) continue;
    const startDate = wo.startDate ?? wo.audit?.createdAt ?? wo.createdAt;
    if (!startDate) continue;
    const age = daysSince(startDate);
    if (age < WO_SLA_DAYS) continue;
    emit(
      "work_order_sla", "Ops", "Warning",
      wo.id,
      `${wo.number ?? wo.id} · ${wo.propertyName ?? ""}`,
      `Work order ${wo.number ?? wo.id} has been ${wo.status} for ${age} day${age !== 1 ? "s" : ""} (SLA: ${WO_SLA_DAYS} days)`
    );
  }

  // ── Rule 10: PM overdue ───────────────────────────────────────────────────
  for (const pm of pmSchedules) {
    if (pm.workspaceId !== workspaceId) continue;
    if (pm.status !== "Active") continue;
    if (!pm.nextDue || pm.nextDue >= todayStr) continue;
    const overdueDays = daysSince(pm.nextDue);
    emit(
      "pm_overdue", "Ops", "Warning",
      pm.id,
      `${pm.name ?? pm.id} · ${pm.propertyName ?? ""}`,
      `PM schedule "${pm.name ?? pm.id}" was due on ${pm.nextDue} (${overdueDays} day${overdueDays !== 1 ? "s" : ""} overdue)`
    );
  }

  // ── Rules 11–12: Vendor contract expiry ───────────────────────────────────
  for (const contract of contracts) {
    if (contract.workspaceId !== workspaceId) continue;
    if (contract.status !== "Active") continue;
    if (!contract.endDate) continue;
    const days = daysFromNow(contract.endDate);
    const ref = `${contract.contractNumber ?? contract.id} · ${contract.vendorName ?? ""}`;
    if (days >= 0 && days <= 30) {
      emit("contract_expiry_30", "Contracts", "Critical", contract.id, ref,
        `Vendor contract ${contract.contractNumber ?? contract.id} (${contract.vendorName ?? ""}) expires in ${days} day${days !== 1 ? "s" : ""}`);
    } else if (days > 30 && days <= 60) {
      emit("contract_expiry_60", "Contracts", "Warning", contract.id, ref,
        `Vendor contract ${contract.contractNumber ?? contract.id} (${contract.vendorName ?? ""}) expires in ${days} days`);
    }
  }

  // ── Rule 13: Portfolio occupancy below threshold ──────────────────────────
  const totalUnits = allUnitIds.size;
  if (totalUnits > 0) {
    const occupancyPct = Math.round((activeUnitIds.size / totalUnits) * 100);
    if (occupancyPct < OCCUPANCY_THRESHOLD) {
      emit(
        "occupancy_below_threshold", "Portfolio", "Warning",
        `${workspaceId}::occupancy`,
        `${workspaceId}`,
        `Portfolio occupancy is ${occupancyPct}% — below the ${OCCUPANCY_THRESHOLD}% threshold (${activeUnitIds.size}/${totalUnits} units occupied)`
      );
    }
  }

  // Persist new alerts
  if (newAlerts.length > 0) {
    await adapter.putMany("alerts", newAlerts);
  }

  // Return all active alerts for this workspace
  const allActive = [
    ...existingAlerts.filter((a) => a.workspaceId === workspaceId && a.status === "Active"),
    ...newAlerts,
  ];

  // Sort: Critical first, then Warning, then Info; newest first within each
  const severityOrder: Record<string, number> = { Critical: 0, Warning: 1, Info: 2 };
  return allActive.sort((a, b) =>
    severityOrder[a.severity] - severityOrder[b.severity] ||
    b.createdAt.localeCompare(a.createdAt)
  );
}

// ── Dismiss / Resolve ─────────────────────────────────────────────────────────
export async function dismissAlert(adapter: StorageAdapter, alertId: string, note?: string): Promise<void> {
  const alert = await adapter.get<Alert>("alerts", alertId);
  if (!alert) return;
  await adapter.put("alerts", {
    ...alert,
    status: "Dismissed",
    dismissedAt: new Date().toISOString(),
    dismissedNote: note,
  });
}

export async function resolveAlert(adapter: StorageAdapter, alertId: string): Promise<void> {
  const alert = await adapter.get<Alert>("alerts", alertId);
  if (!alert) return;
  await adapter.put("alerts", { ...alert, status: "Resolved", dismissedAt: new Date().toISOString() });
}

export async function getActiveAlerts(adapter: StorageAdapter, workspaceId: string): Promise<Alert[]> {
  const all = await adapter.getAll<Alert>("alerts");
  const active = all.filter((a) => a.workspaceId === workspaceId && a.status === "Active");
  const severityOrder: Record<string, number> = { Critical: 0, Warning: 1, Info: 2 };
  return active.sort((a, b) =>
    severityOrder[a.severity] - severityOrder[b.severity] ||
    b.createdAt.localeCompare(a.createdAt)
  );
}
