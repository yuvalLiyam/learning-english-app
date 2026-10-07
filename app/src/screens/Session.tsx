import { useCallback, useEffect, useRef, useState } from 'react'
import { A, STICKERS, STICKER_INFO, img, wordImg, isPhoto, type Word } from '../content'
import { db, today, type Session as SessionRow } from '../lib/db'
import { buildSession, markIntroduced, recordAnswer, mascotLevel, type SessionPlan, type Round } from '../lib/learning'
import { play, playSeq, preload, sfx, stop, wait } from '../lib/audio'
import { listen, matches } from '../lib/speech'
import { useApp } from '../lib/state'
import Mascot from '../components/Mascot'
import { IconButton, burst, randomPraise } from '../components/Common'
import ListenPick from '../games/ListenPick'
import BubblePop from '../games/BubblePop'
import Memory from '../games/Memory'
import SortIt from '../games/SortIt'
import WhereIs from '../games/WhereIs'
import ColorIt from '../games/ColorIt'
import SayIt from '../games/SayIt'
import Teach from './Teach'
import type { Result } from '../games/types'

type Step = { kind: 'loading' } | { kind: 'intro'; i: number } | { kind: 'round'; i: number } | { kind: 'end' }

function roundAudio(r: Round): string[] {
  switch (r.game) {
    case 'listen': case 'bubbles': return [A.find(r.target.id), A.pop(r.target.id), A.findHe(r.target.id), A.word(r.target.id)]
    case 'where': return [A.where(r.target.id), A.findHe(r.target.id), A.word(r.target.id)]
    case 'color': return [A.color(r.target.id), A.colorHe(r.target.id), A.word(r.target.id)]
    case 'say': return [A.slow(r.target.id), A.word(r.target.id)]
    case 'memory': return r.words.map((w) => A.word(w.id))
    case 'sort': return [A.ui('sort_' + r.cats[0]), A.ui('sort_' + r.cats[1])]
  }
}

export default function Session({ game, learn }: { game?: SessionPlan['rounds'][number]['game']; learn?: string }) {
  const { go, profile, settings, sayOk, learned, refreshLearned } = useApp()
  const [plan, setPlan] = useState<SessionPlan | null>(null)
  const [step, setStep] = useState<Step>({ kind: 'loading' })
  const stats = useRef<SessionRow>({ profileId: profile!.id, date: today(), startedAt: Date.now(), introduced: [], correct: 0, wrong: 0 })
  const startLearned = useRef(learned)

  const built = useRef(false)
  useEffect(() => {
    if (!profile) { go({ name: 'profiles' }); return }
    if (built.current) return
    built.current = true
    buildSession(profile.id, settings, { game, sayOk, learn }).then((p) => {
      setPlan(p)
      preload(p.rounds.flatMap(roundAudio))
      preload(p.newWords.flatMap((w) => [A.word(w.id), A.he(w.id), A.slow(w.id)]))
      setStep(p.newWords.length ? { kind: 'intro', i: 0 } : p.rounds.length ? { kind: 'round', i: 0 } : { kind: 'end' })
    })
  }, [profile, settings, game, sayOk, learn, go])

  const home = useCallback(() => { stop(); go({ name: 'home' }) }, [go])

  const next = useCallback(() => {
    setStep((s) => {
      if (!plan) return s
      if (s.kind === 'intro') {
        if (s.i + 1 < plan.newWords.length) return { kind: 'intro', i: s.i + 1 }
        if (learn) play(A.ui('good_now_games'))
        return plan.rounds.length ? { kind: 'round', i: 0 } : { kind: 'end' }
      }
      if (s.kind === 'round') return s.i + 1 < plan.rounds.length ? { kind: 'round', i: s.i + 1 } : { kind: 'end' }
      return s
    })
  }, [plan, learn])

  const onDone = useCallback(async (results: Result[]) => {
    for (const r of results) {
      await recordAnswer(profile!.id, r.wordId, r.correct)
      if (r.correct) stats.current.correct++; else stats.current.wrong++
    }
    next()
  }, [profile, next])

  const introDone = useCallback(async (w: Word) => {
    await markIntroduced(profile!.id, w.id)
    stats.current.introduced.push(w.id)
    next()
  }, [profile, next])

  if (!plan || step.kind === 'loading') return <div className="screen"><Mascot mood="idle" level={mascotLevel(learned)} size={200} /></div>
  if (step.kind === 'intro') return learn
    ? <Teach key={'teach' + step.i} word={plan.newWords[step.i]} onDone={introDone} onHome={home} />
    : <Intro key={'intro' + step.i} word={plan.newWords[step.i]} onDone={introDone} onHome={home} />
  if (step.kind === 'end') return <End stats={stats.current} startLearned={startLearned.current} onHome={async () => { await refreshLearned(); home() }} />

  const r = plan.rounds[step.i]
  const common = { settings, index: step.i, total: plan.rounds.length, onDone, onHome: home }
  const k = 'round' + step.i
  switch (r.game) {
    case 'listen': return <ListenPick key={k} {...common} round={r} />
    case 'bubbles': return <BubblePop key={k} {...common} round={r} />
    case 'memory': return <Memory key={k} {...common} round={r} />
    case 'sort': return <SortIt key={k} {...common} round={r} />
    case 'where': return <WhereIs key={k} {...common} round={r} />
    case 'color': return <ColorIt key={k} {...common} round={r} />
    case 'say': return <SayIt key={k} {...common} round={r} />
  }
}

