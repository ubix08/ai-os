import { useEffect, useState } from 'react'
import { useStore } from '../lib/store'
import { Button, Card, Input } from '../components/ui'
import { format } from 'date-fns'
import * as Dialog from '@radix-ui/react-dialog'
import { Plus, X } from 'lucide-react'
import { useNavigate } from 'react-router-dom'

export function ClientsPage() {
  const { clients, loadClients, createClient } = useStore()
  const [open, setOpen] = useState(false)
  const [form, setForm] = useState({ name: '', company: '', email: '', status: 'ACTIVE' as any })
  const navigate = useNavigate()

  useEffect(() => { loadClients() }, [loadClients])

  const handleCreate = async () => {
    await createClient(form)
    setOpen(false)
    setForm({ name: '', company: '', email: '', status: 'ACTIVE' })
  }

  return (
    <div className="max-w-5xl mx-auto space-y-8 animate-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Clients</h1>
          <p className="text-text-secondary mt-1">Manage your customer relationships.</p>
        </div>
        <Dialog.Root open={open} onOpenChange={setOpen}>
          <Dialog.Trigger asChild>
            <Button><Plus className="w-4 h-4 mr-2" /> New Client</Button>
          </Dialog.Trigger>
          <Dialog.Portal>
            <Dialog.Overlay className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40" />
            <Dialog.Content className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-md bg-bg-surface border border-border-subtle rounded-lg p-6 shadow-xl z-50">
              <div className="flex justify-between items-center mb-4">
                <Dialog.Title className="text-lg font-bold">Add New Client</Dialog.Title>
                <Dialog.Close className="text-text-muted hover:text-text-primary"><X className="w-4 h-4" /></Dialog.Close>
              </div>
              <div className="space-y-4">
                <div><label className="text-xs uppercase text-text-muted font-bold block mb-1">Name</label><Input value={form.name} onChange={e => setForm({...form, name: e.target.value})} /></div>
                <div><label className="text-xs uppercase text-text-muted font-bold block mb-1">Company</label><Input value={form.company} onChange={e => setForm({...form, company: e.target.value})} /></div>
                <div><label className="text-xs uppercase text-text-muted font-bold block mb-1">Status</label>
                  <select className="flex h-10 w-full rounded-md border border-border-muted bg-bg-base px-3 py-2 text-sm" value={form.status} onChange={e => setForm({...form, status: e.target.value as any})}>
                    <option value="PROSPECT">Prospect</option>
                    <option value="ACTIVE">Active</option>
                  </select>
                </div>
                <Button onClick={handleCreate} disabled={!form.name} className="w-full">Create</Button>
              </div>
            </Dialog.Content>
          </Dialog.Portal>
        </Dialog.Root>
      </div>

      <Card className="overflow-hidden">
        <table className="w-full text-sm text-left">
          <thead className="bg-bg-elevated border-b border-border-subtle uppercase text-xs tracking-wider text-text-muted">
            <tr>
              <th className="px-6 py-4 font-semibold">Name</th>
              <th className="px-6 py-4 font-semibold">Status</th>
              <th className="px-6 py-4 font-semibold">Added</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border-subtle">
            {clients.map(c => (
              <tr key={c.id} className="hover:bg-bg-overlay/50 transition-colors cursor-pointer" onClick={() => navigate(`/clients/${c.id}`)}>
                <td className="px-6 py-4 font-medium text-text-primary">
                  {c.name}
                  {c.company && <span className="block text-xs font-normal text-text-muted">{c.company}</span>}
                </td>
                <td className="px-6 py-4">
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border border-border-default bg-bg-base">{c.status}</span>
                </td>
                <td className="px-6 py-4 text-text-secondary">{format(new Date(c.created_at), 'MMM d')}</td>
              </tr>
            ))}
            {clients.length === 0 && <tr><td colSpan={3} className="px-6 py-8 text-center text-text-muted">No clients yet.</td></tr>}
          </tbody>
        </table>
      </Card>
    </div>
  )
}
