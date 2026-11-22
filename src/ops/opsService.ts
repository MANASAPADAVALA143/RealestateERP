import type { StorageAdapter } from "../integrations/service/storage.ts";
import type {
  MaintRequest, WorkOrder, PmSchedule, PmCompletion,
  FacilityAsset, Vendor, VendorContract,
  PurchaseRequisition, Quotation, PurchaseOrder, GoodsReceipt,
  OpsCost, AuditStamp,
} from "./types.ts";

function today(): string {
  return new Date().toISOString().slice(0, 10);
}

function now(): string {
  return new Date().toISOString();
}

function uid(): string {
  return crypto.randomUUID();
}

function stamp(by: string): AuditStamp {
  const t = now();
  return { createdBy: by, createdAt: t, updatedAt: t };
}

function touch(s: AuditStamp): AuditStamp {
  return { ...s, updatedAt: now() };
}

export class OpsService {
  constructor(
    private readonly db: StorageAdapter,
    private readonly workspaceId: string,
    private readonly currentUser = "system",
  ) {}

  // ─── Maintenance Requests ─────────────────────────────────────────────────

  async listRequests(): Promise<MaintRequest[]> {
    return this.db.getByIndex<MaintRequest>("ops_requests", "workspaceId", this.workspaceId);
  }

  async getRequest(id: string): Promise<MaintRequest | undefined> {
    return this.db.get<MaintRequest>("ops_requests", id);
  }

  async createRequest(data: Omit<MaintRequest, "id" | "workspaceId" | "number" | "audit">): Promise<MaintRequest> {
    const existing = await this.listRequests();
    const number = `MR-${String(existing.length + 1).padStart(4, "0")}`;
    const record: MaintRequest = {
      ...data,
      id: uid(),
      workspaceId: this.workspaceId,
      number,
      audit: stamp(this.currentUser),
    };
    await this.db.put("ops_requests", record);
    return record;
  }

  async updateRequest(id: string, patch: Partial<MaintRequest>): Promise<MaintRequest> {
    const existing = await this.getRequest(id);
    if (!existing) throw new Error(`Request ${id} not found`);
    const updated: MaintRequest = { ...existing, ...patch, id, workspaceId: this.workspaceId, audit: touch(existing.audit) };
    await this.db.put("ops_requests", updated);
    return updated;
  }

  async deleteRequest(id: string): Promise<void> {
    await this.db.delete("ops_requests", id);
  }

  // ─── Work Orders ─────────────────────────────────────────────────────────

  async listWorkOrders(): Promise<WorkOrder[]> {
    return this.db.getByIndex<WorkOrder>("ops_work_orders", "workspaceId", this.workspaceId);
  }

  async getWorkOrder(id: string): Promise<WorkOrder | undefined> {
    return this.db.get<WorkOrder>("ops_work_orders", id);
  }

  async createWorkOrder(data: Omit<WorkOrder, "id" | "workspaceId" | "number" | "audit">): Promise<WorkOrder> {
    const existing = await this.listWorkOrders();
    const number = `WO-${String(existing.length + 1).padStart(4, "0")}`;
    const record: WorkOrder = {
      ...data,
      id: uid(),
      workspaceId: this.workspaceId,
      number,
      audit: stamp(this.currentUser),
    };
    await this.db.put("ops_work_orders", record);
    return record;
  }

  async updateWorkOrder(id: string, patch: Partial<WorkOrder>): Promise<WorkOrder> {
    const existing = await this.getWorkOrder(id);
    if (!existing) throw new Error(`Work order ${id} not found`);
    const updated: WorkOrder = { ...existing, ...patch, id, workspaceId: this.workspaceId, audit: touch(existing.audit) };
    await this.db.put("ops_work_orders", updated);
    return updated;
  }

  // ─── PM Schedules ─────────────────────────────────────────────────────────

  async listPmSchedules(): Promise<PmSchedule[]> {
    return this.db.getByIndex<PmSchedule>("ops_pm_schedules", "workspaceId", this.workspaceId);
  }

  async createPmSchedule(data: Omit<PmSchedule, "id" | "workspaceId" | "audit">): Promise<PmSchedule> {
    const record: PmSchedule = { ...data, id: uid(), workspaceId: this.workspaceId, audit: stamp(this.currentUser) };
    await this.db.put("ops_pm_schedules", record);
    return record;
  }

