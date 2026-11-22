// Phase 5 — Maintenance, Facilities, Vendors & Procurement
// All monetary values in INR unless otherwise noted.

export type OpsId = string;

// ─── Shared ──────────────────────────────────────────────────────────────────

export type ApprovalStatus = "Pending" | "Approved" | "Rejected" | "Cancelled";
export type Priority = "Emergency" | "High" | "Medium" | "Low";

export interface AuditStamp {
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

export interface ApprovalRecord {
  requestedBy: string;
  requestedAt: string;
  approvedBy?: string;
  approvedAt?: string;
  rejectedBy?: string;
  rejectedAt?: string;
  reason?: string;
  note?: string;
}

// ─── Maintenance Requests ────────────────────────────────────────────────────

export type MaintCategory =
  | "Electrical" | "Plumbing" | "HVAC" | "Civil" | "Painting"
  | "Carpentry" | "Lift" | "Fire & Safety" | "Water Supply" | "General";

export type MaintStatus =
  | "New" | "Classified" | "Assigned" | "Inspection" | "Estimate"
  | "Approval" | "Work Order" | "In Progress" | "Completed"
  | "Verified" | "Closed" | "Rejected" | "Cancelled";

export type MaintSource = "Tenant" | "Property Manager" | "Facility Manager" | "Internal" | "Scheduled";

export interface MaintRequest {
  id: OpsId;
  workspaceId: string;
  number: string;
  source: MaintSource;
  propertyId: string;
  propertyName: string;
  buildingId?: string;
  unitId?: string;
  unitNumber?: string;
  tenantId?: string;
  tenantName?: string;
  title: string;
  description: string;
  category: MaintCategory;
  priority: Priority;
  status: MaintStatus;
  department?: string;
  assignedTechnician?: string;
  assignedVendorId?: string;
  slaDays?: number;
  slaDeadline?: string;
  estimatedCost?: number;
  approvedBudget?: number;
  actualCost?: number;
  reportedDate: string;
  scheduledDate?: string;
  completedDate?: string;
  verifiedDate?: string;
  closedDate?: string;
  workOrderId?: string;
  rejectionReason?: string;
  notes?: string;
  approval?: ApprovalRecord;
  audit: AuditStamp;
}

// ─── Work Orders ─────────────────────────────────────────────────────────────

export type WorkOrderStatus =
  | "Draft" | "Approved" | "Assigned" | "In Progress"
  | "Completed" | "Verified" | "Closed" | "Cancelled";

export interface WorkOrder {
  id: OpsId;
  workspaceId: string;
  number: string;
  requestId?: string;
  propertyId: string;
  propertyName: string;
  buildingId?: string;
  unitId?: string;
  unitNumber?: string;
  category: MaintCategory;
  scopeOfWork: string;
  vendorId?: string;
  vendorName?: string;
  technicianName?: string;
  labourCost: number;
  materialCost: number;
  estimatedCost: number;
  approvedBudget?: number;
  actualCost: number;
  startDate?: string;
  expectedCompletion?: string;
  actualCompletion?: string;
  completionNotes?: string;
  status: WorkOrderStatus;
  approval?: ApprovalRecord;
  audit: AuditStamp;
}

// ─── Preventive Maintenance ───────────────────────────────────────────────────

export type PmFrequency = "Monthly" | "Quarterly" | "Half-Yearly" | "Annual";
export type PmStatus = "Active" | "Inactive";

export interface PmSchedule {
  id: OpsId;
  workspaceId: string;
  name: string;
  category: MaintCategory;
  propertyId: string;
  propertyName: string;
  assetId?: string;
  assetName?: string;
  vendorId?: string;
  vendorName?: string;
  frequency: PmFrequency;
  lastDone?: string;
  nextDue: string;
  estimatedCost: number;
  status: PmStatus;
  notes?: string;
  audit: AuditStamp;
}

export interface PmCompletion {
  id: OpsId;
  workspaceId: string;
  scheduleId: string;
  completedDate: string;
  completedBy: string;
  actualCost: number;
  notes?: string;
  workOrderId?: string;
  createdAt: string;
}

// ─── Facility Assets ─────────────────────────────────────────────────────────

export type AssetCategory =
  | "HVAC" | "Elevator" | "Generator" | "Pump" | "Electrical"
  | "Fire Safety" | "Water System" | "Security" | "Common Area";

export type AssetCondition = "Excellent" | "Good" | "Fair" | "Poor" | "Decommissioned";
export type AssetStatus = "Active" | "Under Maintenance" | "Offline" | "Decommissioned";

export interface FacilityAsset {
  id: OpsId;
  workspaceId: string;
  assetCode: string;
  name: string;
  category: AssetCategory;
  propertyId: string;
  propertyName: string;
  buildingId?: string;
  location: string;
  manufacturer?: string;
  model?: string;
  serialNumber?: string;
  purchaseDate?: string;
  acquisitionCost?: number;
  warrantyExpiry?: string;
  usefulLifeYears?: number;
  maintenanceFrequency?: PmFrequency;
  vendorId?: string;
  vendorName?: string;
  condition: AssetCondition;
  status: AssetStatus;
  notes?: string;
  audit: AuditStamp;
}

// ─── Vendors ─────────────────────────────────────────────────────────────────

export type VendorCategory =
  | "Plumbing" | "Electrical" | "HVAC" | "Civil" | "Cleaning"
  | "Security" | "Lift Maintenance" | "General Supplies" | "Facility Management";

export type VendorStatus = "Draft" | "Active" | "Inactive" | "Blacklisted" | "Suspended";

export interface Vendor {
  id: OpsId;
  workspaceId: string;
  vendorCode: string;
  companyName: string;
  registrationNumber?: string;
  taxId?: string;
  country: string;
  categories: VendorCategory[];
  contactPerson: string;
  phone: string;
  email: string;
  address: string;
  bankName?: string;
  bankAccount?: string;
  ifscCode?: string;
  paymentTermsDays: number;
  insuranceExpiry?: string;
  certifications?: string;
  contractRef?: string;
  rating?: 1 | 2 | 3 | 4 | 5;
  status: VendorStatus;
  notes?: string;
  approval?: ApprovalRecord;
  audit: AuditStamp;
}

// ─── Vendor Contracts ─────────────────────────────────────────────────────────

export type ContractStatus = "Draft" | "Active" | "Expired" | "Terminated" | "Renewed";

export interface VendorContract {
  id: OpsId;
  workspaceId: string;
  contractNumber: string;
  vendorId: string;
  vendorName: string;
  propertyId?: string;
  propertyName?: string;
  serviceCategory: VendorCategory;
  startDate: string;
  endDate: string;
  contractValue: number;
  paymentTerms: string;
  sla: string;
  scopeOfService: string;
  renewalTerms?: string;
  status: ContractStatus;
  notes?: string;
  audit: AuditStamp;
}

// ─── Procurement ─────────────────────────────────────────────────────────────

export type PrStatus = "Draft" | "Submitted" | "Approved" | "Rejected" | "Cancelled" | "PO Raised";

export interface PurchaseRequisition {
  id: OpsId;
  workspaceId: string;
  prNumber: string;
  propertyId?: string;
  propertyName?: string;
  department: string;
  requester: string;
  items: PrItem[];
  estimatedTotal: number;
  requiredDate: string;
  justification: string;
  budgetRef?: string;
  workOrderId?: string;
  requestId?: string;
  status: PrStatus;
  approval?: ApprovalRecord;
  audit: AuditStamp;
}

export interface PrItem {
  id: string;
  description: string;
  quantity: number;
  unit: string;
  estimatedRate: number;
  estimatedAmount: number;
}

export type QuotationStatus = "Draft" | "Submitted" | "Compared" | "Selected" | "Rejected";

export interface Quotation {
  id: OpsId;
  workspaceId: string;
  quotationNumber: string;
  prId: string;
  vendorId: string;
  vendorName: string;
  items: QuoteItem[];
  totalAmount: number;
  deliveryDays: number;
  validityDays: number;
  paymentTerms: string;
  technicalScore?: number;
  selected: boolean;
  status: QuotationStatus;
  notes?: string;
  audit: AuditStamp;
}

export interface QuoteItem {
  id: string;
  description: string;
  quantity: number;
  unit: string;
  rate: number;
  amount: number;
}

export type PoStatus = "Draft" | "Approved" | "Issued" | "Partially Received" | "Fully Received" | "Cancelled";

export interface PurchaseOrder {
  id: OpsId;
  workspaceId: string;
  poNumber: string;
  prId?: string;
  quotationId?: string;
  vendorId: string;
  vendorName: string;
  propertyId?: string;
  propertyName?: string;
  items: PoItem[];
  subtotal: number;
  taxAmount: number;
  totalAmount: number;
  deliveryTerms: string;
  paymentTerms: string;
  deliveryDate?: string;
  status: PoStatus;
  approval?: ApprovalRecord;
  audit: AuditStamp;
}

export interface PoItem {
  id: string;
  description: string;
  quantity: number;
  unit: string;
  rate: number;
  taxPct: number;
  amount: number;
  receivedQty: number;
}

export type GrnStatus = "Draft" | "Partial" | "Complete" | "Rejected";

export interface GoodsReceipt {
  id: OpsId;
  workspaceId: string;
  grnNumber: string;
  poId: string;
  poNumber: string;
  vendorId: string;
  vendorName: string;
  receiptDate: string;
  items: GrnItem[];
  totalReceived: number;
  status: GrnStatus;
  notes?: string;
  audit: AuditStamp;
}

export interface GrnItem {
  id: string;
  poItemId: string;
  description: string;
  orderedQty: number;
  receivedQty: number;
  rejectedQty: number;
  unit: string;
  rate: number;
  amount: number;
}

// ─── Operational Costs ───────────────────────────────────────────────────────

export type CostType =
  | "Maintenance" | "Materials" | "Labour" | "Contractor" | "Cleaning"
  | "Security" | "Utilities" | "Preventive Maintenance" | "Other";

export interface OpsCost {
  id: OpsId;
  workspaceId: string;
  propertyId: string;
  propertyName: string;
  buildingId?: string;
  costType: CostType;
  description: string;
  amount: number;
  date: string;
  vendorId?: string;
  workOrderId?: string;
  poId?: string;
  requestId?: string;
  createdBy: string;
  createdAt: string;
}

// ─── Store names ─────────────────────────────────────────────────────────────

export type OpsStoreName =
  | "ops_requests" | "ops_work_orders" | "ops_pm_schedules" | "ops_pm_completions"
  | "ops_assets" | "ops_vendors" | "ops_contracts"
  | "ops_requisitions" | "ops_quotations" | "ops_purchase_orders" | "ops_grn"
  | "ops_costs";

export const OPS_STORES: OpsStoreName[] = [
  "ops_requests", "ops_work_orders", "ops_pm_schedules", "ops_pm_completions",
  "ops_assets", "ops_vendors", "ops_contracts",
  "ops_requisitions", "ops_quotations", "ops_purchase_orders", "ops_grn",
  "ops_costs",
];
