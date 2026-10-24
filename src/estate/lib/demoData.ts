// ---- Shared demo data for EstateCFO ----

export type EntityBadge = 'Developer' | 'SPV' | 'Fund';

export interface Entity {
  id: string;
  name: string;
  badge: EntityBadge;
  balance: string;
}

export const entities: Entity[] = [
  { id: 'e1', name: 'Dubai Holdings', badge: 'Developer', balance: 'AED 4.68B' },
  { id: 'e2', name: 'Marina Heights LLC', badge: 'SPV', balance: 'AED 1.24B' },
  { id: 'e3', name: 'Palm View Residences', badge: 'SPV', balance: 'AED 987.3M' },
  { id: 'e4', name: 'Desert Oasis Fund I', badge: 'Fund', balance: 'AED 2.4B' },
];

export interface KpiItem {
  label: string;
  value: string;
  delta: string;
  positive: boolean;
  icon: 'building' | 'layers' | 'trending' | 'banknote';
}

export const commandCenterKpis: KpiItem[] = [
  { label: 'Land Value', value: 'AED 1.24B', delta: '8.6% vs Last Quarter', positive: true, icon: 'building' },
  { label: 'Total Assets', value: 'AED 4.68B', delta: '6.3% vs Last Quarter', positive: true, icon: 'layers' },
  { label: 'Net Income', value: 'AED 312.6M', delta: '12.4% vs Last Quarter', positive: false, icon: 'trending' },
  { label: 'Cash Position', value: 'AED 586.7M', delta: '3.1% vs Last Quarter', positive: true, icon: 'banknote' },
];

export type AuditStatus = 'Active' | 'Pending' | 'Overdue';

export interface AuditRow {
  area: string;
  status: AuditStatus;
  due: string;
  owner: string;
}

export const auditRows: AuditRow[] = [
  { area: 'Project Revenue Recognition', status: 'Active', due: '15 May 2024', owner: 'Finance Team' },
  { area: 'Escrow Account Reconciliation', status: 'Pending', due: '22 May 2024', owner: 'Accounts' },
  { area: 'Land Cost Reconciliation', status: 'Overdue', due: '10 May 2024', owner: 'Audit Team' },
  { area: 'IFRS 15 Disclosure Check', status: 'Active', due: '20 May 2024', owner: 'Finance Team' },
  { area: 'VAT Compliance Review', status: 'Pending', due: '25 May 2024', owner: 'Tax Team' },
];

export interface ProjectProfitRow {
  project: string;
  revenue: number;
  cost: number;
  grossProfit: number;
  margin: number;
}

export const projectProfitRows: ProjectProfitRow[] = [
  { project: 'Marina Heights Towers', revenue: 1_240_000_000, cost: 823_400_000, grossProfit: 416_600_000, margin: 33.6 },
  { project: 'Palm View Residences', revenue: 987_300_000, cost: 640_200_000, grossProfit: 347_100_000, margin: 35.2 },
  { project: 'Desert Oasis Villas', revenue: 752_600_000, cost: 512_800_000, grossProfit: 239_800_000, margin: 31.8 },
  { project: 'Skyline Commercial Hub', revenue: 640_100_000, cost: 445_300_000, grossProfit: 194_800_000, margin: 30.4 },
  { project: 'Downtown Retail Plaza', revenue: 512_700_000, cost: 381_900_000, grossProfit: 130_800_000, margin: 25.5 },
];

export interface CashFlowLine {
  label: string;
  amount: number;
  negative?: boolean;
}

export const cashFlowLines: CashFlowLine[] = [
  { label: 'Operating Cash Flow', amount: 374_200_000 },
  { label: 'Investing Cash Flow', amount: -152_600_000, negative: true },
  { label: 'Financing Cash Flow', amount: 365_100_000 },
];

export const netCashFlow = 586_700_000;

export interface AgingBucket {
  label: string;
  amount: number;
  color: string;
}

export const payablesAging: AgingBucket[] = [
  { label: '0–30 Days', amount: 98_600_000, color: '#0B1D33' },
  { label: '31–60 Days', amount: 62_400_000, color: '#4F46E5' },
  { label: '61–90 Days', amount: 45_200_000, color: '#C79A2B' },
  { label: '90+ Days', amount: 39_400_000, color: '#F59E0B' },
];

export const totalPayables = 245_600_000;

// ---- Fund Management ----

export interface Fund {
  id: string;
  name: string;
  aum: number;
  aumLabel: string;
  size: string;
  called: string;
  calledPct: string;
  distributions: string;
  irr: string;
  irrDelta: string;
  moic: string;
  moicTarget: string;
}

export const funds: Fund[] = [
  {
    id: 'f1',
    name: 'Desert Oasis Fund I',
    aum: 2_400_000_000,
    aumLabel: 'AED 2.4B',
    size: 'AED 2.4B',
    called: 'AED 1.86B',
    calledPct: '77.5% of committed',
    distributions: 'AED 312.4M',
    irr: '18.4%',
    irrDelta: '↑ 1.2% vs last quarter',
    moic: '1.68x',
    moicTarget: '2.0x',
  },
  {
    id: 'f2',
    name: 'Marina Heights SPV',
    aum: 1_240_000_000,
    aumLabel: 'AED 1.24B',
    size: 'AED 1.24B',
    called: 'AED 1.05B',
    calledPct: '84.7% of committed',
    distributions: 'AED 186.2M',
    irr: '16.1%',
    irrDelta: '↑ 0.8% vs last quarter',
    moic: '1.52x',
    moicTarget: '1.8x',
  },
  {
    id: 'f3',
    name: 'Palm View SPV',
    aum: 987_300_000,
    aumLabel: 'AED 987.3M',
    size: 'AED 987.3M',
    called: 'AED 720.5M',
    calledPct: '72.9% of committed',
    distributions: 'AED 94.8M',
    irr: '14.3%',
    irrDelta: '↓ 0.4% vs last quarter',
    moic: '1.34x',
    moicTarget: '1.6x',
  },
];

export interface FundOverviewCard {
  label: string;
  value: string;
  subtitle: string;
  delta?: string;
  positive?: boolean;
}

export const fundOverviewCards: FundOverviewCard[] = [
  { label: 'Fund Size', value: 'AED 2.4B', subtitle: 'Committed Capital' },
  { label: 'Called to Date', value: 'AED 1.86B', subtitle: '77.5% of committed' },
  { label: 'Distributions Paid', value: 'AED 312.4M', subtitle: 'Since inception' },
  { label: 'Fund IRR', value: '18.4%', subtitle: 'Net to LP (since inception)', delta: '↑ 1.2% vs last quarter', positive: true },
  { label: 'MOIC', value: '1.68x', subtitle: 'Multiple on invested capital · Target: 2.0x' },
];

export interface LpRow {
  name: string;
  type: string;
  commitment: string;
  called: string;
  uncalled: string;
  distributions: string;
  netIrr: string;
  status: 'Active' | 'GP';
  isGp?: boolean;
}

export const lpRows: LpRow[] = [
  { name: 'Abu Dhabi Investment Office', type: 'Institutional', commitment: '480.0M', called: '372.0M', uncalled: '108.0M', distributions: '68.4M', netIrr: '19.2%', status: 'Active' },
  { name: 'Emirates NBD Private Banking', type: 'Bank', commitment: '360.0M', called: '279.0M', uncalled: '81.0M', distributions: '48.6M', netIrr: '18.7%', status: 'Active' },
  { name: 'Mubadala Real Estate', type: 'Sovereign', commitment: '320.0M', called: '248.0M', uncalled: '72.0M', distributions: '43.2M', netIrr: '19.8%', status: 'Active' },
  { name: 'Al Habtoor Family Office', type: 'Family Office', commitment: '240.0M', called: '186.0M', uncalled: '54.0M', distributions: '28.8M', netIrr: '17.4%', status: 'Active' },
  { name: 'Gulf Capital Partners', type: 'PE Fund', commitment: '200.0M', called: '155.0M', uncalled: '45.0M', distributions: '22.4M', netIrr: '16.9%', status: 'Active' },
  { name: 'Majid Al Futtaim Ventures', type: 'Corporate', commitment: '180.0M', called: '139.5M', uncalled: '40.5M', distributions: '20.8M', netIrr: '17.1%', status: 'Active' },
  { name: 'Al Futtaim Family Office', type: 'Family Office', commitment: '160.0M', called: '124.0M', uncalled: '36.0M', distributions: '17.6M', netIrr: '16.4%', status: 'Active' },
  { name: 'Gnanova Capital (GP)', type: 'General Partner', commitment: '460.0M', called: '356.5M', uncalled: '103.5M', distributions: '62.6M', netIrr: '21.4%', status: 'GP', isGp: true },
];

export const lpTotals = {
  commitment: '2,400.0M',
  called: '1,860.0M',
  uncalled: '540.0M',
  distributions: '312.4M',
  netIrr: '18.4%',
};

export interface CapitalCall {
  callNum: string;
  date: string;
  amount: string;
  pct: string;
  purpose: string;
  status: 'Pending' | 'Funded';
  dueDate: string;
  upcoming?: boolean;
}

export const capitalCalls: CapitalCall[] = [
  { callNum: 'Call #6', date: '30 Jun 2024', amount: 'AED 180.0M', pct: '7.5%', purpose: 'Desert Oasis Phase 2 Construction', status: 'Pending', dueDate: '30 Jun 2024', upcoming: true },
  { callNum: 'Call #5', date: '15 Feb 2024', amount: 'AED 240.0M', pct: '10.0%', purpose: 'Skyline Commercial Hub — Foundation', status: 'Funded', dueDate: '15 Feb 2024' },
  { callNum: 'Call #4', date: '10 Oct 2023', amount: 'AED 300.0M', pct: '12.5%', purpose: 'Palm View Construction Draw', status: 'Funded', dueDate: '10 Oct 2023' },
  { callNum: 'Call #3', date: '20 Apr 2023', amount: 'AED 360.0M', pct: '15.0%', purpose: 'Marina Heights — MEP Works', status: 'Funded', dueDate: '20 Apr 2023' },
  { callNum: 'Call #2', date: '15 Nov 2022', amount: 'AED 480.0M', pct: '20.0%', purpose: 'Land Acquisition — All Projects', status: 'Funded', dueDate: '15 Nov 2022' },
  { callNum: 'Call #1', date: '01 Jun 2022', amount: 'AED 300.0M', pct: '12.5%', purpose: 'Fund Formation & Initial Costs', status: 'Funded', dueDate: '01 Jun 2022' },
];

