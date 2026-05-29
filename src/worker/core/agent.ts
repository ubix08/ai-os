import { AgentConfig, AgentSession, Message, ToolCall, DocumentStoreAPI } from './types'
import { ToolRegistry } from './tools'
import { ToolParser } from './tool-parser'

const NARRATIVE_SYSTEM_PROMPT = `
You operate in a structured narrative loop. For each step, output exactly one of:

THOUGHT:
<your reasoning about what to do next>

ACTION:
<the tool call or native action you take>
  Tool: <tool_name>
  Arguments:
    <key>: <value>

OBSERVATION:
<the result of the action>

Then repeat until the task is complete, ending with:

THOUGHT:
The task is complete.

RESPONSE:
<final answer to the user>
`

const NATIVE_TOOL_MAP: Record<string, Record<string, any>> = {
  google_search: { googleSearch: {} },
  code_execution: { codeExecution: {} },
}

export class Agent {
  private toolParser = new ToolParser()
  private maxMessages = 200

  constructor(
    private config: AgentConfig,
    private tools: ToolRegistry,
    private store: DocumentStoreAPI,
    private geminiKey: string,
    private sql: SqlStorage,
  ) {}

  getConfig() { return this.config }

  async chat(sessionId: string, userMessage: string): Promise<{ text: string; session: AgentSession }> {
    let session = this.sqlGetSession(sessionId)
    if (!session) {
      session = this.sqlCreateSession(sessionId)
    }

    if (session.turn_count >= this.config.max_turns) {
      return { text: 'Max turns reached. Start a new session.', session }
    }

    this.sqlAddMessage(sessionId, 'user', userMessage)
    session.turn_count++
    this.sqlUpdateSession(sessionId, 'active', session.turn_count)

    const allDefs = this.tools.getToolDefs()
    const toolDefs = allDefs.filter(t => this.config.tools.includes(t.name))

    for (let turn = 0; turn < 10; turn++) {
      const messages = this.sqlGetMessages(sessionId)
      const result = await this.callGemini(messages, toolDefs as any[])
      if (!result) break

      if (result.toolCalls && result.toolCalls.length > 0) {
        for (const tc of result.toolCalls) {
          const handler = this.tools.get(tc.name)
          if (!handler) {
            this.sqlAddMessage(sessionId, 'tool', `Error: Tool '${tc.name}' not found`)
            continue
          }
          try {
            const toolResult = await handler(tc.arguments, { store: this.store, geminiKey: this.geminiKey, agent: this.config, sql: this.sql })
            this.sqlAddMessage(sessionId, 'tool', JSON.stringify(toolResult))
          } catch (err) {
            const msg = err instanceof Error ? err.message : String(err)
            this.sqlAddMessage(sessionId, 'tool', `Error: ${msg}`)
          }
        }
        continue
      }

      const xmlCalls = this.toolParser.parse(result.text)
      if (xmlCalls.length > 0) {
        for (const xc of xmlCalls) {
          if (xc.type === 'response') {
            this.sqlAddMessage(sessionId, 'assistant', xc.content || '')
            this.sqlUpdateSession(sessionId, 'idle', session.turn_count)
            const updated = this.sqlGetSession(sessionId)!
            return { text: xc.content || '', session: updated }
          }
          if (xc.type === 'ask_user') {
            this.sqlUpdateSession(sessionId, 'idle', session.turn_count)
            const updated = this.sqlGetSession(sessionId)!
            return { text: xc.query || '', session: updated }
          }
          if (xc.type === 'file_tool' || xc.type === 'workflow_tool') {
            const handler = this.tools.get(xc.type)
            if (handler) {
              try {
                const toolResult = await handler(xc as any, { store: this.store, geminiKey: this.geminiKey, agent: this.config, sql: this.sql })
                this.sqlAddMessage(sessionId, 'tool', JSON.stringify(toolResult))
              } catch (err) {
                const msg = err instanceof Error ? err.message : String(err)
                this.sqlAddMessage(sessionId, 'tool', `Error: ${msg}`)
              }
            }
          }
        }
        continue
      }

      if (result.codeExecutionResults && result.codeExecutionResults.length > 0) {
        this.sqlAddMessage(sessionId, 'tool', JSON.stringify(result.codeExecutionResults))
        continue
      }

      if (result.searchResults && result.searchResults.length > 0) {
        this.sqlAddMessage(sessionId, 'tool', `Search results:\n${JSON.stringify(result.searchResults)}`)
        continue
      }

      if (result.text) {
        this.sqlAddMessage(sessionId, 'assistant', result.text)
        this.sqlUpdateSession(sessionId, 'idle', session.turn_count)
        const updated = this.sqlGetSession(sessionId)!
        return { text: result.text, session: updated }
      }

      break
    }

    this.sqlUpdateSession(sessionId, 'completed', session.turn_count)
    const updated = this.sqlGetSession(sessionId)!
    return { text: 'Max tool call iterations reached.', session: updated }
  }

