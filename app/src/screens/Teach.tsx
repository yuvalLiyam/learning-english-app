import { useEffect, useRef, useState } from 'react'
import { A, img, wordImg, isPhoto, type Word } from '../content'
import { play, playSeq, sfx, stop, wait } from '../lib/audio'
import { listen, matches } from '../lib/speech'
import { useApp } from '../lib/state'
import { mascotLevel } from '../lib/learning'
import Mascot from '../components/Mascot'
import { IconButton, burst, randomPraise } from '../components/Common'

/**
 * Lesson card: big picture + written word.
 *   "blue" (2s) "blue" (2s) "blue" (2s) "כחול"
 *   then "Now you say it, three times!" – listens 3× (or just pauses 3× if no speech recognition).
 */
export default function Teach({ word, onDone, onHome }: { word: Word; onDone: (w: Word) => void; onHome: () => void }) {
  const { learned, sayOk } = useApp()
  const [mood, setMood] = useState<'idle' | 'talk' | 'happy'>('talk')
  const [listening, setListening] = useState(false)
  const [count, setCount] = useState(0) // how many times the child said it
  const [ready, setReady] = useState(false)
  const alive = useRef(true)

  useEffect(() => {
    alive.current = true
    ;(async () => {
      await wait(500)
      for (let i = 0; i < 3; i++) { if (!alive.current) return; setMood('talk'); await play(A.word(word.id)); setMood('idle'); await wait(2000) }
      if (!alive.current) return
      setMood('talk'); await play(A.he(word.id)); await wait(1200)
      if (!alive.current) return
      await playSeq([A.ui('say_three')]); setMood('idle')
      for (let i = 0; i < 3; i++) {
        if (!alive.current) return
        if (i > 0) { await play(A.ui('again')); await wait(200) }
        setListening(true)
        let ok = true
        if (sayOk) {
          const r = await listen(4500)
          ok = !r.error && matches(word.en, r.alts.length ? r.alts : [r.heard])
          if (r.error && r.error !== 'no-speech') { await wait(2500) } // mic unavailable → just give time to repeat aloud
        } else await wait(2800)
        setListening(false)
        if (!alive.current) return
        setCount(i + 1)
        if (ok) { sfx.pop(); setMood('happy'); await play(i === 2 ? randomPraise() : A.ui('praise_1')); setMood('idle') }
        else { await play(A.ui('i_heard')); await wait(150); await play(A.word(word.id)) }
        await wait(300)
      }
      if (!alive.current) return
      burst(); sfx.happy(); setReady(true)
      await wait(1200)
      if (alive.current) onDone(word)
    })()
    return () => { alive.current = false; stop() }
  }, [word]) // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="screen" style={{ background: 'linear-gradient(#e3f2fd,#fff8e1)' }}>
      <div className="topbar"><IconButton icon="home" small onClick={onHome} />{ready && <IconButton icon="next" onClick={() => { alive.current = false; stop(); onDone(word) }} />}</div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 'clamp(12px, 3vw, 48px)', flexWrap: 'wrap', width: '100%' }}>
        <Mascot mood={mood} level={mascotLevel(learned)} size={150} />
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16 }}>
          <div className={'card ' + (isPhoto(word) ? 'photo' : '')} onPointerDown={() => { stop(); playSeq([A.word(word.id), A.he(word.id)], 600) }}
            style={{ width: 'min(50vh, 50vw, 400px)', height: 'min(50vh, 50vw, 400px)', aspectRatio: 'auto', outline: listening ? '10px solid #ef5350' : 'none', transition: 'outline .2s' }}>
            <img src={wordImg(word)} alt="" />
          </div>
          <div className="word-text" style={{ fontSize: 'clamp(40px, 8vh, 72px)' }}>{word.en}</div>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 14, width: 150 }}>
          <div style={{ width: 130, height: 130, borderRadius: '50%', background: listening ? '#ef5350' : '#eee', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: 'var(--shadow)', animation: listening ? 'pulse .8s infinite' : 'none', transition: 'background .3s' }}>
            <img src={img('images/icons/mic.png')} alt="" style={{ width: '60%' }} />
          </div>
          <div style={{ display: 'flex', gap: 10 }}>{[0, 1, 2].map((i) => <span key={i} style={{ width: 26, height: 26, borderRadius: '50%', background: i < count ? 'var(--accent2)' : '#ddd' }} />)}</div>
        </div>
      </div>
    </div>
  )
}
