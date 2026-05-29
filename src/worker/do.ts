import { DurableObject } from 'cloudflare:workers'
import { DocumentStore, ToolRegistry, Agent, PipelineRunner, ContextInjector, Registry, DomainConfig } from './core'

export interface DoEnv { GEMINI_API_KEY?: string; SERPER_API_KEY?: string }

export class MyosDO extends DurableObject {
  sql: SqlStorage; env: DoEnv

  store: DocumentStore
  registry: Registry
  tools: ToolRegistry
  runner: PipelineRunner
  context: ContextInjector

  private agents = new Map<string, Agent>()
  private domainConfig: DomainConfig | null = null

  constructor(ctx: DurableObjectState, env: DoEnv) {
    super(ctx, env); this.env = env; this.sql = ctx.storage.sql
    this.store = new DocumentStore(this.sql)
    this.registry = new Registry(this.sql)
    this.tools = new ToolRegistry()
    this.context = new ContextInjector(this.sql)

    this.store.initSchema()
    this.registry.initSchema()
    this.sql.exec(`CREATE TABLE IF NOT EXISTS pipeline_steps (
      id TEXT PRIMARY KEY,
      agent_id TEXT NOT NULL,
      name TEXT NOT NULL,
      description TEXT DEFAULT '',
      tool TEXT NOT NULL DEFAULT 'gemini_prompt',
      input_schema TEXT DEFAULT '{}',
      output_schema TEXT DEFAULT '{}',
      retry_count INTEGER DEFAULT 0,
      timeout_seconds INTEGER DEFAULT 30,
      on_failure TEXT DEFAULT 'fail' CHECK(on_failure IN ('fail','skip','retry','fallback')),
      "order" INTEGER DEFAULT 0
    )`)

    this.tools.registerDefaults(env.GEMINI_API_KEY || '', env.SERPER_API_KEY || '')
    this.runner = new PipelineRunner(this.tools, this.store, env.GEMINI_API_KEY || '', this.sql)

    this.domainConfig = this.registry.getDomainConfig()
  }

  private getAgent(id: string): Agent {
    let a = this.agents.get(id)
    if (!a) {
      const cfg = this.registry.getAgent(id)
      if (!cfg) throw new Error(`Agent '${id}' not found`)
      a = new Agent(cfg, this.tools, this.store, this.env.GEMINI_API_KEY || '', this.sql)
      this.agents.set(id, a)
    }
    return a
  }

