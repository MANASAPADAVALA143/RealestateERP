import { BrowserRouter, Navigate, Route, Routes, useParams } from "react-router-dom";
import { AppShell } from "@/components/AppShell";
import { AlertsPage } from "@/pages/AlertsPage";
import { ApprovalsPage } from "@/pages/ApprovalsPage";
import { AssetsPage } from "@/pages/AssetsPage";
import { CashPage } from "@/pages/CashPage";
import { CapitalCallsPage } from "@/pages/CapitalCallsPage";
import { CompaniesPage } from "@/pages/CompaniesPage";
import { CompanyAssetsPage } from "@/pages/CompanyAssetsPage";
import { CompanyDashboardPage } from "@/pages/CompanyDashboardPage";
import { CompanyInsurancePage } from "@/pages/CompanyInsurancePage";
import { CompanyLoansPage } from "@/pages/CompanyLoansPage";
import { CompanyOwnershipPage } from "@/pages/CompanyOwnershipPage";
import { CompanySnapshotPage } from "@/pages/CompanySnapshotPage";
import { CompanyStatementsPage } from "@/pages/CompanyStatementsPage";
import { ActionsPage } from "@/pages/ActionsPage";
import { CashWarRoomPage } from "@/pages/CashWarRoomPage";
import { DashboardPage } from "@/pages/DashboardPage";
import { DecisionSimulatorPage } from "@/pages/DecisionSimulatorPage";
import { ReceivablesPage } from "@/pages/ReceivablesPage";
import { HrPayrollPage } from "@/pages/HrPayrollPage";
import { InsurancePage } from "@/pages/InsurancePage";
import { InventoryPage } from "@/pages/InventoryPage";
import { LoanDetailPage } from "@/pages/LoanDetailPage";
import { LoanEditPage } from "@/pages/LoanEditPage";
import { LoansPage } from "@/pages/LoansPage";
import { RentalPropertyPage } from "@/pages/RentalPropertyPage";
import { RentalsPage } from "@/pages/RentalsPage";
import { OwnershipPage } from "@/pages/OwnershipPage";
import { ProcurementPage } from "@/pages/ProcurementPage";
import { ProjectsCapexPage } from "@/pages/ProjectsCapexPage";
import { SalesPipelinePage } from "@/pages/SalesPipelinePage";
import { SnapshotPage } from "@/pages/SnapshotPage";
import { StatementsPage } from "@/pages/StatementsPage";
import { CommandCenterPage as EstateCommandCenterPage } from "@/estate/pages/CommandCenterPage";
import { ConstructionControlTowerPage } from "@/estate/pages/ConstructionControlTowerPage";
import { DashboardPage as EstateDashboardPage } from "@/estate/pages/DashboardPage";
import { FinancialOverviewPage } from "@/estate/pages/FinancialOverviewPage";
import { FundManagementPage } from "@/estate/pages/FundManagementPage";
import { IfrsHubPage } from "@/estate/pages/IfrsHubPage";
import { LandingPage as EstateLandingPage } from "@/estate/pages/LandingPage";
import { LoginPage as EstateLoginPage } from "@/estate/pages/LoginPage";
import { ProjectsPage as EstateProjectsPage } from "@/estate/pages/ProjectsPage";
import { ReAssetsPage } from "@/realestate/pages/ReAssetsPage";
import { ReCapitalCallsPage } from "@/realestate/pages/ReCapitalCallsPage";
import { ReDashboardPage } from "@/realestate/pages/ReDashboardPage";
import { ReInsurancePage } from "@/realestate/pages/ReInsurancePage";
import { ReLoansPage } from "@/realestate/pages/ReLoansPage";
import { ReOwnershipPage } from "@/realestate/pages/ReOwnershipPage";
import { RePropertiesPage } from "@/realestate/pages/RePropertiesPage";
import { ReSnapshotPage } from "@/realestate/pages/ReSnapshotPage";
import { ReAccountsPayablePage, ReAccountsReceivablePage, ReStatementsPage, ReTreasuryPage } from "@/realestate/pages/ReImportedPages";
import { AnalystPage } from "@/integrations/pages/AnalystPage";
import { ErpConnectorsPage } from "@/integrations/pages/ErpConnectorsPage";
import { ExcelImportPage } from "@/integrations/pages/ExcelImportPage";
import { SyncMonitoringPage } from "@/integrations/pages/SyncMonitoringPage";
import { FieldMappingPage } from "@/integrations/pages/FieldMappingPage";
import { ImportHistoryPage, ImportJobPage } from "@/integrations/pages/ImportHistoryPage";
import { IntegrationDashboardPage } from "@/integrations/pages/IntegrationDashboardPage";
import { IntegrationSettingsPage } from "@/integrations/pages/IntegrationSettingsPage";
import { ReconciliationPage } from "@/integrations/pages/ReconciliationPage";
import { ValidationPage } from "@/integrations/pages/ValidationPage";
import { YardiPage } from "@/integrations/pages/YardiPage";
import { RentalOsShell } from "@/rental-os/RentalOsShell";
import { CommandCentrePage } from "@/rental-os/pages/CommandCentrePage";
import { MaintenanceDashboard } from "@/ops/ui/MaintenanceDashboard";
import { MaintenanceRequestsPage, NewMaintenanceRequestPage } from "@/ops/ui/MaintenanceRequestsPage";
import { WorkOrdersPage, NewWorkOrderPage } from "@/ops/ui/WorkOrdersPage";
import { PreventiveMaintenancePage } from "@/ops/ui/PreventiveMaintenancePage";
import { AssetRegisterPage } from "@/ops/ui/AssetRegisterPage";
import { VendorsPage, NewVendorPage } from "@/ops/ui/VendorsPage";
import { ContractsPage } from "@/ops/ui/ContractsPage";
import { RequisitionsPage, NewRequisitionPage, PurchaseOrdersPage, GoodsReceiptsPage } from "@/ops/ui/ProcurementPages";
import { OpsReportsPage } from "@/ops/ui/OpsReportsPage";
// Phase 6 — Finance & Accounting OS
import { FinDashboard } from "@/fin/ui/FinDashboard";
import { VendorInvoicesPage, NewVendorInvoicePage, VendorInvoiceDetailPage } from "@/fin/ui/VendorInvoicesPage";
import { APPaymentsPage, NewAPPaymentPage } from "@/fin/ui/APPaymentsPage";
import { JournalsPage, NewJournalPage, JournalDetailPage } from "@/fin/ui/JournalsPage";
import { ChartOfAccountsPage } from "@/fin/ui/ChartOfAccountsPage";
import { PeriodClosingPage } from "@/fin/ui/PeriodClosingPage";
import { BankReconPage } from "@/fin/ui/BankReconPage";
import { TrialBalancePage, PnLPage, BalanceSheetPage } from "@/fin/ui/GLReportsPage";
import { PropertiesPage } from "@/rental-os/pages/PropertiesPage";
import { UnitsPage } from "@/rental-os/pages/UnitsPage";
import { TenantsPage } from "@/rental-os/pages/TenantsPage";
import { LeasesPage } from "@/rental-os/pages/LeasesPage";
// MaintenancePage replaced by Phase 5 MaintenanceDashboard
import { BillingDashboardPage } from "@/rental-os/pages/BillingDashboardPage";
import { CollectionsSummaryPage } from "@/rental-os/pages/CollectionsSummaryPage";
import { PaymentDashboardPage } from "@/rental-os/pages/PaymentDashboardPage";
import { CreateReceiptPage } from "@/rental-os/pages/CreateReceiptPage";
import { BankImportPage } from "@/rental-os/pages/BankImportPage";
import { BankReconciliationPage } from "@/rental-os/pages/BankReconciliationPage";
import { DepositRegisterPage } from "@/rental-os/pages/DepositRegisterPage";
import { TenantSettlementPage } from "@/rental-os/pages/TenantSettlementPage";
import { ArDashboardPage } from "@/ar/pages/ArDashboardPage";
import { TenantDetailPage, TenantRegisterPage } from "@/ar/pages/TenantPages";
import { LeaseReceivablesPage } from "@/ar/pages/LeasePage";
import { RentalBillingPage } from "@/ar/pages/BillingPage";
import { InvoiceDetailPage, InvoiceRegisterPage } from "@/ar/pages/InvoicePages";
import { PaymentAllocationPage } from "@/ar/pages/PaymentsPage";
import { ArAgeingPage } from "@/ar/pages/AgeingPage";
import { CollectionsPage, DisputesPage } from "@/ar/pages/CollectionsPages";
import { ArReportsPage } from "@/ar/pages/ReportsPage";
import { ArSettingsPage } from "@/ar/pages/SettingsPage";
import { ExecutiveDashboard } from "@/analytics/ui/ExecutiveDashboard";
import { ArAgingPage } from "@/analytics/ui/ArAgingPage";
import { RevExpTrendPage } from "@/analytics/ui/RevExpTrendPage";
import { OccupancyPage } from "@/analytics/ui/OccupancyPage";
import { MaintCostPage } from "@/analytics/ui/MaintCostPage";

