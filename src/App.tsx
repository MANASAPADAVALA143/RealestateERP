import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
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
        <Route path="/estate" element={<EstateLandingPage />} />
        <Route path="/estate/login" element={<EstateLoginPage />} />
      </Routes>
    </BrowserRouter>
  );
}
