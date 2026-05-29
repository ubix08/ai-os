import { Routes, Route, Navigate } from 'react-router-dom'
import { AppShell } from './components/Layout'
import { DashboardPage } from './pages/DashboardPage'
import { LeadsPage } from './pages/LeadsPage'
import { ClientsPage } from './pages/ClientsPage'
import { ClientDetailPage } from './pages/ClientDetailPage'
import { ProjectsPage } from './pages/ProjectsPage'
import { ProjectDetailPage } from './pages/ProjectDetailPage'
import { TasksPage } from './pages/TasksPage'
import { ProposalsPage } from './pages/ProposalsPage'
import { NewProposalPage } from './pages/NewProposalPage'
import { ProposalEditorPage } from './pages/ProposalEditorPage'
import { InvoicesPage } from './pages/InvoicesPage'
import { InvoiceDetailPage } from './pages/InvoiceDetailPage'
import { PricingPage } from './pages/PricingPage'
import { AnalyticsPage } from './pages/AnalyticsPage'
import { SettingsPage } from './pages/SettingsPage'
import { AiPage } from './pages/AiPage'

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<AppShell />}>
        <Route index element={<DashboardPage />} />
        <Route path="clients" element={<ClientsPage />} />
        <Route path="clients/:id" element={<ClientDetailPage />} />
        <Route path="leads" element={<LeadsPage />} />
        <Route path="projects" element={<ProjectsPage />} />
        <Route path="projects/:id" element={<ProjectDetailPage />} />
        <Route path="tasks" element={<TasksPage />} />
        <Route path="proposals" element={<ProposalsPage />} />
        <Route path="proposals/new" element={<NewProposalPage />} />
        <Route path="proposals/:id" element={<ProposalEditorPage />} />
        <Route path="invoices" element={<InvoicesPage />} />
        <Route path="invoices/:id" element={<InvoiceDetailPage />} />
        <Route path="pricing" element={<PricingPage />} />
        <Route path="pricing/scope" element={<PricingPage />} />
        <Route path="analytics" element={<AnalyticsPage />} />
        <Route path="settings" element={<SettingsPage />} />
        <Route path="ai" element={<AiPage />} />
        <Route path="*" element={<div className="p-8 text-text-muted">Not Found</div>} />
      </Route>
    </Routes>
  )
}