export interface WaterfallStep {
  step: string;
  label: string;
  amount: string;
  description: string;
  status: 'reached' | 'in-progress' | 'not-reached';
}

export const waterfallSteps: WaterfallStep[] = [
  { step: 'Step 1', label: 'Return of Capital', amount: 'AED 1,860M', description: 'Return 100% of called capital to LPs', status: 'in-progress' },
  { step: 'Step 2', label: 'Preferred Return (Hurdle)', amount: 'AED 446.4M', description: '8% p.a. preferred return to LPs (cumulative, compounded)', status: 'not-reached' },
  { step: 'Step 3', label: 'GP Catch-up', amount: 'AED 113.1M', description: 'GP receives 20% of total profit until caught up', status: 'not-reached' },
  { step: 'Step 4', label: 'Carried Interest Split', amount: '80% LP / 20% GP', description: 'Remaining profit split 80% to LPs, 20% carried interest to GP', status: 'not-reached' },
];

export const waterfallSummary = [
  { label: 'Total Fund Value (projected)', value: 'AED 3.84B' },
  { label: 'Less: Called Capital', value: '(AED 1.86B)' },
  { label: 'Gross Profit', value: 'AED 1.98B' },
  { label: 'Less: Preferred Return', value: '(AED 446.4M)' },
  { label: 'GP Catch-up', value: '(AED 113.1M)' },
  { label: 'Remaining for 80/20 split', value: 'AED 1,420.5M' },
  { label: 'LP Share (80%)', value: 'AED 1,136.4M' },
  { label: 'GP Carry (20%)', value: 'AED 284.1M' },
];

export const waterfallTotals = [
  { label: 'Total LP Return', value: 'AED 3,442.4M' },
  { label: 'Net LP IRR', value: '18.4%' },
  { label: 'Net LP MOIC', value: '1.85x (projected to 2.0x at full exit)' },
];

export interface IrrTrendPoint {
  quarter: string;
  irr: number;
}

export const irrTrendData: IrrTrendPoint[] = [
  { quarter: 'Q3 2022', irr: 0 },
  { quarter: 'Q4 2022', irr: 4.2 },
  { quarter: 'Q1 2023', irr: 8.6 },
  { quarter: 'Q2 2023', irr: 11.3 },
  { quarter: 'Q3 2023', irr: 13.8 },
  { quarter: 'Q4 2023', irr: 15.4 },
  { quarter: 'Q1 2024', irr: 17.1 },
  { quarter: 'Q2 2024', irr: 18.4 },
];

export interface DistributionRow {
  distNum: string;
  date: string;
  amount: string;
  perUnit: string;
  type: string;
  status: 'Paid' | 'Scheduled';
  projected?: boolean;
}

export const distributionHistory: DistributionRow[] = [
  { distNum: 'Dist #3', date: '30 Mar 2024', amount: 'AED 124.8M', perUnit: '6.7% of commitment', type: 'Interim', status: 'Paid' },
  { distNum: 'Dist #2', date: '15 Sep 2023', amount: 'AED 112.4M', perUnit: '5.9%', type: 'Interim', status: 'Paid' },
  { distNum: 'Dist #1', date: '20 Mar 2023', amount: 'AED 75.2M', perUnit: '3.1%', type: 'Return of Capital', status: 'Paid' },
  { distNum: 'Next Distribution', date: 'Projected Q3 2024', amount: '~AED 148.0M', perUnit: '6.2%', type: 'Interim', status: 'Scheduled', projected: true },
];

export const reportChecklist = [
  'Fund performance summary',
  'Capital account statements per LP',
  'IRR and MOIC by LP',
  'Waterfall projection',
  'Project-level NAV breakdown',
  'Capital call notices',
  'Distribution notices',
];

export const previousReports = [
  { label: 'Q1 2024 Report', date: 'Generated 15 Apr 2024' },
  { label: 'Q4 2023 Report', date: 'Generated 18 Jan 2024' },
  { label: 'Q3 2023 Report', date: 'Generated 14 Oct 2023' },
  { label: 'Q2 2023 Report', date: 'Generated 16 Jul 2023' },
];

export interface LpDetailKpi {
  label: string;
  value: string;
  sub?: string;
}

export const lpDetailKpis: LpDetailKpi[] = [
  { label: 'Commitment', value: 'AED 480.0M' },
  { label: 'Called', value: 'AED 372.0M', sub: '77.5%' },
  { label: 'Distributions Received', value: 'AED 68.4M' },
  { label: 'Net IRR', value: '19.2%' },
];

export interface LpTransaction {
  date: string;
  transaction: string;
  amount: string;
  balance: string;
  pending?: boolean;
}

export const lpTransactions: LpTransaction[] = [
  { date: '01 Jun 2022', transaction: 'Capital Call #1', amount: '(60.0M)', balance: '60.0M' },
  { date: '15 Nov 2022', transaction: 'Capital Call #2', amount: '(96.0M)', balance: '156.0M' },
  { date: '20 Mar 2023', transaction: 'Distribution #1', amount: '15.0M', balance: '141.0M' },
  { date: '20 Apr 2023', transaction: 'Capital Call #3', amount: '(72.0M)', balance: '213.0M' },
  { date: '15 Sep 2023', transaction: 'Distribution #2', amount: '22.5M', balance: '190.5M' },
  { date: '10 Oct 2023', transaction: 'Capital Call #4', amount: '(60.0M)', balance: '250.5M' },
  { date: '30 Mar 2024', transaction: 'Distribution #3', amount: '25.0M', balance: '225.5M' },
  { date: '15 Feb 2024', transaction: 'Capital Call #5', amount: '(48.0M)', balance: '273.5M' },
  { date: '30 Jun 2024', transaction: 'Capital Call #6 (pending)', amount: '(36.0M)', balance: '309.5M', pending: true },
];

export const lpProjectedExit = [
  { label: 'Projected distributions at exit', value: 'AED 688.4M' },
  { label: 'Total return on AED 480M commitment', value: '43.4%' },
  { label: 'Net IRR', value: '19.2%' },
  { label: 'MOIC', value: '1.93x' },
];

// ---- IFRS Hub ----

export interface FundKpi {
  label: string;
  value: string;
}

export const ifrs15Kpis: FundKpi[] = [
  { label: 'Total Contract Value', value: 'AED 8.4B' },
  { label: 'Recognised YTD', value: 'AED 2.1B' },
  { label: 'Remaining POB', value: 'AED 6.3B' },
];

export interface Ifrs15Row {
  project: string;
  spas: number;
  pobPct: number;
  recognised: number;
  contractAsset: number;
}

export const ifrs15Rows: Ifrs15Row[] = [
  { project: 'Marina Heights Towers', spas: 184, pobPct: 28, recognised: 347_000_000, contractAsset: 893_000_000 },
  { project: 'Palm View Residences', spas: 142, pobPct: 22, recognised: 217_000_000, contractAsset: 770_300_000 },
  { project: 'Desert Oasis Villas', spas: 96, pobPct: 31, recognised: 233_000_000, contractAsset: 519_600_000 },
  { project: 'Skyline Commercial Hub', spas: 64, pobPct: 18, recognised: 115_200_000, contractAsset: 524_900_000 },
  { project: 'Downtown Retail Plaza', spas: 48, pobPct: 20, recognised: 102_500_000, contractAsset: 410_200_000 },
];

export const ifrs16Kpis: FundKpi[] = [
  { label: 'ROU Assets', value: 'AED 124.6M' },
  { label: 'Lease Liability', value: 'AED 118.3M' },
  { label: 'Next 12M Payments', value: 'AED 28.4M' },
];

export interface Ifrs16Row {
  ref: string;
  start: string;
  term: string;
  ibr: number;
  monthly: number;
  rouBalance: number;
}

export const ifrs16Rows: Ifrs16Row[] = [
  { ref: 'LSE-001', start: '01 Jan 2024', term: '36 mo', ibr: 4.5, monthly: 420_000, rouBalance: 14_200_000 },
  { ref: 'LSE-002', start: '15 Mar 2024', term: '24 mo', ibr: 4.2, monthly: 280_000, rouBalance: 6_400_000 },
  { ref: 'LSE-003', start: '01 Apr 2024', term: '60 mo', ibr: 4.8, monthly: 650_000, rouBalance: 36_800_000 },
  { ref: 'LSE-004', start: '01 Jun 2024', term: '48 mo', ibr: 4.6, monthly: 510_000, rouBalance: 23_600_000 },
  { ref: 'LSE-005', start: '15 Jul 2024', term: '12 mo', ibr: 4.3, monthly: 180_000, rouBalance: 2_100_000 },
];

// ---- Projects Module ----

export type ProjectStatus = 'On Schedule' | 'Delayed' | 'Critical' | 'Completed';
export type ProjectType = 'Residential' | 'Commercial' | 'Mixed Use';
export type MilestoneState = 'completed' | 'in-progress' | 'critical' | 'not-started';

export interface Milestone {
  label: string;
  state: MilestoneState;
  detail: string;
}

export interface CostBar {
  label: string;
  budget: number;
  actual: number;
  state: 'green' | 'gold' | 'red' | 'grey';
  note?: string;
}

export interface ProjectData {
  id: string;
  name: string;
  entity: string;
  type: ProjectType;
  location: string;
  status: ProjectStatus;
  statusBadge: string;
  badgeColor: 'green' | 'amber' | 'red';
  units: number;
  unitsSold: number;
  unitsSoldPct: number;
  value: number;
  handover: string;
  ifrsPct: number;
  ifrsRecognised: number;
  ifrsNote?: string;
  milestones: Milestone[];
  costBars?: CostBar[];
  costNote?: string;
  leakage: { text: string; level: 'none' | 'amber' | 'red' };
  featured?: boolean;
}

