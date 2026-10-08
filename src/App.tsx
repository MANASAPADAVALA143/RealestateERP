import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { LandingPage } from '@/pages/LandingPage';
import { LoginPage } from '@/pages/LoginPage';
import { DashboardPage } from '@/pages/DashboardPage';
import { FundManagementPage } from '@/pages/FundManagementPage';
import { IfrsHubPage } from '@/pages/IfrsHubPage';
import { ProjectsPage } from '@/pages/ProjectsPage';
import { CommandCenterPage } from '@/pages/CommandCenterPage';
import { FinancialOverviewPage } from '@/pages/FinancialOverviewPage';
import { ConstructionControlTowerPage } from '@/pages/ConstructionControlTowerPage';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/dashboard" element={<DashboardPage />} />
        <Route path="/projects" element={<ProjectsPage />} />
        <Route path="/command-center" element={<CommandCenterPage />} />
        <Route path="/financial-overview" element={<FinancialOverviewPage />} />
        <Route path="/construction" element={<ConstructionControlTowerPage />} />
        <Route path="/fund-management" element={<FundManagementPage />} />
        <Route path="/ifrs" element={<IfrsHubPage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
