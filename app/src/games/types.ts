import type { Settings } from '../lib/db'

export interface Result { wordId: string; correct: boolean }
export interface GameProps<R> {
  round: R
  settings: Settings
  index: number
  total: number
  onDone: (results: Result[]) => void
  onHome: () => void
}
