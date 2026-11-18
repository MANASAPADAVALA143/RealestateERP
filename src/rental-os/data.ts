// Rental OS — demo data for 3 entities, 5 properties, 10 buildings, 200 units
import type {
  RosBuilding,
  RosLease,
  RosMaintenanceRequest,
  RosProperty,
  RosTenant,
  RosUnit,
  RosVendor,
} from "./types";

// ─── Helpers ────────────────────────────────────────────────────────────────
export function inrCr(val: number) {
  return `₹${(val / 1e7).toFixed(2)} Cr`;
}
export function inrL(val: number) {
  return `₹${(val / 1e5).toFixed(1)} L`;
}
export function inrK(val: number) {
  return `₹${(val / 1000).toFixed(0)}K`;
}

// ─── Properties ─────────────────────────────────────────────────────────────
export const properties: RosProperty[] = [
  {
    id: "PROP-001",
    code: "PROP-001",
    name: "Greenview Residences",
    category: "Residential",
    type: "Apartment Complex",
    entityId: "GNV-RE",
    entityName: "Gnanova Real Estate Pvt Ltd",
    address: "Plot 42, Banjara Hills",
    city: "Hyderabad",
    state: "Telangana",
    country: "India",
    pinCode: "500034",
    acquisitionDate: "2019-04-15",
    acquisitionCost: 85_000_000,
    currentValuation: 130_000_000,
    landAreaSqft: 42000,
    builtUpAreaSqft: 110000,
    totalUnits: 80,
    totalBuildings: 2,
    propertyManager: "Ravi Kumar",
    status: "Active",
    currency: "INR",
    createdAt: "2019-04-15T10:00:00Z",
    updatedAt: "2026-10-01T08:00:00Z",
  },
  {
    id: "PROP-002",
    code: "PROP-002",
    name: "Skyline Commercial Tower",
    category: "Commercial",
    type: "Office Building",
    entityId: "GNV-RE",
    entityName: "Gnanova Real Estate Pvt Ltd",
    address: "Road No. 1, HITEC City",
    city: "Hyderabad",
    state: "Telangana",
    country: "India",
    pinCode: "500081",
    acquisitionDate: "2020-01-10",
    acquisitionCost: 220_000_000,
    currentValuation: 310_000_000,
    landAreaSqft: 18000,
    builtUpAreaSqft: 95000,
    totalUnits: 48,
    totalBuildings: 1,
    propertyManager: "Priya Reddy",
    status: "Active",
    currency: "INR",
    createdAt: "2020-01-10T10:00:00Z",
    updatedAt: "2026-10-01T08:00:00Z",
  },
  {
    id: "PROP-003",
    code: "PROP-003",
    name: "Sunset Villas",
    category: "Residential",
    type: "Villa Complex",
    entityId: "GNV-PROP",
    entityName: "Gnanova Properties LLP",
    address: "Survey No. 112, Gachibowli",
    city: "Hyderabad",
    state: "Telangana",
    country: "India",
    pinCode: "500032",
    acquisitionDate: "2021-07-20",
    acquisitionCost: 180_000_000,
    currentValuation: 240_000_000,
    landAreaSqft: 65000,
    builtUpAreaSqft: 48000,
    totalUnits: 24,
    totalBuildings: 4,
    propertyManager: "Suresh Nair",
    status: "Active",
    currency: "INR",
    createdAt: "2021-07-20T10:00:00Z",
    updatedAt: "2026-10-01T08:00:00Z",
  },
  {
    id: "PROP-004",
    code: "PROP-004",
    name: "Metro Retail Plaza",
    category: "Retail",
    type: "Shopping Center",
    entityId: "GNV-PROP",
    entityName: "Gnanova Properties LLP",
    address: "Main Road, Kukatpally",
    city: "Hyderabad",
    state: "Telangana",
    country: "India",
    pinCode: "500072",
    acquisitionDate: "2022-03-05",
    acquisitionCost: 95_000_000,
    currentValuation: 115_000_000,
    landAreaSqft: 22000,
    builtUpAreaSqft: 38000,
    totalUnits: 32,
    totalBuildings: 1,
    propertyManager: "Anita Sharma",
    status: "Active",
    currency: "INR",
    createdAt: "2022-03-05T10:00:00Z",
    updatedAt: "2026-10-01T08:00:00Z",
  },
  {
    id: "PROP-005",
    code: "PROP-005",
    name: "Industrial Logistics Hub",
    category: "Industrial",
    type: "Warehouse Complex",
    entityId: "GNV-INFRA",
    entityName: "Gnanova Infrastructure Ltd",
    address: "IDA Bollaram, Medak Road",
    city: "Hyderabad",
    state: "Telangana",
    country: "India",
    pinCode: "502325",
    acquisitionDate: "2023-01-12",
    acquisitionCost: 60_000_000,
    currentValuation: 72_000_000,
    landAreaSqft: 120000,
    builtUpAreaSqft: 75000,
    totalUnits: 16,
    totalBuildings: 3,
    propertyManager: "Kiran Babu",
    status: "Active",
    currency: "INR",
    createdAt: "2023-01-12T10:00:00Z",
    updatedAt: "2026-10-01T08:00:00Z",
  },
];

