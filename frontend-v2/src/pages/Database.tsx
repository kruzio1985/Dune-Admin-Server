export function Database() {
  return (
    <div className="space-y-4">
      <div className="bg-card border border-border rounded-lg p-4">
        <h2 className="font-semibold mb-3">🗄️ Database Backups</h2>
        <p className="text-sm text-muted-foreground mb-2">Backup schedule, restore, and SQL editor coming soon.</p>
        <div className="flex gap-2">
          <button className="bg-primary text-primary-foreground px-3 py-1.5 rounded text-sm">Backup Now</button>
          <button className="bg-secondary text-foreground px-3 py-1.5 rounded text-sm">Restore Backup</button>
        </div>
      </div>
    </div>
  )
}
