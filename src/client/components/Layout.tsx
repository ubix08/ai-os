import { Link, Outlet, useLocation } from 'react-router-dom'
import {
  LayoutDashboard, Users, FileText, ReceiptText, DollarSign, Settings,
  Search, Zap, Target, FolderClosed, TrendingUp, Sparkles, ChevronLeft,
  Brain, CheckSquare
} from 'lucide-react'
import { cn } from '../lib/utils'

const NAV_ITEMS = [
  { id: 'dashboard', label: 'Dashboard', path: '/', icon: LayoutDashboard },
  { id: 'clients', label: 'Clients', path: '/clients', icon: Users },
  { id: 'leads', label: 'Leads', path: '/leads', icon: Target },
  { id: 'projects', label: 'Projects', path: '/projects', icon: FolderClosed },
  { id: 'tasks', label: 'Tasks', path: '/tasks', icon: CheckSquare },
  { id: 'proposals', label: 'Proposals', path: '/proposals', icon: FileText },
  { id: 'invoices', label: 'Invoices', path: '/invoices', icon: ReceiptText },
  { id: 'pricing', label: 'Pricing', path: '/pricing', icon: DollarSign },
  { id: 'analytics', label: 'Analytics', path: '/analytics', icon: TrendingUp },
  { id: 'scope-analysis', label: 'Scope Analysis', path: '/pricing/scope', icon: Sparkles },
  { id: 'ai', label: 'AI Copilot', path: '/ai', icon: Brain },
]

export function AppShell() {
  const location = useLocation()
  const pageTitle = NAV_ITEMS.find(
    (item) => item.path === location.pathname || (item.path !== '/' && location.pathname.startsWith(item.path))
  )?.label || 'Dashboard'

  return (
    <div className="flex h-screen overflow-hidden bg-bg-base text-text-primary">
      <aside className="w-[240px] flex-shrink-0 border-r border-border-subtle flex flex-col bg-bg-base">
        <div className="h-[60px] flex items-center px-4 shrink-0 gap-3">
          <div className="w-7 h-7 rounded bg-brand flex items-center justify-center">
            <Zap className="w-4 h-4 text-white fill-white" />
          </div>
          <span className="font-bold text-md tracking-tight">FreelancerOS</span>
        </div>
        <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-1">
          {NAV_ITEMS.map((item) => {
            const isActive = location.pathname === item.path ||
              (item.path !== '/' && location.pathname.startsWith(item.path))
            return (
              <Link
                key={item.id}
                to={item.path}
                className={cn(
                  'flex items-center gap-3 px-3 py-2.5 rounded-md text-sm font-medium transition-colors',
                  isActive
                    ? 'bg-bg-overlay text-text-primary relative before:absolute before:-left-3 before:top-2 before:bottom-2 before:w-1 before:bg-brand before:rounded-r-full'
                    : 'text-text-secondary hover:bg-bg-surface hover:text-text-primary'
                )}
              >
                <item.icon className={cn('w-4 h-4 shrink-0', isActive ? 'text-brand' : 'text-text-secondary')} />
                {item.label}
              </Link>
            )
          })}
        </nav>
        <div className="p-3 space-y-1 mb-2 border-t border-border-subtle pt-4">
          <Link to="/settings" className="flex items-center gap-3 w-full px-3 py-2 text-sm text-text-secondary hover:text-text-primary hover:bg-bg-surface rounded-md transition-colors font-medium">
            <Settings className="w-4 h-4" />
            Settings
          </Link>
        </div>
      </aside>

      <main className="flex-1 flex flex-col overflow-hidden">
        <header className="h-[60px] shrink-0 border-b border-border-subtle bg-bg-base/80 backdrop-blur flex items-center justify-between px-8 sticky top-0 z-10 w-full">
          <h2 className="font-bold text-text-primary">{pageTitle}</h2>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-3 text-sm font-medium border border-border-subtle rounded-md px-3 py-1.5 text-text-secondary hover:bg-bg-surface cursor-text transition-all bg-bg-base">
              <Search className="w-4 h-4 text-text-muted" />
              <input type="text" placeholder="Search" className="bg-transparent border-none outline-none text-sm w-32 placeholder:text-text-muted text-text-primary" />
            </div>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto p-8 relative">
          <Outlet />
        </div>
      </main>
    </div>
  )
}