// ─── Buildings ───────────────────────────────────────────────────────────────
export const buildings: RosBuilding[] = [
  // Greenview Residences
  { id: "BLD-001", propertyId: "PROP-001", code: "BLD-A", name: "Tower A", floors: 10, totalUnits: 40, yearBuilt: 2020, status: "Active", createdAt: "2020-01-01T00:00:00Z" },
  { id: "BLD-002", propertyId: "PROP-001", code: "BLD-B", name: "Tower B", floors: 10, totalUnits: 40, yearBuilt: 2020, status: "Active", createdAt: "2020-01-01T00:00:00Z" },
  // Skyline Commercial Tower
  { id: "BLD-003", propertyId: "PROP-002", code: "BLD-C", name: "Main Tower", floors: 15, totalUnits: 48, yearBuilt: 2021, status: "Active", createdAt: "2021-01-01T00:00:00Z" },
  // Sunset Villas
  { id: "BLD-004", propertyId: "PROP-003", code: "VILLA-A", name: "Villa Block A", floors: 2, totalUnits: 6, yearBuilt: 2022, status: "Active", createdAt: "2022-01-01T00:00:00Z" },
  { id: "BLD-005", propertyId: "PROP-003", code: "VILLA-B", name: "Villa Block B", floors: 2, totalUnits: 6, yearBuilt: 2022, status: "Active", createdAt: "2022-01-01T00:00:00Z" },
  { id: "BLD-006", propertyId: "PROP-003", code: "VILLA-C", name: "Villa Block C", floors: 2, totalUnits: 6, yearBuilt: 2022, status: "Active", createdAt: "2022-01-01T00:00:00Z" },
  { id: "BLD-007", propertyId: "PROP-003", code: "VILLA-D", name: "Villa Block D", floors: 2, totalUnits: 6, yearBuilt: 2022, status: "Active", createdAt: "2022-01-01T00:00:00Z" },
  // Metro Retail Plaza
  { id: "BLD-008", propertyId: "PROP-004", code: "RETAIL-G", name: "Ground + First Floor", floors: 2, totalUnits: 32, yearBuilt: 2023, status: "Active", createdAt: "2023-01-01T00:00:00Z" },
  // Industrial Logistics Hub
  { id: "BLD-009", propertyId: "PROP-005", code: "WH-1", name: "Warehouse 1", floors: 1, totalUnits: 6, yearBuilt: 2023, status: "Active", createdAt: "2023-01-01T00:00:00Z" },
  { id: "BLD-010", propertyId: "PROP-005", code: "WH-2", name: "Warehouse 2", floors: 1, totalUnits: 6, yearBuilt: 2023, status: "Active", createdAt: "2023-01-01T00:00:00Z" },
  { id: "BLD-011", propertyId: "PROP-005", code: "WH-3", name: "Warehouse 3", floors: 1, totalUnits: 4, yearBuilt: 2024, status: "Active", createdAt: "2024-01-01T00:00:00Z" },
];

