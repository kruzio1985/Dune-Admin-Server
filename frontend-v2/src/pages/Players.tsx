import { useQuery } from '@tanstack/react-query'
import { gameplay as api } from '@/lib/api'

export function Players() {
  const { data, isLoading } = useQuery({ queryKey: ['players'], queryFn: () => api.players() })

  return (
    <div className="bg-card border border-border rounded-lg p-4">
      <h2 className="font-semibold mb-3">👤 Players <span className="text-xs text-muted-foreground">({data?.total || 0})</span></h2>
      {isLoading ? <div className="text-muted-foreground text-sm">Loading...</div> :
        <table className="w-full text-sm">
          <thead><tr className="text-muted-foreground"><th className="text-left p-2">Name</th><th className="p-2">FLS ID</th><th className="p-2">Faction</th><th className="p-2">Map</th><th className="p-2">Status</th></tr></thead>
          <tbody>
            {(data?.players || []).map((p: any) => (
              <tr key={p.account_id} className="border-t border-border hover:bg-secondary/30 transition-colors">
                <td className="p-2 font-medium">{p.name}</td>
                <td className="p-2 font-mono text-xs text-muted-foreground">{p.fls_id?.substring(0, 12)}...</td>
                <td className="p-2">{p.faction}</td>
                <td className="p-2">{p.map}</td>
                <td className="p-2">
                  <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${p.online === 'Online' ? 'bg-accent/20 text-accent' : 'bg-muted text-muted-foreground'}`}>
                    {p.online || 'Offline'}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      }
    </div>
  )
}
