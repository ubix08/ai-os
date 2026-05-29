import { AgentConfig, AgentSession, Command, SkillDefinition, ContextDocument, ToolDefinition, DomainConfig, PipelineStep, Message } from './types'
import { DocumentStore } from './store'

export class Registry {
  constructor(private sql: SqlStorage) {}

  initSchema() {
    this.sql.exec(`CREATE TABLE IF NOT EXISTS agent_configs (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      description TEXT DEFAULT '',
      model TEXT NOT NULL DEFAULT 'gemini-2.5-flash',
      mode TEXT DEFAULT 'standalone' CHECK(mode IN ('primary','subagent','standalone')),
      system_prompt TEXT DEFAULT '',
      tools TEXT DEFAULT '[]',
      native_tools TEXT DEFAULT '[]',
      narrative INTEGER DEFAULT 0,
      max_turns INTEGER DEFAULT 20,
      temperature REAL DEFAULT 0.7,
      context_refs TEXT DEFAULT '[]',
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    )`)
    this.sql.exec(`CREATE TABLE IF NOT EXISTS commands (
      id TEXT PRIMARY KEY,
      name TEXT UNIQUE NOT NULL,
      description TEXT DEFAULT '',
      agent_id TEXT NOT NULL,
      input_template TEXT DEFAULT '$ARGUMENTS',
      context_refs TEXT DEFAULT '[]',
      mode TEXT DEFAULT 'pipeline' CHECK(mode IN ('pipeline','autonomous')),
      created_by TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    )`)
    this.sql.exec(`CREATE TABLE IF NOT EXISTS context_documents (
      id TEXT PRIMARY KEY,
      path TEXT UNIQUE NOT NULL,
      title TEXT NOT NULL,
      content TEXT DEFAULT '',
      tags TEXT DEFAULT '',
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    )`)
    this.sql.exec(`CREATE TABLE IF NOT EXISTS tool_definitions (
      id TEXT PRIMARY KEY,
      name TEXT UNIQUE NOT NULL,
      description TEXT DEFAULT '',
      type TEXT NOT NULL CHECK(type IN ('builtin','webhook','api')),
      config TEXT DEFAULT '{}',
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    )`)
    this.sql.exec(`CREATE TABLE IF NOT EXISTS skill_definitions (
      id TEXT PRIMARY KEY,
      name TEXT UNIQUE NOT NULL,
      description TEXT DEFAULT '',
      agents TEXT DEFAULT '[]',
      contexts TEXT DEFAULT '[]',
      commands TEXT DEFAULT '[]',
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    )`)
    this.sql.exec(`CREATE TABLE IF NOT EXISTS domain_config (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL
    )`)
    this.sql.exec(`CREATE TABLE IF NOT EXISTS pipeline_steps (
      id TEXT PRIMARY KEY,
      agent_id TEXT NOT NULL,
      command_name TEXT NOT NULL,
      name TEXT NOT NULL,
      description TEXT DEFAULT '',
      tool TEXT NOT NULL,
      input_schema TEXT DEFAULT '{}',
      output_schema TEXT DEFAULT '{}',
      retry_count INTEGER DEFAULT 0,
      timeout_seconds INTEGER DEFAULT 30,
      on_failure TEXT DEFAULT 'fail' CHECK(on_failure IN ('fail','skip','retry','fallback')),
      step_order INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    )`)
    this.sql.exec(`CREATE TABLE IF NOT EXISTS sessions (
      id TEXT PRIMARY KEY,
      agent_id TEXT NOT NULL,
      status TEXT DEFAULT 'active' CHECK(status IN ('active','completed','idle')),
      turn_count INTEGER DEFAULT 0,
      context TEXT DEFAULT '{}',
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    )`)
    this.sql.exec(`CREATE TABLE IF NOT EXISTS session_messages (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      session_id TEXT NOT NULL,
      role TEXT NOT NULL CHECK(role IN ('system','user','assistant','tool')),
      content TEXT NOT NULL,
      tool_calls TEXT DEFAULT NULL,
      timestamp TEXT NOT NULL DEFAULT (datetime('now'))
    )`)
    this.sql.exec(`CREATE INDEX IF NOT EXISTS idx_session_msgs ON session_messages(session_id, timestamp)`)
  }

