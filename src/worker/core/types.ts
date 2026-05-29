// ─── Generic Document Store ──
export interface Document {
  id: string
  collection: string
  data: Record<string, unknown>
  created_at: string
  updated_at: string
}

// ─── Domain Config ──
export interface DomainConfig {
  name: string
  label: string
  collections: CollectionDef[]
  dashboard: DashboardDef
  agents?: string[]         // agent IDs to auto-register
  commands?: string[]       // command IDs to auto-register
}

export interface CollectionDef {
  name: string
  label: string
  icon?: string
  schema?: Record<string, unknown>
  listFields?: string[]
  searchFields?: string[]
}

export interface DashboardDef {
  widgets: WidgetDef[]
}

export interface WidgetDef {
  type: string
  collection?: string
  label: string
  config?: Record<string, unknown>
}

// ─── Agent ──
export type AgentMode = 'primary' | 'subagent' | 'standalone'

export interface AgentConfig {
  id: string
  name: string
  description: string
  model: string
  mode: AgentMode
  system_prompt: string
  tools: string[]
  native_tools: string[]   // 'google_search' | 'code_execution'
  narrative: boolean       // enable THOUGHT/ACTION/OBSERVATION pattern
  max_turns: number
  temperature: number
  context_refs: string[]
  created_at: string
  updated_at: string
}

export interface XmlToolCall {
  type: 'response' | 'ask_user' | 'file_tool' | 'workflow_tool'
  action?: string
  path?: string
  content?: string
  query?: string
  workflowId?: string
  projectPath?: string
  stepNumber?: number
}

export interface NarrativeBlock {
  thought?: string
  action?: string
  observation?: string
}

export interface AgentSession {
  id: string
  agent_id: string
  messages: Message[]
  context: Record<string, unknown>
  status: 'active' | 'completed' | 'idle'
  turn_count: number
  created_at: string
  updated_at: string
}

export interface Message {
  role: 'system' | 'user' | 'assistant' | 'tool'
  content: string
  tool_calls?: ToolCall[]
  timestamp: string
}

export interface ToolCall {
  id: string
  name: string
  arguments: Record<string, unknown>
}

export type PipelineRunStatus = 'pending' | 'running' | 'completed' | 'failed' | 'cancelled'
export type StepStatus = 'pending' | 'running' | 'completed' | 'failed' | 'skipped'

export interface PipelineRun {
  id: string
  agent_id: string
  input: Record<string, unknown>
  status: PipelineRunStatus
  context: Record<string, unknown>
  error?: string
  created_at: string
  updated_at: string
}

export interface PipelineStep {
  id: string
  command_name: string
  agent_id: string
  name: string
  description: string
  tool: string
  input_schema?: Record<string, unknown>
  output_schema?: Record<string, unknown>
  retry_count: number
  timeout_seconds: number
  on_failure: 'fail' | 'skip' | 'retry' | 'fallback'
  order: number
}

export interface StepResult {
  id: string
  run_id: string
  step_id: string
  status: StepStatus
  input: Record<string, unknown>
  output?: Record<string, unknown>
  error?: string
  attempts: number
  max_attempts: number
  started_at?: string
  completed_at?: string
}

// ─── Command ──
export interface Command {
  id: string
  name: string
  description: string
  agent_id: string
  input_template: string
  context_refs: string[]
  created_by: string
  mode: 'pipeline' | 'autonomous'
  created_at: string
  updated_at: string
}

// ─── Context ──
export interface ContextDocument {
  id: string
  path: string
  title: string
  content: string
  tags: string
  created_at: string
  updated_at: string
}

// ─── Tool ──
export interface ToolDefinition {
  id: string
  name: string
  description: string
  type: 'builtin' | 'webhook' | 'api'
  config: Record<string, unknown>
  created_at: string
  updated_at: string
}

export interface ToolContext {
  session?: AgentSession
  agent?: AgentConfig
  store: DocumentStoreAPI
  geminiKey: string
  sql?: SqlStorage
}

export interface DocumentStoreAPI {
  query: (collection: string, filter?: Record<string, unknown>) => Document[]
  get: (collection: string, id: string) => Document | null
  create: (collection: string, data: Record<string, unknown>) => Document
  update: (collection: string, id: string, data: Record<string, unknown>) => Document | null
  delete: (collection: string, id: string) => boolean
  count: (collection: string, filter?: Record<string, unknown>) => number
  groupBy: (collection: string, field: string) => Record<string, number>
  aggregate: (collection: string, field: string, fn: 'sum' | 'avg' | 'min' | 'max') => number
}

// ─── Skill ──
export interface SkillDefinition {
  id: string
  name: string
  description: string
  agents: string[]
  contexts: string[]
  commands: string[]
  created_at: string
  updated_at: string
}

// ─── Permission ──
export type PermissionRole = 'none' | 'read' | 'write' | 'admin'
export type PermissionDomain = 'documents' | 'agents' | 'commands' | 'contexts' | 'tools' | 'skills' | 'config'

export interface AgentPermission {
  agent_id: string
  domain: PermissionDomain
  role: PermissionRole
}
