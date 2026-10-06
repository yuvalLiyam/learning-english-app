import { useEffect, useRef, useState } from 'react'
import { A, img, wordImg, isPhoto } from '../content'
import type { Round } from '../lib/learning'
import { burst, randomPraise } from '../components/Common'
import GameFrame from '../components/GameFrame'
import { play, playSeq, sfx, stop, wait } from '../lib/audio'
import { listen, matches } from '../lib/speech'
import type { GameProps } from './types'

type R = Extract<Round, { game: 'say' }>

export default function SayIt({ round, index, total, onDone, onHome }: GameProps<R>) {
  const t = round.target
  const [listening, setListening] = useState(false)
  const [mood, setMood] = useState<'idle' | 'happy' | 'sad' | 'talk'>('talk')
  const [state, setState] = useState<'' | 'correct' | 'wrong'>('')
  const running = useRef(false)
  const tries = useRef(0)
  const alive = useRef(true)

  const run = async () => {
    if (running.current) return
    running.current = true
    while (alive.current) {
      stop()
      setMood('talk')
      await playSeq([A.ui('say_word'), A.slow(t.id)])
      if (!alive.current) return
      setListening(true); setMood('idle')
      const r = await listen(6000)
      setListening(false)
      if (!alive.current) return
      if (r.error && r.error !== 'no-speech') {
        // mic/network not available – don't frustrate the child, skip gracefully
        await play(A.ui('i_heard')); await wait(300); onDone([]); return
      }
      if (matches(t.en, r.alts.length ? r.alts : [r.heard])) {
        setState('correct'); setMood('happy'); sfx.happy(); burst()
        await wait(300); await play(randomPraise()); await wait(500)
        onDone([{ wordId: t.id, correct: tries.current === 0 }]); return
      }
      tries.current++
      if (tries.current >= 2) {
        setMood('talk'); await play(A.ui('i_heard')); await wait(200); await play(A.word(t.id)); await wait(600)
        onDone([{ wordId: t.id, correct: false }]); return
      }
      setState('wrong'); setMood('sad'); sfx.oops(); await play(A.ui('almost')); setState(''); await wait(300)
    }
  }
  useEffect(() => { alive.current = true; run(); return () => { alive.current = false; stop() } }, []) // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <GameFrame mood={mood} index={index} total={total} onHome={onHome}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 50, width: '100%' }}>
        <div className={'card ' + (isPhoto(t) ? 'photo ' : '') + state} style={{ width: 'min(46vh, 380px)', height: 'min(46vh, 380px)', aspectRatio: 'auto', cursor: 'default' }}>
          <img src={wordImg(t)} alt="" />{state === 'wrong' && <div className="x">✕</div>}
        </div>
        <div style={{ width: 200, height: 200, borderRadius: '50%', background: listening ? '#ef5350' : '#eee', display: 'flex', alignItems: 'center', justifyContent: 'center',
          boxShadow: 'var(--shadow)', animation: listening ? 'pulse .8s infinite' : 'none', transition: 'background .3s' }}>
          <img src={img('images/icons/mic.png')} alt="" style={{ width: '60%' }} />
        </div>
      </div>
    </GameFrame>
  )
}
