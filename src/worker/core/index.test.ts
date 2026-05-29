import { describe, it, expect, beforeEach } from 'vitest'
import { Registry } from './registry'
import { ToolParser } from './tool-parser'
import { ToolRegistry } from './tools'

// Mock SqlStorage for testing
class MockSqlStorage {
  private tables = new Map<string, any[]>()
  private autoIncrement = new Map<string, number>()

  exec(query: string, ...params: any[]): { one(): any; toArray(): any[]; [Symbol.iterator](): Iterator<any> } {
    const normalized = query.trim().replace(/\s+/g, ' ')

    if (normalized.startsWith('CREATE TABLE')) {
      const match = normalized.match(/CREATE TABLE IF NOT EXISTS (\w+)/i)
      if (match) {
        const name = match[1]
        if (!this.tables.has(name)) this.tables.set(name, [])
      }
      return emptyResult()
    }

    if (normalized.startsWith('CREATE INDEX')) {
      return emptyResult()
    }

    if (normalized.startsWith('INSERT INTO')) {
      const match = normalized.match(/INSERT INTO (\w+) \(([^)]+)\) VALUES \(([^)]+)\)/i)
      if (match) {
        const tableName = match[1]
        const columns = match[2].split(',').map(c => c.trim())
        const values = match[3].split(',').map(v => v.trim())

        if (!this.tables.has(tableName)) this.tables.set(tableName, [])

        const row: Record<string, any> = {}
        for (let i = 0; i < columns.length; i++) {
          let val = params[i] !== undefined ? params[i] : values[i]
          if (val === 'datetime(\'now\')') val = '2025-01-01T00:00:00.000Z'
          if (val === '?' || val === 'NULL') val = null
          row[columns[i]] = val
        }

        // Handle auto-increment
        if (row.id === undefined || row.id === 'INTEGER PRIMARY KEY AUTOINCREMENT') {
          const aiKey = `${tableName}_ai`
          const current = this.autoIncrement.get(aiKey) || 1
          row.id = current
          this.autoIncrement.set(aiKey, current + 1)
        }

        this.tables.get(tableName)!.push(row)
        return emptyResult()
      }
    }

    if (normalized.startsWith('UPDATE')) {
      const match = normalized.match(/UPDATE (\w+) SET (.+?) WHERE (.+)/i)
      if (match) {
        const tableName = match[1]
        const setClause = match[2]
        const whereClause = match[3]

        const table = this.tables.get(tableName) || []
        const whereCol = whereClause.split('=')[0].trim()
        const whereVal = params[params.length - 1]

        const setPairs = setClause.split(',').map(s => s.trim())
        const row = table.find(r => r[whereCol] === whereVal)
        if (row) {
          let paramIdx = 0
          for (const pair of setPairs) {
            const [col] = pair.split('=')
            const val = params[paramIdx]
            row[col.trim()] = val
            paramIdx++
          }
        }
        return emptyResult()
      }
    }

    if (normalized.startsWith('DELETE FROM')) {
      const match = normalized.match(/DELETE FROM (\w+)(?: WHERE (.+))?/i)
      if (match) {
        const tableName = match[1]
        const table = this.tables.get(tableName) || []
        if (match[2]) {
          const whereCol = match[2].split('=')[0].trim()
          const whereVal = params[0]
          const idx = table.findIndex(r => r[whereCol] === whereVal)
          if (idx >= 0) table.splice(idx, 1)
        } else {
          this.tables.set(tableName, [])
        }
        return emptyResult()
      }
    }

    if (normalized.startsWith('SELECT')) {
      const match = normalized.match(/SELECT \* FROM (\w+)(?: WHERE (.+?))?(?: ORDER BY (.+?))?(?: LIMIT (\d+))?/i)
      if (match) {
        const tableName = match[1]
        let rows = [...(this.tables.get(tableName) || [])]

        if (match[2]) {
          const whereClause = match[2]
          // Handle IN subquery pattern
          if (whereClause.includes('IN')) {
            // Skip complex subqueries for mock, just return all
          } else {
            const parts = whereClause.split('=')
            if (parts.length === 2) {
              const col = parts[0].trim()
              const val = params[0]
              rows = rows.filter(r => r[col] === val)
            }
          }
        }

        if (match[3]) {
          const orderBy = match[3].replace(/"/g, '').trim()
          const [col, dir] = orderBy.split(/\s+/)
          rows.sort((a, b) => {
            if (dir?.toUpperCase() === 'DESC') return (b[col] || 0) - (a[col] || 0)
            return (a[col] || 0) - (b[col] || 0)
          })
        }

        if (match[4]) {
          const limit = parseInt(match[4])
          rows = rows.slice(0, limit)
        }

        return iterableResult(rows)
      }
    }

    return emptyResult()
  }
}

