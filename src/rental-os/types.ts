// Rental OS — core data types
// All monetary values are in the entity's functional currency unless noted.

export type PropertyCategory = "Residential" | "Commercial" | "Industrial" | "Mixed Use" | "Retail" | "Hospitality";
export type PropertyStatus = "Active" | "Under Development" | "Inactive" | "Disposed";
export type UnitStatus = "Available" | "Reserved" | "Occupied" | "Vacant" | "Under Maintenance" | "Offline";
export type UnitType = "Studio" | "1BHK" | "2BHK" | "3BHK" | "4BHK" | "Villa" | "Office" | "Retail" | "Warehouse" | "Other";
export type TenantStatus = "Active" | "Inactive" | "Blacklisted";
export type LeaseStatus = "Draft" | "Active" | "Expired" | "Terminated" | "Renewed";
export type MaintenanceStatus = "Open" | "In Progress" | "Pending Parts" | "Completed" | "Cancelled";
export type MaintenancePriority = "Emergency" | "High" | "Medium" | "Low";
export type MaintenanceCategory = "Electrical" | "Plumbing" | "Civil" | "HVAC" | "Painting" | "Carpentry" | "Cleaning" | "Other";

export interface RosProperty {
  id: string;
  code: string;
  name: string;
  category: PropertyCategory;
  type: string;
  entityId: string;
  entityName: string;
  address: string;
  city: string;
  state: string;
  country: string;
  pinCode: string;
  acquisitionDate: string;
  acquisitionCost: number;
  currentValuation: number;
  landAreaSqft: number;
  builtUpAreaSqft: number;
  totalUnits: number;
  totalBuildings: number;
  propertyManager: string;
  status: PropertyStatus;
  currency: string;
  createdAt: string;
  updatedAt: string;
}

export interface RosBuilding {
  id: string;
  propertyId: string;
  code: string;
  name: string;
  floors: number;
  totalUnits: number;
  yearBuilt?: number;
  status: "Active" | "Inactive";
  createdAt: string;
}

export interface RosUnit {
  id: string;
  propertyId: string;
  buildingId: string;
  unitNumber: string;
  floor: number;
  type: UnitType;
  areaSqft: number;
  bedrooms: number;
  bathrooms: number;
  marketRent: number;
  currentRent: number;
  status: UnitStatus;
  tenantId?: string;
  tenantName?: string;
  leaseId?: string;
  leaseEnd?: string;
  currency: string;
  lastMaintenanceDate?: string;
  createdAt: string;
  updatedAt: string;
}

export interface RosTenant {
  id: string;
  code: string;
  type: "Individual" | "Corporate";
  name: string;
  entityId: string;
  contactPerson: string;
  email: string;
  phone: string;
  alternatPhone?: string;
  idType: "Aadhaar" | "PAN" | "Passport" | "Emirates ID" | "Company Registration" | "Other";
  idNumber: string;
  nationality: string;
  address: string;
  emergencyContact?: string;
  emergencyPhone?: string;
  status: TenantStatus;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface RosLease {
  id: string;
  code: string;
  tenantId: string;
  tenantName: string;
  propertyId: string;
  propertyName: string;
  buildingId: string;
  unitId: string;
  unitNumber: string;
  startDate: string;
  endDate: string;
  monthlyRent: number;
  securityDeposit: number;
  camCharges: number;
  parkingCharges: number;
  utilitiesDeposit: number;
  escalationPct: number;
  noticePeriodDays: number;
  status: LeaseStatus;
  currency: string;
  rentFreePeriodDays: number;
  createdAt: string;
  updatedAt: string;
}

export interface RosMaintenanceRequest {
  id: string;
  code: string;
  propertyId: string;
  propertyName: string;
  buildingId?: string;
  unitId?: string;
  unitNumber?: string;
  tenantId?: string;
  tenantName?: string;
  title: string;
  description: string;
  category: MaintenanceCategory;
  priority: MaintenancePriority;
  status: MaintenanceStatus;
  assignedVendorId?: string;
  assignedVendorName?: string;
  estimatedCost?: number;
  actualCost?: number;
  reportedDate: string;
  scheduledDate?: string;
  completedDate?: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface RosVendor {
  id: string;
  code: string;
  name: string;
  category: MaintenanceCategory | "General";
  contactPerson: string;
  phone: string;
  email: string;
  address: string;
  gstNumber?: string;
  rating: 1 | 2 | 3 | 4 | 5;
  status: "Active" | "Inactive" | "Blacklisted";
  createdAt: string;
}
