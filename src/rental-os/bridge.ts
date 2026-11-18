/**
 * Rental OS ↔ AR Engine bridge.
 *
 * Converts RosLease + RosTenant demo/static data into live ArTenant + ArLease
 * records persisted in IndexedDB via ArService. Calling syncRosToAr() is
 * idempotent: it only creates records that don't yet exist (matched by code).
 *
 * STATUS: Production — connects real Rental OS lease data to the live AR engine.
 */

import type { ArTenant, ChargeSchedule } from "@/ar/engine/types";
import { ArService, SAMPLE } from "@/ar/service/arService";
import type { RosLease, RosTenant } from "./types";

/** Convert a RosTenant to an ArTenant input (without id/timestamps). */
function rosTenantToAr(
  t: RosTenant,
  workspaceId: string,
): Omit<ArTenant, "id" | "createdAt" | "updatedAt" | "source"> {
  return {
    workspaceId,
    code: t.code,
    name: t.name,
    entityId: t.entityId,
    propertyId: "", // set per lease below
    propertyName: "",
    building: "",
    unit: "",
    contactName: t.contactPerson,
    email: t.email,
    phone: t.phone,
    billingFrequency: "monthly",
    paymentTermsDays: 5,
    currency: "INR",
    collectionOwner: "CFO Office",
    status: t.status === "Active" ? "Active" : "Inactive",
  };
}

/** Convert a RosLease to ArLease charges array. */
function rosLeaseCharges(l: RosLease): ChargeSchedule[] {
  const charges: ChargeSchedule[] = [
    {
      id: `base_rent`,
      type: "base_rent",
      description: "Base rent",
      amount: l.monthlyRent,
      frequency: "monthly",
      escalationPct: l.escalationPct,
    },
  ];
  if (l.camCharges > 0) {
    charges.push({ id: "cam", type: "cam", description: "CAM charges", amount: l.camCharges, frequency: "monthly", escalationPct: 0 });
  }
  if (l.parkingCharges > 0) {
    charges.push({ id: "parking", type: "parking", description: "Parking", amount: l.parkingCharges, frequency: "monthly", escalationPct: 0 });
  }
  return charges;
}

export interface SyncResult {
  tenantsCreated: number;
  tenantsSkipped: number;
  leasesCreated: number;
  leasesSkipped: number;
  errors: string[];
}

/**
 * Sync Rental OS demo leases/tenants into the live AR engine.
 * Idempotent: existing records (matched by code) are not duplicated.
 */
export async function syncRosToAr(
  service: ArService,
  workspaceId: string,
  rosTenants: RosTenant[],
  rosLeases: RosLease[],
): Promise<SyncResult> {
  const result: SyncResult = { tenantsCreated: 0, tenantsSkipped: 0, leasesCreated: 0, leasesSkipped: 0, errors: [] };

  // Load existing AR records to check idempotency
  const book = await service.book(workspaceId);
  const existingTenantCodes = new Set(book.tenants.map((t) => t.code.toUpperCase()));
  const existingLeaseCodes = new Set(book.leases.map((l) => l.code.toUpperCase()));

  // Map RosTenant id → created ArTenant id
  const tenantIdMap = new Map<string, string>();

  // Build lookup from existing AR tenants by code
  for (const arT of book.tenants) {
    // Try to match to a RosTenant by code
    const ros = rosTenants.find((t) => t.code.toUpperCase() === arT.code.toUpperCase());
    if (ros) tenantIdMap.set(ros.id, arT.id);
  }

  // Create missing AR tenants for active leases only
  const activeLeaseTenantIds = new Set(
    rosLeases.filter((l) => l.status === "Active").map((l) => l.tenantId),
  );

  for (const rosTenant of rosTenants) {
    if (!activeLeaseTenantIds.has(rosTenant.id)) continue;
    if (existingTenantCodes.has(rosTenant.code.toUpperCase())) {
      result.tenantsSkipped++;
      continue;
    }
    // Find the first active lease for this tenant to get property/unit info
    const lease = rosLeases.find((l) => l.tenantId === rosTenant.id && l.status === "Active");
    if (!lease) { result.tenantsSkipped++; continue; }

    try {
      const input = rosTenantToAr(rosTenant, workspaceId);
      const arTenant = await service.saveTenant({
        ...input,
        propertyId: lease.propertyId,
        propertyName: lease.propertyName,
        building: lease.buildingId,
        unit: lease.unitNumber,
        source: SAMPLE,
      });
      tenantIdMap.set(rosTenant.id, arTenant.id);
      result.tenantsCreated++;
    } catch (e) {
      result.errors.push(`Tenant ${rosTenant.code}: ${e instanceof Error ? e.message : String(e)}`);
    }
  }

  // Create missing AR leases for active ROS leases
  for (const rosLease of rosLeases) {
    if (rosLease.status !== "Active") continue;
    if (existingLeaseCodes.has(rosLease.code.toUpperCase())) {
      result.leasesSkipped++;
      continue;
    }
    const arTenantId = tenantIdMap.get(rosLease.tenantId);
    if (!arTenantId) {
      result.errors.push(`Lease ${rosLease.code}: AR tenant not found for ROS tenant ${rosLease.tenantId}.`);
      continue;
    }
    const charges = rosLeaseCharges(rosLease);
    if (charges.length === 0 || charges[0].amount <= 0) {
      result.errors.push(`Lease ${rosLease.code}: no positive charges — skipped.`);
      continue;
    }
    try {
      await service.saveLease({
        workspaceId,
        code: rosLease.code,
        tenantId: arTenantId,
        entityId: rosLease.propertyId.startsWith("PROP") ? "GNV-RE" : "GNV-PROP",
        propertyId: rosLease.propertyId,
        propertyName: rosLease.propertyName,
        building: rosLease.buildingId,
        unit: rosLease.unitNumber,
        start: rosLease.startDate,
        end: rosLease.endDate,
        currency: rosLease.currency,
        charges,
        depositRequired: rosLease.securityDeposit,
        status: "Active",
        source: SAMPLE,
      });
      result.leasesCreated++;
    } catch (e) {
      result.errors.push(`Lease ${rosLease.code}: ${e instanceof Error ? e.message : String(e)}`);
    }
  }

  return result;
}