/** New word: "Dog… כלב… Dog!" twice, the second time with a bounce; tap the arrow (or wait) to continue. */
function Intro({ word, onDone, onHome }: { word: Word; onDone: (w: Word) => void; onHome: () => void }) {
  const { learned } = useApp()
  const [phase, setPhase] = useState<0 | 1 | 2>(0)
  const [ready, setReady] = useState(false)
  const alive = useRef(true)
  useEffect(() => {
    alive.current = true
    ;(async () => {
      await wait(400)
      await playSeq([A.ui('new_word')]); await wait(300)
      if (!alive.current) return
      setPhase(1); await playSeq([A.word(word.id), A.he(word.id), A.word(word.id)], 450)
      if (!alive.current) return
      await wait(600); setPhase(2); sfx.happy()
      await playSeq([A.slow(word.id), A.he(word.id), A.word(word.id)], 450)
      if (!alive.current) return
      setReady(true)
      await wait(2500)
      if (alive.current) onDone(word)
    })()
    return () => { alive.current = false; stop() }
  }, [word]) // eslint-disable-line react-hooks/exhaustive-deps
  const tapCard = () => { stop(); playSeq([A.word(word.id), A.he(word.id), A.word(word.id)], 450) }
  return (
    <div className="screen" style={{ background: 'linear-gradient(#e3f2fd,#fff8e1)' }}>
      <div className="topbar"><IconButton icon="home" small onClick={onHome} />{ready && <IconButton icon="next" onClick={() => { alive.current = false; stop(); onDone(word) }} />}</div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 'clamp(12px, 3vw, 40px)', flexWrap: 'wrap', width: '100%' }}>
        <Mascot mood={phase === 0 ? 'idle' : 'talk'} level={mascotLevel(learned)} size={160} />
        <div className={'card ' + (isPhoto(word) ? 'photo ' : '') + (phase === 2 ? 'bounce' : '')} onPointerDown={tapCard}
          style={{ width: 'min(55vh, 55vw, 440px)', height: 'min(55vh, 55vw, 440px)', aspectRatio: 'auto', animationDuration: '.8s' }}>
          <img src={wordImg(word)} alt="" />
        </div>
        <div className="word-text fade-in" style={{ minWidth: 200, textAlign: 'center', opacity: phase ? 1 : 0, fontSize: 'clamp(40px, 8vh, 64px)' }}>{word.en}</div>
      </div>
    </div>
  )
}

/** Session end: sticker reward (+ teaches the sticker's name) + mascot growth. */
function End({ stats, startLearned, onHome }: { stats: SessionRow; startLearned: number; onHome: () => void }) {
  const { profile, learned, sayOk } = useApp()
  const [sticker, setSticker] = useState<string | null>(null)
  const [grew, setGrew] = useState(false)
  const [listening, setListening] = useState(false)
  const [mood, setMood] = useState<'happy' | 'talk' | 'idle'>('happy')
  const ran = useRef(false)
  const sayName = (s: string) => playSeq([A.sticker(s), A.stickerHe(s), A.sticker(s)], 400)
  useEffect(() => {
    if (ran.current) return
    ran.current = true
    ;(async () => {
      await db.sessions.add(stats)
      const have = new Set((await db.stickers.where('profileId').equals(profile!.id).toArray()).map((s) => s.stickerId))
      const left = STICKERS.filter((s) => !have.has(s))
      const s = left.length ? left[Math.floor(Math.random() * left.length)] : STICKERS[Math.floor(Math.random() * STICKERS.length)]
      await db.stickers.put({ id: `${profile!.id}:${s}`, profileId: profile!.id, stickerId: s, earnedAt: Date.now() })
      preload([A.sticker(s), A.stickerHe(s), A.ui('say_word'), A.ui('i_heard')])
      await playSeq([A.ui('all_done')])
      setSticker(s); sfx.sticker(); burst()
      await wait(300); await play(A.ui('sticker'))
      // teach the word: "Octopus... תמנון... Octopus!"
      await wait(400); setMood('talk'); await sayName(s); setMood('happy')
      if (mascotLevel(learned) > mascotLevel(startLearned)) { await wait(400); setGrew(true); sfx.grow(); await play(A.ui('grow')) }
      // bonus: let the child say it (forgiving – never a failure on the reward screen)
      if (sayOk) {
        await wait(300); setMood('talk'); await play(A.ui('say_word')); setMood('idle')
        setListening(true)
        const r = await listen(5000)
        setListening(false)
        if (!r.error || r.error === 'no-speech') {
          setMood('happy')
          if (matches(STICKER_INFO[s].en, r.alts.length ? r.alts : [r.heard])) { sfx.happy(); burst(); await play(randomPraise()) }
          else if (r.heard) { await play(A.ui('i_heard')); await wait(200); await play(A.sticker(s)) }
        }
      }
    })()
    return () => stop()
  }, []) // eslint-disable-line react-hooks/exhaustive-deps
  return (
    <div className="screen" style={{ background: 'linear-gradient(#fff9c4,#ffe0b2)', gap: 24 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 50 }}>
        <Mascot mood={mood} level={mascotLevel(grew ? learned : startLearned)} size={grew ? 260 : 220} />
        {sticker && (
          <div className="card fade-in" onPointerDown={() => { stop(); sayName(sticker) }}
            style={{ width: 300, height: 300, aspectRatio: 'auto', animation: 'pop .6s', outline: listening ? '10px solid #ef5350' : 'none' }}>
            <img src={img(`images/stickers/${sticker}.png`)} alt="" />
            {listening && <img src={img('images/icons/mic.png')} alt="" className="bounce" style={{ position: 'absolute', right: 10, bottom: 10, width: 70, height: 70 }} />}
          </div>
        )}
      </div>
      <button className="big-btn round" style={{ width: 150, height: 150 }} onPointerDown={() => { sfx.tap(); onHome() }}><img src={img('images/icons/home.png')} alt="" /></button>
    </div>
  )
}