  // ─── Domain Config ──
  getDomainConfig(): DomainConfig | null {
    const rows = this.sql.exec("SELECT * FROM domain_config WHERE key='domain'").toArray() as any[]
    if (rows.length === 0) return null
    return safeJson(rows[0].value, null)
  }

  setDomainConfig(config: DomainConfig): void {
    this.sql.exec("INSERT INTO domain_config (key,value) VALUES ('domain',?) ON CONFLICT(key) DO UPDATE SET value=?", JSON.stringify(config), JSON.stringify(config))
  }

  // ─── Agent Configs ──
  listAgents(): AgentConfig[] {
    return this.sql.exec('SELECT * FROM agent_configs ORDER BY name ASC').toArray().map((r: any) => this.parseAgent(r))
  }

  getAgent(id: string): AgentConfig | null {
    const rows = this.sql.exec('SELECT * FROM agent_configs WHERE id=?', id).toArray() as any[]
    if (rows.length === 0) return null
    return this.parseAgent(rows[0])
  }

  createAgent(data: Partial<AgentConfig>): AgentConfig {
    const id = crypto.randomUUID()
    const n = new Date().toISOString()
    this.sql.exec(
      'INSERT INTO agent_configs (id,name,description,model,mode,system_prompt,tools,native_tools,narrative,max_turns,temperature,context_refs,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)',
      id, data.name || 'Untitled', data.description || '', data.model || 'gemini-2.5-flash',
      data.mode || 'standalone', data.system_prompt || '', JSON.stringify(data.tools || []),
      JSON.stringify(data.native_tools || []), data.narrative ? 1 : 0,
      data.max_turns ?? 20, data.temperature ?? 0.7,
      JSON.stringify(data.context_refs || []), n, n,
    )
    return this.getAgent(id)!
  }

  updateAgent(id: string, data: Partial<AgentConfig>): AgentConfig | null {
    const existing = this.getAgent(id)
    if (!existing) return null
    const n = new Date().toISOString()
    const merged = { ...existing, ...data, updated_at: n }
    this.sql.exec(
      'UPDATE agent_configs SET name=?,description=?,model=?,mode=?,system_prompt=?,tools=?,native_tools=?,narrative=?,max_turns=?,temperature=?,context_refs=?,updated_at=? WHERE id=?',
      merged.name, merged.description, merged.model, merged.mode, merged.system_prompt,
      JSON.stringify(merged.tools), JSON.stringify(merged.native_tools || []),
      merged.narrative ? 1 : 0, merged.max_turns, merged.temperature,
      JSON.stringify(merged.context_refs), n, id,
    )
    return this.getAgent(id)
  }

  deleteAgent(id: string): boolean {
    this.sql.exec('DELETE FROM agent_configs WHERE id=?', id)
    return true
  }

  // ─── Commands ──
  listCommands(): Command[] {
    return this.sql.exec('SELECT * FROM commands ORDER BY name ASC').toArray().map((r: any) => this.parseCommand(r))
  }

  getCommand(name: string): Command | null {
    const rows = this.sql.exec('SELECT * FROM commands WHERE name=?', name).toArray() as any[]
    if (rows.length === 0) return null
    return this.parseCommand(rows[0])
  }

  getCommandById(id: string): Command | null {
    const rows = this.sql.exec('SELECT * FROM commands WHERE id=?', id).toArray() as any[]
    if (rows.length === 0) return null
    return this.parseCommand(rows[0])
  }

  createCommand(data: Partial<Command>): Command {
    const id = crypto.randomUUID()
    const n = new Date().toISOString()
    this.sql.exec(
      'INSERT INTO commands (id,name,description,agent_id,input_template,context_refs,mode,created_by,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?,?,?)',
      id, data.name || 'untitled', data.description || '', data.agent_id || '',
      data.input_template || '$ARGUMENTS', JSON.stringify(data.context_refs || []),
      data.mode || 'pipeline', data.created_by || null, n, n,
    )
    return this.getCommandById(id)!
  }

