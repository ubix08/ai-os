import { Card, Input, Label, Button } from '../components/ui'

export function SettingsPage() {
  return (
    <div className="max-w-4xl mx-auto space-y-8 animate-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Settings</h1>
          <p className="text-text-secondary mt-1">Manage your workspace and billing.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
        <div className="col-span-1 space-y-2 text-sm">
          <div className="font-bold text-text-primary px-3 py-2 bg-bg-surface rounded-md">General</div>
          <div className="font-medium text-text-secondary px-3 py-2 hover:bg-bg-surface rounded-md cursor-pointer">Billing</div>
        </div>

        <div className="col-span-3 space-y-6">
          <Card className="p-6 space-y-6">
            <h3 className="font-semibold text-lg border-b border-border-subtle pb-4">Workspace Details</h3>
            <div className="space-y-4">
              <div>
                <Label>Workspace Name</Label>
                <Input defaultValue="My Freelance Business" />
              </div>
              <div>
                <Label>Contact Email</Label>
                <Input defaultValue="me@example.com" />
              </div>
              <div>
                <Label>Currency</Label>
                <select className="flex h-10 w-full rounded-md border border-border-muted bg-bg-base px-3 py-2 text-sm text-text-primary">
                  <option>USD ($)</option>
                  <option>EUR (&euro;)</option>
                  <option>GBP (&pound;)</option>
                </select>
              </div>
            </div>
            <div className="pt-4 border-t border-border-subtle">
              <Button>Save Changes</Button>
            </div>
          </Card>

          <Card className="p-6 space-y-6 border-error border-opacity-50">
            <h3 className="font-semibold text-lg text-error">Danger Zone</h3>
            <div className="flex items-center justify-between">
              <p className="text-sm text-text-secondary">Delete your workspace and all data.</p>
              <Button variant="danger">Delete Workspace</Button>
            </div>
          </Card>
        </div>
      </div>
    </div>
  )
}
