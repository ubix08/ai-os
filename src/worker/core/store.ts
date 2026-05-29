import { Document, DocumentStoreAPI } from './types'

export class DocumentStore implements DocumentStoreAPI {
  constructor(private sql: SqlStorage) {}

  initSchema() {
    this.sql.exec(`CREATE TABLE IF NOT EXISTS documents (
      id TEXT PRIMARY KEY,
      collection TEXT NOT NULL,
      data TEXT NOT NULL DEFAULT '{}',
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    )`)
    this.sql.exec(`CREATE INDEX IF NOT EXISTS idx_documents_collection ON documents(collection)`)
  }

  query(collection: string, filter?: Record<string, unknown>): Document[] {
    if (filter && Object.keys(filter).length > 0) {
      const rows = this.sql.exec('SELECT * FROM documents WHERE collection=? ORDER BY created_at DESC', collection).toArray()
      return rows
        .map((r: any) => this.parseDoc(r))
        .filter((d: Document) => {
          for (const [k, v] of Object.entries(filter!)) {
            if (d.data[k] !== v) return false
          }
          return true
        })
    }
    return this.sql.exec('SELECT * FROM documents WHERE collection=? ORDER BY created_at DESC', collection).toArray().map((r: any) => this.parseDoc(r))
  }

  get(collection: string, id: string): Document | null {
    const row = this.sql.exec('SELECT * FROM documents WHERE id=? AND collection=?', id, collection).one() as any | null
    if (!row) return null
    return this.parseDoc(row)
  }

  create(collection: string, data: Record<string, unknown>): Document {
    const id = crypto.randomUUID()
    const n = new Date().toISOString()
    this.sql.exec('INSERT INTO documents (id,collection,data,created_at,updated_at) VALUES (?,?,?,?,?)', id, collection, JSON.stringify(data), n, n)
    return this.get(collection, id)!
  }

  update(collection: string, id: string, data: Record<string, unknown>): Document | null {
    const existing = this.get(collection, id)
    if (!existing) return null
    const n = new Date().toISOString()
    const merged = { ...existing.data, ...data }
    this.sql.exec('UPDATE documents SET data=?,updated_at=? WHERE id=? AND collection=?', JSON.stringify(merged), n, id, collection)
    return this.get(collection, id)
  }

  delete(collection: string, id: string): boolean {
    const existing = this.get(collection, id)
    if (!existing) return false
    this.sql.exec('DELETE FROM documents WHERE id=? AND collection=?', id, collection)
    return true
  }

  listCollections(): string[] {
    const rows = this.sql.exec('SELECT DISTINCT collection FROM documents ORDER BY collection').toArray() as any[]
    return rows.map((r: any) => r.collection)
  }

  count(collection: string, filter?: Record<string, unknown>): number {
    return this.query(collection, filter).length
  }

  aggregate(collection: string, field: string, fn: 'sum' | 'avg' | 'min' | 'max'): number {
    const docs = this.query(collection)
    const vals = docs.map((d: Document) => Number(d.data[field])).filter((v: number) => !isNaN(v))
    if (vals.length === 0) return 0
    switch (fn) {
      case 'sum': return vals.reduce((a: number, b: number) => a + b, 0)
      case 'avg': return vals.reduce((a: number, b: number) => a + b, 0) / vals.length
      case 'min': return Math.min(...vals)
      case 'max': return Math.max(...vals)
    }
  }

  groupBy(collection: string, field: string): Record<string, number> {
    const docs = this.query(collection)
    const result: Record<string, number> = {}
    for (const d of docs) {
      const key = String(d.data[field] ?? 'unknown')
      result[key] = (result[key] || 0) + 1
    }
    return result
  }

  private parseDoc(row: any): Document {
    return { ...row, data: safeJson(row.data, {}) }
  }
}

function safeJson(val: string | undefined, fallback: any): any {
  if (!val) return fallback
  try { return JSON.parse(val) } catch { return fallback }
}