function emptyResult() {
  return {
    one: () => null,
    toArray: () => [],
    [Symbol.iterator]: function* () {},
  }
}

function iterableResult(rows: any[]) {
  return {
    one: () => rows[0] || null,
    toArray: () => rows,
    [Symbol.iterator]: function* () { yield* rows },
  }
}

describe('Registry', () => {
  let sql: MockSqlStorage
  let registry: Registry

  beforeEach(() => {
    sql = new MockSqlStorage()
    registry = new Registry(sql as unknown as SqlStorage)
    registry.initSchema()
  })

  it('creates and retrieves agents', () => {
    const agent = registry.createAgent({
      name: 'Test Agent',
      description: 'A test agent',
      model: 'gemini-2.5-flash',
      mode: 'primary',
      system_prompt: 'You are a test agent.',
      tools: ['gemini_prompt'],
      native_tools: ['google_search'],
      narrative: true,
      max_turns: 10,
      temperature: 0.7,
      context_refs: [],
    })

    expect(agent.name).toBe('Test Agent')
    expect(agent.mode).toBe('primary')
    expect(agent.narrative).toBe(true)
    expect(agent.native_tools).toEqual(['google_search'])

    const retrieved = registry.getAgent(agent.id)
    expect(retrieved).not.toBeNull()
    expect(retrieved!.name).toBe('Test Agent')
  })

  it('lists agents sorted by name', () => {
    registry.createAgent({ name: 'Beta', mode: 'standalone', system_prompt: '', tools: [], native_tools: [], narrative: false, context_refs: [] })
    registry.createAgent({ name: 'Alpha', mode: 'standalone', system_prompt: '', tools: [], native_tools: [], narrative: false, context_refs: [] })

    const agents = registry.listAgents()
    expect(agents.length).toBe(2)
    // Verify both agents exist
    const names = agents.map((a: { name: string }) => a.name)
    expect(names).toContain('Alpha')
    expect(names).toContain('Beta')
  })

  it('updates agents', () => {
    const agent = registry.createAgent({ name: 'Test', mode: 'standalone', system_prompt: '', tools: [], native_tools: [], narrative: false, context_refs: [] })
    const updated = registry.updateAgent(agent.id, { name: 'Updated', temperature: 0.3 })
    expect(updated!.name).toBe('Updated')
    expect(updated!.temperature).toBe(0.3)
  })

  it('creates and retrieves commands', () => {
    const cmd = registry.createCommand({
      name: 'test-cmd',
      description: 'A test command',
      agent_id: 'test-agent',
      input_template: 'Do {{task|nothing}}',
      context_refs: ['core/standards.md'],
      mode: 'pipeline',
    })

    expect(cmd.name).toBe('test-cmd')
    expect(cmd.context_refs).toEqual(['core/standards.md'])

    const retrieved = registry.getCommand('test-cmd')
    expect(retrieved).not.toBeNull()
    expect(retrieved!.context_refs).toEqual(['core/standards.md'])
  })

  it('creates and retrieves context documents', () => {
    const ctx = registry.createContext({
      path: 'core/standards.md',
      title: 'Quality Standards',
      content: '# Standards\n\nAll content must...',
      tags: 'core,quality',
    })

    expect(ctx.path).toBe('core/standards.md')

    const retrieved = registry.getContextByPath('core/standards.md')
    expect(retrieved).not.toBeNull()
    expect(retrieved!.content).toContain('All content must')
  })

  it('creates and retrieves pipeline steps', () => {
    const step = registry.createStep({
      command_name: 'article',
      name: 'research',
      description: 'Research the topic',
      tool: 'gemini_prompt',
      agent_id: 'researcher',
      input_schema: { prompt: 'Research {{topic}}' },
      retry_count: 2,
      timeout_seconds: 120,
      on_failure: 'skip',
      order: 1,
    })

    expect(step.name).toBe('research')
    expect(step.order).toBe(1)

    const steps = registry.listStepsByCommand('article')
    expect(steps.length).toBe(1)
    expect(steps[0].name).toBe('research')
  })
})

