import { useState } from 'react'
import { Layout } from '@/components/Layout'
import { Dashboard } from '@/pages/Dashboard'
import { Characters } from '@/pages/Characters'
import { GameplayAdmin } from '@/pages/GameplayAdmin'
import { Market } from '@/pages/Market'
import { Database } from '@/pages/Database'
import { Commands } from '@/pages/Commands'
import { Settings } from '@/pages/Settings'
import { Storage } from '@/pages/Storage'
import { Players } from '@/pages/Players'
import { Battlegroup } from '@/pages/Battlegroup'

type Page = 'dashboard' | 'battlegroup' | 'players' | 'characters' | 'storage' | 'gameplay' | 'market' | 'database' | 'commands' | 'settings'

export default function App() {
  const [page, setPage] = useState<Page>('dashboard')

  const pages: Record<Page, { title: string; component: React.ReactNode }> = {
    dashboard: { title: 'Dashboard', component: <Dashboard /> },
    battlegroup: { title: 'Battlegroup', component: <Battlegroup /> },
    players: { title: 'Players', component: <Players /> },
    characters: { title: 'Characters', component: <Characters /> },
    storage: { title: 'Storage', component: <Storage /> },
    gameplay: { title: 'Gameplay Admin', component: <GameplayAdmin /> },
    market: { title: 'Market', component: <Market /> },
    database: { title: 'Database', component: <Database /> },
    commands: { title: 'Commands', component: <Commands /> },
    settings: { title: 'Settings', component: <Settings /> },
  }

  return (
    <Layout currentPage={page} onNavigate={setPage}>
      <div className="p-6">
        <h1 className="text-2xl font-bold mb-6">{pages[page].title}</h1>
        {pages[page].component}
      </div>
    </Layout>
  )
}
