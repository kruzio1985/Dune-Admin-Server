import { cn } from '@/lib/utils'
import {
  LayoutDashboard, Swords, Users, UserCog, Package, Gamepad2, ShoppingCart,
  Database, Zap, Settings, Server, ChevronLeft, ChevronRight, Monitor,
} from 'lucide-react'
import { useState } from 'react'

const NAV_ITEMS = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { id: 'battlegroup', label: 'Battlegroup', icon: Swords },
  { id: 'players', label: 'Players', icon: Users },
  { id: 'characters', label: 'Characters', icon: UserCog },
  { id: 'storage', label: 'Storage & Bases', icon: Package },
  { id: 'gameplay', label: 'Gameplay Admin', icon: Gamepad2 },
  { id: 'market', label: 'Market', icon: ShoppingCart },
  { id: 'database', label: 'Database', icon: Database },
  { id: 'commands', label: 'Commands', icon: Zap },
  { id: 'settings', label: 'Settings', icon: Settings },
]

interface Props {
  currentPage: string
  onNavigate: (page: any) => void
  children: React.ReactNode
}

export function Layout({ currentPage, onNavigate, children }: Props) {
  const [collapsed, setCollapsed] = useState(false)

  return (
    <div className="flex h-screen bg-background">
      {/* Sidebar */}
      <aside className={cn(
        'flex flex-col border-r border-border bg-card transition-all duration-200',
        collapsed ? 'w-[60px]' : 'w-[220px]'
      )}>
        <div className="flex items-center gap-2 p-4 border-b border-border">
          <Monitor className="w-6 h-6 text-dune-spice shrink-0" />
          {!collapsed && <span className="font-bold text-sm">Dune Admin v2</span>}
        </div>
        <nav className="flex-1 py-2 overflow-y-auto">
          {NAV_ITEMS.map(item => {
            const Icon = item.icon
            const active = currentPage === item.id
            return (
              <button
                key={item.id}
                onClick={() => onNavigate(item.id)}
                className={cn(
                  'w-full flex items-center gap-3 px-3 py-2.5 text-sm transition-colors',
                  'hover:bg-secondary/50',
                  active && 'bg-primary/10 text-primary border-l-2 border-primary',
                  !active && 'text-muted-foreground border-l-2 border-transparent',
                  collapsed && 'justify-center px-2'
                )}
              >
                <Icon className={cn('w-5 h-5 shrink-0', active && 'text-primary')} />
                {!collapsed && <span className="truncate">{item.label}</span>}
              </button>
            )
          })}
        </nav>
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="p-3 border-t border-border text-muted-foreground hover:text-foreground transition-colors flex justify-center"
        >
          {collapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
        </button>
      </aside>

      {/* Main content */}
      <main className="flex-1 overflow-y-auto bg-background">
        <header className="sticky top-0 z-10 flex items-center justify-between px-6 py-3 border-b border-border bg-background/80 backdrop-blur-sm">
          <div className="flex items-center gap-3">
            <Server className="w-4 h-4 text-accent" />
            <span className="text-xs text-muted-foreground">dune-awakening</span>
            <span className="w-2 h-2 rounded-full bg-accent animate-pulse" />
          </div>
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <span>v2.0.0</span>
          </div>
        </header>
        {children}
      </main>
    </div>
  )
}
