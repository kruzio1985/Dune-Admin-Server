import { useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { market as api } from '@/lib/api'
import { toast } from 'sonner'
import { Plus, Trash2, RefreshCw } from 'lucide-react'

export function Market() {
  const queryClient = useQueryClient()
  const [template, setTemplate] = useState('CopperBar')
  const [price, setPrice] = useState(10000)

  const { data, isLoading } = useQuery({
    queryKey: ['market-listings'],
    queryFn: () => api.listings(50),
    refetchInterval: 15000,
  })

  const handleCreate = async () => {
    try {
      await api.create({ template_id: template, item_price: price, quality_level: 0, durability_cur: 100, durability_max: 100 })
      toast.success(`${template} @ ${price.toLocaleString()} 💰`)
      queryClient.invalidateQueries({ queryKey: ['market-listings'] })
    } catch (e: any) { toast.error(e.message) }
  }

  const handleDelete = async (id: number) => {
    try { await api.delete(id); toast.success('Deleted!'); queryClient.invalidateQueries({ queryKey: ['market-listings'] }) }
    catch (e: any) { toast.error(e.message) }
  }

  return (
    <div className="space-y-4">
      {/* Create form */}
      <div className="bg-card border border-border rounded-lg p-4">
        <h2 className="font-semibold text-sm mb-3">📝 Create Listing</h2>
        <div className="flex gap-2 items-end">
          <div>
            <label className="text-xs text-muted-foreground">Template</label>
            <input value={template} onChange={e => setTemplate(e.target.value)}
              className="bg-secondary border border-border rounded px-2 py-1.5 text-sm w-40 block mt-1" />
          </div>
          <div>
            <label className="text-xs text-muted-foreground">Price (Solari)</label>
            <input type="number" value={price} onChange={e => setPrice(Number(e.target.value))}
              className="bg-secondary border border-border rounded px-2 py-1.5 text-sm w-28 block mt-1" />
          </div>
          <button onClick={handleCreate} className="flex items-center gap-1 bg-accent text-accent-foreground px-3 py-1.5 rounded text-sm">
            <Plus className="w-4 h-4" /> Add
          </button>
          <span className="text-xs text-muted-foreground ml-2">Quick: </span>
          {['CopperBar','IronBar','SteelBar','MelangeSpice','Water'].map(t => (
            <button key={t} onClick={() => setTemplate(t)} className="text-xs text-primary hover:underline">{t}</button>
          ))}
        </div>
      </div>

      {/* Listings */}
      <div className="bg-card border border-border rounded-lg p-4">
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-semibold text-sm">📋 Listings</h2>
          <button onClick={() => queryClient.invalidateQueries({ queryKey: ['market-listings'] })}
            className="p-1.5 hover:bg-secondary rounded"><RefreshCw className="w-4 h-4" /></button>
        </div>
        {isLoading ? <div className="text-muted-foreground text-sm">Loading...</div> :
          !data?.listings?.length ? <div className="text-muted-foreground text-sm">No listings</div> :
          <table className="w-full text-xs">
            <thead><tr className="text-muted-foreground"><th className="text-left p-1">ID</th><th className="text-left p-1">Template</th><th className="p-1">Price</th><th className="p-1">NPC</th><th className="p-1"></th></tr></thead>
            <tbody>
              {data.listings.map((i: any) => (
                <tr key={i.id} className="border-t border-border">
                  <td className="p-1">{i.id}</td>
                  <td className="p-1 font-mono text-[10px]">{i.template}</td>
                  <td className="p-1 text-right">{(i.price || 0).toLocaleString()} 💰</td>
                  <td className="p-1 text-center">{i.npc ? '🤖' : '👤'}</td>
                  <td className="p-1">
                    <button onClick={() => handleDelete(i.id)} className="text-red-400 hover:text-red-300"><Trash2 className="w-3 h-3" /></button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        }
      </div>
    </div>
  )
}
