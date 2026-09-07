import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { characters as api } from '@/lib/api'
import { toast } from 'sonner'
import { Save, RefreshCw, Star } from 'lucide-react'

export function Characters() {
  const [actorId, setActorId] = useState<number>(0)
  const queryClient = useQueryClient()

  const { data: charList } = useQuery({ queryKey: ['characters'], queryFn: () => api.list() })

  const { data: char, isLoading } = useQuery({
    queryKey: ['character', actorId],
    queryFn: () => api.get(actorId),
    enabled: actorId > 0,
  })

  const { data: specs } = useQuery({
    queryKey: ['character-specs', actorId],
    queryFn: () => api.getSpecs(actorId),
    enabled: actorId > 0,
  })

  const { data: economy } = useQuery({
    queryKey: ['character-economy', actorId],
    queryFn: () => api.getEconomy(actorId),
    enabled: actorId > 0,
  })

  const saveStats = useMutation({
    mutationFn: (updates: any[]) => api.updateStats(actorId, updates),
    onSuccess: () => toast.success('Stats saved!'),
    onError: (e: any) => toast.error(e.message),
  })

  const setSpec = useMutation({
    mutationFn: ({ track, xp, level }: { track: string; xp: number; level: number }) =>
      api.setSpecTrack(actorId, track, xp, level),
    onSuccess: () => { toast.success('Spec set!'); queryClient.invalidateQueries({ queryKey: ['character-specs'] }) },
    onError: (e: any) => toast.error(e.message),
  })

  const props = char ? JSON.parse(char.properties || '{}') : {}
  const gas = char ? JSON.parse(char.gasAttributes || '{}') : {}
  const rd = (o: any, k1: string, k2: string) => o?.[k1]?.[k2]?.BaseValue ?? o?.[k1]?.[k2] ?? null

  const handleSaveStats = () => {
    const fields = [
      ['csMaxHealth', 'properties', ['DamageableActorComponent', 'm_TotalMaxHealth']],
      ['csTechPts', 'properties', ['TechKnowledgePlayerComponent', 'm_TechKnowledgePoints']],
      ['csHydration', 'gas_attributes', ['DuneHydrationAttributeSet', 'CurrentHydration']],
      ['csHeat', 'gas_attributes', ['DuneHydrationAttributeSet', 'HeatExhaustion']],
      ['csSpice', 'gas_attributes', ['DuneSpiceAddictionAttributeSet', 'CurrentSpice']],
      ['csAddiction', 'gas_attributes', ['DuneSpiceAddictionAttributeSet', 'SpiceAddictionLevel']],
      ['csTolerance', 'gas_attributes', ['DuneSpiceAddictionAttributeSet', 'SpiceTolerance']],
      ['csEyesIbad', 'properties', ['BP_DunePlayerCharacter_C', 'm_EyesOfIbadValue']],
    ]
    const updates: any[] = []
    fields.forEach(([el, field, path]) => {
      const val = parseFloat((document.getElementById(el as string) as HTMLInputElement)?.value)
      if (!isNaN(val)) {
        updates.push({ field, path, value: val })
        if (field === 'gas_attributes') {
          updates.push({ field, path: [(path as string[])[0], (path as string[])[1], 'BaseValue'], value: val })
          updates.push({ field, path: [(path as string[])[0], (path as string[])[1], 'CurrentValue'], value: val })
        }
      }
    })
    saveStats.mutate(updates)
  }

  const handleSetSpec = (track: string) => {
    const lv = parseInt((document.getElementById(`sl_${track}`) as HTMLInputElement)?.value) || 0
    const xp = parseInt((document.getElementById(`sx_${track}`) as HTMLInputElement)?.value) || 44182
    setSpec.mutate({ track, xp, level: lv })
  }

  return (
    <div className="space-y-4">
      <div className="bg-card border border-border rounded-lg p-4">
        <div className="flex items-center gap-3">
          <select className="bg-secondary border border-border rounded px-3 py-2 text-sm w-64"
            value={actorId} onChange={e => setActorId(Number(e.target.value))}>
            <option value={0}>-- Select character --</option>
            {(charList?.characters || []).map((c: any) => (
              <option key={c.id} value={c.id}>{c.name} (ID: {c.id})</option>
            ))}
          </select>
          <button onClick={() => queryClient.invalidateQueries({ queryKey: ['characters'] })}
            className="p-2 hover:bg-secondary rounded"><RefreshCw className="w-4 h-4" /></button>
        </div>
      </div>

      {isLoading && <div className="text-muted-foreground animate-pulse">Loading character...</div>}

      {char && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Stats */}
          <div className="bg-card border border-border rounded-lg p-4">
            <div className="flex items-center justify-between mb-3">
              <h2 className="font-semibold">📊 Stats</h2>
              <button onClick={handleSaveStats} className="flex items-center gap-1 bg-accent text-accent-foreground px-3 py-1.5 rounded text-sm font-medium hover:opacity-90">
                <Save className="w-3 h-3" /> Save
              </button>
            </div>
            <div className="space-y-3">
              {[
                ['Max Health', 'csMaxHealth', rd(props, 'DamageableActorComponent', 'm_TotalMaxHealth') || 500, 'number', '1'],
                ['Tech Points', 'csTechPts', rd(props, 'TechKnowledgePlayerComponent', 'm_TechKnowledgePoints') || 50, 'number', '1'],
                ['Hydration', 'csHydration', rd(gas, 'DuneHydrationAttributeSet', 'CurrentHydration') || 100, 'number', '0.1'],
                ['Heat Exhaustion', 'csHeat', rd(gas, 'DuneHydrationAttributeSet', 'HeatExhaustion') || 0, 'number', '0.1'],
                ['Current Spice', 'csSpice', rd(gas, 'DuneSpiceAddictionAttributeSet', 'CurrentSpice') || 5000, 'number', '1'],
                ['Spice Addiction', 'csAddiction', rd(gas, 'DuneSpiceAddictionAttributeSet', 'SpiceAddictionLevel') || 0, 'number', '0.1'],
                ['Spice Tolerance', 'csTolerance', rd(gas, 'DuneSpiceAddictionAttributeSet', 'SpiceTolerance') || 0, 'number', '0.1'],
                ['Eyes of Ibad', 'csEyesIbad', rd(props, 'BP_DunePlayerCharacter_C', 'm_EyesOfIbadValue') || 0, 'number', '0.05'],
              ].map(([label, id, val, type, step]) => (
                <div key={id as string} className="flex items-center gap-3">
                  <label className="text-xs text-muted-foreground w-32">{label}</label>
                  <input type={type as string} id={id as string} defaultValue={val as number}
                    step={step as string} min={id === 'csEyesIbad' ? '0' : undefined} max={id === 'csEyesIbad' ? '1' : undefined}
                    className="bg-secondary border border-border rounded px-2 py-1 text-sm w-24" />
                </div>
              ))}
            </div>
          </div>

          {/* Specializations */}
          <div className="bg-card border border-border rounded-lg p-4">
            <h2 className="font-semibold mb-3">⚡ Specializations</h2>
            {specs && (
              <div className="space-y-2">
                {(specs.tracks || []).map((t: any) => (
                  <div key={t.track_type} className="flex items-center gap-2 text-xs">
                    <span className="w-24">{t.track_type}</span>
                    <span className="text-muted-foreground w-12">Lv{Math.floor(t.level || 0)}</span>
                    <input id={`sl_${t.track_type}`} defaultValue={Math.floor(t.level || 0)}
                      className="bg-secondary border border-border rounded px-1 py-0.5 w-12 text-xs" />
                    <input id={`sx_${t.track_type}`} defaultValue={t.xp_amount || 0}
                      className="bg-secondary border border-border rounded px-1 py-0.5 w-16 text-xs" />
                    <button onClick={() => handleSetSpec(t.track_type)}
                      className="bg-primary text-primary-foreground px-2 py-0.5 rounded text-xs">Set</button>
                    <button onClick={() => api.unlockKeystones(actorId, t.track_type + '_').then(() => {
                      toast.success('Keystones!'); queryClient.invalidateQueries({ queryKey: ['character-specs'] })
                    })} className="hover:bg-secondary px-1.5 py-0.5 rounded text-xs"><Star className="w-3 h-3" /></button>
                  </div>
                ))}
                <div className="text-xs text-muted-foreground pt-2">
                  Keystones: {specs.purchasedKeystones || 0}/{specs.maxKeystones || 205}
                </div>
              </div>
            )}
          </div>

          {/* Economy */}
          <div className="bg-card border border-border rounded-lg p-4">
            <h2 className="font-semibold mb-3">💰 Economy</h2>
            {economy && (
              <div className="space-y-3 text-sm">
                <div className="flex items-center gap-2">
                  <span className="text-muted-foreground w-20">🪙 Solari</span>
                  <input id="csSolari" defaultValue={(economy.currency || []).find((c: any) => c.currency_id === 0)?.balance || 0}
                    className="bg-secondary border border-border rounded px-2 py-1 w-28" />
                  <button onClick={() => api.setCurrency(actorId, 0, parseInt((document.getElementById('csSolari') as HTMLInputElement)?.value))}
                    className="bg-accent text-accent-foreground px-2 py-0.5 rounded text-xs">Set</button>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-muted-foreground w-20">🏛️ Scrip</span>
                  <input id="csScrip" defaultValue={(economy.currency || []).find((c: any) => c.currency_id === 1)?.balance || 0}
                    className="bg-secondary border border-border rounded px-2 py-1 w-28" />
                  <button onClick={() => api.setCurrency(actorId, 1, parseInt((document.getElementById('csScrip') as HTMLInputElement)?.value))}
                    className="bg-accent text-accent-foreground px-2 py-0.5 rounded text-xs">Set</button>
                </div>
                <hr className="border-border" />
                {(economy.factionRep || []).map((r: any) => (
                  <div key={r.faction_id} className="flex items-center gap-2">
                    <span className="text-muted-foreground w-20 text-xs">{r.faction_name}</span>
                    <input id={`cf_${r.faction_id}`} defaultValue={r.reputation}
                      className="bg-secondary border border-border rounded px-2 py-1 w-24 text-xs" />
                    <button onClick={() => api.setFactionRep(actorId, r.faction_id, parseInt((document.getElementById(`cf_${r.faction_id}`) as HTMLInputElement)?.value))}
                      className="bg-primary text-primary-foreground px-2 py-0.5 rounded text-xs">Set</button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Inventory */}
          <div className="bg-card border border-border rounded-lg p-4">
            <h2 className="font-semibold mb-3">📦 Inventory <span className="text-xs text-muted-foreground">({(char.items || []).length})</span></h2>
            <div className="max-h-64 overflow-y-auto">
              <table className="w-full text-xs">
                <thead><tr className="text-muted-foreground"><th className="text-left p-1">Template</th><th className="p-1">Stack</th><th className="p-1">Location</th></tr></thead>
                <tbody>
                  {(char.items || []).slice(0, 50).map((i: any) => {
                    const labels: Record<number, string> = { 0: '🎒', 14: '👔', 15: '⚡', 27: '⚔️' }
                    return (
                      <tr key={i.id} className="border-t border-border">
                        <td className="p-1 font-mono text-[10px]">{i.template}</td>
                        <td className="p-1 text-center">{i.stack}</td>
                        <td className="p-1 text-center">{labels[i.inv_type] || 'T' + i.inv_type}</td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
