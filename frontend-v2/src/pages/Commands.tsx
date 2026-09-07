import { Terminal, Monitor, HardDrive, Activity, Wrench, RefreshCw, Power } from 'lucide-react'

const COMMANDS = [
  { section: 'VM', color: 'border-l-blue-500', items: [
    { icon: RefreshCw, label: 'Restart VM', desc: 'Restart the Hyper-V virtual machine', shortcut: 'Ctrl+Shift+R' },
    { icon: Power, label: 'Start VM', desc: 'Start the VM if stopped' },
    { icon: Power, label: 'Force Stop VM', desc: 'Immediately power off the VM' },
    { icon: Activity, label: 'Health Check', desc: 'Check VM disk, memory, and pods' },
  ]},
  { section: 'Battlegroup', color: 'border-l-green-500', items: [
    { icon: Power, label: 'Start Battlegroup', desc: 'Start all game server pods' },
    { icon: Power, label: 'Stop Battlegroup', desc: 'Gracefully stop game servers' },
    { icon: RefreshCw, label: 'Restart Battlegroup', desc: 'Stop then start all pods' },
    { icon: Wrench, label: 'Fix Operator Pods', desc: 'Fix stuck operator pods', shortcut: 'Ctrl+Shift+F' },
  ]},
  { section: 'Tools', color: 'border-l-orange-500', items: [
    { icon: Terminal, label: 'Open in PowerShell', desc: 'Open DST PowerShell console' },
    { icon: Monitor, label: 'Open in Terminal', desc: 'Open external terminal window' },
    { icon: HardDrive, label: 'Open Explorer', desc: 'Open server folder in Explorer' },
  ]},
]

export function Commands() {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
      {COMMANDS.map(group => (
        <div key={group.section} className={`bg-card border border-border rounded-lg p-4 border-l-4 ${group.color}`}>
          <h2 className="font-semibold text-sm mb-3 text-muted-foreground uppercase tracking-wider">{group.section}</h2>
          <div className="space-y-2">
            {group.items.map(cmd => (
              <button key={cmd.label} className="w-full text-left p-2 rounded hover:bg-secondary/50 transition-colors group">
                <div className="flex items-center gap-2">
                  <cmd.icon className="w-4 h-4 text-muted-foreground group-hover:text-foreground" />
                  <span className="text-sm font-medium">{cmd.label}</span>
                  {cmd.shortcut && <span className="ml-auto text-[10px] text-muted-foreground bg-secondary px-1.5 py-0.5 rounded">{cmd.shortcut}</span>}
                </div>
                <p className="text-[11px] text-muted-foreground mt-0.5 ml-6">{cmd.desc}</p>
              </button>
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}