  updateCommand(id: string, data: Partial<Command>): Command | null {
    const existing = this.getCommandById(id)
    if (!existing) return null
    const n = new Date().toISOString()
    const merged = { ...existing, ...data, updated_at: n }
    this.sql.exec(
      'UPDATE commands SET name=?,description=?,agent_id=?,input_template=?,context_refs=?,mode=?,updated_at=? WHERE id=?',
      merged.name, merged.description, merged.agent_id, merged.input_template,
      JSON.stringify(merged.context_refs), merged.mode, n, id,
    )
    return this.getCommandById(id)
  }

  deleteCommand(id: string): boolean {
    this.sql.exec('DELETE FROM commands WHERE id=?', id)
    return true
  }

  deleteCommandByName(name: string): boolean {
    this.sql.exec('DELETE FROM commands WHERE name=?', name)
    return true
  }

  updateCommandById(id: string, data: Partial<Command>): Command | null {
    return this.updateCommand(id, data)
  }

  // ─── Context Documents ──
  listContexts(): ContextDocument[] {
    return this.sql.exec('SELECT * FROM context_documents ORDER BY path ASC').toArray() as unknown as ContextDocument[]
  }

  getContext(id: string): ContextDocument | null {
    const rows = this.sql.exec('SELECT * FROM context_documents WHERE id=?', id).toArray() as any[]
    return rows.length > 0 ? rows[0] as ContextDocument : null
  }

  getContextByPath(path: string): ContextDocument | null {
    const rows = this.sql.exec('SELECT * FROM context_documents WHERE path=?', path).toArray() as any[]
    return rows.length > 0 ? rows[0] as ContextDocument : null
  }

  createContext(data: Partial<ContextDocument>): ContextDocument {
    const id = crypto.randomUUID()
    const n = new Date().toISOString()
    this.sql.exec(
      'INSERT INTO context_documents (id,path,title,content,tags,created_at,updated_at) VALUES (?,?,?,?,?,?,?)',
      id, data.path || '', data.title || data.path || 'Untitled', data.content || '', data.tags || '', n, n,
    )
    return this.getContext(id)!
  }

  updateContext(id: string, data: Partial<ContextDocument>): ContextDocument | null {
    const existing = this.getContext(id)
    if (!existing) return null
    const n = new Date().toISOString()
    const merged = { ...existing, ...data, updated_at: n }
    this.sql.exec('UPDATE context_documents SET path=?,title=?,content=?,tags=?,updated_at=? WHERE id=?',
      merged.path, merged.title, merged.content, merged.tags, n, id,
    )
    return this.getContext(id)
  }

  deleteContext(id: string): boolean {
    this.sql.exec('DELETE FROM context_documents WHERE id=?', id)
    return true
  }

  // ─── Tools ──
  listTools(): ToolDefinition[] {
    return this.sql.exec('SELECT * FROM tool_definitions ORDER BY name ASC').toArray().map((r: any) => this.parseTool(r))
  }

  getTool(id: string): ToolDefinition | null {
    const rows = this.sql.exec('SELECT * FROM tool_definitions WHERE id=?', id).toArray() as any[]
    if (rows.length === 0) return null
    return this.parseTool(rows[0])
  }

  getToolByName(name: string): ToolDefinition | null {
    const rows = this.sql.exec('SELECT * FROM tool_definitions WHERE name=?', name).toArray() as any[]
    if (rows.length === 0) return null
    return this.parseTool(rows[0])
  }

  createTool(data: Partial<ToolDefinition>): ToolDefinition {
    const id = crypto.randomUUID()
    const n = new Date().toISOString()
    this.sql.exec(
      'INSERT INTO tool_definitions (id,name,description,type,config,created_at,updated_at) VALUES (?,?,?,?,?,?,?)',
      id, data.name || 'untitled', data.description || '', data.type || 'builtin',
      JSON.stringify(data.config || {}), n, n,
    )
    return this.getTool(id)!
  }

