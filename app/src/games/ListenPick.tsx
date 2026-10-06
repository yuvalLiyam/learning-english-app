import { useCallback } from 'react'
import { A } from '../content'
import type { Round } from '../lib/learning'
import { useInstruction } from '../lib/useInstruction'
import { useFeedback, WordCard } from '../components/Common'
import GameFrame from '../components/GameFrame'
import type { GameProps } from './types'

type R = Extract<Round, { game: 'listen' }>

export default function ListenPick({ round, settings, index, total, onDone, onHome }: GameProps<R>) {
  const t = round.target
  const done = useCallback((ok: boolean) => onDone([{ wordId: t.id, correct: ok }]), [onDone, t.id])
  const fb = useFeedback(done, () => A.word(t.id))
  const ins = useInstruction('listen-' + index, [A.find(t.id)], A.findHe(t.id), A.word(t.id), settings)

  const tap = (id: string) => {
    if (fb.locked.current) return
    if (id === t.id) { ins.answered(); fb.correct(id) } else fb.wrong(id, t.id)
  }
  return (
    <GameFrame mood={fb.mood} index={index} total={total} onReplay={ins.replay} onHome={onHome}>
      <div className="grid4">
        {round.options.map((w) => (
          <WordCard key={w.id} word={w} onTap={() => tap(w.id)}
            state={fb.wrongId === w.id ? 'wrong' : fb.correctId === w.id ? 'correct' : fb.hintId === w.id ? 'hint' : undefined} />
        ))}
      </div>
    </GameFrame>
  )
}
