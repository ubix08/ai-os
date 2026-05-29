import { ToolContext, AgentConfig } from './types'

export type ToolHandler = (args: Record<string, unknown>, ctx: ToolContext) => Promise<Record<string, unknown>>

interface ToolDef { handler: ToolHandler; description: string; schema: Record<string, unknown> }

export class ToolRegistry {
  private tools = new Map<string, ToolDef>()

  register(name: string, description: string, handler: ToolHandler, schema?: Record<string, unknown>) {
    this.tools.set(name, { handler, description, schema: schema || { type: 'object', properties: {} } })
  }

  get(name: string): ToolHandler | undefined {
    return this.tools.get(name)?.handler
  }

  getDescription(name: string): string | undefined {
    return this.tools.get(name)?.description
  }

  list(): { name: string; description: string }[] {
    return Array.from(this.tools.entries()).map(([name, t]) => ({ name, description: t.description }))
  }

  getToolDefs(): any[] {
    return Array.from(this.tools.entries()).map(([name, t]) => ({
      name,
      description: t.description,
      ...t.schema,
    }))
  }

  registerDefaults(geminiKey: string, serperKey?: string) {

    this.register('gemini_prompt', 'Send a prompt to Gemini AI and get a response. Use for generation, analysis, reasoning.', async (args, ctx) => {
      const prompt = (args.prompt as string) || JSON.stringify(args)
      const expectJson = args.response_format === 'json'

      // Use agent config from pipeline runner if available
      let model = (args.model as string) || 'gemini-2.5-flash'
      let temperature = (args.temperature as number) ?? 0.7
      let system = (args.system as string) || ''

      if (ctx.agent) {
        if (ctx.agent.model) model = ctx.agent.model as string
        if (ctx.agent.temperature !== undefined) temperature = ctx.agent.temperature as number
        if (ctx.agent.system_prompt) system = ctx.agent.system_prompt as string
      }

      // Inject context from pipeline runner if available
      const injectedCtx = (args._context as string) || ''
      const lastStep = (args._last_step as string) || ''
      if (injectedCtx) {
        system = system ? `${system}\n\n${injectedCtx}` : injectedCtx
      }
      if (lastStep) {
        const prevOutput = args[lastStep] ? `\nPrevious step (${lastStep}) output: ${JSON.stringify(args[lastStep])}` : ''
        if (prevOutput) system += prevOutput
      }

      const body: any = {
        contents: [{ role: 'user', parts: [{ text: system ? `${system}\n\n${prompt}` : prompt }] }],
        generationConfig: { temperature, maxOutputTokens: args.max_tokens ?? 8192 },
      }
      if (expectJson) body.generationConfig.responseMimeType = 'application/json'

      const resp = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${geminiKey}`,
        { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }
      )
      if (!resp.ok) throw new Error(`Gemini error: ${await resp.text()}`)
      const result = await resp.json() as any
      const text = result?.candidates?.[0]?.content?.parts?.[0]?.text || ''

      if (expectJson) {
        try { return { result: JSON.parse(text), raw: text } }
        catch { return { result: text, raw: text, parse_error: true } }
      }
      return { result: text }
    }, {
      parameters: { type: 'object', properties: { prompt: { type: 'string', description: 'The prompt to send to the AI' }, model: { type: 'string', description: 'Model name (default: gemini-2.5-flash)' }, system: { type: 'string', description: 'System instruction' }, temperature: { type: 'number', description: 'Temperature (0-1)' }, max_tokens: { type: 'integer', description: 'Max output tokens' }, response_format: { type: 'string', description: 'Response format (text or json)' } }, required: ['prompt'] },
    })

    this.register('websearch', 'Search the web for current information on a topic using Serper.dev API. Returns structured results with titles, snippets, and links.', async (args, ctx) => {
      const query = (args.query as string) || JSON.stringify(args)
      const num = (args.num as number) || 5
      const apiKey = serperKey || ''
      if (!apiKey) throw new Error('SERPER_API_KEY not configured')

      const resp = await fetch('https://google.serper.dev/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-API-KEY': apiKey },
        body: JSON.stringify({ q: query, num, gl: 'us', hl: 'en' }),
      })
      if (!resp.ok) throw new Error(`Serper error: ${await resp.text()}`)
      const data = await resp.json() as any

      const results: Array<{ title: string; snippet: string; link: string; position: number }> = []
      if (data.organic) {
        for (const r of data.organic) {
          results.push({ title: r.title || '', snippet: r.snippet || '', link: r.link || '', position: r.position || 0 })
        }
      }
      return { query, count: results.length, results }
    }, {
      parameters: { type: 'object', properties: { query: { type: 'string', description: 'The search query' }, num: { type: 'integer', description: 'Number of results (default: 5)' } }, required: ['query'] },
    })

    this.register('webfetch', 'Fetch a URL and extract LLM-friendly content. Strips HTML, removes navigation/ads, returns clean text with headings.', async (args, ctx) => {
      const url = (args.url as string) || ''
      if (!url) throw new Error('URL is required')

      const resp = await fetch(url, {
        headers: { 'User-Agent': 'Mozilla/5.0 (compatible; AIBot/1.0)' },
      })
      if (!resp.ok) throw new Error(`Fetch error (${resp.status}): ${await resp.text()}`)
      const html = await resp.text()

      const content = extractLlmFriendlyContent(html, url)
      return { url, title: content.title, content: content.text, wordCount: content.text.split(/\s+/).length }
    }, {
      parameters: { type: 'object', properties: { url: { type: 'string', description: 'The URL to fetch and extract content from' } }, required: ['url'] },
    })

    this.register('call_agent', 'Invoke another agent by name or ID. Delegates a task to a specialist agent and returns their response.', async (args, ctx) => {
      const agentName = (args.agent_name as string) || ''
      const agentId = (args.agent_id as string) || ''
      const task = (args.task as string) || JSON.stringify(args)
      const sql = ctx.sql

      if (!sql) throw new Error('call_agent requires SQL storage access')
      if (!agentName && !agentId) throw new Error('agent_name or agent_id is required')

      // Look up agent by name or ID
      let agentRow: any = null
      if (agentId) {
        const rows = sql.exec('SELECT * FROM agent_configs WHERE id=?', agentId).toArray() as any[]
        agentRow = rows[0] || null
      }
      if (!agentRow && agentName) {
        const rows = sql.exec('SELECT * FROM agent_configs WHERE name=?', agentName).toArray() as any[]
        agentRow = rows[0] || null
      }
      if (!agentRow) throw new Error(`Agent '${agentName || agentId}' not found`)

      const agent: AgentConfig = {
        ...agentRow,
        tools: safeJson(agentRow.tools, []),
        native_tools: safeJson(agentRow.native_tools, []),
        narrative: agentRow.narrative === 1 || agentRow.narrative === true,
        context_refs: safeJson(agentRow.context_refs, []),
        mode: agentRow.mode || 'standalone',
      }

      // Load context documents for the target agent
      let contextText = ''
      if (agent.context_refs && agent.context_refs.length > 0) {
        const ctxParts: string[] = []
        for (const path of agent.context_refs) {
          const rows = sql.exec('SELECT * FROM context_documents WHERE path=?', path).toArray() as any[]
          if (rows.length > 0) {
            ctxParts.push(`---\n<context path="${path}">\n${rows[0].content}\n</context>\n---`)
          }
        }
        contextText = ctxParts.join('\n\n')
      }

      // Build system prompt
      let systemPrompt = agent.system_prompt
      if (contextText) systemPrompt += `\n\n## Context Documents\n${contextText}`
      if (agent.narrative) {
        systemPrompt += `\n\nYou operate in a structured narrative loop. For each step, output THOUGHT: your reasoning, ACTION: what you do, OBSERVATION: the result. End with RESPONSE: your final answer.`
      }

      // Call Gemini with the target agent's config
      const body: any = {
        contents: [{ role: 'user', parts: [{ text: task }] }],
        systemInstruction: { parts: [{ text: systemPrompt }] },
        generationConfig: { temperature: agent.temperature, maxOutputTokens: 8192 },
      }

      // Add native tools if configured
      const tools: any[] = []
      for (const nt of agent.native_tools) {
        if (nt === 'google_search') tools.push({ googleSearch: {} })
        if (nt === 'code_execution') tools.push({ codeExecution: {} })
      }
      if (tools.length > 0) body.tools = tools

      const resp = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${agent.model}:generateContent?key=${geminiKey}`,
        { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }
      )
      if (!resp.ok) throw new Error(`Gemini error: ${await resp.text()}`)
      const result = await resp.json() as any
      const text = result?.candidates?.[0]?.content?.parts?.[0]?.text || ''

      return { agent: agent.name, agent_id: agent.id, result: text }
    }, {
      parameters: { type: 'object', properties: { agent_name: { type: 'string', description: 'Name of the agent to call' }, agent_id: { type: 'string', description: 'ID of the agent to call' }, task: { type: 'string', description: 'The task or prompt for the agent' } }, required: ['task'] },
    })

    this.register('store_query', 'Query documents from the store by collection. Use filter to narrow results.', async (args, ctx) => {
      const collection = (args.collection as string) || ''
      const filter = args.filter as Record<string, unknown> | undefined
      const docs = ctx.store.query(collection, filter)
      return { count: docs.length, documents: docs.map(d => ({ id: d.id, ...d.data })) }
    }, {
      parameters: { type: 'object', properties: { collection: { type: 'string', description: 'Collection name' }, filter: { type: 'object', description: 'Optional filter fields' } }, required: ['collection'] },
    })

    this.register('store_get', 'Get a single document by collection and id.', async (args, ctx) => {
      const doc = ctx.store.get(args.collection as string, args.id as string)
      if (!doc) return { found: false }
      return { found: true, document: { id: doc.id, ...doc.data } }
    }, {
      parameters: { type: 'object', properties: { collection: { type: 'string', description: 'Collection name' }, id: { type: 'string', description: 'Document ID' } }, required: ['collection', 'id'] },
    })

    this.register('store_create', 'Create a new document in a collection.', async (args, ctx) => {
      const doc = ctx.store.create(args.collection as string, args.data as Record<string, unknown>)
      return { id: doc.id, document: { id: doc.id, ...doc.data } }
    }, {
      parameters: { type: 'object', properties: { collection: { type: 'string', description: 'Collection name' }, data: { type: 'object', description: 'Document data fields' } }, required: ['collection', 'data'] },
    })

    this.register('store_update', 'Update an existing document by collection and id.', async (args, ctx) => {
      const doc = ctx.store.update(args.collection as string, args.id as string, args.data as Record<string, unknown>)
      if (!doc) return { found: false }
      return { found: true, document: { id: doc.id, ...doc.data } }
    }, {
      parameters: { type: 'object', properties: { collection: { type: 'string', description: 'Collection name' }, id: { type: 'string', description: 'Document ID' }, data: { type: 'object', description: 'Updated data fields' } }, required: ['collection', 'id', 'data'] },
    })

    this.register('store_delete', 'Delete a document by collection and id.', async (args, ctx) => {
      const ok = ctx.store.delete(args.collection as string, args.id as string)
      return { deleted: ok }
    }, {
      parameters: { type: 'object', properties: { collection: { type: 'string', description: 'Collection name' }, id: { type: 'string', description: 'Document ID' } }, required: ['collection', 'id'] },
    })

    this.register('store_count', 'Count documents in a collection, optionally filtered.', async (args, ctx) => {
      const filter = args.filter as Record<string, unknown> | undefined
      const count = ctx.store.count(args.collection as string, filter)
      return { count }
    }, {
      parameters: { type: 'object', properties: { collection: { type: 'string', description: 'Collection name' }, filter: { type: 'object', description: 'Optional filter fields' } }, required: ['collection'] },
    })

    this.register('store_group', 'Group documents by a field and return counts per value.', async (args, ctx) => {
      const groups = ctx.store.groupBy(args.collection as string, args.field as string)
      return { groups }
    }, {
      parameters: { type: 'object', properties: { collection: { type: 'string', description: 'Collection name' }, field: { type: 'string', description: 'Field to group by' } }, required: ['collection', 'field'] },
    })

    this.register('store_aggregate', 'Aggregate a numeric field in a collection (sum, avg, min, max).', async (args, ctx) => {
      const value = ctx.store.aggregate(args.collection as string, args.field as string, args.fn as 'sum' | 'avg' | 'min' | 'max')
      return { [args.fn as string]: value }
    }, {
      parameters: { type: 'object', properties: { collection: { type: 'string', description: 'Collection name' }, field: { type: 'string', description: 'Field to aggregate' }, fn: { type: 'string', description: 'Aggregation function: sum, avg, min, or max' } }, required: ['collection', 'field', 'fn'] },
    })
  }
}

function safeJson(val: string | undefined, fallback: any): any {
  if (!val) return fallback
  try { return JSON.parse(val) } catch { return fallback }
}

function extractLlmFriendlyContent(html: string, url: string): { title: string; text: string } {
  // Extract title
  const titleMatch = html.match(/<title[^>]*>([^<]*)<\/title>/i)
  const title = titleMatch ? titleMatch[1].trim() : url

  // Remove script, style, nav, header, footer, aside, form, svg, iframe
  let cleaned = html
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<style[\s\S]*?<\/style>/gi, '')
    .replace(/<nav[\s\S]*?<\/nav>/gi, '')
    .replace(/<header[\s\S]*?<\/header>/gi, '')
    .replace(/<footer[\s\S]*?<\/footer>/gi, '')
    .replace(/<aside[\s\S]*?<\/aside>/gi, '')
    .replace(/<form[\s\S]*?<\/form>/gi, '')
    .replace(/<svg[\s\S]*?<\/svg>/gi, '')
    .replace(/<iframe[\s\S]*?<\/iframe>/gi, '')
    .replace(/<!--[\s\S]*?-->/g, '')

  // Convert headings to markdown
  cleaned = cleaned.replace(/<h1[^>]*>([^<]*)<\/h1>/gi, '\n# $1\n')
  cleaned = cleaned.replace(/<h2[^>]*>([^<]*)<\/h2>/gi, '\n## $1\n')
  cleaned = cleaned.replace(/<h3[^>]*>([^<]*)<\/h3>/gi, '\n### $1\n')
  cleaned = cleaned.replace(/<h4[^>]*>([^<]*)<\/h4>/gi, '\n#### $1\n')

  // Convert paragraphs and line breaks
  cleaned = cleaned.replace(/<\/?[pPbrBR][^>]*>/gi, '\n')

  // Convert list items
  cleaned = cleaned.replace(/<li[^>]*>([^<]*)<\/li>/gi, '- $1\n')

  // Convert links to [text](url)
  cleaned = cleaned.replace(/<a[^>]*href="([^"]*)"[^>]*>([^<]*)<\/a>/gi, '[$2]($1)')

  // Convert code blocks
  cleaned = cleaned.replace(/<pre[^>]*><code[^>]*>([\s\S]*?)<\/code><\/pre>/gi, '\n```\n$1\n```\n')

  // Remove all remaining HTML tags
  cleaned = cleaned.replace(/<[^>]+>/g, '')

  // Decode HTML entities
  cleaned = cleaned
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, ' ')

  // Normalize whitespace
  cleaned = cleaned
    .replace(/\n{3,}/g, '\n\n')
    .replace(/[ \t]+/g, ' ')
    .trim()

  return { title, text: cleaned }
}