  updateTool(id: string, data: Partial<ToolDefinition>): ToolDefinition | null {
    const existing = this.getTool(id)
    if (!existing) return null
    const n = new Date().toISOString()
    const merged = { ...existing, ...data, updated_at: n }
    this.sql.exec('UPDATE tool_definitions SET name=?,description=?,type=?,config=?,updated_at=? WHERE id=?',
      merged.name, merged.description, merged.type, JSON.stringify(merged.config || {}), n, id,
    )
    return this.getTool(id)
  }

  deleteTool(id: string): boolean {
    this.sql.exec('DELETE FROM tool_definitions WHERE id=?', id)
    return true
  }

  // ─── Skills ──
  listSkills(): SkillDefinition[] {
    return this.sql.exec('SELECT * FROM skill_definitions ORDER BY name ASC').toArray().map((r: any) => this.parseSkill(r))
  }

  getSkill(id: string): SkillDefinition | null {
    const rows = this.sql.exec('SELECT * FROM skill_definitions WHERE id=?', id).toArray() as any[]
    if (rows.length === 0) return null
    return this.parseSkill(rows[0])
  }

  createSkill(data: Partial<SkillDefinition>): SkillDefinition {
    const id = crypto.randomUUID()
    const n = new Date().toISOString()
    this.sql.exec(
      'INSERT INTO skill_definitions (id,name,description,agents,contexts,commands,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?)',
      id, data.name || 'Untitled Skill', data.description || '',
      JSON.stringify(data.agents || []), JSON.stringify(data.contexts || []),
      JSON.stringify(data.commands || []), n, n,
    )
    return this.getSkill(id)!
  }

  updateSkill(id: string, data: Partial<SkillDefinition>): SkillDefinition | null {
    const existing = this.getSkill(id)
    if (!existing) return null
    const n = new Date().toISOString()
    const merged = { ...existing, ...data, updated_at: n }
    this.sql.exec('UPDATE skill_definitions SET name=?,description=?,agents=?,contexts=?,commands=?,updated_at=? WHERE id=?',
      merged.name, merged.description,
      JSON.stringify(merged.agents), JSON.stringify(merged.contexts),
      JSON.stringify(merged.commands), n, id,
    )
    return this.getSkill(id)
  }

  deleteSkill(id: string): boolean {
    this.sql.exec('DELETE FROM skill_definitions WHERE id=?', id)
    return true
  }

  // ─── Pipeline Steps ──
  listStepsByCommand(commandName: string): PipelineStep[] {
    return this.sql.exec('SELECT * FROM pipeline_steps WHERE command_name=? ORDER BY step_order ASC', commandName).toArray().map((r: any) => this.parseStep(r))
  }

  getStep(id: string): PipelineStep | null {
    const rows = this.sql.exec('SELECT * FROM pipeline_steps WHERE id=?', id).toArray() as any[]
    if (rows.length === 0) return null
    return this.parseStep(rows[0])
  }

  createStep(data: Partial<PipelineStep> & { command_name: string; name: string; tool: string }): PipelineStep {
    const id = crypto.randomUUID()
    const n = new Date().toISOString()
    this.sql.exec(
      'INSERT INTO pipeline_steps (id,agent_id,command_name,name,description,tool,input_schema,output_schema,retry_count,timeout_seconds,on_failure,step_order,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)',
      id, data.agent_id || '', data.command_name, data.name, data.description || '', data.tool,
      JSON.stringify(data.input_schema || {}), JSON.stringify(data.output_schema || {}),
      data.retry_count ?? 0, data.timeout_seconds ?? 30, data.on_failure || 'fail',
      data.order ?? 0, n, n,
    )
    return this.getStep(id)!
  }

  deleteStepsByCommand(commandName: string): void {
    this.sql.exec('DELETE FROM pipeline_steps WHERE command_name=?', commandName)
  }

