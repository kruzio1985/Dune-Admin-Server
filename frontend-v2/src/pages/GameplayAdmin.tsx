import { useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { gameplay as api } from '@/lib/api'
import { toast } from 'sonner'
import { RefreshCw, Zap, Shield, Droplets, Wrench, Trash2, Gift } from 'lucide-react'

export function GameplayAdmin() {
  const [flsId, setFlsId] = useState('FC4D3B70DB35663')
  const queryClient = useQueryClient()

  const { data: players } = useQuery({ queryKey: ['players'], queryFn: () => api.players() })

  const handleAction = async (fn: () => Promise<any>, msg: string) => {
    try { await fn(); toast.success(msg) } catch (e: any) { toast.error(e.message) }
  }

  return (
    <div className="space-y-4">
      {/* Player selector */}
      <div className="bg-card border border-border rounded-lg p-4">
        <div className="flex items-center gap-3">
          <select className="bg-secondary border border-border rounded px-3 py-2 text-sm w-64"
            onChange={e => { const p = (players?.players || []).find((x: any) => x.name === e.target.value); if (p) setFlsId(p.fls_id || '') }}>
            <option value="">-- Select player --</option>
            {(players?.players || []).map((p: any) => (
              <option key={p.account_id} value={p.name}>{p.name} ({p.fls_id})</option>
            ))}
          </select>
          <input value={flsId} onChange={e => setFlsId(e.target.value)}
            className="bg-secondary border border-border rounded px-2 py-1 text-sm w-40 font-mono" placeholder="FLS ID" />
          <button onClick={() => queryClient.invalidateQueries({ queryKey: ['players'] })}
            className="p-2 hover:bg-secondary rounded"><RefreshCw className="w-4 h-4" /></button>
        </div>
      </div>

      {/* Action cards */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card title="⚡ Live Actions" borderColor="border-l-red-500">
          <Btn onClick={() => api.kickPlayer(flsId)} icon={Zap} color="bg-red-500/10 text-red-400 hover:bg-red-500/20">Kick</Btn>
          <Btn onClick={() => handleAction(() => api.cheatScript(flsId, 'PlaytestSetupAdmin'), 'Full gear!')} icon={Shield} color="bg-green-500/10 text-green-400">Full Gear</Btn>
        </Card>

        <Card title="🔧 Maintenance" borderColor="border-l-blue-500">
          <Btn onClick={() => api.repairAll(1)} icon={Wrench} color="bg-blue-500/10 text-blue-400">Repair All</Btn>
          <Btn onClick={() => api.fillWater(1)} icon={Droplets} color="bg-cyan-500/10 text-cyan-400">Fill Water</Btn>
          <Btn onClick={() => handleAction(() => api.maxSpecs(1, true), 'Specs maxed!')} icon={Zap} color="bg-yellow-500/10 text-yellow-400">Max Specs</Btn>
          <Btn onClick={() => api.cheatScript(flsId, 'UnlockAllSkills')} icon={Gift} color="bg-purple-500/10 text-purple-400">All Skills</Btn>
        </Card>

        <Card title="💰 Currency" borderColor="border-l-green-500">
          <div className="flex gap-2 items-center text-xs">
            <input id="gpSolari" type="number" defaultValue="100000000" className="bg-secondary border border-border rounded px-2 py-1 w-28" />
            <button onClick={() => api.giveItem(flsId, 'SolarisCoin', parseInt((document.getElementById('gpSolari') as HTMLInputElement)?.value))}
              className="px-2 py-1 bg-accent text-accent-foreground rounded text-xs">Give Solari</button>
          </div>
        </Card>

        <Card title="🆔 Identity" borderColor="border-l-orange-500">
          <Btn onClick={() => { const n = prompt('New name:'); if (n) api.renamePlayer(1, n).then(() => toast.success('Renamed!')) }}
            icon={RefreshCw} color="bg-orange-500/10 text-orange-400">Rename</Btn>
          <Btn onClick={() => api.cheatScript(flsId, 'LeaveMeAlone')} icon={Trash2} color="bg-red-500/10 text-red-400">Leave Alone</Btn>
        </Card>
      </div>
    </div>
  )
}

function Card({ title, borderColor, children }: { title: string; borderColor: string; children: React.ReactNode }) {
  return (
    <div className={`bg-card border border-border rounded-lg p-4 border-l-4 ${borderColor}`}>
      <h3 className="font-semibold text-sm mb-3">{title}</h3>
      <div className="flex flex-wrap gap-2">{children}</div>
    </div>
  )
}

function Btn({ onClick, icon: Icon, color, children }: any) {
  return (
    <button onClick={onClick} className={`flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-medium transition-colors ${color}`}>
      <Icon className="w-3.5 h-3.5" />{children}
    </button>
  )
}
