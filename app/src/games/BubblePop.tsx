import { useCallback, useMemo } from 'react'
import { A, wordImg } from '../content'
import type { Round } from '../lib/learning'
import { useInstruction } from '../lib/useInstruction'
import { useFeedback } from '../components/Common'
import GameFrame from '../components/GameFrame'
import { sfx } from '../lib/audio'
import type { GameProps } from './types'

type R = Extract<Round, { game: 'bubbles' }>

export default function BubblePop({ round, settings, index, total, onDone, onHome }: GameProps<R>) {
  const t = round.target
  const done = useCallback((ok: boolean) => onDone([{ wordId: t.id, correct: ok }]), [onDone, t.id])
  const fb = useFeedback(done, () => A.word(t.id))
  const ins = useInstruction('bubbles-' + index + t.id, [A.pop(t.id)], A.findHe(t.id), A.word(t.id), settings)
  // random lanes/timings per round
  const lanes = useMemo(() => round.options.map((_, i) => ({
    left: 8 + i * (84 / Math.max(1, round.options.length - 1)) + (Math.random() * 6 - 3),
    dur: 9 + Math.random() * 4, delay: -Math.random() * 8,
  })), [round])

  const tap = (id: string) => {
    if (fb.locked.current) return
    sfx.pop()
    if (id === t.id) { ins.answered(); fb.correct(id) } else fb.wrong(id, t.id)
  }
  const paused = !!fb.correctId || !!fb.hintId
  return (
    <GameFrame mood={fb.mood} index={index} total={total} onReplay={ins.replay} onHome={onHome}>
      <div style={{ position: 'absolute', inset: 0, overflow: 'hidden', background: 'linear-gradient(#b3e5fc, #e1f5fe)' }}>
        {round.options.map((w, i) => {
          const st = fb.wrongId === w.id ? 'wrong' : fb.correctId === w.id ? 'correct' : fb.hintId === w.id ? 'hint' : ''
          return (
            <div key={w.id} onPointerDown={() => tap(w.id)} className={'bubble ' + st}
              style={{
                position: 'absolute', left: `${lanes[i].left}%`, bottom: -220, width: 190, height: 190, marginLeft: -95,
                animation: `floatUp ${lanes[i].dur}s linear ${lanes[i].delay}s infinite`, animationPlayState: paused ? 'paused' : 'running',
              }}>
              <div style={{
                width: '100%', height: '100%', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center',
                background: 'radial-gradient(circle at 30% 30%, rgba(255,255,255,.95), rgba(180,230,255,.55) 60%, rgba(120,200,255,.7))',
                boxShadow: 'inset 0 0 30px rgba(255,255,255,.9), 0 8px 20px rgba(0,0,0,.15)', border: '4px solid rgba(255,255,255,.8)',
                outline: st === 'correct' ? '10px solid var(--accent2)' : st === 'hint' ? '10px solid var(--accent)' : 'none',
                animation: st === 'wrong' ? 'shake .5s' : st ? 'pop .5s' : 'none', position: 'relative',
              }}>
                <img src={wordImg(w)} alt="" style={{ width: '68%', height: '68%', objectFit: 'contain', borderRadius: w.source === 'photo' ? '50%' : 0 }} />
                {st === 'wrong' && <div className="x" style={{ fontSize: 120 }}>✕</div>}
              </div>
            </div>
          )
        })}
      </div>
    </GameFrame>
  )
}