function InvoiceDetailRoute() {
  const { id } = useParams<{ id: string }>();
  return <VendorInvoiceDetailPage id={id!} />;
}

function JournalDetailRoute() {
  const { id } = useParams<{ id: string }>();
  return <JournalDetailPage id={id!} />;
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<AppShell />}>
          <Route path="/" element={<DashboardPage />} />
          <Route path="/companies" element={<CompaniesPage />} />
          <Route path="/companies/:entityId" element={<CompanyDashboardPage />} />
          <Route path="/companies/:entityId/snapshot" element={<CompanySnapshotPage />} />
          <Route path="/companies/:entityId/statements" element={<CompanyStatementsPage />} />
          <Route path="/companies/:entityId/loans" element={<CompanyLoansPage />} />
          <Route path="/companies/:entityId/loans/:loanId" element={<LoanDetailPage />} />
          <Route path="/companies/:entityId/assets" element={<CompanyAssetsPage />} />
          <Route path="/companies/:entityId/insurance" element={<CompanyInsurancePage />} />
          <Route path="/companies/:entityId/ownership" element={<CompanyOwnershipPage />} />
          <Route path="/companies/:entityId/capital-calls" element={<CapitalCallsPage />} />
          <Route path="/rentals" element={<RentalsPage />} />
          <Route path="/rentals/:propertyId" element={<RentalPropertyPage />} />
          <Route path="/cash" element={<CashPage />} />
          <Route path="/cash-war-room" element={<CashWarRoomPage />} />
          <Route path="/receivables" element={<ReceivablesPage />} />
          <Route path="/actions" element={<ActionsPage />} />
          <Route path="/decision-simulator" element={<DecisionSimulatorPage />} />
          <Route path="/ownership" element={<OwnershipPage />} />
          <Route path="/loans" element={<LoansPage />} />
          <Route path="/loans/:loanId" element={<LoanDetailPage />} />
          <Route path="/loans/:loanId/edit" element={<LoanEditPage />} />
          <Route path="/insurance" element={<InsurancePage />} />
          <Route path="/statements" element={<StatementsPage />} />
          <Route path="/snapshot" element={<SnapshotPage />} />
          <Route path="/assets" element={<AssetsPage />} />
          <Route path="/sales" element={<SalesPipelinePage />} />
          <Route path="/procurement" element={<ProcurementPage />} />
          <Route path="/inventory" element={<InventoryPage />} />
          <Route path="/hr" element={<HrPayrollPage />} />
          <Route path="/capex" element={<ProjectsCapexPage />} />
          <Route path="/approvals" element={<ApprovalsPage />} />
          <Route path="/alerts" element={<AlertsPage />} />
          <Route path="/estate/dashboard" element={<EstateDashboardPage />} />
          <Route path="/estate/command-center" element={<EstateCommandCenterPage />} />
          <Route path="/estate/financial-overview" element={<FinancialOverviewPage />} />
          <Route path="/estate/projects" element={<EstateProjectsPage />} />
          <Route path="/estate/construction" element={<ConstructionControlTowerPage />} />
          <Route path="/estate/fund-management" element={<FundManagementPage />} />
          <Route path="/estate/ifrs" element={<IfrsHubPage />} />
          <Route path="/estate/ar" element={<ArDashboardPage />} />
          <Route path="/estate/ar/tenants" element={<TenantRegisterPage />} />
          <Route path="/estate/ar/tenants/:tenantId" element={<TenantDetailPage />} />
          <Route path="/estate/ar/leases" element={<LeaseReceivablesPage />} />
          <Route path="/estate/ar/billing" element={<RentalBillingPage />} />
          <Route path="/estate/ar/invoices" element={<InvoiceRegisterPage />} />
          <Route path="/estate/ar/invoices/:invoiceId" element={<InvoiceDetailPage />} />
          <Route path="/estate/ar/payments" element={<PaymentAllocationPage />} />
          <Route path="/estate/ar/ageing" element={<ArAgeingPage />} />
          <Route path="/estate/ar/collections" element={<CollectionsPage />} />
          <Route path="/estate/ar/disputes" element={<DisputesPage />} />
          <Route path="/estate/ar/reports" element={<ArReportsPage />} />
          <Route path="/estate/ar/settings" element={<ArSettingsPage />} />
          <Route path="/gnanova/realestate" element={<Navigate to="/gnanova/realestate/dashboard" replace />} />
          <Route path="/gnanova/realestate/dashboard" element={<ReDashboardPage />} />
          <Route path="/gnanova/realestate/properties" element={<RePropertiesPage />} />
          <Route path="/gnanova/realestate/loans" element={<ReLoansPage />} />
          <Route path="/gnanova/realestate/assets" element={<ReAssetsPage />} />
          <Route path="/gnanova/realestate/insurance" element={<ReInsurancePage />} />
          <Route path="/gnanova/realestate/ownership" element={<ReOwnershipPage />} />
          <Route path="/gnanova/realestate/capital-calls" element={<ReCapitalCallsPage />} />
          <Route path="/gnanova/realestate/financial-snapshot" element={<ReSnapshotPage />} />
          <Route path="/gnanova/realestate/accounts-payable" element={<ReAccountsPayablePage />} />
          <Route path="/gnanova/realestate/accounts-receivable" element={<ReAccountsReceivablePage />} />
          <Route path="/gnanova/realestate/treasury" element={<ReTreasuryPage />} />
          <Route path="/gnanova/realestate/statements" element={<ReStatementsPage />} />
          <Route path="/gnanova/integrations" element={<Navigate to="/data-integrations" replace />} />
          <Route path="/data-integrations" element={<IntegrationDashboardPage />} />
          <Route path="/data-integrations/erp" element={<ErpConnectorsPage />} />
          <Route path="/data-integrations/yardi" element={<YardiPage />} />
          <Route path="/data-integrations/sync" element={<SyncMonitoringPage />} />
          <Route path="/data-integrations/import" element={<ExcelImportPage />} />
          <Route path="/data-integrations/mapping" element={<FieldMappingPage />} />
          <Route path="/data-integrations/validation" element={<ValidationPage />} />
          <Route path="/data-integrations/reconciliation" element={<ReconciliationPage />} />
          <Route path="/data-integrations/history" element={<ImportHistoryPage />} />
          <Route path="/data-integrations/history/:jobId" element={<ImportJobPage />} />
          <Route path="/data-integrations/settings" element={<IntegrationSettingsPage />} />
          <Route path="/ai-analyst" element={<AnalystPage />} />
        </Route>
        {/* Rental OS — separate shell */}
        <Route path="/rental-os" element={<RentalOsShell />}>
          <Route index element={<Navigate to="/rental-os/command-centre" replace />} />
          <Route path="command-centre" element={<CommandCentrePage />} />
          <Route path="properties" element={<PropertiesPage />} />
          <Route path="properties/:id" element={<PropertiesPage />} />
          <Route path="units" element={<UnitsPage />} />
          <Route path="tenants" element={<TenantsPage />} />
          <Route path="tenants/:id" element={<TenantsPage />} />
          <Route path="leases" element={<LeasesPage />} />
          <Route path="leases/:id" element={<LeasesPage />} />
          {/* Phase 5 — Maintenance */}
          <Route path="maintenance" element={<MaintenanceDashboard />} />
          <Route path="maintenance/requests" element={<MaintenanceRequestsPage />} />
          <Route path="maintenance/requests/new" element={<NewMaintenanceRequestPage />} />
          <Route path="maintenance/requests/:id" element={<MaintenanceRequestsPage />} />
          <Route path="maintenance/work-orders" element={<WorkOrdersPage />} />
          <Route path="maintenance/work-orders/new" element={<NewWorkOrderPage />} />
          <Route path="maintenance/work-orders/:id" element={<WorkOrdersPage />} />
          <Route path="maintenance/preventive" element={<PreventiveMaintenancePage />} />
          {/* Phase 5 — Facilities */}
          <Route path="facilities/assets" element={<AssetRegisterPage />} />
          <Route path="facilities/assets/new" element={<AssetRegisterPage />} />
          <Route path="facilities/assets/:id" element={<AssetRegisterPage />} />
          {/* Phase 5 — Vendors */}
          <Route path="vendors" element={<VendorsPage />} />
          <Route path="vendors/new" element={<NewVendorPage />} />
          <Route path="vendors/:id" element={<VendorsPage />} />
          <Route path="vendors/contracts" element={<ContractsPage />} />
          <Route path="vendors/contracts/new" element={<ContractsPage />} />
          <Route path="vendors/contracts/:id" element={<ContractsPage />} />
          {/* Phase 5 — Procurement */}
          <Route path="procurement/requisitions" element={<RequisitionsPage />} />
          <Route path="procurement/requisitions/new" element={<NewRequisitionPage />} />
          <Route path="procurement/requisitions/:id" element={<RequisitionsPage />} />
          <Route path="procurement/purchase-orders" element={<PurchaseOrdersPage />} />
          <Route path="procurement/purchase-orders/new" element={<PurchaseOrdersPage />} />
          <Route path="procurement/purchase-orders/:id" element={<PurchaseOrdersPage />} />
          <Route path="procurement/grn" element={<GoodsReceiptsPage />} />
          <Route path="procurement/grn/:id" element={<GoodsReceiptsPage />} />
          {/* Phase 5 — Reports */}
          <Route path="ops-reports" element={<OpsReportsPage />} />
          {/* Phase 7 — Analytics & Executive Dashboards */}
          <Route path="analytics" element={<ExecutiveDashboard />} />
          <Route path="analytics/ar-aging" element={<ArAgingPage />} />
          <Route path="analytics/revenue-trend" element={<RevExpTrendPage />} />
          <Route path="analytics/occupancy" element={<OccupancyPage />} />
          <Route path="analytics/maint-cost" element={<MaintCostPage />} />
          {/* Phase 6 — Finance & Accounting OS */}
          <Route path="finance" element={<FinDashboard />} />
          <Route path="finance/invoices" element={<VendorInvoicesPage />} />
          <Route path="finance/invoices/new" element={<NewVendorInvoicePage />} />
          <Route path="finance/invoices/:id" element={<InvoiceDetailRoute />} />
          <Route path="finance/payments" element={<APPaymentsPage />} />
          <Route path="finance/payments/new" element={<NewAPPaymentPage />} />
          <Route path="finance/journals" element={<JournalsPage />} />
          <Route path="finance/journals/new" element={<NewJournalPage />} />
          <Route path="finance/journals/:id" element={<JournalDetailRoute />} />
          <Route path="finance/accounts" element={<ChartOfAccountsPage />} />
          <Route path="finance/periods" element={<PeriodClosingPage />} />
          <Route path="finance/bank-recon" element={<BankReconPage />} />
          <Route path="finance/reports/trial-balance" element={<TrialBalancePage />} />
          <Route path="finance/reports/pnl" element={<PnLPage />} />
          <Route path="finance/reports/balance-sheet" element={<BalanceSheetPage />} />
          {/* Phase 3 — Billing & Collections (live AR integration) */}
          <Route path="billing" element={<BillingDashboardPage />} />
          <Route path="collections" element={<CollectionsSummaryPage />} />
          {/* Phase 4 — Payment Operations, Bank Reconciliation & Security Deposits */}
          <Route path="payments" element={<PaymentDashboardPage />} />
          <Route path="payments/create" element={<CreateReceiptPage />} />
          <Route path="bank" element={<BankImportPage />} />
          <Route path="reconciliation" element={<BankReconciliationPage />} />
          <Route path="deposits" element={<DepositRegisterPage />} />
          <Route path="deposits/refunds" element={<DepositRegisterPage />} />
          <Route path="settlement" element={<TenantSettlementPage />} />
          <Route path="occupancy" element={<Navigate to="/rental-os/units" replace />} />
        </Route>
        <Route path="/estate" element={<EstateLandingPage />} />
        <Route path="/estate/login" element={<EstateLoginPage />} />
      </Routes>
    </BrowserRouter>
  );
}