export const projects: ProjectData[] = [
  {
    id: 'p1',
    name: 'Marina Heights Towers',
    entity: 'Marina Heights LLC',
    type: 'Residential',
    location: 'Dubai Marina',
    status: 'On Schedule',
    statusBadge: 'On Schedule',
    badgeColor: 'green',
    units: 342,
    unitsSold: 287,
    unitsSoldPct: 83.9,
    value: 1_240_000_000,
    handover: 'Q4 2025',
    ifrsPct: 72,
    ifrsRecognised: 893_300_000,
    ifrsNote: '3 POBs satisfied',
    milestones: [
      { label: 'Foundation & Structure', state: 'completed', detail: 'Completed May 2023' },
      { label: 'MEP Rough-in', state: 'completed', detail: 'Completed Jan 2024' },
      { label: 'Finishing Works', state: 'in-progress', detail: '68% complete' },
      { label: 'Handover & Snagging', state: 'not-started', detail: 'Not started' },
    ],
    costBars: [
      { label: 'Civil Works', budget: 380_000_000, actual: 372_000_000, state: 'green' },
      { label: 'MEP', budget: 210_000_000, actual: 198_000_000, state: 'green' },
      { label: 'Finishing', budget: 180_000_000, actual: 165_000_000, state: 'gold' },
      { label: 'Contingency', budget: 50_000_000, actual: 12_000_000, state: 'grey' },
    ],
    leakage: { text: 'Revenue Leakage: None detected', level: 'none' },
    featured: true,
  },
  {
    id: 'p2',
    name: 'Palm View Residences',
    entity: 'Palm View Residences',
    type: 'Residential',
    location: 'Palm Jumeirah',
    status: 'Delayed',
    statusBadge: 'Delayed — 45 days',
    badgeColor: 'amber',
    units: 218,
    unitsSold: 164,
    unitsSoldPct: 75.2,
    value: 987_300_000,
    handover: 'Q2 2026 (was Q4 2025)',
    ifrsPct: 58,
    ifrsRecognised: 572_600_000,
    milestones: [
      { label: 'Foundation', state: 'completed', detail: 'Completed Aug 2023' },
      { label: 'Structure', state: 'completed', detail: 'Completed Mar 2024' },
      { label: 'MEP Rough-in', state: 'critical', detail: '45 days delayed' },
      { label: 'Finishing', state: 'not-started', detail: 'Not started' },
    ],
    costBars: [
      { label: 'Civil', budget: 290_000_000, actual: 285_000_000, state: 'green' },
      { label: 'MEP', budget: 160_000_000, actual: 145_000_000, state: 'red', note: 'AED 15M cost overrun on MEP — review pending' },
    ],
    leakage: { text: 'Revenue Leakage: AED 24.2M at risk', level: 'amber' },
  },
  {
    id: 'p3',
    name: 'Desert Oasis Villas',
    entity: 'Desert Oasis Fund I',
    type: 'Residential',
    location: 'Dubai Hills',
    status: 'On Schedule',
    statusBadge: 'On Schedule',
    badgeColor: 'green',
    units: 156,
    unitsSold: 98,
    unitsSoldPct: 62.8,
    value: 752_600_000,
    handover: 'Q1 2026',
    ifrsPct: 61,
    ifrsRecognised: 459_100_000,
    milestones: [
      { label: 'Foundation', state: 'completed', detail: 'Completed' },
      { label: 'Structure', state: 'in-progress', detail: '78% complete' },
      { label: 'MEP', state: 'not-started', detail: 'Not started' },
      { label: 'Finishing', state: 'not-started', detail: 'Not started' },
    ],
    leakage: { text: 'Revenue Leakage: None detected', level: 'none' },
  },
  {
    id: 'p4',
    name: 'Skyline Commercial Hub',
    entity: 'Dubai Holdings',
    type: 'Commercial',
    location: 'DIFC',
    status: 'Critical',
    statusBadge: 'Critical — Funding Gap',
    badgeColor: 'red',
    units: 48,
    unitsSold: 31,
    unitsSoldPct: 64.6,
    value: 640_100_000,
    handover: 'Q3 2026',
    ifrsPct: 44,
    ifrsRecognised: 281_600_000,
    ifrsNote: 'IFRS 15 Method: % Completion (POB = floor handover)',
    milestones: [
      { label: 'Foundation', state: 'completed', detail: 'Completed' },
      { label: 'Structure', state: 'in-progress', detail: '44% complete' },
      { label: 'Funding gap — AED 45M required by Aug 2024', state: 'critical', detail: 'Funding gap' },
    ],
    leakage: { text: 'Revenue Leakage: AED 67.4M at risk', level: 'red' },
  },
  {
    id: 'p5',
    name: 'Downtown Retail Plaza',
    entity: 'Dubai Holdings',
    type: 'Commercial',
    location: 'Downtown Dubai',
    status: 'Delayed',
    statusBadge: 'Delayed — 20 days',
    badgeColor: 'amber',
    units: 84,
    unitsSold: 51,
    unitsSoldPct: 60.7,
    value: 512_700_000,
    handover: 'Q2 2026',
    ifrsPct: 38,
    ifrsRecognised: 194_800_000,
    milestones: [
      { label: 'Foundation', state: 'completed', detail: 'Completed' },
      { label: 'Structure', state: 'in-progress', detail: 'In progress' },
    ],
    leakage: { text: 'Revenue Leakage: None detected', level: 'none' },
  },
];

export interface IfrsScheduleRow {
  quarter: string;
  pct: number;
  recognise: number;
  cumulative: number;
  status: 'Posted' | 'Scheduled';
}

export const marinaHeightsIfrsSchedule: IfrsScheduleRow[] = [
  { quarter: 'Q1 2023', pct: 8, recognise: 99_200_000, cumulative: 99_200_000, status: 'Posted' },
  { quarter: 'Q2 2023', pct: 15, recognise: 86_800_000, cumulative: 186_000_000, status: 'Posted' },
  { quarter: 'Q3 2023', pct: 24, recognise: 111_600_000, cumulative: 297_600_000, status: 'Posted' },
  { quarter: 'Q4 2023', pct: 35, recognise: 136_400_000, cumulative: 434_000_000, status: 'Posted' },
  { quarter: 'Q1 2024', pct: 48, recognise: 161_200_000, cumulative: 595_200_000, status: 'Posted' },
  { quarter: 'Q2 2024', pct: 58, recognise: 124_000_000, cumulative: 719_200_000, status: 'Posted' },
  { quarter: 'Q3 2024', pct: 72, recognise: 173_600_000, cumulative: 892_800_000, status: 'Posted' },
  { quarter: 'Q4 2024', pct: 85, recognise: 161_200_000, cumulative: 1_054_000_000, status: 'Scheduled' },
  { quarter: 'Q1 2025', pct: 100, recognise: 186_000_000, cumulative: 1_240_000_000, status: 'Scheduled' },
];

export interface CostCategory {
  label: string;
  budget: number;
  actual: number;
  color: string;
}

export const marinaHeightsCostCategories: CostCategory[] = [
  { label: 'Civil Works', budget: 380_000_000, actual: 372_000_000, color: '#0B1D33' },
  { label: 'MEP', budget: 210_000_000, actual: 198_000_000, color: '#4F46E5' },
  { label: 'Finishing', budget: 180_000_000, actual: 165_000_000, color: '#C79A2B' },
  { label: 'Contingency', budget: 50_000_000, actual: 12_000_000, color: '#94A3B8' },
];

export const projectSummaryCards = [
  { label: 'Active Projects', value: '5', subtitle: '2 on schedule · 2 delayed · 1 critical' },
  { label: 'Total Project Value', value: 'AED 4.13B', subtitle: '↑ 6.3% vs last quarter' },
  { label: 'Avg Completion', value: '64.2%', subtitle: 'Weighted by project value' },
  { label: 'Revenue Recognised', value: 'AED 1.28B', subtitle: '31.2% of total portfolio' },
];

// ---- Command Center ----

export const alertStripItems = [
  { text: 'Escrow reconciliation overdue (32 days)', href: '#' },
  { text: 'IFRS 15 Q2 filing due in 7 days', href: '#' },
  { text: 'Capital Call #6 notice not confirmed by 2 LPs', href: '#' },
];

export interface LiveMetricCard {
  label: string;
  value: string;
  subtitle: string;
  dotColor: 'green' | 'gold' | 'amber' | 'red';
  delta?: string;
  deltaPositive?: boolean;
}

export const liveMetrics: LiveMetricCard[] = [
  { label: 'Cash Position', value: 'AED 586.7M', subtitle: '↑ 3.1% today', dotColor: 'green' },
  { label: 'Collections Today', value: 'AED 12.4M', subtitle: '3 payments received', dotColor: 'gold' },
  { label: 'Payables Due Today', value: 'AED 8.2M', subtitle: '5 contractor bills', dotColor: 'amber' },
  { label: 'Overdue Collections', value: 'AED 45.2M', subtitle: '12 buyers overdue', dotColor: 'red' },
  { label: 'Active Projects', value: '5 projects', subtitle: '2 delayed · 1 critical', dotColor: 'amber' },
  { label: 'Compliance Score', value: '74%', subtitle: '↓ 2% this week', dotColor: 'red', delta: '↓ 2%', deltaPositive: false },
];

export interface TaskItem {
  id: string;
  title: string;
  badge: string;
  badgeColor: 'red' | 'amber' | 'green';
  due: string;
  amount?: string;
  assignee: string;
  completed: boolean;
}

export const initialTasks: TaskItem[] = [
  { id: 't1', title: 'Review IFRS 15 Q2 entries — Marina Heights', badge: 'Overdue', badgeColor: 'red', due: '10 May', assignee: 'You', completed: false },
  { id: 't2', title: 'Approve contractor bill — Desert Oasis MEP', badge: 'Due Today', badgeColor: 'amber', due: 'Today', amount: 'AED 4.2M', assignee: 'You', completed: false },
  { id: 't3', title: 'Send Capital Call #6 reminder to 2 LPs', badge: 'Due Today', badgeColor: 'amber', due: 'Today', amount: 'AED 180M', assignee: 'You', completed: false },
  { id: 't4', title: 'Reconcile Palm View escrow — Apr 2024', badge: '32 days overdue', badgeColor: 'red', due: 'Overdue', assignee: 'Accounts', completed: false },
  { id: 't5', title: 'Upload QPR documents — Palm View RERA', badge: 'Due in 7 days', badgeColor: 'amber', due: '7 days', assignee: 'You', completed: false },
  { id: 't6', title: 'Post Q1 2024 IFRS entries — Marina Heights', badge: 'Completed', badgeColor: 'green', due: 'Done: 08 May', assignee: 'You', completed: true },
  { id: 't7', title: 'VAT return filed — Dubai Holdings Q1', badge: 'Completed', badgeColor: 'green', due: 'Done: 05 May', assignee: 'Tax Team', completed: true },
];