// ─── Generate units for PROP-001 (Tower A & B) ───────────────────────────────
function makeResidentialUnits(bldId: string, propId: string, floors: number, unitsPerFloor: number, startNum: number): RosUnit[] {
  const units: RosUnit[] = [];
  const types = ["2BHK", "2BHK", "3BHK", "1BHK"] as const;
  const rents = [28000, 28000, 42000, 18000];
  for (let f = 1; f <= floors; f++) {
    for (let u = 0; u < unitsPerFloor; u++) {
      const num = startNum++;
      const occupied = Math.random() > 0.15;
      units.push({
        id: `UNIT-${String(num).padStart(4, "0")}`,
        propertyId: propId,
        buildingId: bldId,
        unitNumber: `${f}0${u + 1}`,
        floor: f,
        type: types[u % types.length],
        areaSqft: [1150, 1150, 1600, 750][u % 4],
        bedrooms: [2, 2, 3, 1][u % 4],
        bathrooms: [2, 2, 3, 1][u % 4],
        marketRent: rents[u % 4],
        currentRent: occupied ? rents[u % 4] : 0,
        status: occupied ? "Occupied" : "Available",
        tenantId: occupied ? `TNT-${String(num).padStart(4, "0")}` : undefined,
        tenantName: occupied ? `Tenant ${num}` : undefined,
        currency: "INR",
        createdAt: "2020-06-01T00:00:00Z",
        updatedAt: "2026-10-01T00:00:00Z",
      });
    }
  }
  return units;
}

function makeCommercialUnits(bldId: string, propId: string): RosUnit[] {
  const units: RosUnit[] = [];
  for (let f = 1; f <= 15; f++) {
    for (let u = 1; u <= 3; u++) {
      const num = (f - 1) * 3 + u + 200;
      const occupied = Math.random() > 0.2;
      units.push({
        id: `UNIT-${String(num).padStart(4, "0")}`,
        propertyId: propId,
        buildingId: bldId,
        unitNumber: `${f}F-${String(u).padStart(2, "0")}`,
        floor: f,
        type: "Office",
        areaSqft: [2200, 1800, 3500][u - 1],
        bedrooms: 0,
        bathrooms: 2,
        marketRent: [110000, 90000, 175000][u - 1],
        currentRent: occupied ? [110000, 90000, 175000][u - 1] : 0,
        status: occupied ? "Occupied" : "Available",
        tenantId: occupied ? `TNT-${String(num).padStart(4, "0")}` : undefined,
        tenantName: occupied ? `Corp Tenant ${num}` : undefined,
        currency: "INR",
        createdAt: "2021-03-01T00:00:00Z",
        updatedAt: "2026-10-01T00:00:00Z",
      });
    }
  }
  return units;
}

function makeRetailUnits(): RosUnit[] {
  const units: RosUnit[] = [];
  for (let u = 1; u <= 32; u++) {
    const floor = u <= 16 ? 0 : 1;
    const occupied = Math.random() > 0.25;
    units.push({
      id: `UNIT-${String(u + 300).padStart(4, "0")}`,
      propertyId: "PROP-004",
      buildingId: "BLD-008",
      unitNumber: `${floor === 0 ? "G" : "F1"}-${String(u).padStart(2, "0")}`,
      floor,
      type: "Retail",
      areaSqft: 400 + Math.floor(Math.random() * 600),
      bedrooms: 0,
      bathrooms: 1,
      marketRent: 45000 + Math.floor(Math.random() * 25000),
      currentRent: occupied ? 45000 + Math.floor(Math.random() * 25000) : 0,
      status: occupied ? "Occupied" : "Available",
      tenantId: occupied ? `TNT-${String(u + 300).padStart(4, "0")}` : undefined,
      tenantName: occupied ? `Retailer ${u}` : undefined,
      currency: "INR",
      createdAt: "2023-04-01T00:00:00Z",
      updatedAt: "2026-10-01T00:00:00Z",
    });
  }
  return units;
}

