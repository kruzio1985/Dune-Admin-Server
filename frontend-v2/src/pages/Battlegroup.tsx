export function Battlegroup() {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: 'Start Battlegroup', desc: 'Start all game server pods', color: 'bg-accent' },
          { label: 'Stop Battlegroup', desc: 'Gracefully stop all pods', color: 'bg-destructive' },
          { label: 'Restart Battlegroup', desc: 'Stop then start all pods', color: 'bg-warning' },
        ].map(btn => (
          <button key={btn.label} className={`${btn.color} text-foreground p-4 rounded-lg text-left hover:opacity-90 transition-opacity`}>
            <div className="font-semibold">{btn.label}</div>
            <div className="text-xs opacity-80 mt-1">{btn.desc}</div>
          </button>
        ))}
      </div>
    </div>
  )
}
