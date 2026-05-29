import { XmlToolCall } from './types'

const TAG_PATTERNS: { tag: string; type: XmlToolCall['type'] }[] = [
  { tag: 'response', type: 'response' },
  { tag: 'ask_user', type: 'ask_user' },
  { tag: 'file_tool', type: 'file_tool' },
  { tag: 'workflow_tool', type: 'workflow_tool' },
]

export class ToolParser {
  parse(text: string): XmlToolCall[] {
    const calls: XmlToolCall[] = []
    for (const { tag, type } of TAG_PATTERNS) {
      // Match both <tag ...>content</tag> and <tag ... />
      const regex = new RegExp(`<${tag}([^>]*)>([\\s\\S]*?)<\\/${tag}>|<${tag}([^>]*)\\s*\\/>`, 'gi')
      let match: RegExpExecArray | null
      while ((match = regex.exec(text)) !== null) {
        const attrStr = match[1] || match[3] || ''
        const inner = (match[2] || '').trim()
        const attrs = this.parseAttrs(attrStr)
        const call: XmlToolCall = { type }

        if (type === 'response') {
          call.content = inner
        } else if (type === 'ask_user') {
          call.query = attrs.query || inner
        } else if (type === 'file_tool') {
          call.action = attrs.action
          call.path = attrs.path
          call.content = inner
        } else if (type === 'workflow_tool') {
          call.workflowId = attrs.workflowId || attrs.workflow_id
          call.projectPath = attrs.projectPath || attrs.project_path
          call.stepNumber = attrs.stepNumber ? parseInt(attrs.stepNumber) : undefined
          call.action = attrs.action
        }

        calls.push(call)
      }
    }
    return calls
  }

  reconstruct(calls: XmlToolCall[]): string {
    let output = ''
    for (const c of calls) {
      if (c.type === 'response') {
        output += `<response>${c.content || ''}</response>\n`
      } else if (c.type === 'ask_user') {
        output += `<ask_user query="${(c.query || '').replace(/"/g, '&quot;')}" />\n`
      } else if (c.type === 'file_tool') {
        const attrs = ` action="${c.action || ''}" path="${(c.path || '').replace(/"/g, '&quot;')}"`
        output += `<file_tool${attrs}>${c.content || ''}</file_tool>\n`
      } else if (c.type === 'workflow_tool') {
        const parts: string[] = []
        if (c.workflowId) parts.push(`workflowId="${c.workflowId}"`)
        if (c.projectPath) parts.push(`projectPath="${c.projectPath.replace(/"/g, '&quot;')}"`)
        if (c.stepNumber !== undefined) parts.push(`stepNumber="${c.stepNumber}"`)
        if (c.action) parts.push(`action="${c.action}"`)
        output += `<workflow_tool ${parts.join(' ')} />\n`
      }
    }
    return output
  }

  private parseAttrs(attrStr: string): Record<string, string> {
    const attrs: Record<string, string> = {}
    const attrRegex = /(\w+)=["']([^"']*)["']/g
    let m: RegExpExecArray | null
    while ((m = attrRegex.exec(attrStr)) !== null) {
      attrs[m[1]] = m[2]
    }
    return attrs
  }
}