function makeWarehouseUnits(): RosUnit[] {
  const blds = ["BLD-009", "BLD-010", "BLD-011"];
  const counts = [6, 6, 4];
  const units: RosUnit[] = [];
  let num = 400;
  blds.forEach((bld, bi) => {
    for (let u = 1; u <= counts[bi]; u++) {
      num++;
      const occupied = Math.random() > 0.3;
      units.push({
        id: `UNIT-${String(num).padStart(4, "0")}`,
        propertyId: "PROP-005",
        buildingId: bld,
        unitNumber: `WH-${String(u).padStart(2, "0")}`,
        floor: 0,
        type: "Warehouse",
        areaSqft: 5000 + Math.floor(Math.random() * 5000),
        bedrooms: 0,
        bathrooms: 2,
        marketRent: 85000 + Math.floor(Math.random() * 65000),
        currentRent: occupied ? 85000 + Math.floor(Math.random() * 65000) : 0,
        status: occupied ? "Occupied" : "Available",
        tenantId: occupied ? `TNT-${String(num).padStart(4, "0")}` : undefined,
        tenantName: occupied ? `Logistics Co ${num}` : undefined,
        currency: "INR",
        createdAt: "2023-06-01T00:00:00Z",
        updatedAt: "2026-10-01T00:00:00Z",
      });
    }
  });
  return units;
}

export const units: RosUnit[] = [
  ...makeResidentialUnits("BLD-001", "PROP-001", 10, 4, 1),
  ...makeResidentialUnits("BLD-002", "PROP-001", 10, 4, 41),
  ...makeCommercialUnits("BLD-003", "PROP-002"),
  ...makeRetailUnits(),
  ...makeWarehouseUnits(),
  // Villas (PROP-003) — 24 units across 4 blocks
  ...[1, 2, 3, 4, 5, 6].map((u) => ({
    id: `UNIT-V${String(u).padStart(2, "0")}A`,
    propertyId: "PROP-003",
    buildingId: "BLD-004",
    unitNumber: `VA-${String(u).padStart(2, "0")}`,
    floor: u <= 3 ? 0 : 1,
    type: "Villa" as const,
    areaSqft: 2800,
    bedrooms: 4,
    bathrooms: 4,
    marketRent: 95000,
    currentRent: u <= 5 ? 95000 : 0,
    status: (u <= 5 ? "Occupied" : "Available") as "Occupied" | "Available",
    tenantId: u <= 5 ? `TNT-V${u}A` : undefined,
    tenantName: u <= 5 ? `Villa Tenant A${u}` : undefined,
    currency: "INR",
    createdAt: "2022-04-01T00:00:00Z",
    updatedAt: "2026-10-01T00:00:00Z",
  })),
];

// ─── Computed KPIs ───────────────────────────────────────────────────────────
export function computeKpis(propertyId?: string) {
  const filtered = propertyId ? units.filter((u) => u.propertyId === propertyId) : units;
  const totalUnits = filtered.length;
  const occupied = filtered.filter((u) => u.status === "Occupied").length;
  const vacant = filtered.filter((u) => u.status === "Available").length;
  const underMaint = filtered.filter((u) => u.status === "Under Maintenance").length;
  const monthlyPotential = filtered.reduce((s, u) => s + u.marketRent, 0);
  const monthlyBilled = filtered.reduce((s, u) => s + u.currentRent, 0);
  const occupancyPct = totalUnits > 0 ? (occupied / totalUnits) * 100 : 0;
  const vacancyLoss = monthlyPotential - monthlyBilled;
  return { totalUnits, occupied, vacant, underMaint, monthlyPotential, monthlyBilled, occupancyPct, vacancyLoss };
}