  async updatePmSchedule(id: string, patch: Partial<PmSchedule>): Promise<PmSchedule> {
    const existing = await this.db.get<PmSchedule>("ops_pm_schedules", id);
    if (!existing) throw new Error(`PM schedule ${id} not found`);
    const updated: PmSchedule = { ...existing, ...patch, id, workspaceId: this.workspaceId, audit: touch(existing.audit) };
    await this.db.put("ops_pm_schedules", updated);
    return updated;
  }

  async completePmSchedule(scheduleId: string, actualCost: number, notes?: string): Promise<PmCompletion> {
    const completion: PmCompletion = {
      id: uid(),
      workspaceId: this.workspaceId,
      scheduleId,
      completedDate: today(),
      completedBy: this.currentUser,
      actualCost,
      notes,
      createdAt: now(),
    };
    await this.db.put("ops_pm_completions", completion);
    // Advance next due date on the schedule
    const schedule = await this.db.get<PmSchedule>("ops_pm_schedules", scheduleId);
    if (schedule) {
      const advance = { Monthly: 1, Quarterly: 3, "Half-Yearly": 6, Annual: 12 }[schedule.frequency] ?? 3;
      const next = new Date(today());
      next.setMonth(next.getMonth() + advance);
      await this.db.put("ops_pm_schedules", { ...schedule, lastDone: today(), nextDue: next.toISOString().slice(0, 10), audit: touch(schedule.audit) });
    }
    return completion;
  }

  async listPmCompletions(scheduleId?: string): Promise<PmCompletion[]> {
    const all = await this.db.getByIndex<PmCompletion>("ops_pm_completions", "workspaceId", this.workspaceId);
    return scheduleId ? all.filter((c) => c.scheduleId === scheduleId) : all;
  }

  // ─── Assets ───────────────────────────────────────────────────────────────

  async listAssets(): Promise<FacilityAsset[]> {
    return this.db.getByIndex<FacilityAsset>("ops_assets", "workspaceId", this.workspaceId);
  }

  async getAsset(id: string): Promise<FacilityAsset | undefined> {
    return this.db.get<FacilityAsset>("ops_assets", id);
  }

  async createAsset(data: Omit<FacilityAsset, "id" | "workspaceId" | "assetCode" | "audit">): Promise<FacilityAsset> {
    const existing = await this.listAssets();
    const assetCode = `AST-${String(existing.length + 1).padStart(4, "0")}`;
    const record: FacilityAsset = { ...data, id: uid(), workspaceId: this.workspaceId, assetCode, audit: stamp(this.currentUser) };
    await this.db.put("ops_assets", record);
    return record;
  }

  async updateAsset(id: string, patch: Partial<FacilityAsset>): Promise<FacilityAsset> {
    const existing = await this.getAsset(id);
    if (!existing) throw new Error(`Asset ${id} not found`);
    const updated: FacilityAsset = { ...existing, ...patch, id, workspaceId: this.workspaceId, audit: touch(existing.audit) };
    await this.db.put("ops_assets", updated);
    return updated;
  }

  // ─── Vendors ──────────────────────────────────────────────────────────────

  async listVendors(): Promise<Vendor[]> {
    return this.db.getByIndex<Vendor>("ops_vendors", "workspaceId", this.workspaceId);
  }

  async getVendor(id: string): Promise<Vendor | undefined> {
    return this.db.get<Vendor>("ops_vendors", id);
  }

  async createVendor(data: Omit<Vendor, "id" | "workspaceId" | "vendorCode" | "audit">): Promise<Vendor> {
    const existing = await this.listVendors();
    const vendorCode = `VND-${String(existing.length + 1).padStart(4, "0")}`;
    const record: Vendor = { ...data, id: uid(), workspaceId: this.workspaceId, vendorCode, audit: stamp(this.currentUser) };
    await this.db.put("ops_vendors", record);
    return record;
  }

  async updateVendor(id: string, patch: Partial<Vendor>): Promise<Vendor> {
    const existing = await this.getVendor(id);
    if (!existing) throw new Error(`Vendor ${id} not found`);
    const updated: Vendor = { ...existing, ...patch, id, workspaceId: this.workspaceId, audit: touch(existing.audit) };
    await this.db.put("ops_vendors", updated);
    return updated;
  }