  private sqlGetSession(sessionId: string): AgentSession | null {
    const rows = this.sql.exec('SELECT * FROM sessions WHERE id=?', sessionId).toArray() as any[]
    if (rows.length === 0) return null
    const row = rows[0]
    const messages = this.sqlGetMessages(sessionId)
    return {
      id: row.id,
      agent_id: row.agent_id,
      messages,
      context: safeJson(row.context, {}),
      status: row.status,
      turn_count: row.turn_count,
      created_at: row.created_at,
      updated_at: row.updated_at,
    }
  }

  private sqlCreateSession(sessionId: string): AgentSession {
    const n = new Date().toISOString()
    this.sql.exec(
      'INSERT INTO sessions (id,agent_id,status,turn_count,context,created_at,updated_at) VALUES (?,"active",0,"{}",?,?)',
      sessionId, this.config.id, n, n,
    )
    return this.sqlGetSession(sessionId)!
  }

  private sqlUpdateSession(sessionId: string, status: string, turnCount: number): void {
    const n = new Date().toISOString()
    this.sql.exec(
      'UPDATE sessions SET status=?,turn_count=?,updated_at=? WHERE id=?',
      status, turnCount, n, sessionId,
    )
  }

  private sqlGetMessages(sessionId: string): Message[] {
    const rows = this.sql.exec(
      'SELECT * FROM session_messages WHERE session_id=? ORDER BY timestamp ASC LIMIT ?',
      sessionId, this.maxMessages,
    ).toArray() as any[]
    return rows.map(r => ({
      role: r.role,
      content: r.content,
      tool_calls: r.tool_calls ? safeJson(r.tool_calls, []) : undefined,
      timestamp: r.timestamp,
    }))
  }

  private sqlAddMessage(sessionId: string, role: string, content: string, toolCalls?: unknown): void {
    this.sql.exec(
      'INSERT INTO session_messages (session_id,role,content,tool_calls,timestamp) VALUES (?,?,?,?,?)',
      sessionId, role, content, toolCalls ? JSON.stringify(toolCalls) : null, new Date().toISOString(),
    )
    this.sql.exec(
      'DELETE FROM session_messages WHERE id IN (SELECT id FROM session_messages WHERE session_id=? ORDER BY timestamp ASC LIMIT -1 OFFSET ?)',
      sessionId, this.maxMessages,
    )
  }

  private buildSystemPrompt(): string {
    let prompt = this.config.system_prompt
    if (this.config.narrative) {
      prompt += `\n${NARRATIVE_SYSTEM_PROMPT}`
    }
    return prompt
  }

  private async callGemini(messages: Message[], toolDefs: any[]): Promise<{
    text: string
    toolCalls?: ToolCall[]
    searchResults?: any[]
    codeExecutionResults?: any[]
  } | null> {
    const contents = messages.map((m) => {
      if (m.role === 'system') return { role: 'user', parts: [{ text: m.content }] }
      if (m.role === 'tool') return { role: 'user', parts: [{ text: `Tool result:\n${m.content}` }] }
      return { role: m.role === 'assistant' ? 'model' : 'user', parts: [{ text: m.content }] }
    })

    const body: any = {
      contents,
      systemInstruction: { parts: [{ text: this.buildSystemPrompt() }] },
      generationConfig: { temperature: this.config.temperature, maxOutputTokens: 8192 },
    }

    const tools: any[] = []
    for (const nt of this.config.native_tools) {
      const nativeTool = NATIVE_TOOL_MAP[nt]
      if (nativeTool) tools.push(nativeTool)
    }
    if (toolDefs.length > 0) {
      tools.push({ functionDeclarations: toolDefs })
    }
    if (tools.length > 0) {
      body.tools = tools
    }

    const resp = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${this.config.model}:generateContent?key=${this.geminiKey}`,
      { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }
    )
    if (!resp.ok) throw new Error(`Gemini error: ${await resp.text()}`)
    const result = await resp.json() as any
    const candidate = result?.candidates?.[0]
    if (!candidate) return { text: 'No response from model.' }

    const parts = candidate.content?.parts
    if (!parts || parts.length === 0) return { text: 'Empty response.' }

    let text = ''
    const toolCalls: ToolCall[] = []
    const codeExecutionResults: any[] = []

    for (const part of parts) {
      if (part.text) text += part.text
      if (part.thought) text += `\n[thinking]\n${part.thought}\n[/thinking]\n`
      if (part.functionCall) {
        const fc = part.functionCall
        toolCalls.push({ id: crypto.randomUUID(), name: fc.name, arguments: fc.args as Record<string, unknown> })
      }
      if (part.codeExecutionResult) codeExecutionResults.push(part.codeExecutionResult)
      if (part.executableCode) codeExecutionResults.push({ code: part.executableCode.code, language: part.executableCode.language })
    }

    const searchResults = candidate.groundingMetadata ? [candidate.groundingMetadata] : undefined

    if (!text && toolCalls.length === 0 && searchResults === undefined && codeExecutionResults.length === 0) {
      return { text: 'Empty response.' }
    }

    const response: any = { text }
    if (toolCalls.length > 0) response.toolCalls = toolCalls
    if (searchResults) response.searchResults = searchResults
    if (codeExecutionResults.length > 0) response.codeExecutionResults = codeExecutionResults
    return response
  }
}

function safeJson(val: string | undefined, fallback: any): any {
  if (!val) return fallback
  try { return JSON.parse(val) } catch { return fallback }
}
