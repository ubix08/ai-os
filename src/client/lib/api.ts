const BASE = '/api'

async function req<T>(method: string, path: string, body?: unknown): Promise<T> {
  const opts: RequestInit = { method, headers: { 'Content-Type': 'application/json' } }
  if (body && method !== 'GET') opts.body = JSON.stringify(body)
  const res = await fetch(`${BASE}${path}`, opts)
  if (!res.ok) {
    const err: any = await res.json().catch(() => ({ error: res.statusText }))
    throw new Error(err?.error || res.statusText)
  }
  return res.json()
}

export const api = {
  // Dashboard
  getDashboard: () => req<any>('GET', '/dashboard'),

  // Tasks
  getTasks: () => req<any[]>('GET', '/tasks'),
  createTask: (data: any) => req<any>('POST', '/tasks', data),
  updateTask: (data: any) => req<any>('PUT', '/tasks', data),
  deleteTask: (id: string) => req<any>('DELETE', `/tasks/${id}`),

  // Leads
  getLeads: () => req<any[]>('GET', '/leads'),
  createLead: (data: any) => req<any>('POST', '/leads', data),
  updateLead: (data: any) => req<any>('PUT', '/leads', data),
  deleteLead: (id: string) => req<any>('DELETE', `/leads/${id}`),

  // Clients
  getClients: () => req<any[]>('GET', '/clients'),
  createClient: (data: any) => req<any>('POST', '/clients', data),
  updateClient: (data: any) => req<any>('PUT', '/clients', data),
  deleteClient: (id: string) => req<any>('DELETE', `/clients/${id}`),

  // Projects
  getProjects: () => req<any[]>('GET', '/projects'),
  createProject: (data: any) => req<any>('POST', '/projects', data),
  updateProject: (data: any) => req<any>('PUT', '/projects', data),
  deleteProject: (id: string) => req<any>('DELETE', `/projects/${id}`),

  // Proposals
  getProposals: () => req<any[]>('GET', '/proposals'),
  createProposal: (data: any) => req<any>('POST', '/proposals', data),
  updateProposal: (data: any) => req<any>('PUT', '/proposals', data),
  deleteProposal: (id: string) => req<any>('DELETE', `/proposals/${id}`),

  // Invoices
  getInvoices: () => req<any[]>('GET', '/invoices'),
  createInvoice: (data: any) => req<any>('POST', '/invoices', data),
  updateInvoice: (data: any) => req<any>('PUT', '/invoices', data),
  deleteInvoice: (id: string) => req<any>('DELETE', `/invoices/${id}`),

  // Config
  getConfig: () => req<Record<string, string>>('GET', '/config'),
  updateConfig: (data: Record<string, string>) => req<any>('PUT', '/config', data),

  // AI
  analyzeScope: (data: any) => req<any>('POST', '/pricing/analyze-scope', data),
  generateProposal: (data: any) => req<any>('POST', '/proposals/generate', data),
  chat: (data: { messages: any[]; context?: any }) => req<any>('POST', '/ai/chat', data),

  // Conversations (for chat history)
  getConversations: () => req<any[]>('GET', '/conversations'),
  createConversation: (data?: any) => req<any>('POST', '/conversations', data || {}),
  updateConversation: (id: string, data: any) => req<any>('PUT', `/conversations/${id}`, data),
  deleteConversation: (id: string) => req<any>('DELETE', `/conversations/${id}`),
  getMessages: (id: string) => req<{ messages: any[]; files: any[] }>('GET', `/conversations/${id}/messages`),
  sendChat: (data: { conversation_id: string; message: string }) => req<any>('POST', '/chat', data),
}