// ─── Tenants (sample) ─────────────────────────────────────────────────────────
export const tenants: RosTenant[] = [
  { id: "TNT-ROS-001", code: "TNT-001", type: "Individual", name: "Arjun Mehta", entityId: "GNV-RE", contactPerson: "Arjun Mehta", email: "arjun.mehta@email.com", phone: "9876543210", idType: "Aadhaar", idNumber: "XXXX-XXXX-1234", nationality: "Indian", address: "Flat 101, Tower A, Greenview", status: "Active", createdAt: "2024-01-15T00:00:00Z", updatedAt: "2026-10-01T00:00:00Z" },
  { id: "TNT-ROS-002", code: "TNT-002", type: "Corporate", name: "Infosys BPM Ltd", entityId: "GNV-RE", contactPerson: "Rajesh Kumar", email: "leases@infosysbpm.com", phone: "9876500001", idType: "Company Registration", idNumber: "U72200KA1991PLC013234", nationality: "Indian", address: "Skyline Tower, Floor 3", status: "Active", createdAt: "2024-02-01T00:00:00Z", updatedAt: "2026-10-01T00:00:00Z" },
  { id: "TNT-ROS-003", code: "TNT-003", type: "Individual", name: "Priya Nair", entityId: "GNV-PROP", contactPerson: "Priya Nair", email: "priya.nair@email.com", phone: "9876543220", idType: "PAN", idNumber: "ABCPN1234F", nationality: "Indian", address: "Villa A-02, Sunset Villas", status: "Active", createdAt: "2024-03-10T00:00:00Z", updatedAt: "2026-10-01T00:00:00Z" },
  { id: "TNT-ROS-004", code: "TNT-004", type: "Corporate", name: "Zara Retail India Pvt Ltd", entityId: "GNV-PROP", contactPerson: "Meena Kapoor", email: "leases@zara-india.com", phone: "9876500002", idType: "Company Registration", idNumber: "U52100MH2010PTC200456", nationality: "Indian", address: "Metro Retail Plaza, G-05", status: "Active", createdAt: "2024-04-01T00:00:00Z", updatedAt: "2026-10-01T00:00:00Z" },
  { id: "TNT-ROS-005", code: "TNT-005", type: "Corporate", name: "BlueDart Express Ltd", entityId: "GNV-INFRA", contactPerson: "Sunil Rao", email: "leases@bluedart.com", phone: "9876500003", idType: "Company Registration", idNumber: "L62100GJ1983PLC006542", nationality: "Indian", address: "Industrial Logistics Hub, WH-01", status: "Active", createdAt: "2024-05-15T00:00:00Z", updatedAt: "2026-10-01T00:00:00Z" },
];

