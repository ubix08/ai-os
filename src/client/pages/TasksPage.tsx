import { useEffect, useState } from 'react'
import { useStore } from '../lib/store'
import { Card, Button, Input } from '../components/ui'
import { CheckCircle, Circle, Trash2, Plus, Calendar } from 'lucide-react'

export function TasksPage() {
  const { tasks, loadTasks, createTask, updateTask, deleteTask } = useStore()
  const [newTitle, setNewTitle] = useState('')
  const [newDue, setNewDue] = useState('')

  useEffect(() => { loadTasks() }, [loadTasks])

  const handleCreate = async () => {
    if (!newTitle.trim()) return
    await createTask({ title: newTitle, due_date: newDue || null })
    setNewTitle('')
    setNewDue('')
  }

  const handleToggle = async (task: any) => {
    await updateTask({ id: task.id, status: task.status === 'done' ? 'pending' : 'done' })
  }

  const handleDelete = async (id: string) => {
    if (!window.confirm('Delete this task?')) return
    await deleteTask(id)
  }

  const pending = tasks.filter((t: any) => t.status !== 'done')
  const completed = tasks.filter((t: any) => t.status === 'done')

  return (
    <div className="max-w-4xl mx-auto space-y-8 animate-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Tasks</h1>
          <p className="text-text-secondary mt-1">Manage your tasks and todos.</p>
        </div>
      </div>

      <Card className="p-6">
        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-3 bg-bg-base p-4 rounded-lg border border-border-subtle">
            <Input placeholder="Add a new task..." value={newTitle}
              onChange={e => setNewTitle(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleCreate()}
              className="border-none bg-transparent shadow-none px-0 text-sm focus-visible:ring-0" />
            <div className="flex gap-2 items-center text-sm pt-2 border-t border-border-subtle border-dashed">
              <Input type="date" value={newDue} onChange={e => setNewDue(e.target.value)} className="w-[140px] text-xs h-8" />
              <Button onClick={handleCreate} className="px-3 h-8 text-xs font-semibold"><Plus className="w-3 h-3 mr-1" /> Add Task</Button>
            </div>
          </div>

          <div className="space-y-1">
            {pending.length === 0 && completed.length === 0 && (
              <div className="text-center text-text-muted py-8">No tasks yet. Add one above!</div>
            )}
            {pending.map((task: any) => (
              <div key={task.id} className="flex items-center gap-3 p-3 hover:bg-bg-surface rounded-md group transition-colors">
                <button onClick={() => handleToggle(task)} className="text-text-muted hover:text-brand transition-colors shrink-0">
                  <Circle className="w-5 h-5" />
                </button>
                <div className="flex-1 flex flex-col min-w-0">
                  <span className="text-sm font-medium truncate">{task.title}</span>
                  {task.due_date && (
                    <span className="flex items-center gap-1 mt-1 text-[11px] text-text-muted font-medium">
                      <Calendar className="w-3 h-3" />
                      {new Date(task.due_date).toLocaleDateString()}
                    </span>
                  )}
                </div>
                <button onClick={() => handleDelete(task.id)} className="text-text-muted hover:text-error opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>

          {completed.length > 0 && (
            <div className="pt-6 mt-6 border-t border-border-subtle">
              <h4 className="text-xs font-bold uppercase tracking-wider text-text-muted mb-3 px-2">Completed</h4>
              {completed.map((task: any) => (
                <div key={task.id} className="flex items-center gap-3 p-3 hover:bg-bg-surface rounded-md group transition-colors opacity-60 hover:opacity-100">
                  <button onClick={() => handleToggle(task)} className="text-brand transition-colors">
                    <CheckCircle className="w-5 h-5" />
                  </button>
                  <span className="flex-1 text-sm line-through">{task.title}</span>
                  <button onClick={() => handleDelete(task.id)} className="text-text-muted hover:text-error opacity-0 group-hover:opacity-100 transition-opacity">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </Card>
    </div>
  )
}
