import { useState } from 'react'
import { useStore } from '../lib/store'
import { Button, Card, Input, Label, Textarea } from '../components/ui'
import { useNavigate } from 'react-router-dom'
import { api } from '../lib/api'

export function NewProposalPage() {
  const { createProposal } = useStore()
  const navigate = useNavigate()
  const [loading, setLoading] = useState(false)
  const [formData, setFormData] = useState({
    title: '', clientName: '', deliverables: '', goals: '', timeline: '', tone: 'professional',
  })
  const [aiResult, setAiResult] = useState<any>(null)

  const handleGenerate = async () => {
    setLoading(true)
    try {
      const res = await api.generateProposal(formData)
      setAiResult(res.data)
    } catch (e) {
      console.error(e)
      alert('Failed to generate proposal')
    } finally {
      setLoading(false)
    }
  }

  const handleSave = async () => {
    await createProposal({
      title: formData.title || 'Untitled Proposal',
      status: 'DRAFT',
      content: JSON.stringify(aiResult),
    })
    navigate('/proposals')
  }

  return (
    <div className="max-w-4xl mx-auto space-y-8 animate-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">New AI Proposal</h1>
          <p className="text-text-secondary mt-1">Generate a conversion-optimized document in seconds.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="space-y-6">
          <Card className="p-6 space-y-4">
            <div><Label>Proposal Title</Label><Input value={formData.title} onChange={e => setFormData({...formData, title: e.target.value})} placeholder="Website Redesign 2025" /></div>
            <div><Label>Client Name</Label><Input value={formData.clientName} onChange={e => setFormData({...formData, clientName: e.target.value})} placeholder="e.g. Startup Inc" /></div>
            <div><Label>Deliverables</Label><Textarea value={formData.deliverables} onChange={e => setFormData({...formData, deliverables: e.target.value})} placeholder="What are you building or providing?" /></div>
            <div><Label>Goals & Context</Label><Textarea value={formData.goals} onChange={e => setFormData({...formData, goals: e.target.value})} placeholder="Why are they doing this?" /></div>
            <div><Label>Timeline</Label><Input value={formData.timeline} onChange={e => setFormData({...formData, timeline: e.target.value})} placeholder="e.g. 4-6 weeks" /></div>
            <div><Label>Tone</Label>
              <select className="flex h-10 w-full rounded-md border border-border-muted bg-bg-base px-3 py-2 text-sm text-text-primary" value={formData.tone} onChange={e => setFormData({...formData, tone: e.target.value})}>
                <option value="professional">Professional</option>
                <option value="friendly">Friendly & Warm</option>
                <option value="premium">Premium & Assertive</option>
              </select>
            </div>
            <Button className="w-full mt-4" onClick={handleGenerate} disabled={loading || !formData.clientName || !formData.deliverables}>
              {loading ? 'Generating with AI...' : 'Generate Proposal'}
            </Button>
          </Card>
        </div>

        <div className="space-y-6">
          <Card className="p-6 min-h-[500px] flex flex-col">
            <h3 className="font-semibold text-lg border-b border-border-subtle pb-4 mb-4">Preview</h3>
            {!aiResult && !loading && (
              <div className="flex-1 flex items-center justify-center text-text-muted text-sm text-center px-8">
                Fill out the parameters and click Generate.
              </div>
            )}
            {loading && (
              <div className="flex-1 flex items-center justify-center text-brand text-sm animate-pulse">
                Drafting proposal...
              </div>
            )}
            {aiResult && !loading && (
              <div className="flex-1 overflow-y-auto space-y-6 text-sm">
                <div><h4 className="font-bold text-text-primary text-base mb-2">Executive Summary</h4><p className="text-text-secondary leading-relaxed">{aiResult.executiveSummary}</p></div>
                <div><h4 className="font-bold text-text-primary text-base mb-2">Understanding</h4><p className="text-text-secondary leading-relaxed">{aiResult.understanding}</p></div>
                <div><h4 className="font-bold text-text-primary text-base mb-2">Approach</h4><p className="text-text-secondary leading-relaxed">{aiResult.approach}</p></div>
                <div><h4 className="font-bold text-text-primary text-base mb-2">Deliverables</h4>
                  <ul className="list-disc pl-5 space-y-1 text-text-secondary">
                    {aiResult.deliverables?.map((d: any, i: number) => (
                      <li key={i}><span className="font-medium text-text-primary">{d.name}:</span> {d.description}</li>
                    ))}
                  </ul>
                </div>
                <div className="pt-4 mt-4 border-t border-border-subtle">
                  <Button className="w-full" onClick={handleSave}>Save as Draft</Button>
                </div>
              </div>
            )}
          </Card>
        </div>
      </div>
    </div>
  )
}