  // ─── Sessions ──
  getSession(sessionId: string): AgentSession | null {
    const rows = this.sql.exec('SELECT * FROM sessions WHERE id=?', sessionId).toArray() as any[]
    if (rows.length === 0) return null
    const row = rows[0]
    const messages = this.getSessionMessages(sessionId)
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

  createSession(sessionId: string, agentId: string): AgentSession {
    const n = new Date().toISOString()
    this.sql.exec(
      'INSERT INTO sessions (id,agent_id,status,turn_count,context,created_at,updated_at) VALUES (?,"active",0,"{}",?,?)',
      sessionId, agentId, n, n,
    )
    return this.getSession(sessionId)!
  }

  updateSessionStatus(sessionId: string, status: string, turnCount: number): void {
    const n = new Date().toISOString()
    this.sql.exec(
      'UPDATE sessions SET status=?,turn_count=?,updated_at=? WHERE id=?',
      status, turnCount, n, sessionId,
    )
  }

  // ─── Session Messages ──
  getSessionMessages(sessionId: string, limit = 200): Message[] {
    const rows = this.sql.exec(
      'SELECT * FROM session_messages WHERE session_id=? ORDER BY timestamp ASC LIMIT ?',
      sessionId, limit,
    ).toArray() as any[]
    return rows.map(r => ({
      role: r.role,
      content: r.content,
      tool_calls: r.tool_calls ? safeJson(r.tool_calls, []) : undefined,
      timestamp: r.timestamp,
    }))
  }

  addSessionMessage(sessionId: string, role: string, content: string, toolCalls?: unknown): void {
    this.sql.exec(
      'INSERT INTO session_messages (session_id,role,content,tool_calls,timestamp) VALUES (?,?,?,?,?)',
      sessionId, role, content, toolCalls ? JSON.stringify(toolCalls) : null, new Date().toISOString(),
    )
  }

  pruneSessionMessages(sessionId: string, maxMessages = 200): void {
    const count = this.sql.exec(
      'SELECT COUNT(*) as c FROM session_messages WHERE session_id=?', sessionId,
    ).one() as any
    if (count.c > maxMessages * 1.5) {
      const toDelete = count.c - maxMessages
      this.sql.exec(
        'DELETE FROM session_messages WHERE id IN (SELECT id FROM session_messages WHERE session_id=? ORDER BY timestamp ASC LIMIT ?)',
        sessionId, toDelete,
      )
    }
  }

  deleteSession(sessionId: string): void {
    this.sql.exec('DELETE FROM session_messages WHERE session_id=?', sessionId)
    this.sql.exec('DELETE FROM sessions WHERE id=?', sessionId)
  }

  resolveTemplate(template: string, args: Record<string, string>): string {
    let result = template

    // Handle {{ variable }} and {{ variable|default }} syntax
    result = result.replace(/\{\{\s*(\w+)(?:\s*\|\s*([^}\}]+))?\s*\}\}/g, (_match, key, defaultVal) => {
      if (args[key] !== undefined && args[key] !== '') return args[key]
      if (defaultVal !== undefined) return defaultVal.trim()
      return ''
    })

    // Handle $VARIABLE syntax (backward compatibility)
    for (const [key, value] of Object.entries(args)) {
      result = result.replaceAll(`$${key}`, value)
    }

    return result
  }

  // ─── Parsers ──
  private parseAgent(row: any): AgentConfig {
    return {
      ...row,
      mode: row.mode || 'standalone',
      tools: safeJson(row.tools, []),
      native_tools: safeJson(row.native_tools, []),
      narrative: row.narrative === 1 || row.narrative === true,
      context_refs: safeJson(row.context_refs, []),
    }
  }

  private parseCommand(row: any): Command {
    return { ...row, context_refs: safeJson(row.context_refs, []) }
  }

  private parseTool(row: any): ToolDefinition {
    return { ...row, config: safeJson(row.config, {}) }
  }

  private parseSkill(row: any): SkillDefinition {
    return { ...row, agents: safeJson(row.agents, []), contexts: safeJson(row.contexts, []), commands: safeJson(row.commands, []) }
  }

  private parseStep(row: any): PipelineStep {
    return {
      ...row,
      order: row.step_order ?? 0,
      input_schema: safeJson(row.input_schema, {}),
      output_schema: safeJson(row.output_schema, {}),
    }
  }
}

function safeJson(val: string | undefined, fallback: any): any {
  if (!val) return fallback
  try { return JSON.parse(val) } catch { return fallback }
}