export const quickActions = [
  { icon: 'FileUp', label: 'Upload Invoice' },
  { icon: 'Receipt', label: 'Run VAT Return' },
  { icon: 'Mail', label: 'Send Demand Letter' },
  { icon: 'ClipboardList', label: 'New Capital Call' },
  { icon: 'SearchCheck', label: 'IFRS 15 Check' },
  { icon: 'FileBarChart', label: 'Generate Report' },
];

export interface AiInsight {
  level: 'red' | 'amber' | 'blue';
  icon: string;
  title: string;
  body: string;
  buttonText: string;
}

export const aiInsights: AiInsight[] = [
  {
    level: 'red',
    icon: '🚨',
    title: 'Revenue Leakage Detected',
    body: 'Palm View Residences has AED 24.2M in revenue at risk due to MEP delay pushing handover beyond Q2 2024. IFRS 15 recognition may need to be deferred by one quarter.',
    buttonText: 'Review Now →',
  },
  {
    level: 'amber',
    icon: '⚠',
    title: 'Cash Flow Pressure — June 2024',
    body: 'Capital Call #6 (AED 180M) is due 30 Jun 2024 but AED 45M in contractor payments are also due in the same week. Net cash requirement peaks at AED 225M. Consider staggering.',
    buttonText: 'View Cash Flow →',
  },
  {
    level: 'blue',
    icon: '💡',
    title: 'Marina Heights Ahead of Schedule',
    body: 'Marina Heights Towers is 72% complete vs 68% planned. Early completion could unlock AED 86M in additional IFRS 15 revenue recognition in Q3 2024.',
    buttonText: 'View Project →',
  },
];

export interface ActivityItem {
  time: string;
  borderColor: string;
  icon: string;
  title: string;
  detail: string;
  tag: string;
  amount?: string;
  button?: { text: string; color: 'gold' | 'red' };
}

export const activityFeed: ActivityItem[] = [
  { time: '10:28 AM', borderColor: '#16a34a', icon: '💰', title: 'Payment received — AED 2.4M', detail: 'Marina Buyer #287 — Unit 2804 · Palm View Residences · Unit 2804', tag: 'Collections', amount: 'AED 2.4M' },
  { time: '10:15 AM', borderColor: '#C79A2B', icon: '📄', title: 'Contractor bill submitted — AED 4.2M', detail: 'Desert Oasis MEP Works — Al Futtaim Contracting · Awaiting approval by Finance Team', tag: 'Procurement', button: { text: 'Approve', color: 'gold' } },
  { time: '09:52 AM', borderColor: '#dc2626', icon: '🚨', title: 'Escrow alert — reconciliation overdue', detail: 'Palm View escrow: AED 67.2M unreconciled · RERA may flag on next audit', tag: 'Compliance', button: { text: 'Resolve', color: 'red' } },
  { time: '09:44 AM', borderColor: '#4F46E5', icon: '📊', title: 'IFRS 15 entry posted — AED 173.6M', detail: 'Marina Heights Q3 2024 revenue recognised · Journal entry #JE-2024-0847 posted', tag: 'Accounting', amount: 'AED 173.6M' },
  { time: '09:31 AM', borderColor: '#16a34a', icon: '💰', title: 'Payment received — AED 5.8M', detail: 'Desert Oasis Villas — 3 unit instalments', tag: 'Collections', amount: 'AED 5.8M' },
  { time: '09:15 AM', borderColor: '#C79A2B', icon: '📧', title: 'Demand letter sent — 3 buyers', detail: 'Palm View Residences — overdue instalments · AED 1.2M total overdue', tag: 'Collections' },
  { time: '08:58 AM', borderColor: '#C79A2B', icon: '⚠', title: 'LP confirmation pending', detail: 'Capital Call #6 — Emirates NBD Private Banking and Al Habtoor Family Office yet to confirm', tag: 'Fund Management', button: { text: 'Send Reminder', color: 'gold' } },
  { time: '08:45 AM', borderColor: '#4F46E5', icon: '📋', title: 'New project milestone — Desert Oasis', detail: 'Structure works 78% complete · Updated by site engineer', tag: 'Projects' },
  { time: '08:30 AM', borderColor: '#16a34a', icon: '✅', title: 'VAT return filed successfully', detail: 'Dubai Holdings Q1 2024 — AED 12.4M payable · Filed by Tax Team', tag: 'Compliance' },
  { time: '08:15 AM', borderColor: '#16a34a', icon: '💰', title: 'Morning collections summary', detail: 'AED 12.4M received across 3 payments vs AED 18.0M expected today', tag: 'Collections' },
];

export interface CollectionItem {
  label: string;
  amount: string;
  time: string;
  status: 'received' | 'expected' | 'overdue';
}

export const todayCollections: CollectionItem[] = [
  { label: 'Marina Buyer #287', amount: 'AED 2.4M', time: '10:28 AM', status: 'received' },
  { label: 'Desert Oasis x3', amount: 'AED 5.8M', time: '09:31 AM', status: 'received' },
  { label: 'Skyline Unit 14B', amount: 'AED 4.2M', time: '08:45 AM', status: 'received' },
  { label: 'Palm View #164', amount: 'AED 3.2M', time: 'Expected 2 PM', status: 'expected' },
  { label: 'Marina #301', amount: 'AED 2.4M', time: 'Expected 4 PM', status: 'expected' },
  { label: 'Palm View #089', amount: 'AED 1.6M', time: 'Overdue 3 days', status: 'overdue' },
];

export interface PayableItem {
  vendor: string;
  amount: string;
  project: string;
  status: string;
  dotColor: 'red' | 'amber' | 'green';
  action?: { text: string; color: 'gold' | 'navy' };
  autoPay?: string;
}

export const payablesToday: PayableItem[] = [
  { vendor: 'Al Futtaim Contracting', amount: 'AED 4.2M', project: 'Desert Oasis MEP', status: 'Pending Approval', dotColor: 'red', action: { text: 'Approve', color: 'gold' } },
  { vendor: 'UAE Steel LLC', amount: 'AED 1.8M', project: 'Marina Heights Structure', status: 'Ready to pay', dotColor: 'amber', action: { text: 'Pay Now', color: 'navy' } },
  { vendor: 'Gulf Elevators', amount: 'AED 1.2M', project: 'Skyline Commercial', status: 'Ready to pay', dotColor: 'amber', action: { text: 'Pay Now', color: 'navy' } },
  { vendor: 'Al Masaood Power', amount: 'AED 580K', project: 'Palm View MEP', status: 'Scheduled', dotColor: 'green', autoPay: 'Auto-pay at 3 PM' },
  { vendor: 'Transguard Security', amount: 'AED 420K', project: 'All Projects', status: 'Scheduled', dotColor: 'green', autoPay: 'Auto-pay at 3 PM' },
];

export interface ProjectPulseRow {
  name: string;
  pct: number;
  status: string;
  badgeColor: 'green' | 'amber' | 'red';
  updated: string;
}

export const projectPulse: ProjectPulseRow[] = [
  { name: 'Marina Heights Towers', pct: 72, status: 'On Schedule', badgeColor: 'green', updated: '2h ago' },
  { name: 'Palm View Residences', pct: 58, status: 'Delayed 45d', badgeColor: 'amber', updated: '1d ago' },
  { name: 'Desert Oasis Villas', pct: 61, status: 'On Schedule', badgeColor: 'green', updated: '3h ago' },
  { name: 'Skyline Commercial Hub', pct: 44, status: 'Critical', badgeColor: 'red', updated: '4h ago' },
  { name: 'Downtown Retail Plaza', pct: 38, status: 'Delayed 20d', badgeColor: 'amber', updated: '2d ago' },
];

export interface CashFlowDay {
  day: string;
  inflow: number;
  outflow: number;
}

export const weeklyCashFlow: CashFlowDay[] = [
  { day: 'Mon 13', inflow: 12.4, outflow: 8.2 },
  { day: 'Tue 14', inflow: 8.2, outflow: 12.4 },
  { day: 'Wed 15', inflow: 18.6, outflow: 6.8 },
  { day: 'Thu 16', inflow: 6.4, outflow: 18.4 },
  { day: 'Fri 17', inflow: 14.2, outflow: 4.2 },
];

export interface ComplianceCalendarItem {
  date: string;
  label: string;
  color: 'red' | 'amber' | 'blue';
}

export const complianceCalendar: ComplianceCalendarItem[] = [
  { date: 'TODAY', label: 'Escrow recon overdue (32 days)', color: 'red' },
  { date: '15 May', label: 'Project Revenue Recognition due', color: 'amber' },
  { date: '20 May', label: 'IFRS 15 Disclosure Check', color: 'amber' },
  { date: '22 May', label: 'Escrow Account Reconciliation', color: 'amber' },
  { date: '25 May', label: 'VAT Compliance Review', color: 'amber' },
  { date: '30 Jun', label: 'Capital Call #6 due (AED 180M)', color: 'blue' },
  { date: '15 Aug', label: 'QPR deadline — Palm View RERA', color: 'blue' },
  { date: '15 Aug', label: 'IFRS 15 Q2 filing due', color: 'blue' },
];

export interface EntitySnapshotRow {
  entity: string;
  assets: string;
  cash: string;
  projects: number;
  status: 'amber' | 'green' | 'red';
}

export const entitySnapshot: EntitySnapshotRow[] = [
  { entity: 'Dubai Holdings', assets: '4.68B', cash: '312.4M', projects: 3, status: 'amber' },
  { entity: 'Marina Heights LLC', assets: '1.24B', cash: '124.8M', projects: 1, status: 'green' },
  { entity: 'Palm View Residences', assets: '987.3M', cash: '86.4M', projects: 1, status: 'red' },
  { entity: 'Desert Oasis Fund I', assets: '2.4B', cash: '63.1M', projects: 2, status: 'green' },
];