  // ─── Contracts ────────────────────────────────────────────────────────────

  async listContracts(): Promise<VendorContract[]> {
    return this.db.getByIndex<VendorContract>("ops_contracts", "workspaceId", this.workspaceId);
  }

  async createContract(data: Omit<VendorContract, "id" | "workspaceId" | "contractNumber" | "audit">): Promise<VendorContract> {
    const existing = await this.listContracts();
    const contractNumber = `CON-${String(existing.length + 1).padStart(4, "0")}`;
    const record: VendorContract = { ...data, id: uid(), workspaceId: this.workspaceId, contractNumber, audit: stamp(this.currentUser) };
    await this.db.put("ops_contracts", record);
    return record;
  }

  async updateContract(id: string, patch: Partial<VendorContract>): Promise<VendorContract> {
    const existing = await this.db.get<VendorContract>("ops_contracts", id);
    if (!existing) throw new Error(`Contract ${id} not found`);
    const updated: VendorContract = { ...existing, ...patch, id, workspaceId: this.workspaceId, audit: touch(existing.audit) };
    await this.db.put("ops_contracts", updated);
    return updated;
  }

  // ─── Purchase Requisitions ────────────────────────────────────────────────

  async listRequisitions(): Promise<PurchaseRequisition[]> {
    return this.db.getByIndex<PurchaseRequisition>("ops_requisitions", "workspaceId", this.workspaceId);
  }

  async createRequisition(data: Omit<PurchaseRequisition, "id" | "workspaceId" | "prNumber" | "audit">): Promise<PurchaseRequisition> {
    const existing = await this.listRequisitions();
    const prNumber = `PR-${String(existing.length + 1).padStart(4, "0")}`;
    const record: PurchaseRequisition = { ...data, id: uid(), workspaceId: this.workspaceId, prNumber, audit: stamp(this.currentUser) };
    await this.db.put("ops_requisitions", record);
    return record;
  }

  async updateRequisition(id: string, patch: Partial<PurchaseRequisition>): Promise<PurchaseRequisition> {
    const existing = await this.db.get<PurchaseRequisition>("ops_requisitions", id);
    if (!existing) throw new Error(`Requisition ${id} not found`);
    const updated: PurchaseRequisition = { ...existing, ...patch, id, workspaceId: this.workspaceId, audit: touch(existing.audit) };
    await this.db.put("ops_requisitions", updated);
    return updated;
  }

  // ─── Quotations ───────────────────────────────────────────────────────────

  async listQuotations(prId?: string): Promise<Quotation[]> {
    const all = await this.db.getByIndex<Quotation>("ops_quotations", "workspaceId", this.workspaceId);
    return prId ? all.filter((q) => q.prId === prId) : all;
  }

  async createQuotation(data: Omit<Quotation, "id" | "workspaceId" | "quotationNumber" | "audit">): Promise<Quotation> {
    const existing = await this.listQuotations();
    const quotationNumber = `QT-${String(existing.length + 1).padStart(4, "0")}`;
    const record: Quotation = { ...data, id: uid(), workspaceId: this.workspaceId, quotationNumber, audit: stamp(this.currentUser) };
    await this.db.put("ops_quotations", record);
    return record;
  }

  async updateQuotation(id: string, patch: Partial<Quotation>): Promise<Quotation> {
    const existing = await this.db.get<Quotation>("ops_quotations", id);
    if (!existing) throw new Error(`Quotation ${id} not found`);
    const updated: Quotation = { ...existing, ...patch, id, workspaceId: this.workspaceId, audit: touch(existing.audit) };
    await this.db.put("ops_quotations", updated);
    return updated;
  }

  // ─── Purchase Orders ──────────────────────────────────────────────────────

  async listPurchaseOrders(): Promise<PurchaseOrder[]> {
    return this.db.getByIndex<PurchaseOrder>("ops_purchase_orders", "workspaceId", this.workspaceId);
  }

  async getPurchaseOrder(id: string): Promise<PurchaseOrder | undefined> {
    return this.db.get<PurchaseOrder>("ops_purchase_orders", id);
  }

