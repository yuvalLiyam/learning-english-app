import { useCallback, useState } from 'react'
import { A } from '../content'
import type { Round } from '../lib/learning'
import { useInstruction } from '../lib/useInstruction'
import { useFeedback } from '../components/Common'
import GameFrame from '../components/GameFrame'
import { sfx } from '../lib/audio'
import type { GameProps } from './types'

type R = Extract<Round, { game: 'color' }>

export default function ColorIt({ round, settings, index, total, onDone, onHome }: GameProps<R>) {
  const t = round.target
  const [fill, setFill] = useState<string>('#ffffff')
  const done = useCallback((ok: boolean) => onDone([{ wordId: t.id, correct: ok }]), [onDone, t.id])
  const fb = useFeedback(done, () => A.word(t.id))
  const ins = useInstruction('color-' + index, [A.color(t.id)], A.colorHe(t.id), A.word(t.id), settings)

  const tap = (id: string, color: string) => {
    if (fb.locked.current) return
    sfx.tap()
    setFill(color)
    if (id === t.id) { ins.answered(); fb.correct(id) } else { fb.wrong(id, t.id); setTimeout(() => setFill('#ffffff'), 900) }
  }
  return (
    <GameFrame mood={fb.mood} index={index} total={total} onReplay={ins.replay} onHome={onHome}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 40, width: '100%', height: '100%', flexWrap: 'wrap' }}>
        <svg viewBox="0 0 600 600" style={{ width: 'min(42vh, 360px)', height: 'min(42vh, 360px)', filter: 'drop-shadow(0 8px 10px rgba(0,0,0,.2))' }}>
          <path d="M300 500 q-10 30 10 70" stroke="#888" strokeWidth="6" fill="none" strokeLinecap="round" />
          <ellipse cx="300" cy="270" rx="190" ry="230" fill={fill} stroke="#666" strokeWidth="6" style={{ transition: 'fill .3s' }} />
          <path d="M300 495 l-22 25 h44 z" fill={fill} stroke="#666" strokeWidth="4" style={{ transition: 'fill .3s' }} />
          <ellipse cx="230" cy="170" rx="45" ry="80" fill="#fff" opacity=".35" transform="rotate(-20 230 170)" />
        </svg>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 }}>
          {round.options.map((c) => {
            const st = fb.wrongId === c.id ? 'wrong' : fb.correctId === c.id ? 'correct' : fb.hintId === c.id ? 'hint' : ''
            return (
              <div key={c.id} onPointerDown={() => tap(c.id, c.color!)} className={st}
                style={{ width: 150, height: 150, borderRadius: '50%', background: c.color, border: '8px solid #fff', boxShadow: 'var(--shadow)', position: 'relative',
                  outline: st === 'correct' ? '10px solid var(--accent2)' : st === 'hint' ? '10px solid var(--accent)' : 'none', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                {st === 'wrong' && <div className="x" style={{ fontSize: 110 }}>✕</div>}
              </div>
            )
          })}
        </div>
      </div>
    </GameFrame>
  )
}
