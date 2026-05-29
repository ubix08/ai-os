import { useEffect } from 'react'
import { useStore } from '../lib/store'
import { Card } from '../components/ui'
import { formatCurrency } from '../lib/utils'
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, Legend } from 'recharts'

const mockRevenueData = [
  { name: 'Jan', revenue: 7000 }, { name: 'Feb', revenue: 9000 },
  { name: 'Mar', revenue: 12000 }, { name: 'Apr', revenue: 15500 },
  { name: 'May', revenue: 18000 }, { name: 'Jun', revenue: 28000 },
]

const mockProfitabilityData = [
  { name: 'Acme Corp', margin: 85, cost: 15 },
  { name: 'Startup IO', margin: 60, cost: 40 },
  { name: 'Design Co', margin: 90, cost: 10 },
  { name: 'Alpha Inc', margin: 45, cost: 55 },
]

export function AnalyticsPage() {
  const { clients, invoices, loadClients, loadInvoices } = useStore()

  useEffect(() => { loadClients(); loadInvoices() }, [loadClients, loadInvoices])

  return (
    <div className="max-w-[1200px] mx-auto space-y-8 animate-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Analytics</h1>
          <p className="text-text-secondary mt-1">Deep dive into your financial health.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card className="p-6 flex flex-col bg-bg-surface border-border-subtle h-[350px]">
          <h3 className="text-[15px] font-bold text-text-primary mb-6 px-2 text-center">Revenue Projection</h3>
          <div className="flex-1 w-full min-h-0 -ml-4">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={mockRevenueData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorRev2" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10B981" stopOpacity={0.25}/>
                    <stop offset="95%" stopColor="#10B981" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#2A2D38" />
                <XAxis dataKey="name" stroke="#6B7280" fontSize={12} tickLine={false} axisLine={false} dy={10} />
                <YAxis stroke="#6B7280" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(v) => `$${v/1000}k`} dx={-10} />
                <Tooltip contentStyle={{ backgroundColor: '#1A1C21', borderColor: '#363A4A', borderRadius: '8px', color: '#F0F1F5' }} itemStyle={{ color: '#10B981', fontWeight: 600 }} formatter={(value: number) => [`$${value.toLocaleString()}`, 'Revenue']} />
                <Area type="monotone" dataKey="revenue" stroke="#10B981" strokeWidth={3} fillOpacity={1} fill="url(#colorRev2)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card className="p-6 flex flex-col bg-bg-surface border-border-subtle h-[350px]">
          <h3 className="text-[15px] font-bold text-text-primary mb-6 px-2 text-center">Client Margin Overview</h3>
          <div className="flex-1 w-full min-h-0 -ml-4">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={mockProfitabilityData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#2A2D38" />
                <XAxis dataKey="name" stroke="#6B7280" fontSize={12} tickLine={false} axisLine={false} dy={10} />
                <YAxis stroke="#6B7280" fontSize={12} tickLine={false} axisLine={false} dx={-10} />
                <Tooltip contentStyle={{ backgroundColor: '#1A1C21', borderColor: '#363A4A', borderRadius: '8px', color: '#F0F1F5' }} cursor={{fill: '#2A2D38', opacity: 0.4}} />
                <Legend />
                <Bar dataKey="margin" stackId="a" fill="#5865F2" name="Profit Margin (%)" radius={[0, 0, 4, 4]} />
                <Bar dataKey="cost" stackId="a" fill="#EF4444" name="Effective Cost (%)" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </div>

      <Card className="p-0 overflow-hidden">
        <div className="p-6 border-b border-border-subtle">
          <h3 className="font-semibold text-lg">Client Breakdown</h3>
        </div>
        <table className="w-full text-sm text-left">
          <thead className="bg-bg-elevated border-b border-border-subtle uppercase text-xs tracking-wider text-text-muted">
            <tr>
              <th className="px-6 py-4 font-semibold">Client</th>
              <th className="px-6 py-4 font-semibold">Invoices</th>
              <th className="px-6 py-4 font-semibold">Profitability Score</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border-subtle">
            {clients.map((c: any) => (
              <tr key={c.id} className="hover:bg-bg-overlay/50 transition-colors">
                <td className="px-6 py-4 font-medium text-text-primary">{c.name}</td>
                <td className="px-6 py-4 text-text-secondary">
                  {invoices.filter((i: any) => i.client_id === c.id).length} Invoice(s)
                </td>
                <td className="px-6 py-4">
                  <span className="text-brand font-medium">{c.profitability_score || 0}/100</span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </div>
  )
}