// ---- Financial Overview ----

export const finKpis = [
  { label: 'Total Revenue', value: 'AED 2,892.7M', sub: '↑ 14.2% vs FY 2023', sub2: 'Recognised per IFRS 15' },
  { label: 'Gross Profit', value: 'AED 1,129.1M', sub: 'Margin: 39.0%', sub2: '↑ 2.1% vs FY 2023' },
  { label: 'EBITDA', value: 'AED 847.4M', sub: 'Margin: 29.3%', sub2: '↑ 1.8% vs FY 2023' },
  { label: 'Net Income', value: 'AED 312.6M', sub: 'Margin: 10.8%', sub2: '↓ 12.4% vs last quarter', negative: true },
  { label: 'Total Equity', value: 'AED 1,847.3M', sub: 'NAV per unit: AED 4,842', sub2: '↑ 8.6% vs FY 2023' },
];

export interface FinRow {
  label: string;
  fy2024: string;
  fy2023: string;
  variance: string;
  pct: string;
  type: 'header' | 'data' | 'subtotal' | 'total' | 'grand';
  indent?: boolean;
  negative?: boolean;
}

export const incomeStatementRows: FinRow[] = [
  { label: 'REVENUE', fy2024: '', fy2023: '', variance: '', pct: '', type: 'header' },
  { label: 'Property Sales Revenue', fy2024: '2,184.6', fy2023: '1,876.2', variance: '+308.4', pct: '+16.4%', type: 'data' },
  { label: 'Rental Income', fy2024: '342.8', fy2023: '298.4', variance: '+44.4', pct: '+14.9%', type: 'data' },
  { label: 'Fund Management Fees', fy2024: '186.4', fy2023: '162.8', variance: '+23.6', pct: '+14.5%', type: 'data' },
  { label: 'Other Income', fy2024: '178.9', fy2023: '144.6', variance: '+34.3', pct: '+23.7%', type: 'data' },
  { label: 'TOTAL REVENUE', fy2024: '2,892.7', fy2023: '2,482.0', variance: '+410.7', pct: '+16.6%', type: 'total' },
  { label: 'COST OF SALES', fy2024: '', fy2023: '', variance: '', pct: '', type: 'header' },
  { label: 'Land Costs', fy2024: '(624.8)', fy2023: '(548.2)', variance: '(76.6)', pct: '+14.0%', type: 'data', negative: true },
  { label: 'Construction Costs', fy2024: '(848.4)', fy2023: '(724.6)', variance: '(123.8)', pct: '+17.1%', type: 'data', negative: true },
  { label: 'Professional Fees', fy2024: '(168.4)', fy2023: '(142.8)', variance: '(25.6)', pct: '+17.9%', type: 'data', negative: true },
  { label: 'Other Direct Costs', fy2024: '(122.0)', fy2023: '(98.4)', variance: '(23.6)', pct: '+24.0%', type: 'data', negative: true },
  { label: 'TOTAL COST OF SALES', fy2024: '(1,763.6)', fy2023: '(1,514.0)', variance: '(249.6)', pct: '+16.5%', type: 'subtotal', negative: true },
  { label: 'GROSS PROFIT', fy2024: '1,129.1', fy2023: '968.0', variance: '+161.1', pct: '+16.6%', type: 'total' },
  { label: 'Gross Margin', fy2024: '39.0%', fy2023: '39.0%', variance: '—', pct: '—', type: 'data', indent: true },
  { label: 'OPERATING EXPENSES', fy2024: '', fy2023: '', variance: '', pct: '', type: 'header' },
  { label: 'Staff Costs', fy2024: '(142.4)', fy2023: '(124.8)', variance: '(17.6)', pct: '+14.1%', type: 'data', negative: true },
  { label: 'Marketing & Sales', fy2024: '(84.6)', fy2023: '(72.4)', variance: '(12.2)', pct: '+16.9%', type: 'data', negative: true },
  { label: 'General & Admin', fy2024: '(54.7)', fy2023: '(48.2)', variance: '(6.5)', pct: '+13.5%', type: 'data', negative: true },
  { label: 'TOTAL OPEX', fy2024: '(281.7)', fy2023: '(245.4)', variance: '(36.3)', pct: '+14.8%', type: 'subtotal', negative: true },
  { label: 'EBITDA', fy2024: '847.4', fy2023: '722.6', variance: '+124.8', pct: '+17.3%', type: 'total' },
  { label: 'EBITDA Margin', fy2024: '29.3%', fy2023: '29.1%', variance: '+0.2%', pct: '—', type: 'data', indent: true },
  { label: 'Depreciation & Amortisation', fy2024: '(186.4)', fy2023: '(164.2)', variance: '(22.2)', pct: '+13.5%', type: 'data', negative: true },
  { label: 'IFRS 16 Interest on Leases', fy2024: '(42.8)', fy2023: '(38.4)', variance: '(4.4)', pct: '+11.5%', type: 'data', negative: true },
  { label: 'EBIT', fy2024: '618.2', fy2023: '520.0', variance: '+98.2', pct: '+18.9%', type: 'subtotal' },
  { label: 'Finance Costs', fy2024: '(248.6)', fy2023: '(212.4)', variance: '(36.2)', pct: '+17.0%', type: 'data', negative: true },
  { label: 'Finance Income', fy2024: '24.8', fy2023: '18.4', variance: '+6.4', pct: '+34.8%', type: 'data' },
  { label: 'PROFIT BEFORE TAX', fy2024: '394.4', fy2023: '326.0', variance: '+68.4', pct: '+21.0%', type: 'total' },
  { label: 'Income Tax', fy2024: '(81.8)', fy2023: '(68.2)', variance: '(13.6)', pct: '+19.9%', type: 'data', negative: true },
  { label: 'NET PROFIT', fy2024: '312.6', fy2023: '257.8', variance: '+54.8', pct: '+21.3%', type: 'grand' },
  { label: 'Net Margin', fy2024: '10.8%', fy2023: '10.4%', variance: '+0.4%', pct: '—', type: 'data', indent: true },
];

export interface RevenueBridgeStep {
  label: string;
  value: number;
  color: string;
}

export const revenueBridge: RevenueBridgeStep[] = [
  { label: 'FY 2023', value: 2482.0, color: '#0B1D33' },
  { label: 'Property Sales', value: 308.4, color: '#16a34a' },
  { label: 'Rental Income', value: 44.4, color: '#16a34a' },
  { label: 'Fund Fees', value: 23.6, color: '#16a34a' },
  { label: 'Other', value: 34.3, color: '#16a34a' },
  { label: 'FY 2024', value: 2892.7, color: '#C79A2B' },
];

export const marginTrend = [
  { quarter: 'Q1 23', gross: 37.2, ebitda: 27.4, net: 9.2 },
  { quarter: 'Q2 23', gross: 38.1, ebitda: 28.2, net: 9.8 },
  { quarter: 'Q3 23', gross: 38.8, ebitda: 28.8, net: 10.2 },
  { quarter: 'Q4 23', gross: 39.4, ebitda: 29.6, net: 10.8 },
  { quarter: 'Q1 24', gross: 38.6, ebitda: 28.4, net: 10.1 },
  { quarter: 'Q2 24', gross: 39.0, ebitda: 29.3, net: 10.8 },
  { quarter: 'Q3 24', gross: 39.4, ebitda: 29.8, net: 11.2 },
  { quarter: 'Q4 24', gross: 39.8, ebitda: 30.2, net: 11.6 },
];

export const revenueMix = [
  { label: 'Dubai Holdings', pct: 40.2, amount: '1,162.8M', color: '#0B1D33' },
  { label: 'Marina Heights LLC', pct: 28.4, amount: '821.4M', color: '#C79A2B' },
  { label: 'Palm View Residences', pct: 18.6, amount: '538.0M', color: '#F59E0B' },
  { label: 'Desert Oasis Fund I', pct: 12.8, amount: '370.5M', color: '#0D9488' },
];

