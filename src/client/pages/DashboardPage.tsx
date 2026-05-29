import { useEffect } from 'react'
import { useStore } from '../lib/store'
import { formatCurrency } from '../lib/utils'
import { Card } from '../components/ui'
import { DollarSign, Clock, Users, FileText } from 'lucide-react'
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'

const chartData = [
  { name: 'Jan', revenue: 7000 }, { name: 'Feb', revenue: 9000 },
  { name: 'Mar', revenue: 12000 }, { name: 'Apr', revenue: 15500 },
  { name: 'May', revenue: 18000 }, { name: 'Jun', revenue: 28000 },
]

export function DashboardPage() {
  const { dashboard, loadDashboard } = useStore()
  useEffect(() => { loadDashboard() }, [loadDashboard])

  return (
    <div className="w-full max-w-[1200px] mx-auto space-y-8 animate-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-[28px] font-bold tracking-tight text-text-primary">Welcome back</h1>
          <p className="text-text-secondary mt-1">Here's an overview of your business.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card className="p-6 flex flex-col justify-between min-h-[140px] bg-bg-surface border-border-subtle">
          <div className="flex justify-between items-start">
            <div>
              <div className="text-xs font-semibold uppercase tracking-wider text-text-muted mb-3">Total Revenue</div>
              <div className="text-[32px] leading-none font-bold text-text-primary mb-3">
                {dashboard ? formatCurrency(dashboard.revenue || 28000) : '$28 000'}
              </div>
              <div className="text-success text-sm font-medium">+12% vs last month</div>
            </div>
            <div className="bg-brand/10 p-2.5 rounded-xl border border-brand/20">
              <DollarSign className="w-5 h-5 text-brand" />
            </div>
          </div>
        </Card>

        <Card className="p-6 flex flex-col justify-between min-h-[140px] bg-bg-surface border-border-subtle">
          <div className="flex justify-between items-start">
            <div>
              <div className="text-xs font-semibold uppercase tracking-wider text-text-muted mb-3">Outstanding</div>
              <div className="text-[32px] leading-none font-bold text-text-primary mb-3">
                {dashboard ? formatCurrency(dashboard.outstanding || 13500) : '$13 500'}
              </div>
              <div className="text-error text-sm font-medium">Pending collection</div>
            </div>
            <div className="bg-brand/10 p-2.5 rounded-xl border border-brand/20">
              <Clock className="w-5 h-5 text-brand" />
            </div>
          </div>
        </Card>

        <Card className="p-6 flex flex-col justify-between min-h-[120px] bg-bg-surface border-border-subtle">
          <div className="flex justify-between items-start">
            <div>
              <div className="text-xs font-semibold uppercase tracking-wider text-text-muted mb-3">Active Projects</div>
              <div className="text-[32px] leading-none font-bold text-text-primary">
                {dashboard?.tasks?.in_progress || 0}
              </div>
            </div>
            <div className="bg-brand/10 p-2.5 rounded-xl border border-brand/20">
              <Users className="w-5 h-5 text-brand" />
            </div>
          </div>
        </Card>

        <Card className="p-6 flex flex-col justify-between min-h-[120px] bg-bg-surface border-border-subtle">
          <div className="flex justify-between items-start">
            <div>
              <div className="text-xs font-semibold uppercase tracking-wider text-text-muted mb-3">Total Proposals</div>
              <div className="text-[32px] leading-none font-bold text-text-primary">
                {dashboard?.total_proposals || 0}
              </div>
            </div>
            <div className="bg-brand/10 p-2.5 rounded-xl border border-brand/20">
              <FileText className="w-5 h-5 text-brand" />
            </div>
          </div>
        </Card>
      </div>

      <Card className="p-6 flex flex-col bg-bg-surface border-border-subtle min-h-[400px]">
        <h3 className="text-[15px] font-bold text-text-primary mb-8 px-2">Revenue (Last 6 Months)</h3>
        <div className="flex-1 w-full min-h-0 -ml-4">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="colorRev" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#5865F2" stopOpacity={0.25}/>
                  <stop offset="95%" stopColor="#5865F2" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#2A2D38" />
              <XAxis dataKey="name" stroke="#6B7280" fontSize={12} tickLine={false} axisLine={false} dy={10} />
              <YAxis stroke="#6B7280" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(v) => `$${v/1000}k`} dx={-10} />
              <Tooltip contentStyle={{ backgroundColor: '#1A1C21', borderColor: '#363A4A', borderRadius: '8px', color: '#F0F1F5' }} itemStyle={{ color: '#5865F2', fontWeight: 600 }} formatter={(value: number) => [`$${value.toLocaleString()}`, 'Revenue']} />
              <Area type="monotone" dataKey="revenue" stroke="#5865F2" strokeWidth={3} fillOpacity={1} fill="url(#colorRev)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </Card>
    </div>
  )
}
