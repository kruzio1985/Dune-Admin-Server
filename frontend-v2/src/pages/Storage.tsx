import { useQuery } from '@tanstack/react-query'
import { storage as api } from '@/lib/api'

export function Storage() {
  const { data: containers, isLoading: cl } = useQuery({ queryKey: ['storage'], queryFn: () => api.list() })
  const { data: bases, isLoading: bl } = useQuery({ queryKey: ['bases'], queryFn: () => api.bases() })

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      <div className="bg-card border border-border rounded-lg p-4">
        <h2 className="font-semibold mb-3">📦 Storage <span className="text-xs text-muted-foreground">({containers?.containers?.length || 0})</span></h2>
        {cl ? <div className="text-muted-foreground text-sm">Loading...</div> :
          <div className="max-h-96 overflow-y-auto">
            <table className="w-full text-xs">
              <thead><tr className="text-muted-foreground"><th className="text-left p-1">ID</th><th className="p-1">Type</th><th className="p-1">Items</th></tr></thead>
              <tbody>{(containers?.containers || []).slice(0, 30).map((c: any) => (
                <tr key={c.id} className="border-t border-border"><td className="p-1">{c.id}</td><td className="p-1">{c.type}</td><td className="p-1 text-right">{c.items}</td></tr>
              ))}</tbody>
            </table>
          </div>
        }
      </div>
      <div className="bg-card border border-border rounded-lg p-4">
        <h2 className="font-semibold mb-3">🏗️ Bases <span className="text-xs text-muted-foreground">({bases?.bases?.length || 0})</span></h2>
        {bl ? <div className="text-muted-foreground text-sm">Loading...</div> :
          <div className="max-h-96 overflow-y-auto">
            <table className="w-full text-xs">
              <thead><tr className="text-muted-foreground"><th className="text-left p-1">Type</th><th className="p-1">HP</th></tr></thead>
              <tbody>{(bases?.bases || []).slice(0, 30).map((b: any, i: number) => (
                <tr key={i} className="border-t border-border"><td className="p-1 font-mono text-[10px]">{b.type}</td><td className="p-1 text-right">{b.hp}</td></tr>
              ))}</tbody>
            </table>
          </div>
        }
      </div>
    </div>
  )
}
