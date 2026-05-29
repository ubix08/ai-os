import { useEffect, useState } from 'react'
import { useStore } from '../lib/store'
import { Button, Card, Input } from '../components/ui'
import { format } from 'date-fns'
import * as Dialog from '@radix-ui/react-dialog'
import { Plus, X } from 'lucide-react'

const KANBAN_STATUSES = ['NEW', 'CONTACTED', 'QUALIFIED', 'PROPOSAL_SENT', 'NEGOTIATING', 'WON', 'LOST']

export function LeadsPage() {
  const { leads, loadLeads, createLead, updateLead } = useStore()
  const [open, setOpen] = useState(false)
  const [form, setForm] = useState({ name: '', company: '', email: '', status: 'NEW' as any })

  useEffect(() => { loadLeads() }, [loadLeads])

  const handleCreate = async () => {
    await createLead(form)
    setOpen(false)
    setForm({ name: '', company: '', email: '', status: 'NEW' })
  }

  return (
    <div className="mx-auto space-y-8 animate-in w-full">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Leads</h1>
          <p className="text-text-secondary mt-1">Manage prospective clients and opportunities.</p>
        </div>
        <Dialog.Root open={open} onOpenChange={setOpen}>
          <Dialog.Trigger asChild>
            <Button><Plus className="w-4 h-4 mr-2" /> New Lead</Button>
          </Dialog.Trigger>
          <Dialog.Portal>
            <Dialog.Overlay className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40" />
            <Dialog.Content className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-md bg-bg-surface border border-border-subtle rounded-lg p-6 shadow-xl z-50">
              <div className="flex justify-between items-center mb-4">
                <Dialog.Title className="text-lg font-bold">Add New Lead</Dialog.Title>
                <Dialog.Close className="text-text-muted hover:text-text-primary"><X className="w-4 h-4" /></Dialog.Close>
              </div>
              <div className="space-y-4">
                <div><label className="text-xs uppercase text-text-muted font-bold block mb-1">Name</label><Input value={form.name} onChange={e => setForm({...form, name: e.target.value})} /></div>
                <div><label className="text-xs uppercase text-text-muted font-bold block mb-1">Company</label><Input value={form.company} onChange={e => setForm({...form, company: e.target.value})} /></div>
                <div><label className="text-xs uppercase text-text-muted font-bold block mb-1">Status</label>
                  <select className="flex h-10 w-full rounded-md border border-border-muted bg-bg-base px-3 py-2 text-sm text-text-primary" value={form.status} onChange={e => setForm({...form, status: e.target.value as any})}>
                    {KANBAN_STATUSES.map(s => <option key={s} value={s}>{s.replace('_', ' ')}</option>)}
                  </select>
                </div>
                <Button onClick={handleCreate} disabled={!form.name} className="w-full">Create</Button>
              </div>
            </Dialog.Content>
          </Dialog.Portal>
        </Dialog.Root>
      </div>

      <div className="flex gap-4 overflow-x-auto pb-4 pt-2 -mx-2 px-2 min-h-[400px]">
        {KANBAN_STATUSES.map(status => (
          <div key={status} className="flex flex-col w-64 shrink-0 px-2">
            <h3 className="text-xs font-bold uppercase tracking-wider text-text-muted mb-3 px-1">{status.replace('_', ' ')}</h3>
            <div className="flex-1 rounded-md bg-bg-base/30 border border-transparent flex flex-col gap-3 min-h-[100px]">
              {leads.filter(l => l.status === status).map(lead => (
                <Card key={lead.id} className="p-3 cursor-pointer hover:border-brand/40 transition-colors">
                  <div className="font-medium text-sm text-text-primary mb-1">{lead.name}</div>
                  {lead.company && <div className="text-xs text-text-secondary">{lead.company}</div>}
                  <div className="mt-3 flex justify-between items-center">
                    <div className="text-[10px] text-text-muted">{format(new Date(lead.created_at), 'MMM d')}</div>
                    <select className="bg-transparent text-[10px] uppercase font-bold text-text-muted outline-none cursor-pointer p-0" value={lead.status}
                      onClick={e => e.stopPropagation()}
                      onChange={(e) => updateLead({ id: lead.id, status: e.target.value as any })}>
                      {KANBAN_STATUSES.map(s => <option key={s} value={s}>{s.replace('_', ' ')}</option>)}
                    </select>
                  </div>
                </Card>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
