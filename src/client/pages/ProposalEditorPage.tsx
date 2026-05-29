import { useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useStore } from '../lib/store'
import { Button, Card } from '../components/ui'
import { ArrowLeft, FileText, CheckCircle, XCircle } from 'lucide-react'

export function ProposalEditorPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { proposals, clients, loadProposals, loadClients, updateProposal } = useStore()

  useEffect(() => { loadProposals(); loadClients() }, [loadProposals, loadClients])

  const proposal = proposals.find((p: any) => p.id === id)
  const content = proposal?.content ? (typeof proposal.content === 'string' ? JSON.parse(proposal.content) : proposal.content) : null

  if (!proposal) {
    return <div className="p-8 text-text-muted">Proposal not found.</div>
  }

  const handleState = async (status: string) => {
    await updateProposal({ id: proposal.id, status })
  }

  return (
    <div className="max-w-4xl mx-auto space-y-8 animate-in">
      <div className="flex items-center gap-4 justify-between">
        <div className="flex items-center gap-4">
          <Button variant="outline" onClick={() => navigate('/proposals')} className="p-2">
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">{proposal.title}</h1>
            <p className="text-text-secondary mt-1">Status: <span className="font-semibold text-text-primary">{proposal.status}</span></p>
          </div>
        </div>
        <div className="flex gap-2">
          {proposal.status === 'DRAFT' && <Button onClick={() => handleState('SENT')}>Mark as Sent</Button>}
          {proposal.status === 'SENT' && (
            <>
              <Button variant="outline" className="text-success hover:bg-success/10 hover:text-success border-success/20" onClick={() => handleState('ACCEPTED')}>
                <CheckCircle className="w-4 h-4 mr-2" /> Accepted
              </Button>
              <Button variant="outline" className="text-error hover:bg-error/10 hover:text-error border-error/20" onClick={() => handleState('REJECTED')}>
                <XCircle className="w-4 h-4 mr-2" /> Rejected
              </Button>
            </>
          )}
        </div>
      </div>

      <Card className="p-8">
        {content ? (
          <div className="space-y-6 text-sm">
            <div className="flex items-center gap-2 mb-8 border-b border-border-subtle pb-4">
              <FileText className="w-5 h-5 text-brand" />
              <h2 className="text-xl font-bold">Proposal Document</h2>
            </div>
            <div><h4 className="font-bold text-text-primary text-base mb-2">Executive Summary</h4><p className="text-text-secondary leading-relaxed">{content.executiveSummary}</p></div>
            <div><h4 className="font-bold text-text-primary text-base mb-2">Understanding</h4><p className="text-text-secondary leading-relaxed">{content.understanding}</p></div>
            <div><h4 className="font-bold text-text-primary text-base mb-2">Approach</h4><p className="text-text-secondary leading-relaxed">{content.approach}</p></div>
            <div><h4 className="font-bold text-text-primary text-base mb-2">Deliverables</h4>
              <ul className="list-disc pl-5 space-y-1 text-text-secondary">
                {content.deliverables?.map((d: any, i: number) => (
                  <li key={i}><span className="font-medium text-text-primary">{d.name}:</span> {d.description}</li>
                ))}
              </ul>
            </div>
            <div><h4 className="font-bold text-text-primary text-base mb-2">Timeline</h4>
              <ul className="list-disc pl-5 space-y-1 text-text-secondary">
                {content.timeline?.map((t: any, i: number) => (
                  <li key={i}><span className="font-medium text-text-primary">{t.phase} ({t.duration}):</span> {t.description}</li>
                ))}
              </ul>
            </div>
            <div className="p-4 bg-bg-surface border border-brand/20 rounded-lg">
              <h4 className="font-bold text-base mb-2">Investment</h4>
              <div className="flex justify-between items-center text-lg">
                <span className="font-medium">{content.investment?.name}</span>
                <span className="font-bold">${content.investment?.price?.toLocaleString()}</span>
              </div>
              <p className="text-text-secondary mt-2">{content.investment?.description}</p>
            </div>
          </div>
        ) : (
          <div className="text-center py-12 text-text-muted">
            <FileText className="w-12 h-12 mx-auto mb-4 opacity-50" />
            <p>No rich content found.</p>
          </div>
        )}
      </Card>
    </div>
  )
}
