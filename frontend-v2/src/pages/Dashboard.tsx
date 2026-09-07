import { useQuery } from '@tanstack/react-query'
import { dashboard as api } from '@/lib/api'
import { formatNumber, formatUptime } from '@/lib/utils'
import { Cpu, HardDrive, Activity, Server } from 'lucide-react'
import { toast } from 'sonner'

function StatCard({ icon: Icon, label, value, color = 'text-primary' }: any) {
  return (
    <div className="bg-card border border-border rounded-lg p-4 flex items-center gap-3">
      <Icon className={`w-8 h-8 ${color}`} />
      <div>
        <div className="text-2xl font-bold">{value}</div>
        <div className="text-xs text-muted-foreground">{label}</div>
      </div>
    </div>
  )
}

export function Dashboard() {
  const { data, isLoading, refetch } = useQuery({
    queryKey: ['dashboard'],
    queryFn: () => api.get(),
    refetchInterval: 10000,
  })

  if (isLoading) return <div className="text-muted-foreground animate-pulse">Loading dashboard...</div>
  if (!data) return <div className="text-destructive">Failed to load</div>

  const vm = data.vm || {}
  const bg = data.battlegroup || {}

  return (
    <div className="space-y-6">
      {/* Top stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard icon={Server} label="VM Status" value={vm.status || 'OFFLINE'}
          color={vm.status === 'running' ? 'text-accent' : 'text-destructive'} />
        <StatCard icon={Cpu} label="CPU" value={`${(vm.cpu_percent || 0).toFixed(1)}%`} color="text-primary" />
        <StatCard icon={HardDrive} label="RAM"
          value={`${(vm.memory_used_gb || 0).toFixed(1)}/${(vm.memory_total_gb || '?')} GB`} color="text-warning" />
        <StatCard icon={Activity} label="Servers"
          value={`${bg.healthy_servers || 0}/${bg.server_count || 0}`} color="text-dune-spice" />
      </div>

      {/* Details */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="bg-card border border-border rounded-lg p-4">
          <h2 className="font-semibold mb-3 flex items-center gap-2">
            <Server className="w-4 h-4 text-accent" /> VM Info
          </h2>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between"><span className="text-muted-foreground">Name</span><span>{vm.name || 'dune-awakening'}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">IP</span><span>{vm.ip_address || 'N/A'}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Uptime</span><span>{formatUptime(vm.uptime_seconds || 0)}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Memory</span>
              <span>{(vm.memory_used_gb || 0).toFixed(1)} / {(vm.memory_total_gb || '?')} GB</span></div>
            <div className="w-full bg-secondary rounded-full h-2 mt-1">
              <div className="bg-warning h-2 rounded-full" style={{ width: `${Math.min(100, ((vm.memory_used_gb || 0) / (vm.memory_total_gb || 1)) * 100)}%` }} />
            </div>
          </div>
        </div>

        <div className="bg-card border border-border rounded-lg p-4">
          <h2 className="font-semibold mb-3 flex items-center gap-2">
            <Activity className="w-4 h-4 text-primary" /> Battlegroup
          </h2>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Status</span>
              <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                bg.status === 'healthy' ? 'bg-accent/20 text-accent' :
                bg.status === 'degraded' ? 'bg-warning/20 text-warning' : 'bg-destructive/20 text-destructive'
              }`}>{bg.status || 'unknown'}</span>
            </div>
            <div className="flex justify-between"><span className="text-muted-foreground">Servers</span><span>{bg.healthy_servers || 0} / {bg.server_count || 0} healthy</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Total Pods</span><span>{(bg.pods || []).length}</span></div>
          </div>
          {(bg.pods || []).length > 0 && (
            <div className="mt-3 space-y-1">
              {(bg.pods || []).map((p: any, i: number) => (
                <div key={i} className="flex items-center gap-2 text-xs">
                  <span className={`w-2 h-2 rounded-full ${p.status === 'Running' ? 'bg-accent' : 'bg-destructive'}`} />
                  <span className="text-muted-foreground truncate">{p.name}</span>
                  <span className="ml-auto">{p.ready}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Quick Links */}
      {(data.quick_links?.director_url || data.quick_links?.file_browser_url) && (
        <div className="bg-card border border-border rounded-lg p-4">
          <h2 className="font-semibold mb-3">🔗 Quick Links</h2>
          <div className="flex gap-3 text-sm">
            {data.quick_links.director_url && (
              <a href={data.quick_links.director_url} target="_blank" className="text-primary hover:underline">Director</a>
            )}
            {data.quick_links.file_browser_url && (
              <a href={data.quick_links.file_browser_url} target="_blank" className="text-primary hover:underline">File Browser</a>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