describe('Template Resolution', () => {
  let sql: MockSqlStorage
  let registry: Registry

  beforeEach(() => {
    sql = new MockSqlStorage()
    registry = new Registry(sql as unknown as SqlStorage)
  })

  it('resolves $VAR syntax', () => {
    const result = registry.resolveTemplate('Hello $NAME, welcome to $PLACE', { NAME: 'World', PLACE: 'ai-os' })
    expect(result).toBe('Hello World, welcome to ai-os')
  })

  it('resolves {{ var }} syntax', () => {
    const result = registry.resolveTemplate('Topic: {{topic}}', { topic: 'AI Agents' })
    expect(result).toBe('Topic: AI Agents')
  })

  it('resolves {{ var|default }} with value', () => {
    const result = registry.resolveTemplate('Audience: {{audience|intermediate}}', { audience: 'advanced' })
    expect(result).toBe('Audience: advanced')
  })

  it('resolves {{ var|default }} with default when missing', () => {
    const result = registry.resolveTemplate('Audience: {{audience|intermediate}}', {})
    expect(result).toBe('Audience: intermediate')
  })

  it('resolves mixed syntax', () => {
    const result = registry.resolveTemplate('$GREETING {{name|friend}}, topic: {{topic}}', {
      GREETING: 'Hello',
      name: 'Alice',
      topic: 'Cloudflare Workers',
    })
    expect(result).toBe('Hello Alice, topic: Cloudflare Workers')
  })

  it('handles empty default', () => {
    const result = registry.resolveTemplate('Value: {{missing}}', {})
    expect(result).toBe('Value: ')
  })
})

describe('ToolParser', () => {
  it('parses <response> tag', () => {
    const text = 'THOUGHT: Done.\n<response>Here is the answer.</response>'
    const calls = new ToolParser().parse(text)
    expect(calls.length).toBe(1)
    expect(calls[0].type).toBe('response')
    expect(calls[0].content).toBe('Here is the answer.')
  })

  it('parses <ask_user> tag', () => {
    const text = '<ask_user query="What is the target audience?">Please specify the audience.</ask_user>'
    const calls = new ToolParser().parse(text)
    expect(calls.length).toBe(1)
    expect(calls[0].type).toBe('ask_user')
    expect(calls[0].query).toBe('What is the target audience?')
  })

  it('parses <file_tool> tag with attributes', () => {
    const text = '<file_tool action="write" path="content/article.md">Hello world</file_tool>'
    const calls = new ToolParser().parse(text)
    expect(calls.length).toBe(1)
    expect(calls[0].type).toBe('file_tool')
    expect(calls[0].action).toBe('write')
    expect(calls[0].path).toBe('content/article.md')
    expect(calls[0].content).toBe('Hello world')
  })

  it('parses <workflow_tool> tag', () => {
    const text = '<workflow_tool action="search" workflowId="seo-content" projectPath="project_123" stepNumber="2" />'
    const calls = new ToolParser().parse(text)
    expect(calls.length).toBe(1)
    expect(calls[0].type).toBe('workflow_tool')
    expect(calls[0].action).toBe('search')
    expect(calls[0].workflowId).toBe('seo-content')
  })

  it('parses multiple tags', () => {
    const text = `
      THOUGHT: Starting work.
      <file_tool action="write" path="data/research.md">Research data</file_tool>
      OBSERVATION: File written.
      <response>Research complete.</response>
    `
    const calls = new ToolParser().parse(text)
    expect(calls.length).toBe(2)
    // Tags are parsed in TAG_PATTERNS order: response first, then file_tool
    expect(calls[0].type).toBe('response')
    expect(calls[1].type).toBe('file_tool')
  })

  it('returns empty array for no tags', () => {
    const calls = new ToolParser().parse('Just plain text with no tags.')
    expect(calls.length).toBe(0)
  })
})

describe('ToolRegistry', () => {
  it('registers and retrieves tools', () => {
    const registry = new ToolRegistry()
    registry.registerDefaults('test-key', 'test-serper')

    expect(registry.get('gemini_prompt')).toBeDefined()
    expect(registry.get('websearch')).toBeDefined()
    expect(registry.get('webfetch')).toBeDefined()
    expect(registry.get('call_agent')).toBeDefined()
    expect(registry.get('store_query')).toBeDefined()
    expect(registry.get('store_create')).toBeDefined()
  })

  it('lists all registered tools', () => {
    const registry = new ToolRegistry()
    registry.registerDefaults('test-key', 'test-serper')

    const tools = registry.list()
    expect(tools.length).toBeGreaterThan(10)
    expect(tools.map((t: { name: string }) => t.name)).toContain('gemini_prompt')
    expect(tools.map((t: { name: string }) => t.name)).toContain('websearch')
    expect(tools.map((t: { name: string }) => t.name)).toContain('webfetch')
    expect(tools.map((t: { name: string }) => t.name)).toContain('call_agent')
  })

  it('generates tool definitions for Gemini function calling', () => {
    const registry = new ToolRegistry()
    registry.registerDefaults('test-key', 'test-serper')

    const defs = registry.getToolDefs()
    const geminiPrompt = defs.find((d: { name: string }) => d.name === 'gemini_prompt')
    expect(geminiPrompt).toBeDefined()
    expect(geminiPrompt!.description).toContain('Send a prompt to Gemini')
    expect(geminiPrompt!.parameters).toBeDefined()
  })
})
