import { create } from 'zustand'
import { api } from './api'

export interface AppState {
  dashboard: any | null
  tasks: any[]
  leads: any[]
  clients: any[]
  projects: any[]
  proposals: any[]
  invoices: any[]
  pricingConfig: any
  loading: boolean
  error: string | null

  loadDashboard: () => Promise<void>
  loadTasks: () => Promise<void>
  loadLeads: () => Promise<void>
  loadClients: () => Promise<void>
  loadProjects: () => Promise<void>
  loadProposals: () => Promise<void>
  loadInvoices: () => Promise<void>
  loadPricingConfig: () => Promise<void>

  createTask: (d: any) => Promise<void>
  updateTask: (d: any) => Promise<void>
  deleteTask: (id: string) => Promise<void>

  createLead: (d: any) => Promise<void>
  updateLead: (d: any) => Promise<void>
  deleteLead: (id: string) => Promise<void>

  createClient: (d: any) => Promise<void>
  updateClient: (d: any) => Promise<void>
  deleteClient: (id: string) => Promise<void>

  createProject: (d: any) => Promise<void>
  updateProject: (d: any) => Promise<void>
  deleteProject: (id: string) => Promise<void>

  createProposal: (d: any) => Promise<void>
  updateProposal: (d: any) => Promise<void>
  deleteProposal: (id: string) => Promise<void>

  createInvoice: (d: any) => Promise<void>
  updateInvoice: (d: any) => Promise<void>
  deleteInvoice: (id: string) => Promise<void>

  updatePricingConfig: (d: any) => Promise<void>
}

export const useStore = create<AppState>((set, get) => ({
  dashboard: null,
  tasks: [],
  leads: [],
  clients: [],
  projects: [],
  proposals: [],
  invoices: [],
  pricingConfig: { niche: 'web-development', experienceLevel: 'senior', hourlyRate: 100, targetMonthlyRevenue: 10000 },
  loading: false,
  error: null,

  loadDashboard: async () => {
    try {
      const dashboard = await api.getDashboard()
      set({ dashboard })
    } catch (e: any) { set({ error: e.message }) }
  },

  loadTasks: async () => {
    try {
      const tasks = await api.getTasks()
      set({ tasks })
    } catch (e: any) { set({ error: e.message }) }
  },

  loadLeads: async () => {
    try {
      const leads = await api.getLeads()
      set({ leads })
    } catch (e: any) { set({ error: e.message }) }
  },

  loadClients: async () => {
    try {
      const clients = await api.getClients()
      set({ clients })
    } catch (e: any) { set({ error: e.message }) }
  },

  loadProjects: async () => {
    try {
      const projects = await api.getProjects()
      set({ projects })
    } catch (e: any) { set({ error: e.message }) }
  },

  loadProposals: async () => {
    try {
      const proposals = await api.getProposals()
      set({ proposals })
    } catch (e: any) { set({ error: e.message }) }
  },

  loadInvoices: async () => {
    try {
      const invoices = await api.getInvoices()
      set({ invoices })
    } catch (e: any) { set({ error: e.message }) }
  },

  loadPricingConfig: async () => {
    try {
      const config = await api.getConfig()
      if (config.pricing_config) {
        set({ pricingConfig: JSON.parse(config.pricing_config) })
      }
    } catch (e: any) { set({ error: e.message }) }
  },

  createTask: async (d) => { await api.createTask(d); await get().loadTasks() },
  updateTask: async (d) => { await api.updateTask(d); await get().loadTasks() },
  deleteTask: async (id) => { await api.deleteTask(id); await get().loadTasks() },

  createLead: async (d) => { await api.createLead(d); await get().loadLeads() },
  updateLead: async (d) => { await api.updateLead(d); await get().loadLeads() },
  deleteLead: async (id) => { await api.deleteLead(id); await get().loadLeads() },

  createClient: async (d) => { await api.createClient(d); await get().loadClients() },
  updateClient: async (d) => { await api.updateClient(d); await get().loadClients() },
  deleteClient: async (id) => { await api.deleteClient(id); await get().loadClients() },

  createProject: async (d) => { await api.createProject(d); await get().loadProjects() },
  updateProject: async (d) => { await api.updateProject(d); await get().loadProjects() },
  deleteProject: async (id) => { await api.deleteProject(id); await get().loadProjects() },

  createProposal: async (d) => { await api.createProposal(d); await get().loadProposals() },
  updateProposal: async (d) => { await api.updateProposal(d); await get().loadProposals() },
  deleteProposal: async (id) => { await api.deleteProposal(id); await get().loadProposals() },

  createInvoice: async (d) => { await api.createInvoice(d); await get().loadInvoices() },
  updateInvoice: async (d) => { await api.updateInvoice(d); await get().loadInvoices() },
  deleteInvoice: async (id) => { await api.deleteInvoice(id); await get().loadInvoices() },

  updatePricingConfig: async (d) => {
    set((state) => ({ pricingConfig: { ...state.pricingConfig, ...d } }))
    await api.updateConfig({ pricing_config: JSON.stringify({ ...get().pricingConfig, ...d }) })
  },
}))
