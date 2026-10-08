import { useCallback, useEffect, useRef, useState } from 'react'
import { A, img, wordImg, type Word } from '../content'
import type { Round } from '../lib/learning'
import { useInstruction } from '../lib/useInstruction'
import { burst, randomPraise } from '../components/Common'
import GameFrame from '../components/GameFrame'
import { play, sfx, stop, wait } from '../lib/audio'
import type { GameProps, Result } from './types'

type R = Extract<Round, { game: 'sort' }>
const ZONE_BG: Record<string, string> = { animals: '#c5e1a5', food: '#ffe0b2', dinosaurs: '#ffcdd2', vehicles: '#cfd8dc', clothes: '#e1bee7', nature: '#b3e5fc' }

export default function SortIt({ round, settings, index, total, onDone, onHome }: GameProps<R>) {
  const [placed, setPlaced] = useState<Record<string, string>>({}) // wordId -> cat
  const [drag, setDragState] = useState<{ id: string; x: number; y: number } | null>(null)
  const dragRef = useRef<{ id: string; x: number; y: number } | null>(null)
  const setDrag = (d: { id: string; x: number; y: number } | null) => { dragRef.current = d; setDragState(d) }
  const [wrongId, setWrongId] = useState<string | null>(null)
  const [hintCat, setHintCat] = useState<string | null>(null)
  const [mood, setMood] = useState<'idle' | 'happy' | 'sad' | 'talk'>('idle')
  const tries = useRef<Record<string, number>>({})
  const zones = useRef<Record<string, HTMLDivElement | null>>({})
  const busy = useRef(false)
  const finished = useRef(false)
  const alive = useRef(true)
  useEffect(() => { alive.current = true; return () => { alive.current = false; stop() } }, [])
  const [a, b] = round.cats
  const ins = useInstruction('sort-' + index + a + b, [A.ui('sort_' + a), A.ui('sort_' + b)], A.uiHe('sort_' + a), A.ui('drag_it'), settings)

  useEffect(() => {
    if (Object.keys(placed).length === round.items.length && !finished.current) {
      finished.current = true
      const results: Result[] = round.items.map((w) => ({ wordId: w.id, correct: (tries.current[w.id] ?? 0) === 0 }))
      ;(async () => { setMood('happy'); burst(); sfx.happy(); await wait(300); if (!alive.current) return; await play(randomPraise()); await wait(600); if (alive.current) onDone(results) })()
    }
  }, [placed, round.items, onDone])

  const zoneAt = (x: number, y: number): string | null => {
    for (const cat of round.cats) {
      const r = zones.current[cat]?.getBoundingClientRect()
      if (r && x >= r.left && x <= r.right && y >= r.top && y <= r.bottom) return cat
    }
    return null
  }

  const drop = useCallback(async (w: Word, x: number, y: number) => {
    const z = zoneAt(x, y)
    if (!z || busy.current) return
    ins.answered()
    if (z === w.category) {
      setPlaced((p) => ({ ...p, [w.id]: z })); sfx.happy(); setMood('happy')
      stop(); play(A.word(w.id)); await wait(500); setMood('idle')
    } else {
      busy.current = true
      tries.current[w.id] = (tries.current[w.id] ?? 0) + 1
      setWrongId(w.id); setMood('sad'); sfx.oops(); stop()
      await wait(300); await play(A.ui('try_again'))
      setWrongId(null); setMood('idle')
      if (tries.current[w.id] >= 2) {
        setHintCat(w.category); setMood('talk')
        await play(A.ui('sort_' + w.category)); await wait(800)
        setHintCat(null); setPlaced((p) => ({ ...p, [w.id]: w.category }))
      }
      busy.current = false
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ins])

  const onDown = (w: Word, e: React.PointerEvent) => {
    if (placed[w.id] || busy.current) return
    try { (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId) } catch { /* synthetic event */ }
    setDrag({ id: w.id, x: e.clientX, y: e.clientY })
  }
  const onMove = (e: React.PointerEvent) => { const d = dragRef.current; if (d) setDrag({ ...d, x: e.clientX, y: e.clientY }) }
  const onUp = (w: Word, e: React.PointerEvent) => { if (dragRef.current) { setDrag(null); drop(w, e.clientX, e.clientY) } }

  const Zone = ({ cat }: { cat: string }) => (
    <div ref={(el) => { zones.current[cat] = el }} className={hintCat === cat ? 'hint' : ''}
      style={{ flex: 1, minHeight: 170, borderRadius: 28, background: ZONE_BG[cat] ?? '#eee', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, flexWrap: 'wrap', padding: 10, position: 'relative', border: '4px dashed rgba(0,0,0,.15)', animation: hintCat === cat ? 'pulse 1s infinite' : 'none' }}>
      <img src={img(`images/icons/zone_${cat}.png`)} alt="" style={{ width: 110, height: 110, opacity: .9, position: 'absolute', left: 12, top: 12 }} />
      {round.items.filter((w) => placed[w.id] === cat).map((w) => <img key={w.id} src={wordImg(w)} alt="" style={{ width: 100, height: 100, objectFit: 'contain', borderRadius: 16 }} />)}
    </div>
  )

  return (
    <GameFrame mood={mood} index={index} total={total} onReplay={ins.replay} onHome={onHome}>
      <div style={{ display: 'flex', flexDirection: 'column', width: '100%', height: '100%', gap: 16, maxWidth: 1100 }}>
        <div style={{ display: 'flex', gap: 16, flex: 1 }}><Zone cat={a} /><Zone cat={b} /></div>
        <div style={{ display: 'flex', justifyContent: 'center', gap: 24, minHeight: 150, marginLeft: 150 }}>
          {round.items.map((w) => placed[w.id] ? <div key={w.id} style={{ width: 140 }} /> : (
            <div key={w.id} onPointerDown={(e) => onDown(w, e)} onPointerMove={onMove} onPointerUp={(e) => onUp(w, e)} onPointerCancel={() => setDrag(null)}
              className={'card ' + (w.source === 'photo' ? 'photo ' : '') + (wrongId === w.id ? 'wrong' : '')}
              style={{ width: 140, height: 140, touchAction: 'none', zIndex: drag?.id === w.id ? 20 : 1,
                position: drag?.id === w.id ? 'fixed' : 'relative', left: drag?.id === w.id ? drag.x - 70 : undefined, top: drag?.id === w.id ? drag.y - 70 : undefined,
                transform: drag?.id === w.id ? 'scale(1.15)' : 'none', transition: drag?.id === w.id ? 'none' : 'transform .1s' }}>
              <img src={wordImg(w)} alt="" />
              {wrongId === w.id && <div className="x" style={{ fontSize: 110 }}>✕</div>}
            </div>
          ))}
        </div>
      </div>
    </GameFrame>
  )
}
