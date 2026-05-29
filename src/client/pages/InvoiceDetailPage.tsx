import { useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useStore } from '../lib/store'
import { Button, Card } from '../components/ui'
import { ArrowLeft, Check, Send } from 'lucide-react'
import { formatCurrency } from '../lib/utils'
import { format } from 'date-fns'

export function InvoiceDetailPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { invoices, clients, loadInvoices, loadClients, updateInvoice } = useStore()

  useEffect(() => { loadInvoices(); loadClients() }, [loadInvoices, loadClients])

  const invoice = invoices.find((i: any) => i.id === id)
  const client = clients.find((c: any) => c.id === invoice?.client_id)

  if (!invoice) {
    return <div className="p-8 text-text-muted">Invoice not found.</div>
  }

  return (
    <div className="max-w-4xl mx-auto space-y-8 animate-in">
      <div className="flex items-center gap-4 justify-between">
        <div className="flex items-center gap-4">
          <Button variant="outline" onClick={() => navigate('/invoices')} className="p-2">
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">{invoice.invoice_number}</h1>
            <p className="text-text-secondary mt-1">Status: <span className="font-semibold text-text-primary">{invoice.status}</span></p>
          </div>
        </div>
        <div className="flex gap-2">
          {invoice.status === 'DRAFT' && (
            <Button onClick={() => updateInvoice({ id: invoice.id, status: 'SENT' })}>
              <Send className="w-4 h-4 mr-2" /> Mark as Sent
            </Button>
          )}
          {invoice.status === 'SENT' && (
            <Button className="bg-success text-white hover:bg-success/90" onClick={() => updateInvoice({ id: invoice.id, status: 'PAID' })}>
              <Check className="w-4 h-4 mr-2" /> Mark as Paid
            </Button>
          )}
        </div>
      </div>

      <Card className="p-12 space-y-12 bg-white text-black">
        <div className="flex justify-between items-start">
          <div>
            <h2 className="text-3xl font-bold opacity-80">INVOICE</h2>
            <div className="mt-2 text-sm font-medium opacity-60">{invoice.invoice_number}</div>
          </div>
          <div className="text-right text-sm opacity-80">
            <div><strong>FreelancerOS</strong></div>
            <div>San Francisco, CA</div>
          </div>
        </div>

        <div className="flex justify-between items-start border-t border-black/10 pt-8">
          <div className="text-sm opacity-80">
            <div className="font-bold opacity-60 mb-2 uppercase text-xs">Billed To</div>
            {client ? (
              <>
                <div className="font-bold text-base">{client.name}</div>
                {client.company && <div>{client.company}</div>}
                {client.email && <div>{client.email}</div>}
              </>
            ) : (
              <div className="italic">Unknown Client</div>
            )}
          </div>
          <div className="text-right text-sm opacity-80 space-y-1">
            <div className="flex justify-end gap-8">
              <span className="font-bold opacity-60 text-xs uppercase">Date</span>
              <span>{format(new Date(invoice.created_at), 'MMMM d, yyyy')}</span>
            </div>
            <div className="flex justify-end gap-8">
              <span className="font-bold opacity-60 text-xs uppercase">Due</span>
              <span>{invoice.due_date ? format(new Date(invoice.due_date), 'MMMM d, yyyy') : format(new Date(invoice.created_at).getTime() + 14*24*60*60*1000, 'MMMM d, yyyy')}</span>
            </div>
          </div>
        </div>

        <table className="w-full text-sm text-left">
          <thead className="border-b-2 border-black/20 text-xs uppercase opacity-60 font-bold">
            <tr><th className="py-3">Description</th><th className="py-3 text-center">Amount</th></tr>
          </thead>
          <tbody className="divide-y divide-black/10">
            <tr><td className="py-4">Professional Services Rendered</td><td className="py-4 text-center font-medium">{formatCurrency(invoice.total)}</td></tr>
          </tbody>
        </table>

        <div className="flex justify-end pt-4 border-t-2 border-black/20">
          <div className="w-64 space-y-3">
            <div className="flex justify-between text-xl font-bold">
              <span>Total</span>
              <span>{formatCurrency(invoice.total)}</span>
            </div>
          </div>
        </div>

        <div className="pt-12 text-sm opacity-60">
          <strong>Payment Terms:</strong> Net 14.
        </div>
      </Card>
    </div>
  )
}