  async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url); const method = request.method

    try {
      const routes: [RegExp, (m: RegExpMatchArray) => Promise<Response>][] = [

        // ─── Domain Config ──
        [/^\/domain\/config$/, async () =>
          method === 'GET' ? this.json(this.registry.getDomainConfig())
          : method === 'PUT' ? (this.registry.setDomainConfig(await request.json()), this.json({success:true}))
          : this.methodNotAllowed()],
        [/^\/domain\/seed$/, async () =>
          method === 'POST' ? this.seedDomain(await request.json())
          : this.methodNotAllowed()],

        // ─── Generic Document Store ──
        [/^\/store\/([^/]+)\/([^/]+)$/, async (m) =>
          method === 'GET' ? this.json(this.store.get(m[1], m[2]))
          : method === 'PUT' ? this.json(this.store.update(m[1], m[2], await request.json()))
          : method === 'DELETE' ? (this.store.delete(m[1], m[2]), this.json({success:true}))
          : this.methodNotAllowed()],
        [/^\/store\/([^/]+)$/, async (m) =>
          method === 'GET' ? this.json(this.store.query(m[1]))
          : method === 'POST' ? this.json(this.store.create(m[1], await request.json()))
          : this.methodNotAllowed()],
        [/^\/store\/?$/, async () =>
          method === 'GET' ? this.json(this.store.listCollections())
          : this.methodNotAllowed()],

        // ─── Domain Collection Shorthands (auto-mapped) ──
        [/^\/(clients|leads|projects|tasks|invoices|proposals|notes|contacts)$/, async (m) => {
          const collection = m[1]
          return method === 'GET' ? this.json(this.store.query(collection))
            : method === 'POST' ? this.json(this.store.create(collection, await request.json()))
            : this.methodNotAllowed()
        }],
        [/^\/(clients|leads|projects|tasks|invoices|proposals|notes|contacts)\/([^/]+)$/, async (m) => {
          const collection = m[1]; const id = m[2]
          return method === 'GET' ? this.json(this.store.get(collection, id))
            : method === 'PUT' ? this.json(this.store.update(collection, id, await request.json()))
            : method === 'DELETE' ? (this.store.delete(collection, id), this.json({success:true}))
            : this.methodNotAllowed()
        }],

        // ─── Dashboard (generic) ──
        [/^\/dashboard$/, async () => this.getDashboard()],

        // ─── Agent Sessions (multiturn chat) ──
        [/^\/agents\/([^/]+)\/sessions\/([^/]+)\/chat$/, async (m) => {
          const { message } = await request.json() as { message: string }
          const agent = this.getAgent(m[1])
          const result = await agent.chat(m[2], message)
          return this.json(result)
        }],
        [/^\/agents\/([^/]+)\/sessions$/, async () => this.methodNotAllowed()],

        // ─── Autonomous Command Execution ──
        [/^\/commands\/([^/]+)\/chat$/, async (m) => {
          const cmd = this.registry.getCommand(m[1])
          if (!cmd) return this.json({ error: 'Command not found' }, 404)
          if (cmd.mode !== 'autonomous') return this.json({ error: 'Use /commands/:name/run for pipeline mode' }, 400)
          const { message } = await request.json() as { message: string }
          const agent = this.getAgent(cmd.agent_id)
          const result = await agent.chat(`cmd_${cmd.name}_${crypto.randomUUID()}`, message)
          return this.json(result)
        }],
        [/^\/commands\/([^/]+)\/run$/, async (m) => {
          const cmd = this.registry.getCommand(m[1])
          if (!cmd) return this.json({ error: 'Command not found' }, 404)
          if (cmd.mode !== 'pipeline') return this.json({ error: 'Use /commands/:name/chat for autonomous mode' }, 400)
          const agent = this.registry.getAgent(cmd.agent_id)
          if (!agent) return this.json({ error: 'Agent not found' }, 404)
          const steps = this.registry.listStepsByCommand(cmd.name)
          const input = await request.json() as Record<string, string>
          const resolvedInput = this.registry.resolveTemplate(cmd.input_template, input)
          const ctxDocs = this.context.load(cmd.context_refs || [])
          const result = await this.runner.executeRun({ id: agent.id, config: agent as unknown as Record<string, unknown>, model: agent.model }, steps, { ...input, _resolved: resolvedInput, _context: ctxDocs })
          return this.json(result)
        }],
        [/^\/commands\/([^/]+)$/, async (m) =>
          method === 'GET' ? this.json(this.registry.getCommand(m[1]))
          : method === 'PUT' ? this.json(this.registry.updateCommandById(m[1], await request.json()))
          : method === 'DELETE' ? (this.registry.deleteCommandByName(m[1]), this.json({success:true}))
          : this.methodNotAllowed()],
        [/^\/commands$/, async () =>
          method === 'GET' ? this.json(this.registry.listCommands())
          : method === 'POST' ? this.json(this.registry.createCommand(await request.json()))
          : this.methodNotAllowed()],

        // ─── Agent Configs ──
        [/^\/agents\/([^/]+)$/, async (m) =>
          method === 'GET' ? this.json(this.registry.getAgent(m[1]))
          : method === 'PUT' ? this.json(this.registry.updateAgent(m[1], await request.json()))
          : method === 'DELETE' ? (this.registry.deleteAgent(m[1]), this.json({success:true}))
          : this.methodNotAllowed()],
        [/^\/agents$/, async () =>
          method === 'GET' ? this.json(this.registry.listAgents())
          : method === 'POST' ? this.json(this.registry.createAgent(await request.json()))
          : this.methodNotAllowed()],

        // ─── Pipeline Steps ──
        [/^\/agents\/([^/]+)\/steps\/([^/]+)$/, async (m) => {
          const steps = this.sql.exec('SELECT * FROM pipeline_steps WHERE id=? AND agent_id=?', m[2], m[1]).toArray() as any[]
          if (steps.length === 0) return this.json({error:'Not found'}, 404)
          const step = steps[0]
          if (method === 'PUT') {
            const d = await request.json() as any
            this.sql.exec(
              'UPDATE pipeline_steps SET name=?,description=?,tool=?,input_schema=?,output_schema=?,retry_count=?,timeout_seconds=?,on_failure=?,"order"=? WHERE id=?',
              d.name ?? step.name, d.description ?? step.description, d.tool ?? step.tool,
              d.input_schema ? JSON.stringify(d.input_schema) : step.input_schema,
              d.output_schema ? JSON.stringify(d.output_schema) : step.output_schema,
              d.retry_count ?? step.retry_count, d.timeout_seconds ?? step.timeout_seconds,
              d.on_failure ?? step.on_failure, d.order ?? step.order, m[2],
            )
            return this.json({success:true})
          }
          return method === 'DELETE' ? (this.sql.exec('DELETE FROM pipeline_steps WHERE id=?', m[2]), this.json({success:true}))
            : this.methodNotAllowed()
        }],
        [/^\/agents\/([^/]+)\/steps$/, async (m) => {
          if (method === 'GET') return this.json(this.sql.exec('SELECT * FROM pipeline_steps WHERE agent_id=? ORDER BY "order" ASC', m[1]).toArray())
          if (method === 'POST') {
            const d = await request.json() as any
            const id = crypto.randomUUID()
            this.sql.exec(
              'INSERT INTO pipeline_steps (id,agent_id,name,description,tool,input_schema,output_schema,retry_count,timeout_seconds,on_failure,"order") VALUES (?,?,?,?,?,?,?,?,?,?,?)',
              id, d.agent_id || m[1], d.name || 'Step', d.description || '',
              d.tool || 'gemini_prompt', JSON.stringify(d.input_schema || {}), JSON.stringify(d.output_schema || {}),
              d.retry_count ?? 0, d.timeout_seconds ?? 30, d.on_failure || 'fail', d.order ?? 0,
            )
            return this.json(this.sql.exec('SELECT * FROM pipeline_steps WHERE id=?', id).one())
          }
          return this.methodNotAllowed()
        }],

        // ─── Context Documents ──
        [/^\/contexts\/([^/]+)$/, async (m) =>
          method === 'GET' ? this.json(this.registry.getContext(m[1]))
          : method === 'PUT' ? this.json(this.registry.updateContext(m[1], await request.json()))
          : method === 'DELETE' ? (this.registry.deleteContext(m[1]), this.json({success:true}))
          : this.methodNotAllowed()],
        [/^\/contexts$/, async () =>
          method === 'GET' ? this.json(this.registry.listContexts())
          : method === 'POST' ? this.json(this.registry.createContext(await request.json()))
          : this.methodNotAllowed()],

        // ─── Tool Definitions ──
        [/^\/tools\/([^/]+)$/, async (m) =>
          method === 'GET' ? this.json(this.registry.getTool(m[1]))
          : method === 'PUT' ? this.json(this.registry.updateTool(m[1], await request.json()))
          : method === 'DELETE' ? (this.registry.deleteTool(m[1]), this.json({success:true}))
          : this.methodNotAllowed()],
        [/^\/tools$/, async () =>
          method === 'GET' ? this.json(this.registry.listTools())
          : method === 'POST' ? this.json(this.registry.createTool(await request.json()))
          : this.methodNotAllowed()],

        // ─── Skills ──
        [/^\/skills\/([^/]+)$/, async (m) =>
          method === 'GET' ? this.json(this.registry.getSkill(m[1]))
          : method === 'PUT' ? this.json(this.registry.updateSkill(m[1], await request.json()))
          : method === 'DELETE' ? (this.registry.deleteSkill(m[1]), this.json({success:true}))
          : this.methodNotAllowed()],
        [/^\/skills$/, async () =>
          method === 'GET' ? this.json(this.registry.listSkills())
          : method === 'POST' ? this.json(this.registry.createSkill(await request.json()))
          : this.methodNotAllowed()],

        // ─── Legacy AI routes (kept for backward compat) ──
        [/^\/pricing\/analyze-scope$/, async () => method === 'POST' ? this.analyzeScope(await request.json()) : this.methodNotAllowed()],
        [/^\/proposals\/generate$/, async () => method === 'POST' ? this.generateProposal(await request.json()) : this.methodNotAllowed()],
        [/^\/ai\/chat$/, async () => method === 'POST' ? this.handleChat(await request.json()) : this.methodNotAllowed()],
        [/^\/config$/, async () => method === 'GET' ? this.getConfig() : method === 'PUT' ? this.updateConfig(await request.json()) : this.methodNotAllowed()],
      ]

      for (const [pattern, handler] of routes) {
        const match = url.pathname.match(pattern)
        if (match) return handler(match)
      }

      return this.json({ error: 'Not Found' }, 404)
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e)
      return this.json({ error: msg }, 500)
    }
  }

  // ─── Dashboard ──
  async getDashboard(): Promise<Response> {
    const collections = this.store.listCollections()
    const data: Record<string, any> = {}
    for (const c of collections) {
      const docs = this.store.query(c)
      const statusGroups = this.store.groupBy(c, 'status')
      data[c] = { total: docs.length, byStatus: statusGroups }
    }
    return this.json(data)
  }

  // ─── Config (generic key-value) ──
  async getConfig() {
    const rows = this.sql.exec('SELECT key,value FROM domain_config').toArray() as { key: string; value: string }[]
    const c: Record<string, string> = {}
    for (const r of rows) c[r.key] = r.value
    return this.json(c)
  }

  async updateConfig(d: Record<string, string>) {
    for (const [k, v] of Object.entries(d))
      this.sql.exec('INSERT INTO domain_config (key,value) VALUES (?,?) ON CONFLICT(key) DO UPDATE SET value=?', k, v, v)
    return this.json({ success: true })
  }

  // ─── Legacy AI Routes ──
  async analyzeScope(data: any): Promise<Response> {
    return this.callGemini('gemini-2.5-flash', this.buildScopePrompt(data), 0.7, 4096, 'application/json')
  }

  async generateProposal(data: any): Promise<Response> {
    return this.callGemini('gemini-2.5-pro', this.buildProposalPrompt(data), 0.8, 8192, 'application/json')
  }

  async handleChat(data: any): Promise<Response> {
    const { messages, context } = data
    const ctxDocs = this.context.loadAll()
    const systemInstruction = `You are an AI Business Assistant.\n\n${ctxDocs ? `Context:\n${ctxDocs}\n\n` : ''}Clients: ${JSON.stringify(context?.clients || [])}\nProjects: ${JSON.stringify(context?.projects || [])}\nInvoices: ${JSON.stringify(context?.invoices || [])}\n\nRespond in markdown. Be concise and actionable.`

    const contents = [
      { role: 'user', parts: [{ text: systemInstruction }] },
      { role: 'model', parts: [{ text: 'Understood.' }] },
      ...(messages || []).map((m: any) => ({ role: m.role === 'assistant' ? 'model' : 'user', parts: [{ text: m.content }] })),
    ]

    const resp = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${this.env.GEMINI_API_KEY}`,
      {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contents, generationConfig: { temperature: 0.7, maxOutputTokens: 4096 } }),
      }
    )
    if (!resp.ok) return this.json({ error: `Gemini error: ${await resp.text()}` }, 502)
    const result = await resp.json() as any
    const reply = result?.candidates?.[0]?.content?.parts?.[0]?.text || 'No response.'

    if (data.conversation_id) {
      const n = new Date().toISOString()
      this.sql.exec('INSERT INTO documents (id,collection,data,created_at,updated_at) VALUES (?,?,?,?,?)', crypto.randomUUID(), 'messages', JSON.stringify({ conversation_id: data.conversation_id, role: 'user', content: messages?.[messages.length - 1]?.content || '' }), n, n)
      this.sql.exec('INSERT INTO documents (id,collection,data,created_at,updated_at) VALUES (?,?,?,?,?)', crypto.randomUUID(), 'messages', JSON.stringify({ conversation_id: data.conversation_id, role: 'assistant', content: reply }), n, n)
    }

    return this.json({ text: reply })
  }

  private async callGemini(model: string, prompt: string, temp: number, maxTokens: number, mime?: string): Promise<Response> {
    const key = this.env.GEMINI_API_KEY || ''
    if (!key) return this.json({ error: 'Gemini API key not configured' }, 400)
    const body: any = { contents: [{ role: 'user', parts: [{ text: prompt }] }], generationConfig: { temperature: temp, maxOutputTokens: maxTokens } }
    if (mime) body.generationConfig.responseMimeType = mime
    const resp = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${key}`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body),
    })
    if (!resp.ok) return this.json({ error: `Gemini error: ${await resp.text()}` }, 502)
    const result = await resp.json() as any
    const text = result?.candidates?.[0]?.content?.parts?.[0]?.text || '{}'
    return this.json({ data: mime ? JSON.parse(text) : text })
  }

  private buildScopePrompt(d: any): string {
    return `You are an experienced freelance project estimator. Analyze this project and provide realistic estimates in JSON.\n\n<project>\n${d.description}\n</project>\n<context>\n<niche>${d.niche || 'general'}</niche>\n<experience>${d.experienceLevel || 'mid'}</experience>\n<rate>${d.hourlyRate || 50}</rate>\n</context>\n\nReturn JSON: {"estimatedHours":{"low":number,"mid":number,"high":number},"complexityScore":number,"pricingModel":"fixed"|"hourly"|"retainer","recommendedPrice":{"low":number,"mid":number,"high":number,"currency":"USD"},"scopeRisks":[...],"breakdown":[...]}`
  }

  private buildProposalPrompt(d: any): string {
    return `You are an expert proposal writer. Generate a complete freelance proposal as JSON.\n\nClient: ${d.clientName}\nDeliverables: ${d.deliverables}\nGoals: ${d.goals}\nTimeline: ${d.timeline}\nTone: ${d.tone}\n\nReturn JSON: {"executiveSummary":"string","understanding":"string","approach":"string","deliverables":[...],"timeline":[...],"investment":{"name":"string","price":number,"description":"string"},"whyMe":"string","callToAction":"string"}`
  }

  // ─── Domain Seeding ──
  async seedDomain(data: any): Promise<Response> {
    const results: Record<string, { created: number; updated: number; errors: string[] }> = {}

    // Seed domain config
    if (data.domain) {
      this.registry.setDomainConfig(data.domain)
      results.domain = { created: 1, updated: 0, errors: [] }
    }

    // Seed agents
    if (data.agents && Array.isArray(data.agents)) {
      results.agents = { created: 0, updated: 0, errors: [] }
      for (const a of data.agents) {
        try {
          const existing = this.registry.listAgents().find(x => x.name === a.name)
          if (existing) {
            this.registry.updateAgent(existing.id, a)
            results.agents.updated++
          } else {
            this.registry.createAgent(a)
            results.agents.created++
          }
        } catch (e) {
          results.agents.errors.push(`Agent ${a.name}: ${e instanceof Error ? e.message : String(e)}`)
        }
      }
    }

    // Seed commands
    if (data.commands && Array.isArray(data.commands)) {
      results.commands = { created: 0, updated: 0, errors: [] }
      for (const c of data.commands) {
        try {
          const existing = this.registry.getCommand(c.name)
          if (existing) {
            this.registry.updateCommand(existing.id, c)
            results.commands.updated++
          } else {
            this.registry.createCommand(c)
            results.commands.created++
          }
        } catch (e) {
          results.commands.errors.push(`Command ${c.name}: ${e instanceof Error ? e.message : String(e)}`)
        }
      }
    }

    // Seed context documents
    if (data.contexts && Array.isArray(data.contexts)) {
      results.contexts = { created: 0, updated: 0, errors: [] }
      for (const c of data.contexts) {
        try {
          const existing = this.registry.getContextByPath(c.path)
          if (existing) {
            this.registry.updateContext(existing.id, c)
            results.contexts.updated++
          } else {
            this.registry.createContext(c)
            results.contexts.created++
          }
        } catch (e) {
          results.contexts.errors.push(`Context ${c.path}: ${e instanceof Error ? e.message : String(e)}`)
        }
      }
    }

    // Seed pipeline steps (delete existing for command, then recreate)
    if (data.pipeline_steps && Array.isArray(data.pipeline_steps)) {
      results.pipeline_steps = { created: 0, updated: 0, errors: [] }
      const commandNames = new Set<string>(data.pipeline_steps.map((s: any) => s.command_name as string))
      for (const cmdName of commandNames) {
        this.registry.deleteStepsByCommand(cmdName)
      }
      for (const s of data.pipeline_steps) {
        try {
          this.registry.createStep(s)
          results.pipeline_steps.created++
        } catch (e) {
          results.pipeline_steps.errors.push(`Step ${s.name}: ${e instanceof Error ? e.message : String(e)}`)
        }
      }
    }

    return this.json({ success: true, results })
  }

  methodNotAllowed() { return this.json({ error: 'Method not allowed' }, 405) }
  json(data: any, status = 200): Response {
    return new Response(JSON.stringify(data), { status, headers: { 'Content-Type': 'application/json' } })
  }
}
