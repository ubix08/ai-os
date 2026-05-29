import { useEffect, useState } from 'react'
import { useStore } from '../lib/store'
import { Button, Card, Input } from '../components/ui'
import { formatCurrency } from '../lib/utils'
import { format } from 'date-fns'
import * as Dialog from '@radix-ui/react-dialog'
import { Plus, X } from 'lucide-react'
import { useNavigate } from 'react-router-dom'

export function InvoicesPage() {
  const { invoices, clients, loadInvoices, loadClients, createInvoice } = useStore()
  const [open, setOpen] = useState(false)
  const navigate = useNavigate()
  const [form, setForm] = useState({ client_id: '', total: 0, status: 'DRAFT' as any })

  useEffect(() => { loadInvoices(); loadClients() }, [loadInvoices, loadClients])

  const handleCreate = async () => {
    await createInvoice(form)
    setOpen(false)
    setForm({ client_id: '', total: 0, status: 'DRAFT' })
  }

  return (
    <div className="max-w-5xl mx-auto space-y-8 animate-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Invoices</h1>
          <p className="text-text-secondary mt-1">Track payments and outstanding balances.</p>
        </div>
        <Dialog.Root open={open} onOpenChange={setOpen}>
          <Dialog.Trigger asChild>
            <Button><Plus className="w-4 h-4 mr-2" /> New Invoice</Button>
          </Dialog.Trigger>
          <Dialog.Portal>
            <Dialog.Overlay className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40" />
            <Dialog.Content className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-md bg-bg-surface border border-border-subtle rounded-lg p-6 shadow-xl z-50">
              <div className="flex justify-between items-center mb-4">
                <Dialog.Title className="text-lg font-bold">Create Invoice</Dialog.Title>
                <Dialog.Close className="text-text-muted hover:text-text-primary"><X className="w-4 h-4" /></Dialog.Close>
              </div>
              <div className="space-y-4">
                <div>
                  <label className="text-xs uppercase text-text-muted font-bold block mb-1">Client</label>
                  <select className="flex h-10 w-full rounded-md border border-border-muted bg-bg-base px-3 py-2 text-sm" value={form.client_id} onChange={e => setForm({...form, client_id: e.target.value})}>
                    <option value="">Select a client...</option>
                    {clients.map((c: any) => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-xs uppercase text-text-muted font-bold block mb-1">Total (USD)</label>
                  <Input type="number" value={form.total || ''} onChange={e => setForm({...form, total: Number(e.target.value)})} />
                </div>
                <div>
                  <label className="text-xs uppercase text-text-muted font-bold block mb-1">Status</label>
                  <select className="flex h-10 w-full rounded-md border border-border-muted bg-bg-base px-3 py-2 text-sm" value={form.status} onChange={e => setForm({...form, status: e.target.value as any})}>
                    <option value="DRAFT">Draft</option>
                    <option value="SENT">Sent</option>
                    <option value="PAID">Paid</option>
                  </select>
                </div>
                <Button onClick={handleCreate} disabled={!form.client_id || !form.total} className="w-full">Save Invoice</Button>
              </div>
            </Dialog.Content>
          </Dialog.Portal>
        </Dialog.Root>
      </div>

      <Card className="overflow-hidden">
        <table className="w-full text-sm text-left">
          <thead className="bg-bg-elevated border-b border-border-subtle uppercase text-xs tracking-wider text-text-muted">
            <tr>
              <th className="px-6 py-4 font-semibold">Number</th>
              <th className="px-6 py-4 font-semibold">Client</th>
              <th className="px-6 py-4 font-semibold">Amount</th>
              <th className="px-6 py-4 font-semibold">Status</th>
              <th className="px-6 py-4 font-semibold">Date</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border-subtle">
            {invoices.map((inv: any) => {
              const client = clients.find((c: any) => c.id === inv.client_id)
              return (
                <tr key={inv.id} className="hover:bg-bg-overlay/50 transition-colors cursor-pointer" onClick={() => navigate(`/invoices/${inv.id}`)}>
                  <td className="px-6 py-4 font-medium text-text-primary">{inv.invoice_number}</td>
                  <td className="px-6 py-4 text-text-secondary">{client?.name || 'Unknown'}</td>
                  <td className="px-6 py-4 font-medium">{formatCurrency(inv.total)}</td>
                  <td className="px-6 py-4">
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border border-border-default bg-bg-base">{inv.status}</span>
                  </td>
                  <td className="px-6 py-4 text-text-secondary">{format(new Date(inv.created_at), 'MMM d, yyyy')}</td>
                </tr>
              )
            })}
            {invoices.length === 0 && <tr><td colSpan={5} className="px-6 py-8 text-center text-text-muted">No invoices yet.</td></tr>}
          </tbody>
        </table>
      </Card>
    </div>
  )
}
