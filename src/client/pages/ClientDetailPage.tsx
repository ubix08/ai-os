import { useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useStore } from '../lib/store'
import { Button, Card } from '../components/ui'
import { formatCurrency } from '../lib/utils'
import { format } from 'date-fns'
import { ArrowLeft } from 'lucide-react'

export function ClientDetailPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { clients, invoices, proposals, loadClients, loadInvoices, loadProposals, updateClient } = useStore()

  useEffect(() => { loadClients(); loadInvoices(); loadProposals() }, [loadClients, loadInvoices, loadProposals])

  const client = clients.find((c: any) => c.id === id)
  const clientInvoices = invoices.filter((i: any) => i.client_id === id)
  const clientProposals = proposals.filter((p: any) => p.client_id === id)

  if (!client) {
    return <div className="p-8 text-text-muted">Client not found.</div>
  }

  const revenue = clientInvoices.filter((i: any) => i.status === 'PAID').reduce((sum: number, i: any) => sum + i.total, 0)

  return (
    <div className="max-w-5xl mx-auto space-y-8 animate-in">
      <div className="flex items-center gap-4">
        <Button variant="outline" onClick={() => navigate('/clients')} className="p-2">
          <ArrowLeft className="w-4 h-4" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">{client.name}</h1>
          <p className="text-text-secondary mt-1">{client.company || 'Independent'} &bull; Added {format(new Date(client.created_at), 'MMM d, yyyy')}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="p-6 md:col-span-2 space-y-6">
          <div className="flex justify-between items-center border-b border-border-subtle pb-4">
            <h3 className="font-semibold text-lg">Details</h3>
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border border-border-default bg-bg-base">{client.status}</span>
          </div>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <label className="text-xs uppercase text-text-muted font-bold block mb-1">Company</label>
              <div className="font-medium">{client.company || '&mdash;'}</div>
            </div>
            <div>
              <label className="text-xs uppercase text-text-muted font-bold block mb-1">Profitability Score</label>
              <div className="font-medium text-brand">{client.profitability_score || 0}/100</div>
            </div>
          </div>
          <div>
            <label className="text-xs uppercase text-text-muted font-bold block mb-1">Status Action</label>
            <select className="h-10 rounded-md border border-border-muted bg-bg-base px-3 py-2 text-sm text-text-primary"
              value={client.status}
              onChange={(e) => updateClient({ id: client.id, status: e.target.value })}>
              <option value="PROSPECT">Prospect</option>
              <option value="ACTIVE">Active</option>
              <option value="INACTIVE">Inactive</option>
            </select>
          </div>
        </Card>

        <Card className="p-6 space-y-6">
          <div className="border-b border-border-subtle pb-4">
            <h3 className="font-semibold text-lg">Financials</h3>
          </div>
          <div>
            <label className="text-xs uppercase text-text-muted font-bold block mb-1">Total Revenue</label>
            <div className="text-2xl font-bold text-success">{formatCurrency(revenue)}</div>
          </div>
          <div>
            <label className="text-xs uppercase text-text-muted font-bold block mb-1">Outstanding</label>
            <div className="text-xl font-medium text-text-primary">
              {formatCurrency(clientInvoices.filter((i: any) => i.status === 'SENT' || i.status === 'OVERDUE').reduce((sum: number, i: any) => sum + i.total, 0))}
            </div>
          </div>
        </Card>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card className="p-0 overflow-hidden">
          <div className="p-6 border-b border-border-subtle">
            <h3 className="font-semibold text-lg">Proposals</h3>
          </div>
          <div className="divide-y divide-border-subtle">
            {clientProposals.length === 0 && <div className="p-6 text-sm text-text-muted text-center">No proposals found.</div>}
            {clientProposals.map((p: any) => (
              <div key={p.id} className="p-4 flex justify-between items-center hover:bg-bg-overlay/50 cursor-pointer" onClick={() => navigate(`/proposals/${p.id}`)}>
                <div>
                  <div className="font-medium">{p.title}</div>
                  <div className="text-xs text-text-secondary mt-0.5">{format(new Date(p.created_at), 'MMM d, yyyy')}</div>
                </div>
                <span className="text-xs border border-border-default px-2 py-0.5 rounded-full">{p.status}</span>
              </div>
            ))}
          </div>
        </Card>
        <Card className="p-0 overflow-hidden">
          <div className="p-6 border-b border-border-subtle">
            <h3 className="font-semibold text-lg">Invoices</h3>
          </div>
          <div className="divide-y divide-border-subtle">
            {clientInvoices.length === 0 && <div className="p-6 text-sm text-text-muted text-center">No invoices found.</div>}
            {clientInvoices.map((i: any) => (
              <div key={i.id} className="p-4 flex justify-between items-center hover:bg-bg-overlay/50 cursor-pointer" onClick={() => navigate(`/invoices/${i.id}`)}>
                <div>
                  <div className="font-medium">{i.invoice_number}</div>
                  <div className="text-xs text-text-secondary mt-0.5">{format(new Date(i.created_at), 'MMM d, yyyy')}</div>
                </div>
                <div className="text-right">
                  <div className="font-medium">{formatCurrency(i.total)}</div>
                  <div className="text-xs text-text-muted">{i.status}</div>
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  )
}
