import { DocumentStore } from './store'

export class ContextInjector {
  constructor(private sql: SqlStorage) {}

  load(paths: string[]): string {
    if (!paths || paths.length === 0) return ''
    return paths.map((path) => {
      const row = this.sql.exec('SELECT * FROM context_documents WHERE path=?', path).one() as any | null
      if (!row) return `<!-- context '${path}' not found -->`
      return `---\n<context path="${path}">\n${row.content}\n</context>\n---`
    }).join('\n\n')
  }

  loadAll(): string {
    const docs = this.sql.exec('SELECT * FROM context_documents ORDER BY path ASC').toArray() as any[]
    return docs.map((d: any) => `---\n<context path="${d.path}">\n${d.content}\n</context>\n---`).join('\n\n')
  }
}
