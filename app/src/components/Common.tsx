import { useState, useCallback, useRef, useEffect, type ReactNode } from 'react'
import confetti from 'canvas-confetti'
import { img, wordImg, isPhoto, type Word, PRAISES, A } from '../content'
import { play, playSeq, stop, sfx, wait } from '../lib/audio'

export function IconButton({ icon, onClick, small, style }: { icon: string; onClick: () => void; small?: boolean; style?: React.CSSProperties }) {
  return (
    <button className={'icon-btn' + (small ? ' small' : '')} style={style} onPointerDown={(e) => { e.stopPropagation(); sfx.tap(); onClick() }}>
      <img src={img(`images/icons/${icon}.png`)} alt="" />
    </button>
  )
}

export function WordCard({ word, state, onTap, style, children, className }: {
  word: Word; state?: 'wrong' | 'correct' | 'hint' | 'hidden'; onTap?: () => void; style?: React.CSSProperties; children?: ReactNode; className?: string
}) {
  return (
    <div className={['card', isPhoto(word) ? 'photo' : '', state ?? '', className ?? ''].join(' ')} style={style}
      onPointerDown={onTap ? (e) => { e.preventDefault(); onTap() } : undefined}>
      <img src={wordImg(word)} alt="" draggable={false} />
      {state === 'wrong' && <div className="x">✕</div>}
      {children}
    </div>
  )
}

export function Dots({ total, index }: { total: number; index: number }) {
  return <div className="dots">{Array.from({ length: total }, (_, i) => <span key={i} className={i < index ? 'done' : i === index ? 'now' : ''} />)}</div>
}

export function burst() {
  confetti({ particleCount: 120, spread: 90, origin: { y: 0.6 }, zIndex: 50 })
  confetti({ particleCount: 60, angle: 60, spread: 60, origin: { x: 0, y: 0.7 }, zIndex: 50 })
  confetti({ particleCount: 60, angle: 120, spread: 60, origin: { x: 1, y: 0.7 }, zIndex: 50 })
}

export const randomPraise = () => A.ui(PRAISES[Math.floor(Math.random() * PRAISES.length)])

/**
 * Shared answer-feedback logic used by every game:
 *  correct  → happy sfx + praise + confetti, then onDone(true)
 *  wrong    → oops + "Try again!"; after 2 wrong tries highlight the answer, say the word, then onDone(false)
 */
export function useFeedback(onDone: (correct: boolean) => void, targetAudio: () => string) {
  const [wrongId, setWrongId] = useState<string | null>(null)
  const [correctId, setCorrectId] = useState<string | null>(null)
  const [hintId, setHintId] = useState<string | null>(null)
  const [mood, setMood] = useState<'idle' | 'happy' | 'sad' | 'talk'>('idle')
  const tries = useRef(0)
  const locked = useRef(false)
  const alive = useRef(true)
  useEffect(() => { alive.current = true; return () => { alive.current = false; stop() } }, [])

  const reset = useCallback(() => { tries.current = 0; locked.current = false; setWrongId(null); setCorrectId(null); setHintId(null); setMood('idle') }, [])

  const correct = useCallback(async (id: string) => {
    if (locked.current) return
    locked.current = true
    stop()
    setCorrectId(id); setMood('happy')
    sfx.happy(); burst()
    await wait(350)
    if (!alive.current) return
    await play(randomPraise())
    await wait(500)
    if (alive.current) onDone(tries.current === 0)
  }, [onDone])

  const wrong = useCallback(async (id: string, correctAnswerId: string) => {
    if (locked.current) return
    locked.current = true
    stop()
    tries.current++
    setWrongId(id); setMood('sad')
    sfx.oops()
    await wait(300)
    if (!alive.current) return
    await play(A.ui('try_again'))
    if (!alive.current) return
    if (tries.current >= 2) {
      setWrongId(null); setHintId(correctAnswerId); setMood('talk')
      await wait(300)
      if (!alive.current) return
      await play(targetAudio())
      await wait(600)
      if (!alive.current) return
      await play(targetAudio())
      await wait(800)
      if (alive.current) onDone(false)
      return
    }
    setWrongId(null); setMood('idle')
    locked.current = false
    if (alive.current) await playSeq([targetAudio()])
  }, [onDone, targetAudio])

  return { wrongId, correctId, hintId, mood, correct, wrong, reset, locked }
}