// ─── Leases (sample) ─────────────────────────────────────────────────────────
export const leases: RosLease[] = [
  { id: "LSE-ROS-001", code: "LSE-001", tenantId: "TNT-ROS-001", tenantName: "Arjun Mehta", propertyId: "PROP-001", propertyName: "Greenview Residences", buildingId: "BLD-001", unitId: "UNIT-0001", unitNumber: "101", startDate: "2024-01-15", endDate: "2026-01-14", monthlyRent: 28000, securityDeposit: 56000, camCharges: 0, parkingCharges: 2000, utilitiesDeposit: 5000, escalationPct: 5, noticePeriodDays: 60, status: "Active", currency: "INR", rentFreePeriodDays: 0, createdAt: "2024-01-10T00:00:00Z", updatedAt: "2026-10-01T00:00:00Z" },
  { id: "LSE-ROS-002", code: "LSE-002", tenantId: "TNT-ROS-002", tenantName: "Infosys BPM Ltd", propertyId: "PROP-002", propertyName: "Skyline Commercial Tower", buildingId: "BLD-003", unitId: "UNIT-0203", unitNumber: "3F-01", startDate: "2024-02-01", endDate: "2027-01-31", monthlyRent: 110000, securityDeposit: 330000, camCharges: 15000, parkingCharges: 10000, utilitiesDeposit: 25000, escalationPct: 5, noticePeriodDays: 90, status: "Active", currency: "INR", rentFreePeriodDays: 30, createdAt: "2024-01-25T00:00:00Z", updatedAt: "2026-10-01T00:00:00Z" },
  { id: "LSE-ROS-003", code: "LSE-003", tenantId: "TNT-ROS-003", tenantName: "Priya Nair", propertyId: "PROP-003", propertyName: "Sunset Villas", buildingId: "BLD-004", unitId: "UNIT-V02A", unitNumber: "VA-02", startDate: "2024-03-10", endDate: "2027-03-09", monthlyRent: 95000, securityDeposit: 285000, camCharges: 5000, parkingCharges: 0, utilitiesDeposit: 10000, escalationPct: 5, noticePeriodDays: 90, status: "Active", currency: "INR", rentFreePeriodDays: 0, createdAt: "2024-03-05T00:00:00Z", updatedAt: "2026-10-01T00:00:00Z" },
  { id: "LSE-ROS-004", code: "LSE-004", tenantId: "TNT-ROS-004", tenantName: "Zara Retail India Pvt Ltd", propertyId: "PROP-004", propertyName: "Metro Retail Plaza", buildingId: "BLD-008", unitId: "UNIT-0305", unitNumber: "G-05", startDate: "2024-04-01", endDate: "2029-03-31", monthlyRent: 65000, securityDeposit: 390000, camCharges: 8000, parkingCharges: 5000, utilitiesDeposit: 15000, escalationPct: 5, noticePeriodDays: 120, status: "Active", currency: "INR", rentFreePeriodDays: 60, createdAt: "2024-03-28T00:00:00Z", updatedAt: "2026-10-01T00:00:00Z" },
  { id: "LSE-ROS-005", code: "LSE-005", tenantId: "TNT-ROS-005", tenantName: "BlueDart Express Ltd", propertyId: "PROP-005", propertyName: "Industrial Logistics Hub", buildingId: "BLD-009", unitId: "UNIT-0401", unitNumber: "WH-01", startDate: "2024-05-15", endDate: "2027-05-14", monthlyRent: 120000, securityDeposit: 360000, camCharges: 10000, parkingCharges: 0, utilitiesDeposit: 20000, escalationPct: 3, noticePeriodDays: 90, status: "Active", currency: "INR", rentFreePeriodDays: 0, createdAt: "2024-05-10T00:00:00Z", updatedAt: "2026-10-01T00:00:00Z" },
  { id: "LSE-ROS-006", code: "LSE-006", tenantId: "TNT-ROS-001", tenantName: "Arjun Mehta", propertyId: "PROP-001", propertyName: "Greenview Residences", buildingId: "BLD-001", unitId: "UNIT-0002", unitNumber: "102", startDate: "2022-01-15", endDate: "2024-01-14", monthlyRent: 25000, securityDeposit: 50000, camCharges: 0, parkingCharges: 2000, utilitiesDeposit: 5000, escalationPct: 5, noticePeriodDays: 60, status: "Expired", currency: "INR", rentFreePeriodDays: 0, createdAt: "2022-01-10T00:00:00Z", updatedAt: "2024-01-14T00:00:00Z" },
];

