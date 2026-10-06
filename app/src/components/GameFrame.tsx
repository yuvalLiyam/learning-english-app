import type { ReactNode } from 'react'
import Mascot, { type Mood } from './Mascot'
import { IconButton, Dots } from './Common'
import { useApp } from '../lib/state'
import { mascotLevel } from '../lib/learning'

/** Chrome around every game: home button, replay-instruction button, progress dots and the mascot. */
export default function GameFrame({ children, mood, index, total, onReplay, onHome }: {
  children: ReactNode; mood: Mood; index: number; total: number; onReplay?: () => void; onHome: () => void
}) {
  const { learned } = useApp()
  return (
    <div className="screen" style={{ paddingTop: 110 }}>
      <div className="topbar">
        <IconButton icon="home" small onClick={onHome} />
        <div style={{ paddingTop: 36 }}><Dots total={total} index={index} /></div>
        {onReplay ? <IconButton icon="replay" small onClick={onReplay} /> : <div style={{ width: 96 }} />}
      </div>
      <div style={{ flex: 1, width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 0, paddingBottom: 40 }}>{children}</div>
      <div style={{ position: 'absolute', left: 8, bottom: 4, pointerEvents: 'none', zIndex: 4 }}>
        <Mascot mood={mood} level={mascotLevel(learned)} size={130} />
      </div>
    </div>
  )
}