// Balance Sheet
export const balanceSheetRows: FinRow[] = [
  { label: 'NON-CURRENT ASSETS', fy2024: '', fy2023: '', variance: '', pct: '', type: 'header' },
  { label: 'Investment Properties', fy2024: '2,842.4', fy2023: '2,486.2', variance: '+356.2', pct: '', type: 'data' },
  { label: 'Right-of-Use Assets (IFRS 16)', fy2024: '284.6', fy2023: '312.4', variance: '(27.8)', pct: '', type: 'data', negative: true },
  { label: 'Property Plant & Equipment', fy2024: '124.8', fy2023: '108.4', variance: '+16.4', pct: '', type: 'data' },
  { label: 'Intangible Assets', fy2024: '42.4', fy2023: '38.6', variance: '+3.8', pct: '', type: 'data' },
  { label: 'Investments in Associates', fy2024: '186.4', fy2023: '162.8', variance: '+23.6', pct: '', type: 'data' },
  { label: 'Total Non-Current Assets', fy2024: '3,480.6', fy2023: '3,108.4', variance: '+372.2', pct: '', type: 'subtotal' },
  { label: 'CURRENT ASSETS', fy2024: '', fy2023: '', variance: '', pct: '', type: 'header' },
  { label: 'Development Properties (WIP)', fy2024: '624.8', fy2023: '548.4', variance: '+76.4', pct: '', type: 'data' },
  { label: 'Trade Receivables', fy2024: '284.6', fy2023: '248.2', variance: '+36.4', pct: '', type: 'data' },
  { label: 'Contract Assets (IFRS 15)', fy2024: '186.4', fy2023: '142.8', variance: '+43.6', pct: '', type: 'data' },
  { label: 'Cash & Cash Equivalents', fy2024: '586.7', fy2023: '486.2', variance: '+100.5', pct: '', type: 'data' },
  { label: 'Escrow Accounts', fy2024: '245.6', fy2023: '212.4', variance: '+33.2', pct: '', type: 'data' },
  { label: 'Other Current Assets', fy2024: '84.2', fy2023: '72.4', variance: '+11.8', pct: '', type: 'data' },
  { label: 'Total Current Assets', fy2024: '2,012.3', fy2023: '1,710.4', variance: '+301.9', pct: '', type: 'subtotal' },
  { label: 'TOTAL ASSETS', fy2024: '5,492.9', fy2023: '4,818.8', variance: '+674.1', pct: '', type: 'total' },
  { label: 'EQUITY', fy2024: '', fy2023: '', variance: '', pct: '', type: 'header' },
  { label: 'Share Capital', fy2024: '480.0', fy2023: '480.0', variance: '—', pct: '', type: 'data' },
  { label: 'Retained Earnings', fy2024: '1,124.8', fy2023: '812.2', variance: '+312.6', pct: '', type: 'data' },
  { label: 'Revaluation Reserve', fy2024: '242.5', fy2023: '186.4', variance: '+56.1', pct: '', type: 'data' },
  { label: 'Total Equity', fy2024: '1,847.3', fy2023: '1,478.6', variance: '+368.7', pct: '', type: 'total' },
  { label: 'NON-CURRENT LIABILITIES', fy2024: '', fy2023: '', variance: '', pct: '', type: 'header' },
  { label: 'Bank Borrowings', fy2024: '2,124.8', fy2023: '1,986.4', variance: '+138.4', pct: '', type: 'data' },
  { label: 'IFRS 16 Lease Liabilities', fy2024: '242.8', fy2023: '268.4', variance: '(25.6)', pct: '', type: 'data', negative: true },
  { label: 'Deferred Tax', fy2024: '124.6', fy2023: '108.2', variance: '+16.4', pct: '', type: 'data' },
  { label: 'Total Non-Current Liabilities', fy2024: '2,492.2', fy2023: '2,363.0', variance: '+129.2', pct: '', type: 'subtotal' },
  { label: 'CURRENT LIABILITIES', fy2024: '', fy2023: '', variance: '', pct: '', type: 'header' },
  { label: 'Trade Payables', fy2024: '486.4', fy2023: '412.8', variance: '+73.6', pct: '', type: 'data' },
  { label: 'Contract Liabilities (IFRS 15)', fy2024: '342.8', fy2023: '286.4', variance: '+56.4', pct: '', type: 'data' },
  { label: 'Current Borrowings', fy2024: '186.4', fy2023: '142.8', variance: '+43.6', pct: '', type: 'data' },
  { label: 'Tax Payable', fy2024: '81.8', fy2023: '68.2', variance: '+13.6', pct: '', type: 'data' },
  { label: 'Other Payables', fy2024: '56.0', fy2023: '67.0', variance: '(11.0)', pct: '', type: 'data', negative: true },
  { label: 'Total Current Liabilities', fy2024: '1,153.4', fy2023: '977.2', variance: '+176.2', pct: '', type: 'subtotal' },
  { label: 'TOTAL LIABILITIES', fy2024: '3,645.6', fy2023: '3,340.2', variance: '+305.4', pct: '', type: 'subtotal' },
  { label: 'TOTAL EQUITY & LIABILITIES', fy2024: '5,492.9', fy2023: '4,818.8', variance: '+674.1', pct: '', type: 'total' },
];

export const assetComposition = [
  { label: 'Investment Properties', pct: 51.7, color: '#0B1D33' },
  { label: 'Development WIP', pct: 11.4, color: '#C79A2B' },
  { label: 'Cash & Escrow', pct: 15.2, color: '#16a34a' },
  { label: 'Receivables & Contract Assets', pct: 8.6, color: '#4F46E5' },
  { label: 'Other', pct: 13.1, color: '#94A3B8' },
];

export const capitalStructure = [
  { label: 'Equity', value: 33.6, color: '#C79A2B' },
  { label: 'Long term debt', value: 45.4, color: '#0B1D33' },
  { label: 'Current liabilities', value: 21.0, color: '#F59E0B' },
];

export const workingCapitalTrend = [
  { quarter: 'Q1 23', ca: 1420, cl: 780 },
  { quarter: 'Q2 23', ca: 1486, cl: 820 },
  { quarter: 'Q3 23', ca: 1562, cl: 870 },
  { quarter: 'Q4 23', ca: 1710, cl: 977 },
  { quarter: 'Q1 24', ca: 1780, cl: 1020 },
  { quarter: 'Q2 24', ca: 1860, cl: 1080 },
  { quarter: 'Q3 24', ca: 1940, cl: 1110 },
  { quarter: 'Q4 24', ca: 2012, cl: 1153 },
];

// Cash Flow
export interface CashFlowRow {
  label: string;
  amount: string;
  type: 'header' | 'data' | 'subtotal' | 'total' | 'grand';
  indent?: boolean;
  negative?: boolean;
}

export const cashFlowRows: CashFlowRow[] = [
  { label: 'OPERATING ACTIVITIES', amount: '', type: 'header' },
  { label: 'Net Profit', amount: '312.6', type: 'data' },
  { label: 'Add: Depreciation & Amortisation', amount: '186.4', type: 'data' },
  { label: 'Add: IFRS 16 Depreciation', amount: '84.2', type: 'data' },
  { label: 'Add: Finance Costs', amount: '248.6', type: 'data' },
  { label: 'Less: Finance Income', amount: '(24.8)', type: 'data', negative: true },
  { label: 'Changes in Working Capital:', amount: '', type: 'data', indent: true },
  { label: '(Increase) in Receivables', amount: '(36.4)', type: 'data', indent: true, negative: true },
  { label: '(Increase) in Contract Assets', amount: '(43.6)', type: 'data', indent: true, negative: true },
  { label: '(Increase) in Dev Properties', amount: '(76.4)', type: 'data', indent: true, negative: true },
  { label: 'Increase in Payables', amount: '73.6', type: 'data', indent: true },
  { label: 'Increase in Contract Liabilities', amount: '56.4', type: 'data', indent: true },
  { label: 'Increase in Tax Payable', amount: '13.6', type: 'data', indent: true },
  { label: 'Net Cash from Operations', amount: '794.2', type: 'total' },
  { label: 'INVESTING ACTIVITIES', amount: '', type: 'header' },
  { label: 'Purchase of Investment Properties', amount: '(486.4)', type: 'data', negative: true },
  { label: 'Capital Expenditure — PPE', amount: '(42.4)', type: 'data', negative: true },
  { label: 'Investment in Associates', amount: '(24.8)', type: 'data', negative: true },
  { label: 'Interest Received', amount: '24.8', type: 'data' },
  { label: 'Net Cash used in Investing', amount: '(528.8)', type: 'subtotal', negative: true },
  { label: 'FINANCING ACTIVITIES', amount: '', type: 'header' },
  { label: 'Proceeds from Bank Borrowings', amount: '624.8', type: 'data' },
  { label: 'Repayment of Borrowings', amount: '(486.4)', type: 'data', negative: true },
  { label: 'IFRS 16 Lease Payments', amount: '(68.4)', type: 'data', negative: true },
  { label: 'Interest Paid', amount: '(248.6)', type: 'data', negative: true },
  { label: 'Distributions to LPs', amount: '(312.4)', type: 'data', negative: true },
  { label: 'Net Cash from Financing', amount: '(490.0)', type: 'subtotal', negative: true },
  { label: 'NET INCREASE IN CASH', amount: '100.5', type: 'total' },
  { label: 'Opening Cash Balance', amount: '486.2', type: 'data' },
  { label: 'Closing Cash Balance', amount: '586.7', type: 'grand' },
];

export const cashFlowWaterfall = [
  { label: 'Operating', value: 794.2, color: '#16a34a' },
  { label: 'Investing', value: -528.8, color: '#dc2626' },
  { label: 'Financing', value: -490.0, color: '#dc2626' },
  { label: 'Net Change', value: 100.5, color: '#C79A2B' },
  { label: 'Closing', value: 586.7, color: '#0B1D33' },
];

export const freeCashFlowTrend = [
  { quarter: 'Q1 23', fcf: 142 },
  { quarter: 'Q2 23', fcf: 168 },
  { quarter: 'Q3 23', fcf: 186 },
  { quarter: 'Q4 23', fcf: 204 },
  { quarter: 'Q1 24', fcf: 178 },
  { quarter: 'Q2 24', fcf: 212 },
  { quarter: 'Q3 24', fcf: 234 },
  { quarter: 'Q4 24', fcf: 248 },
];

// Entity breakdown
export interface EntityPerfRow {
  entity: string;
  revenue: string;
  grossProfit: string;
  margin: string;
  ebitda: string;
  netIncome: string;
  totalAssets: string;
  cash: string;
  roe: string;
  isTotal?: boolean;
}

export const entityPerfRows: EntityPerfRow[] = [
  { entity: 'Dubai Holdings', revenue: '1,162.8', grossProfit: '453.5', margin: '39.0%', ebitda: '341.2', netIncome: '124.6', totalAssets: '4,680.0', cash: '312.4M', roe: '16.8%' },
  { entity: 'Marina Heights LLC', revenue: '821.4', grossProfit: '320.4', margin: '39.0%', ebitda: '240.8', netIncome: '88.4', totalAssets: '1,240.0', cash: '124.8M', roe: '19.2%' },
  { entity: 'Palm View Residences', revenue: '538.0', grossProfit: '209.8', margin: '39.0%', ebitda: '157.6', netIncome: '57.8', totalAssets: '987.3', cash: '86.4M', roe: '14.6%' },
  { entity: 'Desert Oasis Fund I', revenue: '370.5', grossProfit: '145.4', margin: '39.2%', ebitda: '107.8', netIncome: '41.8', totalAssets: '2,400.0', cash: '63.1M', roe: '18.4%' },
  { entity: 'TOTAL', revenue: '2,892.7', grossProfit: '1,129.1', margin: '39.0%', ebitda: '847.4', netIncome: '312.6', totalAssets: '9,307.3', cash: '586.7M', roe: '17.3%', isTotal: true },
];