// ─── Maintenance requests ────────────────────────────────────────────────────
export const maintenanceRequests: RosMaintenanceRequest[] = [
  { id: "MNT-001", code: "MNT-001", propertyId: "PROP-001", propertyName: "Greenview Residences", buildingId: "BLD-001", unitId: "UNIT-0001", unitNumber: "101", tenantId: "TNT-ROS-001", tenantName: "Arjun Mehta", title: "AC not cooling properly", description: "The split AC in bedroom 1 is not cooling. Temperature stays at 28°C even at max settings.", category: "HVAC", priority: "High", status: "In Progress", assignedVendorId: "VND-001", assignedVendorName: "Cooltech Services", estimatedCost: 3500, reportedDate: "2026-10-20", scheduledDate: "2026-10-22", createdAt: "2026-10-20T10:00:00Z", updatedAt: "2026-10-21T12:00:00Z" },
  { id: "MNT-002", code: "MNT-002", propertyId: "PROP-002", propertyName: "Skyline Commercial Tower", buildingId: "BLD-003", unitId: "UNIT-0203", unitNumber: "3F-01", tenantId: "TNT-ROS-002", tenantName: "Infosys BPM Ltd", title: "Leaking ceiling in conference room", description: "Water dripping from ceiling near window during heavy rain. Floor is slippery — safety risk.", category: "Civil", priority: "Emergency", status: "Open", estimatedCost: 25000, reportedDate: "2026-10-19", createdAt: "2026-10-19T09:00:00Z", updatedAt: "2026-10-19T09:00:00Z" },
  { id: "MNT-003", code: "MNT-003", propertyId: "PROP-003", propertyName: "Sunset Villas", buildingId: "BLD-004", unitId: "UNIT-V02A", unitNumber: "VA-02", tenantId: "TNT-ROS-003", tenantName: "Priya Nair", title: "Swimming pool pump repair", description: "Main circulation pump making loud noise and water is not filtering properly.", category: "Plumbing", priority: "Medium", status: "Pending Parts", assignedVendorId: "VND-002", assignedVendorName: "AquaFix Solutions", estimatedCost: 12000, reportedDate: "2026-10-15", scheduledDate: "2026-10-25", createdAt: "2026-10-15T11:00:00Z", updatedAt: "2026-10-20T16:00:00Z" },
  { id: "MNT-004", code: "MNT-004", propertyId: "PROP-004", propertyName: "Metro Retail Plaza", buildingId: "BLD-008", unitId: "UNIT-0305", unitNumber: "G-05", tenantId: "TNT-ROS-004", tenantName: "Zara Retail India Pvt Ltd", title: "Electrical short in display area", description: "Circuit breaker tripping repeatedly in the main display area. Needs immediate inspection.", category: "Electrical", priority: "Emergency", status: "Open", reportedDate: "2026-10-21", createdAt: "2026-10-21T08:00:00Z", updatedAt: "2026-10-21T08:00:00Z" },
  { id: "MNT-005", code: "MNT-005", propertyId: "PROP-001", propertyName: "Greenview Residences", buildingId: "BLD-002", title: "Common area painting — Tower B", description: "Annual maintenance painting of corridors and stairwells in Tower B.", category: "Painting", priority: "Low", status: "Open", estimatedCost: 45000, reportedDate: "2026-10-18", createdAt: "2026-10-18T14:00:00Z", updatedAt: "2026-10-18T14:00:00Z" },
];

// ─── Vendors ─────────────────────────────────────────────────────────────────
export const vendors: RosVendor[] = [
  { id: "VND-001", code: "VND-001", name: "Cooltech Services Pvt Ltd", category: "HVAC", contactPerson: "Ramesh Rao", phone: "9876500010", email: "service@cooltech.com", address: "Ameerpet, Hyderabad", gstNumber: "36AACCC1234A1Z5", rating: 4, status: "Active", createdAt: "2022-01-01T00:00:00Z" },
  { id: "VND-002", code: "VND-002", name: "AquaFix Solutions", category: "Plumbing", contactPerson: "Deepak Nair", phone: "9876500011", email: "info@aquafix.in", address: "Jubilee Hills, Hyderabad", rating: 4, status: "Active", createdAt: "2022-03-01T00:00:00Z" },
  { id: "VND-003", code: "VND-003", name: "Bright Spark Electricals", category: "Electrical", contactPerson: "Vinay Kumar", phone: "9876500012", email: "work@brightspark.com", address: "Secunderabad", gstNumber: "36AABCB5678B1Z3", rating: 5, status: "Active", createdAt: "2021-06-01T00:00:00Z" },
  { id: "VND-004", code: "VND-004", name: "Buildcare Civil Works", category: "Civil", contactPerson: "Srinivas Murthy", phone: "9876500013", email: "projects@buildcare.in", address: "Miyapur, Hyderabad", gstNumber: "36AADCB9012C1Z1", rating: 3, status: "Active", createdAt: "2022-08-01T00:00:00Z" },
  { id: "VND-005", code: "VND-005", name: "ColourPro Painters", category: "Painting", contactPerson: "Anil Sharma", phone: "9876500014", email: "colourpro@gmail.com", address: "Kukatpally, Hyderabad", rating: 4, status: "Active", createdAt: "2023-02-01T00:00:00Z" },
];
