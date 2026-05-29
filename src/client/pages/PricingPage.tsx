import { useEffect, useState } from 'react'
import { useStore } from '../lib/store'
import { Button, Card, Input, Label, Textarea } from '../components/ui'
import { formatCurrency } from '../lib/utils'
import { api } from '../lib/api'

export function PricingPage() {
  const { pricingConfig, loadPricingConfig, updatePricingConfig } = useStore()
  const [loading, setLoading] = useState(false)
  const [desc, setDesc] = useState('')
  const [aiResult, setAiResult] = useState<any>(null)

  useEffect(() => { loadPricingConfig() }, [loadPricingConfig])

  const handleAnalyze = async () => {
    setLoading(true)
    try {
      const res = await api.analyzeScope({
        description: desc,
        niche: pricingConfig.niche,
        experienceLevel: pricingConfig.experienceLevel,
        hourlyRate: pricingConfig.hourlyRate,
      })
      setAiResult(res.data)
    } catch (e) {
      console.error(e)
      alert('Failed to analyze scope')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="max-w-5xl mx-auto space-y-8 animate-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Pricing & Scope Intelligence</h1>
          <p className="text-text-secondary mt-1">Configure your rates and analyze project scope with AI.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="space-y-6 col-span-1 lg:border-r lg:border-border-subtle lg:pr-8">
          <div>
            <h3 className="font-semibold text-lg mb-4">Your Base Rates</h3>
            <div className="space-y-4">
              <div>
                <Label>Niche</Label>
                <select className="flex h-10 w-full rounded-md border border-border-muted bg-bg-base px-3 py-2 text-sm text-text-primary"
                  value={pricingConfig.niche} onChange={(e) => updatePricingConfig({ niche: e.target.value })}>
                  <option value="web-development">Web Development</option>
                  <option value="design">Design</option>
                  <option value="copywriting">Copywriting</option>
                  <option value="consulting">Consulting</option>
                </select>
              </div>
              <div>
                <Label>Hourly Rate (USD)</Label>
                <Input type="number" value={pricingConfig.hourlyRate} onChange={e => updatePricingConfig({ hourlyRate: Number(e.target.value) })} />
              </div>
              <div>
                <Label>Target Monthly Revenue (USD)</Label>
                <Input type="number" value={pricingConfig.targetMonthlyRevenue} onChange={e => updatePricingConfig({ targetMonthlyRevenue: Number(e.target.value) })} />
              </div>
            </div>
          </div>

          <div className="pt-6 border-t border-border-subtle space-y-4">
            <h3 className="font-semibold text-lg">AI Scope Analysis</h3>
            <div>
              <Label>Project Description / Client Email</Label>
              <Textarea className="min-h-[160px]" value={desc} onChange={e => setDesc(e.target.value)} placeholder="Paste the client's email or rough project brief here..." />
            </div>
            <Button onClick={handleAnalyze} disabled={loading || !desc.trim()} className="w-full">
              {loading ? 'Analyzing...' : 'Analyze Scope'}
            </Button>
          </div>
        </div>

        <div className="col-span-2">
          {!aiResult && !loading && (
            <div className="h-full flex items-center justify-center border border-dashed border-border-subtle rounded-lg p-12 text-center">
              <div>
                <h3 className="font-medium text-text-primary mb-2">Awaiting Analysis</h3>
                <p className="text-text-muted text-sm max-w-sm">Enter a project description to estimate hours, complexity, and pricing.</p>
              </div>
            </div>
          )}

          {loading && (
            <div className="h-full flex items-center justify-center">
              <div className="animate-pulse flex items-center gap-2 text-brand">
                <div className="w-2 h-2 rounded-full bg-brand"></div>
                <div className="w-2 h-2 rounded-full bg-brand animation-delay-200"></div>
                <div className="w-2 h-2 rounded-full bg-brand animation-delay-400"></div>
              </div>
            </div>
          )}

          {aiResult && !loading && (
            <div className="space-y-6">
              <div className="grid grid-cols-3 gap-4">
                <Card className="p-4">
                  <Label>Total Hours</Label>
                  <div className="text-2xl font-bold flex items-baseline gap-2">
                    {aiResult.estimatedHours?.mid} <span className="text-sm font-normal text-text-muted">hrs</span>
                  </div>
                  <div className="text-xs text-text-secondary mt-1">Range: {aiResult.estimatedHours?.low} - {aiResult.estimatedHours?.high}</div>
                </Card>
                <Card className="p-4">
                  <Label>Model</Label>
                  <div className="text-xl font-bold capitalize mt-1">{aiResult.pricingModel}</div>
                  <div className="text-xs text-text-secondary mt-1">Recommended billing</div>
                </Card>
                <Card className="p-4 border-brand bg-brand/5">
                  <Label>Target Price</Label>
                  <div className="text-2xl font-bold text-brand">{formatCurrency(aiResult.recommendedPrice?.mid || 0)}</div>
                  <div className="text-xs text-text-secondary mt-1">Based on base rate</div>
                </Card>
              </div>

              <Card className="p-6">
                <h4 className="font-semibold mb-4">Phase Breakdown</h4>
                <div className="divide-y divide-border-subtle">
                  {aiResult.breakdown?.map((phase: any, i: number) => (
                    <div key={i} className="py-3 flex justify-between gap-4">
                      <div>
                        <div className="font-medium text-sm">{phase.phase}</div>
                        <div className="text-xs text-text-secondary mt-0.5">{phase.description}</div>
                      </div>
                      <div className="text-sm font-semibold shrink-0">{phase.hours} hrs</div>
                    </div>
                  ))}
                </div>
              </Card>

              {aiResult.scopeRisks?.length > 0 && (
                <Card className="p-6 bg-error/5 border-error/20">
                  <h4 className="font-semibold mb-4 text-error">Scope Risks</h4>
                  <ul className="space-y-3">
                    {aiResult.scopeRisks?.map((risk: any, i: number) => (
                      <li key={i} className="text-sm">
                        <span className="font-medium">{risk.risk}</span>
                        <div className="text-text-secondary mt-1 text-xs">Mitigation: {risk.mitigation}</div>
                      </li>
                    ))}
                  </ul>
                </Card>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
