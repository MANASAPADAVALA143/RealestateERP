export type AlertModule = "AR" | "Leasing" | "Finance" | "Ops" | "Contracts" | "Portfolio";
export type AlertSeverity = "Critical" | "Warning" | "Info";
export type AlertStatus = "Active" | "Dismissed" | "Resolved";

export type AlertRuleId =
  | "overdue_ar_invoice"
  | "lease_expiry_30"
  | "lease_expiry_60"
  | "lease_expiry_90"
  | "rent_escalation_due"
  | "vacant_unit"
  | "overdue_ap_invoice"
  | "unposted_journal"
  | "work_order_sla"
  | "pm_overdue"
  | "contract_expiry_30"
  | "contract_expiry_60"
  | "occupancy_below_threshold";

export interface Alert {
  id: string;
  workspaceId: string;
  module: AlertModule;
  severity: AlertSeverity;
  ruleId: AlertRuleId;
  entityId: string;
  entityRef: string;
  message: string;
  createdAt: string;
  status: AlertStatus;
  dismissedAt?: string;
  dismissedNote?: string;
}

export interface AlertRuleDefinition {
  id: AlertRuleId;
  module: AlertModule;
  severity: AlertSeverity;
  description: string;
}

export const ALERT_RULES: AlertRuleDefinition[] = [
  { id: "overdue_ar_invoice",        module: "AR",        severity: "Critical", description: "AR invoice past due date with outstanding balance" },
  { id: "lease_expiry_30",           module: "Leasing",   severity: "Critical", description: "Active lease expiring within 30 days" },
  { id: "lease_expiry_60",           module: "Leasing",   severity: "Warning",  description: "Active lease expiring within 31–60 days" },
  { id: "lease_expiry_90",           module: "Leasing",   severity: "Info",     description: "Active lease expiring within 61–90 days" },
  { id: "rent_escalation_due",       module: "Leasing",   severity: "Warning",  description: "Rent escalation anniversary due within 30 days" },
  { id: "vacant_unit",               module: "Leasing",   severity: "Info",     description: "Unit with no active lease" },
  { id: "overdue_ap_invoice",        module: "Finance",   severity: "Critical", description: "Vendor invoice past due date with outstanding balance" },
  { id: "unposted_journal",          module: "Finance",   severity: "Warning",  description: "Journal entry in Draft for more than 3 days" },
  { id: "work_order_sla",            module: "Ops",       severity: "Warning",  description: "Work order open for more than 7 days" },
  { id: "pm_overdue",                module: "Ops",       severity: "Warning",  description: "Preventive maintenance schedule past due date" },
  { id: "contract_expiry_30",        module: "Contracts", severity: "Critical", description: "Active vendor contract expiring within 30 days" },
  { id: "contract_expiry_60",        module: "Contracts", severity: "Warning",  description: "Active vendor contract expiring within 31–60 days" },
  { id: "occupancy_below_threshold", module: "Portfolio", severity: "Warning",  description: "Portfolio occupancy rate below 80%" },
];