  async createPurchaseOrder(data: Omit<PurchaseOrder, "id" | "workspaceId" | "poNumber" | "audit">): Promise<PurchaseOrder> {
    const existing = await this.listPurchaseOrders();
    const poNumber = `PO-${String(existing.length + 1).padStart(4, "0")}`;
    const record: PurchaseOrder = { ...data, id: uid(), workspaceId: this.workspaceId, poNumber, audit: stamp(this.currentUser) };
    await this.db.put("ops_purchase_orders", record);
    return record;
  }

  async updatePurchaseOrder(id: string, patch: Partial<PurchaseOrder>): Promise<PurchaseOrder> {
    const existing = await this.getPurchaseOrder(id);
    if (!existing) throw new Error(`PO ${id} not found`);
    const updated: PurchaseOrder = { ...existing, ...patch, id, workspaceId: this.workspaceId, audit: touch(existing.audit) };
    await this.db.put("ops_purchase_orders", updated);
    return updated;
  }

  // ─── Goods Receipts ───────────────────────────────────────────────────────

  async listGoodsReceipts(poId?: string): Promise<GoodsReceipt[]> {
    const all = await this.db.getByIndex<GoodsReceipt>("ops_grn", "workspaceId", this.workspaceId);
    return poId ? all.filter((g) => g.poId === poId) : all;
  }

  async createGoodsReceipt(data: Omit<GoodsReceipt, "id" | "workspaceId" | "grnNumber" | "audit">): Promise<GoodsReceipt> {
    const existing = await this.listGoodsReceipts();
    const grnNumber = `GRN-${String(existing.length + 1).padStart(4, "0")}`;
    const record: GoodsReceipt = { ...data, id: uid(), workspaceId: this.workspaceId, grnNumber, audit: stamp(this.currentUser) };
    await this.db.put("ops_grn", record);
    // Update PO received quantities
    const po = await this.getPurchaseOrder(data.poId);
    if (po) {
      const updatedItems = po.items.map((item) => {
        const received = data.items.find((gi) => gi.poItemId === item.id);
        return received ? { ...item, receivedQty: item.receivedQty + received.receivedQty } : item;
      });
      const allReceived = updatedItems.every((item) => item.receivedQty >= item.quantity);
      const anyReceived = updatedItems.some((item) => item.receivedQty > 0);
      await this.updatePurchaseOrder(po.id, {
        items: updatedItems,
        status: allReceived ? "Fully Received" : anyReceived ? "Partially Received" : po.status,
      });
    }
    return record;
  }

  // ─── Ops Costs ────────────────────────────────────────────────────────────

  async listCosts(propertyId?: string): Promise<OpsCost[]> {
    const all = await this.db.getByIndex<OpsCost>("ops_costs", "workspaceId", this.workspaceId);
    return propertyId ? all.filter((c) => c.propertyId === propertyId) : all;
  }

  async recordCost(data: Omit<OpsCost, "id" | "workspaceId" | "createdAt">): Promise<OpsCost> {
    const record: OpsCost = { ...data, id: uid(), workspaceId: this.workspaceId, createdAt: now() };
    await this.db.put("ops_costs", record);
    return record;
  }

  // ─── Dashboard summary ────────────────────────────────────────────────────

  async getDashboardSummary() {
    const [requests, workOrders, vendors, pos, pmSchedules] = await Promise.all([
      this.listRequests(),
      this.listWorkOrders(),
      this.listVendors(),
      this.listPurchaseOrders(),
      this.listPmSchedules(),
    ]);

    const openRequests = requests.filter((r) => !["Closed", "Cancelled", "Rejected"].includes(r.status));
    const overdueRequests = requests.filter(
      (r) => r.slaDeadline && r.slaDeadline < today() && !["Closed", "Cancelled", "Completed", "Verified"].includes(r.status),
    );
    const activeWOs = workOrders.filter((w) => !["Closed", "Cancelled"].includes(w.status));
    const activeVendors = vendors.filter((v) => v.status === "Active");
    const pendingPOs = pos.filter((p) => ["Draft", "Approved"].includes(p.status));
    const pmDueSoon = pmSchedules.filter((s) => s.status === "Active" && s.nextDue <= today());

    return { openRequests, overdueRequests, activeWOs, activeVendors, pendingPOs, pmDueSoon };
  }
}

let _service: OpsService | null = null;

export function getOpsService(db: StorageAdapter, workspaceId = "meridian-ventures"): OpsService {
  if (!_service) _service = new OpsService(db, workspaceId);
  return _service;
}
