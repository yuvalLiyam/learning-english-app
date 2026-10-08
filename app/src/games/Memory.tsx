import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { A, wordImg, isPhoto, type Word } from '../content'
import type { Round } from '../lib/learning'
import { useInstruction } from '../lib/useInstruction'
import { burst, randomPraise } from '../components/Common'
import GameFrame from '../components/GameFrame'
import { play, sfx, stop, wait } from '../lib/audio'
import type { GameProps, Result } from './types'

type R = Extract<Round, { game: 'memory' }>
interface Card { key: string; word: Word; kind: 'pic' | 'text' }

export default function Memory({ round, settings, index, total, onDone, onHome }: GameProps<R>) {
  const cards = useMemo<Card[]>(() => {
    const c: Card[] = round.words.flatMap((w) => [{ key: w.id + ':p', word: w, kind: 'pic' as const }, { key: w.id + ':t', word: w, kind: 'text' as const }])
    for (let i = c.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [c[i], c[j]] = [c[j], c[i]] }
    return c
  }, [round])
  const [open, setOpen] = useState<string[]>([])
  const [matched, setMatched] = useState<Set<string>>(new Set())
  const [mood, setMood] = useState<'idle' | 'happy' | 'sad' | 'talk'>('idle')
  const misses = useRef<Record<string, number>>({})
  const busy = useRef(false)
  const ins = useInstruction('memory-' + index + round.words[0].id, [A.ui('find_pairs')], A.uiHe('find_pairs'), null, settings)
  const finished = useRef(false)
  const alive = useRef(true)
  useEffect(() => { alive.current = true; return () => { alive.current = false; stop() } }, [])

  useEffect(() => {
    if (matched.size === round.words.length && !finished.current) {
      finished.current = true
      const results: Result[] = round.words.map((w) => ({ wordId: w.id, correct: (misses.current[w.id] ?? 0) <= 1 }))
      ;(async () => { setMood('happy'); burst(); sfx.happy(); await wait(300); if (!alive.current) return; await play(randomPraise()); await wait(600); if (alive.current) onDone(results) })()
    }
  }, [matched, round.words, onDone])

  const flip = useCallback(async (c: Card) => {
    if (busy.current || open.includes(c.key) || matched.has(c.word.id)) return
    ins.answered()
    sfx.flip()
    stop()
    play(A.word(c.word.id))
    const next = [...open, c.key]
    setOpen(next)
    if (next.length < 2) return
    busy.current = true
    const [a, b] = next.map((k) => cards.find((x) => x.key === k)!)
    await wait(900)
    if (a.word.id === b.word.id) {
      setMatched((m) => new Set([...m, a.word.id]))
      setMood('happy'); sfx.happy()
      setOpen([])
      await wait(400); setMood('idle')
    } else {
      misses.current[a.word.id] = (misses.current[a.word.id] ?? 0) + 1
      misses.current[b.word.id] = (misses.current[b.word.id] ?? 0) + 1
      setMood('sad'); sfx.oops()
      await wait(500)
      setOpen([]); setMood('idle')
    }
    busy.current = false
  }, [open, matched, cards, ins])

  const n = cards.length
  const cols = n <= 6 ? 3 : n <= 10 ? 5 : 4
  return (
    <GameFrame mood={mood} index={index} total={total} onReplay={ins.replay} onHome={onHome}>
      <div style={{ display: 'grid', gridTemplateColumns: `repeat(${cols}, 1fr)`, gap: 14, width: '100%', maxWidth: cols * 190, maxHeight: '100%' }}>
        {cards.map((c) => {
          const up = open.includes(c.key) || matched.has(c.word.id)
          return (
            <div key={c.key} onPointerDown={() => flip(c)} style={{ perspective: 800, aspectRatio: '1', cursor: 'pointer', minHeight: 120 }}>
              <div style={{ position: 'relative', width: '100%', height: '100%', transition: 'transform .4s', transformStyle: 'preserve-3d', transform: up ? 'rotateY(180deg)' : 'none' }}>
                <div className="card" style={{ position: 'absolute', inset: 0, backfaceVisibility: 'hidden', background: 'linear-gradient(135deg,#ff9800,#ffc107)' }}>
                  <span style={{ fontSize: 70 }}>🦖</span>
                </div>
                <div className={'card ' + (c.kind === 'pic' && isPhoto(c.word) ? 'photo' : '')}
                  style={{ position: 'absolute', inset: 0, backfaceVisibility: 'hidden', transform: 'rotateY(180deg)', outline: matched.has(c.word.id) ? '8px solid var(--accent2)' : 'none' }}>
                  {c.kind === 'pic' ? <img src={wordImg(c.word)} alt="" /> : <span className="word-text" style={{ fontSize: c.word.en.length > 9 ? 24 : c.word.en.length > 6 ? 32 : 44, textAlign: 'center', padding: 6 }}>{c.word.en}</span>}
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </GameFrame>
  )
}