// IFRS Compliance
export const ifrsComplianceCards = [
  { icon: 'FileText', title: 'IFRS 15 — Revenue', status: 'Compliant', statusColor: 'green', body: '% completion method applied across 5 active projects. AED 1.28B recognised in FY 2024 per POB milestones.', footnote: 'Last reviewed: 30 Apr 2024' },
  { icon: 'Building2', title: 'IFRS 16 — Leases', status: 'Compliant', statusColor: 'green', body: '47 leases on balance sheet. ROU assets: AED 284.6M. Lease liabilities: AED 242.8M', footnote: 'Last reviewed: 31 Mar 2024' },
  { icon: 'Shield', title: 'IFRS 9 — Financial Instruments', status: 'Review Due', statusColor: 'amber', body: 'ECL provision model requires Q2 2024 update. Trade receivables of AED 284.6M under review.', footnote: 'Due: 30 Jun 2024' },
  { icon: 'Flag', title: 'UAE Corporate Tax', status: 'Compliant', statusColor: 'green', body: '9% CT applied on taxable income above AED 375,000 threshold. AED 81.8M tax provision raised.', footnote: 'Last filed: 31 Mar 2024' },
];

// ---- Construction Control Tower ----

export interface ConstructionKpi {
  label: string;
  value: string;
  sub: string;
}

export const constructionKpis: ConstructionKpi[] = [
  { label: 'Active Sites', value: '5', sub: '2 delayed · 1 critical' },
  { label: 'Overall Completion', value: '64.2%', sub: 'Weighted by value' },
  { label: 'Budget Health', value: 'AED 1.98B', sub: 'Committed of AED 2.13B total' },
  { label: 'Contractor Bills Pending', value: 'AED 42.6M', sub: '8 pending approval' },
  { label: 'Revenue at Risk', value: 'AED 91.6M', sub: '2 projects flagged' },
  { label: 'Days to Next RERA Deadline', value: '7 days', sub: 'QPR — Palm View' },
];

export interface ConstructionAlert {
  id: string;
  siteId: string;
  siteName: string;
  alertType: string;
  severity: 'critical' | 'warning' | 'info';
  title: string;
  description: string;
  aedImpact: string;
  actionRequired: string;
}

export const constructionAlerts: ConstructionAlert[] = [
  { id: 'a1', siteId: 's2', siteName: 'Palm View Residences', alertType: 'mismatch_sales_vs_build', severity: 'critical', title: 'MEP contractor claiming 18% more than certified — AED 18.2M at risk', description: 'Gulf MEP Solutions has certified progress at 34% but claimed 52%. AED 18.2M payment mismatch detected. Do not release payment pending re-certification.', aedImpact: 'AED 18.2M', actionRequired: 'Re-certify and withhold payment' },
  { id: 'a2', siteId: 's2', siteName: 'Palm View Residences', alertType: 'revenue_at_risk', severity: 'critical', title: 'Revenue at risk — AED 24.2M IFRS 15 deferral likely', description: 'MEP delay pushing handover beyond Q2 2024. IFRS 15 revenue recognition may need to be deferred by one quarter.', aedImpact: 'AED 24.2M', actionRequired: 'Review with finance team' },
  { id: 'a3', siteId: 's2', siteName: 'Palm View Residences', alertType: 'escrow_overdue', severity: 'critical', title: 'Escrow reconciliation overdue (32 days)', description: 'Palm View escrow: AED 67.2M unreconciled. RERA may flag on next audit.', aedImpact: 'AED 67.2M', actionRequired: 'Reconcile immediately' },
  { id: 'a4', siteId: 's2', siteName: 'Palm View Residences', alertType: 'mismatch_sales_vs_build', severity: 'warning', title: '23 sold units below handover threshold — mismatch flag', description: '23 units sold to buyers have construction status below handover threshold. Buyer contracts reference handover dates that construction cannot meet.', aedImpact: '23 units', actionRequired: 'Send delay notices' },
  { id: 'a5', siteId: 's3', siteName: 'Desert Oasis Villas', alertType: 'cash_pressure', severity: 'warning', title: 'Capital Call #6 AED 180M due same week as AED 45M contractor payments', description: 'Net cash requirement AED 225M week of 30 Jun 2026. Projected cash position only AED 186M. Consider staggering payments.', aedImpact: 'AED 225M', actionRequired: 'Stagger contractor payments' },
  { id: 'a6', siteId: 's1', siteName: 'Marina Heights Towers', alertType: 'contractor_underperformance', severity: 'warning', title: 'Al Futtaim MEP claiming 7% more than certified', description: 'Al Futtaim MEP has certified progress at 64% but claimed 71%. Variance of 7% exceeds 5% threshold. Review claimed work items.', aedImpact: 'AED 8.4M', actionRequired: 'Review claim vs certified' },
  { id: 'a7', siteId: 's2', siteName: 'Palm View Residences', alertType: 'rera_deadline', severity: 'warning', title: 'QPR deadline — Palm View RERA in 7 days', description: 'Quarterly Progress Report due to RERA by 15 May 2024. Construction progress and escrow status must be included.', aedImpact: '—', actionRequired: 'Upload QPR documents' },
];

export interface SiteMilestone {
  name: string;
  type: 'foundation' | 'structure' | 'mep' | 'finishing' | 'handover';
  status: 'completed' | 'in_progress' | 'not_started' | 'delayed' | 'critical';
  pct: number;
}

export interface ConstructionSite {
  id: string;
  name: string;
  entity: string;
  location: string;
  type: string;
  overallPct: number;
  status: 'active' | 'delayed' | 'critical' | 'completed';
  delayDays: number;
  unitsSold: number;
  unitsTotal: number;
  budgetUsed: string;
  budgetTotal: string;
  billsPending: string;
  alertCount: number;
  alertBadges: string[];
  milestones: SiteMilestone[];
  startDate: string;
  plannedCompletion: string;
}

export const constructionSites: ConstructionSite[] = [
  {
    id: 's1',
    name: 'Marina Heights Towers',
    entity: 'Marina Heights LLC',
    location: 'Dubai Marina',
    type: 'Residential',
    overallPct: 72,
    status: 'active',
    delayDays: 0,
    unitsSold: 287,
    unitsTotal: 342,
    budgetUsed: 'AED 594M',
    budgetTotal: 'AED 823.4M',
    billsPending: 'AED 8.4M',
    alertCount: 1,
    alertBadges: ['warning'],
    startDate: '01 Jun 2022',
    plannedCompletion: 'Q4 2025',
    milestones: [
      { name: 'Foundation', type: 'foundation', status: 'completed', pct: 100 },
      { name: 'Structure', type: 'structure', status: 'completed', pct: 100 },
      { name: 'MEP', type: 'mep', status: 'in_progress', pct: 68 },
      { name: 'Finishing', type: 'finishing', status: 'not_started', pct: 0 },
      { name: 'Handover', type: 'handover', status: 'not_started', pct: 0 },
    ],
  },
  {
    id: 's2',
    name: 'Palm View Residences',
    entity: 'Palm View Residences',
    location: 'Palm Jumeirah',
    type: 'Residential',
    overallPct: 58,
    status: 'delayed',
    delayDays: 45,
    unitsSold: 164,
    unitsTotal: 218,
    budgetUsed: 'AED 412M',
    budgetTotal: 'AED 640.2M',
    billsPending: 'AED 18.2M',
    alertCount: 4,
    alertBadges: ['critical', 'critical', 'warning', 'warning'],
    startDate: '01 Aug 2022',
    plannedCompletion: 'Q2 2026 (was Q4 2025)',
    milestones: [
      { name: 'Foundation', type: 'foundation', status: 'completed', pct: 100 },
      { name: 'Structure', type: 'structure', status: 'completed', pct: 100 },
      { name: 'MEP', type: 'mep', status: 'critical', pct: 34 },
      { name: 'Finishing', type: 'finishing', status: 'not_started', pct: 0 },
      { name: 'Handover', type: 'handover', status: 'not_started', pct: 0 },
    ],
  },
  {
    id: 's3',
    name: 'Desert Oasis Villas',
    entity: 'Desert Oasis Fund I',
    location: 'Dubai Hills',
    type: 'Residential',
    overallPct: 61,
    status: 'active',
    delayDays: 0,
    unitsSold: 98,
    unitsTotal: 156,
    budgetUsed: 'AED 312M',
    budgetTotal: 'AED 512.8M',
    billsPending: 'AED 12.4M',
    alertCount: 1,
    alertBadges: ['warning'],
    startDate: '01 Mar 2023',
    plannedCompletion: 'Q1 2026',
    milestones: [
      { name: 'Foundation', type: 'foundation', status: 'completed', pct: 100 },
      { name: 'Structure', type: 'structure', status: 'in_progress', pct: 78 },
      { name: 'MEP', type: 'mep', status: 'not_started', pct: 0 },
      { name: 'Finishing', type: 'finishing', status: 'not_started', pct: 0 },
      { name: 'Handover', type: 'handover', status: 'not_started', pct: 0 },
    ],
  },
];

export interface ContractorRow {
  id: string;
  contractorName: string;
  project: string;
  contractValue: string;
  certifiedPct: number;
  claimedPct: number;
  variance: number;
  billsSubmitted: string;
  billsApproved: string;
  performanceScore: number;
  status: 'healthy' | 'flag' | 'critical';
}

export const contractorRows: ContractorRow[] = [
  { id: 'c1', contractorName: 'Gulf MEP Solutions', project: 'Palm View Residences', contractValue: 'AED 142.0M', certifiedPct: 34, claimedPct: 52, variance: 18, billsSubmitted: 'AED 73.8M', billsApproved: 'AED 48.3M', performanceScore: 3, status: 'critical' },
  { id: 'c2', contractorName: 'Al Futtaim MEP', project: 'Marina Heights Towers', contractValue: 'AED 120.0M', certifiedPct: 64, claimedPct: 71, variance: 7, billsSubmitted: 'AED 85.2M', billsApproved: 'AED 76.8M', performanceScore: 6, status: 'flag' },
  { id: 'c3', contractorName: 'Arabtec Construction', project: 'Marina Heights Towers', contractValue: 'AED 420.0M', certifiedPct: 88, claimedPct: 88, variance: 0, billsSubmitted: 'AED 369.6M', billsApproved: 'AED 369.6M', performanceScore: 9, status: 'healthy' },
  { id: 'c4', contractorName: 'UAE Steel LLC', project: 'Desert Oasis Villas', contractValue: 'AED 86.0M', certifiedPct: 78, claimedPct: 76, variance: -2, billsSubmitted: 'AED 67.1M', billsApproved: 'AED 65.4M', performanceScore: 8, status: 'healthy' },
  { id: 'c5', contractorName: 'Gulf Elevators', project: 'Marina Heights Towers', contractValue: 'AED 48.0M', certifiedPct: 72, claimedPct: 74, variance: 2, billsSubmitted: 'AED 35.5M', billsApproved: 'AED 34.6M', performanceScore: 7, status: 'healthy' },
  { id: 'c6', contractorName: 'Al Masaood Power', project: 'Palm View Residences', contractValue: 'AED 64.0M', certifiedPct: 48, claimedPct: 50, variance: 2, billsSubmitted: 'AED 32.0M', billsApproved: 'AED 30.7M', performanceScore: 6, status: 'healthy' },
  { id: 'c7', contractorName: 'Transguard Security', project: 'All Projects', contractValue: 'AED 18.0M', certifiedPct: 100, claimedPct: 100, variance: 0, billsSubmitted: 'AED 18.0M', billsApproved: 'AED 18.0M', performanceScore: 8, status: 'healthy' },
  { id: 'c8', contractorName: 'Downtown Civil Works', project: 'Desert Oasis Villas', contractValue: 'AED 94.0M', certifiedPct: 61, claimedPct: 64, variance: 3, billsSubmitted: 'AED 60.2M', billsApproved: 'AED 57.3M', performanceScore: 7, status: 'healthy' },
];

