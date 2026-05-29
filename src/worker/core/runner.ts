import { PipelineRun, PipelineStep, ToolContext } from './types'
import { ToolRegistry, ToolHandler } from './tools'
import { DocumentStore } from './store'

export class PipelineRunner {
  constructor(
    private tools: ToolRegistry,
    private store: DocumentStore,
    private geminiKey: string,
    private sql?: SqlStorage,
  ) {}

  async executeRun(
    agent: { id: string; config: Record<string, unknown>; model?: string },
    steps: PipelineStep[],
    input: Record<string, unknown>,
    onProgress?: (runId: string, stepId: string, status: string) => void,
  ): Promise<{ status: string; outputs: Record<string, unknown>; error?: string; context: Record<string, unknown> }> {
    const context: Record<string, unknown> = { ...input }
    const outputs: Record<string, unknown> = {}
    const runId = crypto.randomUUID()

    for (const step of steps) {
      const attemptCount = (step.retry_count || 0) + 1
      let lastError: string | undefined

      for (let attempt = 1; attempt <= attemptCount; attempt++) {
        try {
          onProgress?.(runId, step.id, 'running')

          const handler = this.tools.get(step.tool)
          if (!handler) throw new Error(`Tool '${step.tool}' not found`)

          // Look up step's target agent config for system prompt and context injection
          let stepAgentConfig: Record<string, unknown> | undefined
          if (step.agent_id && this.sql) {
            const rows = this.sql.exec('SELECT * FROM agent_configs WHERE id=? OR name=?', step.agent_id, step.agent_id).toArray() as any[]
            if (rows.length > 0) {
              const agentRow = rows[0]
              stepAgentConfig = {
                ...agentRow,
                tools: safeJson(agentRow.tools, []),
                native_tools: safeJson(agentRow.native_tools, []),
                narrative: agentRow.narrative === 1 || agentRow.narrative === true,
                context_refs: safeJson(agentRow.context_refs, []),
                mode: agentRow.mode || 'standalone',
              }

              // Load context documents for the step's agent
              if (agentRow.context_refs) {
                const ctxRefs = safeJson(agentRow.context_refs, [])
                if (ctxRefs.length > 0) {
                  const ctxParts: string[] = []
                  for (const path of ctxRefs) {
                    const ctxRows = this.sql.exec('SELECT * FROM context_documents WHERE path=?', path).toArray() as any[]
                    if (ctxRows.length > 0) {
                      ctxParts.push(`---\n<context path="${path}">\n${ctxRows[0].content}\n</context>\n---`)
                    }
                  }
                  if (ctxParts.length > 0) {
                    context._injected_context = ctxParts.join('\n\n')
                  }
                }
              }
            }
          }

          const toolCtx: ToolContext = {
            store: this.store,
            geminiKey: this.geminiKey,
            sql: this.sql,
            agent: stepAgentConfig as any,
          }

          const stepInput = { ...step.input_schema, ...input, ...context, ...outputs }
          const output = await this.runWithTimeout(handler(stepInput, toolCtx), step.timeout_seconds * 1000)

          outputs[step.id] = output
          context[step.id] = output
          context._last_step = step.name
          onProgress?.(runId, step.id, 'completed')
          break
        } catch (err) {
          lastError = err instanceof Error ? err.message : String(err)
          onProgress?.(runId, step.id, attempt < attemptCount ? 'retrying' : 'failed')

          if (attempt >= attemptCount) {
            switch (step.on_failure) {
              case 'skip':
                outputs[step.id] = { skipped: true, error: lastError }
                context[step.id] = { skipped: true }
                onProgress?.(runId, step.id, 'skipped')
                break
              case 'fallback':
                outputs[step.id] = step.output_schema?.fallback || { fallback: true }
                context[step.id] = step.output_schema?.fallback || { fallback: true }
                onProgress?.(runId, step.id, 'completed')
                break
              case 'retry':
                // Already exhausted retries, treat as fail
                return { status: 'failed', outputs, error: lastError, context }
              default:
                return { status: 'failed', outputs, error: lastError, context }
            }
          }
        }
      }
    }

    return { status: 'completed', outputs, context }
  }

  private async runWithTimeout(promise: Promise<unknown>, ms: number): Promise<any> {
    const timeout = new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error(`Timed out after ${ms}ms`)), ms)
    )
    return Promise.race([promise, timeout])
  }
}

function safeJson(val: string | undefined, fallback: any): any {
  if (!val) return fallback
  try { return JSON.parse(val) } catch { return fallback }
}
