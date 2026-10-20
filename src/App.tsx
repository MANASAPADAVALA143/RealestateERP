import { BrowserRouter, Route, Routes } from "react-router-dom";
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
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
