import { useEffect } from 'react'
import { useStore } from '../lib/store'
import { Button, Card } from '../components/ui'
import { useNavigate } from 'react-router-dom'
import { format } from 'date-fns'

export function ProposalsPage() {
  const { proposals, loadProposals } = useStore()
  const navigate = useNavigate()

  useEffect(() => { loadProposals() }, [loadProposals])

  return (
    <div className="max-w-5xl mx-auto space-y-8 animate-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Proposals</h1>
          <p className="text-text-secondary mt-1">Manage and track your pitches.</p>
        </div>
        <Button onClick={() => navigate('/proposals/new')}>New Proposal</Button>
      </div>

      <Card className="overflow-hidden">
        <table className="w-full text-sm text-left">
          <thead className="bg-bg-elevated border-b border-border-subtle uppercase text-xs tracking-wider text-text-muted">
            <tr>
              <th className="px-6 py-4 font-semibold">Title</th>
              <th className="px-6 py-4 font-semibold">Status</th>
              <th className="px-6 py-4 font-semibold">Created Date</th>
              <th className="px-6 py-4 font-semibold text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border-subtle">
            {proposals.length === 0 && (
              <tr><td colSpan={4} className="px-6 py-8 text-center text-text-muted">No proposals yet.</td></tr>
            )}
            {proposals.map((p: any) => (
              <tr key={p.id} className="hover:bg-bg-overlay/50 transition-colors cursor-pointer" onClick={() => navigate(`/proposals/${p.id}`)}>
                <td className="px-6 py-4 font-medium text-text-primary">{p.title}</td>
                <td className="px-6 py-4">
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border border-border-default bg-bg-base">{p.status}</span>
                </td>
                <td className="px-6 py-4 text-text-secondary">{format(new Date(p.created_at), 'MMM d, yyyy')}</td>
                <td className="px-6 py-4 text-right">
                  <Button variant="outline" className="px-2 py-1 text-xs">View</Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </div>
  )
}
