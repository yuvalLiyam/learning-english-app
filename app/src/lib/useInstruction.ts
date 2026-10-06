import { useEffect, useRef, useCallback } from 'react'
import { play, playSeq, stop } from './audio'
import type { Settings } from './db'

/**
 * Spoken-instruction scheduler (no text ever needed by the child):
 *   t=0        English instruction
 *   +repeatEn  English instruction again (if no answer)
 *   +hebrew    Hebrew instruction once
 *   then every wordRepeat: the English target word
 * Call `answered()` to silence it, `replay()` to repeat the English instruction.
 */
export function useInstruction(
  key: string,
  en: string[] | null,
  he: string | null,
  word: string | null,
  settings: Settings,
  active = true,
) {
  const timers = useRef<number[]>([])
  const done = useRef(false)

  const clear = useCallback(() => {
    timers.current.forEach((t) => window.clearTimeout(t))
    timers.current = []
  }, [])

  const schedule = useCallback(() => {
    clear()
    if (!en) return
    const t1 = window.setTimeout(() => {
      if (done.current) return
      playSeq(en)
      const t2 = window.setTimeout(() => {
        if (done.current) return
        if (he) play(he)
        const loop = () => {
          const t = window.setTimeout(() => {
            if (done.current) return
            if (word) play(word)
            loop()
          }, settings.wordRepeatMs)
          timers.current.push(t)
        }
        loop()
      }, settings.hebrewMs)
      timers.current.push(t2)
    }, settings.repeatEnMs)
    timers.current.push(t1)
  }, [clear, en, he, word, settings])

  useEffect(() => {
    done.current = !active
    if (!active || !en) return
    stop()
    playSeq(en).then(() => { if (!done.current) schedule() })
    return () => { clear(); stop() }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, active])

  const answered = useCallback(() => { done.current = true; clear() }, [clear])
  const replay = useCallback(() => { if (en) { stop(); playSeq(en).then(() => { if (!done.current) schedule() }) } }, [en, schedule])
  return { answered, replay }
}
