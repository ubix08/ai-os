import { useEffect, useState, useRef } from 'react'
import { useStore } from '../lib/store'
import { Card, Input, Button } from '../components/ui'
import { Brain, Send, User } from 'lucide-react'
import Markdown from 'react-markdown'

interface Message {
  role: 'user' | 'assistant'
  content: string
}

export function AiPage() {
  const { clients, projects, invoices, loadClients, loadProjects, loadInvoices } = useStore()
  const [messages, setMessages] = useState<Message[]>([
    { role: 'assistant', content: "Hi! I'm your AI Copilot. How can I help you grow your freelance business today? I can help with pricing strategies, drafting negotiation emails, or analyzing your pipeline." }
  ])
  const [input, setInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => { loadClients(); loadProjects(); loadInvoices() }, [loadClients, loadProjects, loadInvoices])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const handleSend = async () => {
    if (!input.trim() || isLoading) return

    const userMessage: Message = { role: 'user', content: input }
    setMessages(prev => [...prev, userMessage])
    setInput('')
    setIsLoading(true)

    try {
      const response = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: [...messages, userMessage],
          context: { clients, projects, invoices }
        })
      })

      if (!response.ok) throw new Error('Failed to get response')
      const { text } = await response.json() as { text: string }
      setMessages(prev => [...prev, { role: 'assistant', content: text }])
    } catch (error) {
      console.error(error)
      setMessages(prev => [...prev, { role: 'assistant', content: '**Error:** Could not connect to AI. Please try again.' }])
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="w-full h-full max-h-[85vh] flex flex-col space-y-4 animate-in">
      <div className="flex items-center justify-between shrink-0">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">AI Copilot</h1>
          <p className="text-text-secondary mt-1">Your dedicated assistant modeled for freelance growth.</p>
        </div>
      </div>

      <Card className="flex-1 flex flex-col min-h-0 bg-bg-surface border-border-subtle overflow-hidden">
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {messages.map((msg, i) => (
            <div key={i} className={`flex gap-4 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}>
              <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${msg.role === 'user' ? 'bg-brand' : 'bg-bg-elevated border border-border-subtle'}`}>
                {msg.role === 'user' ? <User className="w-4 h-4 text-white" /> : <Brain className="w-4 h-4 text-brand" />}
              </div>
              <div className={`max-w-[80%] rounded-2xl px-5 py-3.5 ${msg.role === 'user' ? 'bg-brand text-white' : 'bg-bg-elevated border border-border-subtle text-text-primary'}`}>
                {msg.role === 'user' ? (
                  <p className="text-sm">{msg.content}</p>
                ) : (
                  <div className="prose prose-invert max-w-none text-sm prose-p:leading-relaxed prose-pre:bg-bg-base prose-pre:border prose-pre:border-border-subtle">
                    <Markdown>{msg.content}</Markdown>
                  </div>
                )}
              </div>
            </div>
          ))}
          {isLoading && (
            <div className="flex gap-4">
              <div className="w-8 h-8 rounded-full bg-bg-elevated border border-border-subtle flex items-center justify-center shrink-0">
                <Brain className="w-4 h-4 text-brand animate-pulse" />
              </div>
              <div className="bg-bg-elevated border border-border-subtle rounded-2xl px-5 py-3.5 flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-text-muted animate-bounce" style={{ animationDelay: '0ms' }} />
                <span className="w-2 h-2 rounded-full bg-text-muted animate-bounce" style={{ animationDelay: '150ms' }} />
                <span className="w-2 h-2 rounded-full bg-text-muted animate-bounce" style={{ animationDelay: '300ms' }} />
              </div>
            </div>
          )}
          <div ref={bottomRef} />
        </div>

        <div className="p-4 border-t border-border-subtle bg-bg-base">
          <div className="relative flex items-center gap-2">
            <Input
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && !e.shiftKey && (e.preventDefault(), handleSend())}
              placeholder="Ask for negotiation advice, email templates, or pricing strategies..."
              className="flex-1 py-3 px-4 bg-bg-elevated border-border-subtle focus-visible:ring-1 focus-visible:ring-brand"
            />
            <Button onClick={handleSend} disabled={isLoading || !input.trim()} className="absolute right-2 px-3 self-center h-8">
              <Send className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </Card>
    </div>
  )
}