export interface BudgetRow {
  siteId: string;
  projectName: string;
  category: string;
  budgeted: string;
  committed: string;
  actualSpent: string;
  forecastFinal: string;
  variance: string;
  status: 'green' | 'amber' | 'red';
}

export const budgetRows: BudgetRow[] = [
  { siteId: 's1', projectName: 'Marina Heights', category: 'Land', budgeted: '180.0', committed: '180.0', actualSpent: '180.0', forecastFinal: '180.0', variance: '0.0', status: 'green' },
  { siteId: 's1', projectName: 'Marina Heights', category: 'Civil', budgeted: '380.0', committed: '380.0', actualSpent: '372.0', forecastFinal: '378.0', variance: '-2.0', status: 'green' },
  { siteId: 's1', projectName: 'Marina Heights', category: 'MEP', budgeted: '210.0', committed: '210.0', actualSpent: '198.0', forecastFinal: '208.0', variance: '-2.0', status: 'green' },
  { siteId: 's1', projectName: 'Marina Heights', category: 'Finishing', budgeted: '180.0', committed: '165.0', actualSpent: '0.0', forecastFinal: '185.0', variance: '+5.0', status: 'amber' },
  { siteId: 's1', projectName: 'Marina Heights', category: 'Professional Fees', budgeted: '73.4', committed: '73.4', actualSpent: '44.0', forecastFinal: '73.4', variance: '0.0', status: 'green' },
  { siteId: 's2', projectName: 'Palm View', category: 'Land', budgeted: '160.0', committed: '160.0', actualSpent: '160.0', forecastFinal: '160.0', variance: '0.0', status: 'green' },
  { siteId: 's2', projectName: 'Palm View', category: 'Civil', budgeted: '290.0', committed: '290.0', actualSpent: '285.0', forecastFinal: '295.0', variance: '+5.0', status: 'amber' },
  { siteId: 's2', projectName: 'Palm View', category: 'MEP', budgeted: '160.0', committed: '160.0', actualSpent: '145.0', forecastFinal: '188.0', variance: '+28.0', status: 'red' },
  { siteId: 's2', projectName: 'Palm View', category: 'Finishing', budgeted: '30.2', committed: '0.0', actualSpent: '0.0', forecastFinal: '35.0', variance: '+4.8', status: 'amber' },
  { siteId: 's3', projectName: 'Desert Oasis', category: 'Land', budgeted: '120.0', committed: '120.0', actualSpent: '120.0', forecastFinal: '120.0', variance: '0.0', status: 'green' },
  { siteId: 's3', projectName: 'Desert Oasis', category: 'Civil', budgeted: '220.0', committed: '220.0', actualSpent: '172.0', forecastFinal: '225.0', variance: '+5.0', status: 'amber' },
  { siteId: 's3', projectName: 'Desert Oasis', category: 'MEP', budgeted: '98.0', committed: '0.0', actualSpent: '0.0', forecastFinal: '98.0', variance: '0.0', status: 'green' },
  { siteId: 's3', projectName: 'Desert Oasis', category: 'Contingency', budgeted: '50.0', committed: '20.0', actualSpent: '20.0', forecastFinal: '65.0', variance: '+15.0', status: 'red' },
  { siteId: 's3', projectName: 'Desert Oasis', category: 'Professional Fees', budgeted: '24.8', committed: '24.8', actualSpent: '0.0', forecastFinal: '24.8', variance: '0.0', status: 'green' },
];

export interface MismatchRow {
  id: string;
  unitNo: string;
  floor: string;
  project: string;
  soldDate: string;
  buyer: string;
  constructionStatus: string;
  handoverDue: string;
  handoverForecast: string;
  delayDays: number;
}

export const mismatchRows: MismatchRow[] = [
  { id: 'm1', unitNo: 'Villa 42', floor: 'N/A', project: 'Palm View Residences', soldDate: '12 Jan 2024', buyer: 'Al Maktoum Family Trust', constructionStatus: 'MEP not started', handoverDue: 'Q4 2025', handoverForecast: 'Q1 2027', delayDays: 180 },
  { id: 'm2', unitNo: 'Unit 1402', floor: '14', project: 'Palm View Residences', soldDate: '03 Feb 2024', buyer: 'Gulf Capital Partners', constructionStatus: 'MEP 12%', handoverDue: 'Q4 2025', handoverForecast: 'Q1 2027', delayDays: 165 },
  { id: 'm3', unitNo: 'Unit 0804', floor: '8', project: 'Palm View Residences', soldDate: '18 Feb 2024', buyer: 'Emirates NBD Private', constructionStatus: 'MEP 18%', handoverDue: 'Q4 2025', handoverForecast: 'Q4 2026', delayDays: 120 },
  { id: 'm4', unitNo: 'Unit 1201', floor: '12', project: 'Palm View Residences', soldDate: '25 Feb 2024', buyer: 'Al Habtoor Family Office', constructionStatus: 'MEP 22%', handoverDue: 'Q4 2025', handoverForecast: 'Q4 2026', delayDays: 110 },
  { id: 'm5', unitNo: 'Villa 15', floor: 'N/A', project: 'Palm View Residences', soldDate: '01 Mar 2024', buyer: 'Majid Al Futtaim Ventures', constructionStatus: 'Structure 90%', handoverDue: 'Q4 2025', handoverForecast: 'Q1 2027', delayDays: 95 },
  { id: 'm6', unitNo: 'Unit 0502', floor: '5', project: 'Palm View Residences', soldDate: '10 Mar 2024', buyer: 'Riyadh Wealth Partners', constructionStatus: 'MEP 28%', handoverDue: 'Q4 2025', handoverForecast: 'Q1 2027', delayDays: 90 },
  { id: 'm7', unitNo: 'Unit 1803', floor: '18', project: 'Palm View Residences', soldDate: '15 Mar 2024', buyer: 'Mubadala Real Estate', constructionStatus: 'MEP 30%', handoverDue: 'Q4 2025', handoverForecast: 'Q4 2026', delayDays: 75 },
  { id: 'm8', unitNo: 'Villa 08', floor: 'N/A', project: 'Palm View Residences', soldDate: '20 Mar 2024', buyer: 'Al Futtaim Family Office', constructionStatus: 'Structure 95%', handoverDue: 'Q4 2025', handoverForecast: 'Q1 2027', delayDays: 70 },
];

export interface ConstructionComplianceItem {
  date: string;
  label: string;
  project: string;
  color: 'red' | 'amber' | 'grey';
}

export const constructionCompliance: ConstructionComplianceItem[] = [
  { date: 'TODAY', label: 'Escrow reconciliation overdue (32 days)', project: 'Palm View', color: 'red' },
  { date: '15 May', label: 'QPR deadline — Palm View RERA', project: 'Palm View', color: 'amber' },
  { date: '22 May', label: 'Escrow Account Reconciliation', project: 'Palm View', color: 'amber' },
  { date: '28 May', label: 'DLD construction progress submission', project: 'Marina Heights', color: 'amber' },
  { date: '10 Jun', label: 'DLD construction progress submission', project: 'Desert Oasis', color: 'grey' },
  { date: '30 Jun', label: 'Handover notice — Marina Heights Q4 2025', project: 'Marina Heights', color: 'grey' },
  { date: '15 Aug', label: 'QPR deadline — Palm View RERA', project: 'Palm View', color: 'grey' },
  { date: '15 Aug', label: 'IFRS 15 Q2 filing (construction-linked)', project: 'All Projects', color: 'grey' },
];

export interface ConstructionAiInsight {
  level: 'critical' | 'warning' | 'opportunity';
  icon: string;
  title: string;
  body: string;
  buttonText: string;
}

export const constructionAiInsights: ConstructionAiInsight[] = [
  {
    level: 'critical',
    icon: '🚨',
    title: 'Palm View MEP Payment Mismatch — AED 18.2M',
    body: 'Gulf MEP Solutions has certified 34% but claimed 52% — AED 18.2M payment mismatch detected. Do not release payment pending re-certification. Overbilling pattern detected across 3 invoices.',
    buttonText: 'Review Now →',
  },
  {
    level: 'warning',
    icon: '⚠️',
    title: 'Desert Oasis Cash Pressure — Week of 30 Jun 2026',
    body: 'Capital Call of AED 180M coincides with AED 45M contractor payments. Net cash requirement AED 225M vs projected position AED 186M. Recommend staggering non-critical contractor payments by 2 weeks.',
    buttonText: 'View Cash Flow →',
  },
  {
    level: 'opportunity',
    icon: '💡',
    title: 'Marina Heights 4% Ahead of Schedule',
    body: 'MEP completion could finish 3 weeks early. Early MEP completion could unlock IFRS 15 revenue recognition of AED 86M in Q3 2026 — coordinate with finance team to align POB milestone.',
    buttonText: 'View Project →',
  },
];

export const budgetTotals = {
  budgeted: '2,130.2',
  committed: '1,980.0',
  actualSpent: '1,436.0',
  forecastFinal: '2,188.2',
  variance: '+58.0',
};
