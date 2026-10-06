import { useCallback } from 'react'
import { A, wordImg, type Word } from '../content'
import type { Round, SceneId } from '../lib/learning'
import { useInstruction } from '../lib/useInstruction'
import { useFeedback } from '../components/Common'
import GameFrame from '../components/GameFrame'
import type { GameProps } from './types'

type R = Extract<Round, { game: 'where' }>

/* object slots per scene, in % of the scene box */
const SLOTS: Record<SceneId, { x: number; y: number }[]> = {
  bedroom: [{ x: 14, y: 62 }, { x: 38, y: 40 }, { x: 62, y: 64 }, { x: 84, y: 38 }, { x: 50, y: 82 }],
  street: [{ x: 12, y: 70 }, { x: 36, y: 72 }, { x: 62, y: 70 }, { x: 86, y: 72 }, { x: 50, y: 30 }],
  jungle: [{ x: 14, y: 68 }, { x: 36, y: 42 }, { x: 60, y: 70 }, { x: 84, y: 44 }, { x: 50, y: 20 }],
}

function Scene({ id }: { id: SceneId }) {
  if (id === 'bedroom') return (
    <svg viewBox="0 0 100 60" preserveAspectRatio="none" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }}>
      <rect width="100" height="40" fill="#ffe0b2" /><rect y="40" width="100" height="20" fill="#bcaaa4" />
      <rect x="8" y="6" width="22" height="18" fill="#81d4fa" stroke="#fff" strokeWidth="1.5" /><line x1="19" y1="6" x2="19" y2="24" stroke="#fff" strokeWidth="1" /><line x1="8" y1="15" x2="30" y2="15" stroke="#fff" strokeWidth="1" />
      <rect x="60" y="20" width="34" height="22" rx="2" fill="#ef9a9a" /><rect x="60" y="14" width="34" height="8" rx="2" fill="#b71c1c" /><rect x="62" y="16" width="12" height="6" rx="2" fill="#fff" />
    </svg>)
  if (id === 'street') return (
    <svg viewBox="0 0 100 60" preserveAspectRatio="none" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }}>
      <rect width="100" height="36" fill="#81d4fa" /><circle cx="12" cy="10" r="6" fill="#ffeb3b" />
      <rect x="20" y="16" width="14" height="20" fill="#90a4ae" /><rect x="40" y="10" width="18" height="26" fill="#b0bec5" /><rect x="64" y="18" width="12" height="18" fill="#90a4ae" />
      <rect y="36" width="100" height="24" fill="#616161" /><line x1="0" y1="48" x2="100" y2="48" stroke="#fff" strokeWidth="1.5" strokeDasharray="6 4" />
    </svg>)
  return (
    <svg viewBox="0 0 100 60" preserveAspectRatio="none" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }}>
      <rect width="100" height="60" fill="#b3e5fc" /><circle cx="88" cy="10" r="7" fill="#ffeb3b" />
      <ellipse cx="20" cy="44" rx="34" ry="18" fill="#81c784" /><ellipse cx="80" cy="48" rx="40" ry="20" fill="#66bb6a" /><rect y="50" width="100" height="10" fill="#4caf50" />
      <rect x="6" y="18" width="4" height="22" fill="#795548" /><circle cx="8" cy="16" r="9" fill="#2e7d32" />
      <rect x="92" y="24" width="4" height="20" fill="#795548" /><circle cx="94" cy="22" r="8" fill="#388e3c" />
    </svg>)
}

export default function WhereIs({ round, settings, index, total, onDone, onHome }: GameProps<R>) {
  const t = round.target
  const done = useCallback((ok: boolean) => onDone([{ wordId: t.id, correct: ok }]), [onDone, t.id])
  const fb = useFeedback(done, () => A.word(t.id))
  const ins = useInstruction('where-' + index, [A.where(t.id)], A.findHe(t.id), A.word(t.id), settings)
  const tap = (w: Word) => { if (fb.locked.current) return; if (w.id === t.id) { ins.answered(); fb.correct(w.id) } else fb.wrong(w.id, t.id) }
  return (
    <GameFrame mood={fb.mood} index={index} total={total} onReplay={ins.replay} onHome={onHome}>
      <div style={{ position: 'relative', width: '100%', height: '100%', maxWidth: 1100, maxHeight: 620, borderRadius: 28, overflow: 'hidden', boxShadow: 'var(--shadow)' }}>
        <Scene id={round.scene} />
        {round.objects.map((w, i) => {
          const s = SLOTS[round.scene][i % SLOTS[round.scene].length]
          const st = fb.wrongId === w.id ? 'wrong' : fb.correctId === w.id ? 'correct' : fb.hintId === w.id ? 'hint' : ''
          return (
            <div key={w.id} onPointerDown={() => tap(w)} className={st}
              style={{ position: 'absolute', left: `${s.x}%`, top: `${s.y}%`, width: 150, height: 150, marginLeft: -75, marginTop: -75, display: 'flex', alignItems: 'center', justifyContent: 'center',
                borderRadius: 24, background: w.source === 'photo' ? '#fff' : 'transparent', padding: w.source === 'photo' ? 4 : 0, outline: st === 'correct' ? '10px solid var(--accent2)' : st === 'hint' ? '10px solid var(--accent)' : 'none' }}>
              <img src={wordImg(w)} alt="" style={{ width: '100%', height: '100%', objectFit: w.source === 'photo' ? 'cover' : 'contain', borderRadius: 20, filter: 'drop-shadow(0 4px 6px rgba(0,0,0,.25))' }} />
              {st === 'wrong' && <div className="x" style={{ fontSize: 120 }}>✕</div>}
            </div>
          )
        })}
      </div>
    </GameFrame>
  )
}
