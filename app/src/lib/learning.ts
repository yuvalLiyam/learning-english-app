/**
 * Learning engine: Leitner boxes + session builder.
 */
import { PACKS, PACK_BY_ID, WORD_BY_ID, type Word } from '../content'
import { db, today, getEnabledCategories, type Progress, type Settings } from './db'

const BOX_DAYS = [0, 1, 3, 7, 14]
const DAY = 86400000

export type GameId = 'memory' | 'listen' | 'bubbles' | 'sort' | 'where' | 'color' | 'say'
export const ALL_GAMES: GameId[] = ['memory', 'listen', 'bubbles', 'sort', 'where', 'color', 'say']

export type Round =
  | { game: 'listen'; target: Word; options: Word[] }
  | { game: 'bubbles'; target: Word; options: Word[] }
  | { game: 'memory'; words: Word[] }
  | { game: 'sort'; cats: [string, string]; items: Word[] }
  | { game: 'where'; scene: SceneId; objects: Word[]; target: Word }
  | { game: 'color'; target: Word; options: Word[] }
  | { game: 'say'; target: Word }

export type SceneId = 'bedroom' | 'street' | 'jungle'
export const SCENE_CATS: Record<SceneId, string[]> = {
  bedroom: ['home', 'clothes', 'family', 'body', 'food'],
  street: ['vehicles'],
  jungle: ['animals', 'dinosaurs', 'nature'],
}
export const SORT_CATS = ['animals', 'food', 'dinosaurs', 'vehicles', 'clothes', 'nature']

export interface SessionPlan { newWords: Word[]; rounds: Round[] }

const shuffle = <T,>(a: T[]): T[] => { const b = [...a]; for (let i = b.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [b[i], b[j]] = [b[j], b[i]] } return b }
const pick = <T,>(a: T[]): T => a[Math.floor(Math.random() * a.length)]

/** Make sure every enabled word has a progress row; words in "known" packs start as introduced. */
export async function ensureProgress(profileId: string, extraCats: string[] = []): Promise<Progress[]> {
  const cats = [...new Set([...(await getEnabledCategories(profileId)), ...extraCats])]
  const existing = await db.progress.where('profileId').equals(profileId).toArray()
  const have = new Set(existing.map((p) => p.wordId))
  const add: Progress[] = []
  for (const pack of PACKS) {
    if (!cats.includes(pack.id)) continue
    for (const w of pack.words) {
      if (have.has(w.id)) continue
      add.push({
        id: `${profileId}:${w.id}`, profileId, wordId: w.id, introduced: pack.known, box: pack.known ? 1 : 0,
        correct: 0, wrong: 0, correctDays: [], dueAt: 0, lastSeen: 0, learned: false,
      })
    }
  }
  if (add.length) await db.progress.bulkPut(add)
  return [...existing, ...add].filter((p) => cats.includes(WORD_BY_ID[p.wordId]?.category))
}

export async function recordAnswer(profileId: string, wordId: string, correct: boolean) {
  const id = `${profileId}:${wordId}`
  const p = await db.progress.get(id)
  if (!p) return
  const s = (await db.settings.get('global')) as Settings | undefined
  const learnedDays = s?.learnedDays ?? 3
  const now = Date.now()
  if (correct) {
    p.correct++
    p.box = Math.min(BOX_DAYS.length - 1, p.box + 1)
    if (!p.correctDays.includes(today())) p.correctDays.push(today())
    p.dueAt = now + BOX_DAYS[p.box] * DAY
    p.learned = p.correctDays.length >= learnedDays && p.box >= 3
  } else {
    p.wrong++
    p.box = Math.max(0, p.box - 1)
    p.dueAt = now
    p.learned = false
  }
  p.lastSeen = now
  await db.progress.put(p)
}

export async function markIntroduced(profileId: string, wordId: string) {
  const id = `${profileId}:${wordId}`
  const p = await db.progress.get(id)
  if (p && !p.introduced) { p.introduced = true; p.introducedAt = Date.now(); p.box = 0; p.dueAt = 0; await db.progress.put(p) }
}

/** New words come from the first non-"known" enabled pack that still has un-introduced words. */
export function pickNewWords(progress: Progress[], n: number): Word[] {
  const byId = new Map(progress.map((p) => [p.wordId, p]))
  for (const pack of PACKS) {
    if (pack.known) continue
    const left = pack.words.filter((w) => byId.has(w.id) && !byId.get(w.id)!.introduced)
    if (left.length) return left.slice(0, n)
  }
  return []
}

export function learnedCount(progress: Progress[]) { return progress.filter((p) => p.learned).length }

export function mascotLevel(learned: number) {
  const t = [0, 5, 12, 25, 40, 60]
  let lvl = 0
  for (let i = 0; i < t.length; i++) if (learned >= t[i]) lvl = i
  return lvl
}

interface Pool { fresh: Word[]; focus: Word[]; all: Word[]; introduced: Word[]; prog: Map<string, Progress> }

const ALL_SCENE_CATS = Object.values(SCENE_CATS).flat()
const sceneOf = (w: Word) => (Object.keys(SCENE_CATS) as SceneId[]).find((s) => SCENE_CATS[s].includes(w.category))
void ALL_SCENE_CATS

/** How likely a word is to be picked as a question target. New / recently introduced / wrongly answered words dominate. */
function weight(p: Progress | undefined, w: Word, freshIds: Set<string>): number {
  if (freshIds.has(w.id)) return 20
  if (!p || !p.introduced) return 0
  const known = !!PACK_BY_ID[w.category]?.known
  let wt = [8, 4, 2, 1, 0.6][Math.min(4, p.box)]
  if (p.learned) wt *= 0.25
  const since = p.introducedAt ?? (known ? 0 : p.lastSeen || 0)
  const age = since ? Date.now() - since : Infinity
  if (age < 3 * DAY) wt *= 5
  else if (age < 7 * DAY) wt *= 2.5
  if (known && p.correct > 0 && p.wrong <= p.correct) wt *= 0.4 // confidence-builders: keep, but don't flood
  if (p.wrong > p.correct) wt *= 2
  return wt
}

function weightedPick(words: Word[], wt: (w: Word) => number, avoid: Set<string>): Word | null {
  const ws = words.map((w) => wt(w) * (avoid.has(w.id) ? 0.04 : 1))
  const total = ws.reduce((a, b) => a + b, 0)
  if (total <= 0) return null
  let r = Math.random() * total
  for (let i = 0; i < words.length; i++) { r -= ws[i]; if (r <= 0) return words[i] }
  return words[words.length - 1]
}

function buildPool(progress: Progress[], fresh: Word[]): Pool {
  const prog = new Map(progress.map((p) => [p.wordId, p]))
  const freshIds = new Set(fresh.map((w) => w.id))
  const introduced = progress.filter((p) => p.introduced).map((p) => WORD_BY_ID[p.wordId]).filter(Boolean)
  const all = progress.map((p) => WORD_BY_ID[p.wordId]).filter(Boolean)
  // focus = fresh words + the most recently introduced / still-weak words (they show up as targets AND as wrong options)
  const recent = introduced
    .filter((w) => !freshIds.has(w.id) && weight(prog.get(w.id), w, freshIds) >= 12)
    .sort((a, b) => weight(prog.get(b.id), b, freshIds) - weight(prog.get(a.id), a, freshIds))
    .slice(0, 8)
  return { fresh, focus: [...fresh, ...recent], all, introduced: [...new Set([...introduced, ...fresh])], prog }
}

/** Wrong options: same category first, new/focus words preferred; falls back to any word. */
function distractors(target: Word, pool: Pool, n: number, opts: { from?: Word[]; focusFirst?: boolean } = {}): Word[] {
  const focusIds = new Set(pool.focus.map((w) => w.id))
  const rank = (w: Word) => opts.focusFirst
    ? (focusIds.has(w.id) ? 0 : 2) + (w.category === target.category ? 0 : 1)
    : (w.category === target.category ? 0 : 2) + (focusIds.has(w.id) ? 0 : 1)
  const pickFrom = (src: Word[]) => shuffle(src.filter((w) => w.id !== target.id)).sort((a, b) => rank(a) - rank(b))
  const intro = new Set(pool.introduced.map((w) => w.id))
  const base = opts.from ?? pool.all
  const out = pickFrom(base.filter((w) => intro.has(w.id))).slice(0, n)
  if (out.length < n) out.push(...pickFrom(base.filter((w) => !intro.has(w.id))).slice(0, n - out.length))
  return out
}

function eligible(game: GameId, w: Word, pool: Pool): boolean {
  switch (game) {
    case 'where': return !!sceneOf(w)
    case 'color': return w.category === 'colors'
    case 'sort': {
      if (!SORT_CATS.includes(w.category)) return false
      const ok = SORT_CATS.filter((c) => pool.introduced.filter((x) => x.category === c).length >= 2)
      return ok.includes(w.category) && ok.length >= 2
    }
    default: return true
  }
}

function roundFor(game: GameId, target: Word, pool: Pool, learned: number): Round | null {
  switch (game) {
    case 'listen':
    case 'bubbles': {
      const opts = distractors(target, pool, 3)
      if (opts.length < 2) return null
      return { game, target, options: shuffle([target, ...opts]) }
    }
    case 'memory': {
      const pairs = Math.min(6, 3 + Math.floor(learned / 8))
      const words = [target, ...distractors(target, pool, pairs - 1, { from: pool.introduced, focusFirst: true })]
      if (words.length < 3) return null
      return { game, words }
    }
    case 'sort': {
      const catsAvail = SORT_CATS.filter((c) => pool.introduced.filter((w) => w.category === c).length >= 2)
      if (catsAvail.length < 2) return null
      const a = target.category
      if (!catsAvail.includes(a)) return null
      const b = pick(catsAvail.filter((c) => c !== a))
      const focusIds = new Set(pool.focus.map((w) => w.id))
      const take = (cat: string, must?: Word) => {
        const list = shuffle(pool.introduced.filter((w) => w.category === cat && w.id !== must?.id))
          .sort((x, y) => (focusIds.has(x.id) ? 0 : 1) - (focusIds.has(y.id) ? 0 : 1))
        return (must ? [must] : []).concat(list).slice(0, 2)
      }
      return { game, cats: [a, b], items: shuffle([...take(a, target), ...take(b)]) }
    }
    case 'where': {
      const scene = sceneOf(target)
      if (!scene) return null
      const others = distractors(target, pool, 4, { from: pool.all.filter((w) => SCENE_CATS[scene].includes(w.category)) })
      if (others.length < 2) return null
      return { game, scene, objects: shuffle([target, ...others]), target }
    }
    case 'color': {
      const colors = pool.all.filter((w) => w.category === 'colors')
      if (colors.length < 4 || target.category !== 'colors') return null
      const rest = distractors(target, pool, 3, { from: colors })
      return { game, target, options: shuffle([target, ...rest]) }
    }
    case 'say':
      return { game, target }
  }
}

/**
 * Pick `n` question targets: every fresh word is guaranteed `perFresh` rounds, the rest are weighted-random
 * (new / recent / weak words >> already-known ones), no word twice in a row.
 */
function pickTargets(pool: Pool, n: number, perFresh: number, canBe: (w: Word) => boolean = () => true): Word[] {
  const freshIds = new Set(pool.fresh.map((w) => w.id))
  const wt = (w: Word) => (canBe(w) ? weight(pool.prog.get(w.id), w, freshIds) : 0)
  const out: Word[] = []
  for (const w of pool.fresh) if (canBe(w)) for (let i = 0; i < perFresh; i++) out.push(w)
  const used = new Set(out.map((w) => w.id))
  let guard = 0
  while (out.length < n && guard++ < 200) {
    const w = weightedPick(pool.introduced, wt, used)
    if (!w) break
    out.push(w); used.add(w.id)
  }
  const sh = shuffle(out)
  for (let i = 1; i < sh.length; i++) { // no immediate repeats
    if (sh[i].id === sh[i - 1].id) {
      const j = sh.findIndex((x, k) => k > i && x.id !== sh[i].id && x.id !== sh[i - 1].id)
      if (j > -1) [sh[i], sh[j]] = [sh[j], sh[i]]
    }
  }
  return sh
}

const GAME_WEIGHT: Record<GameId, number> = { listen: 3, bubbles: 3, memory: 2, where: 2, sort: 2, color: 2, say: 1.5 }
const GAME_CAP: Partial<Record<GameId, number>> = { memory: 2, sort: 2, say: 2 }

function chooseGame(target: Word, pool: Pool, allowed: GameId[], prev: GameId | null, counts: Record<string, number>): GameId {
  const cands = allowed.filter((g) => eligible(g, target, pool) && g !== prev && (GAME_CAP[g] === undefined || (counts[g] ?? 0) < GAME_CAP[g]!))
  const list = cands.length ? cands : (['listen', 'bubbles'] as GameId[]).filter((g) => g !== prev)
  const total = list.reduce((a, g) => a + GAME_WEIGHT[g], 0)
  let r = Math.random() * total
  for (const g of list) { r -= GAME_WEIGHT[g]; if (r <= 0) return g }
  return list[0]
}

function makeRounds(pool: Pool, targets: Word[], allowed: GameId[], learned: number, fixedGame?: GameId): Round[] {
  const rounds: Round[] = []
  const counts: Record<string, number> = {}
  let prev: GameId | null = null
  for (const t of targets) {
    let g: GameId = fixedGame && eligible(fixedGame, t, pool) ? fixedGame : chooseGame(t, pool, allowed, prev, counts)
    let r = roundFor(g, t, pool, learned)
    if (!r) { g = 'listen'; r = roundFor(g, t, pool, learned) }
    if (r) { rounds.push(r); prev = g; counts[g] = (counts[g] ?? 0) + 1 }
  }
  return rounds
}

/** Lesson: 5-6 words from ONE category (un-introduced first), then games using only those words (2 rounds per word). */
export async function buildLesson(profileId: string, settings: Settings, category: string): Promise<SessionPlan> {
  void settings
  const progress = await ensureProgress(profileId, [category])
  const byId = new Map(progress.map((p) => [p.wordId, p]))
  const catWords = (PACK_BY_ID[category]?.words ?? []).filter((w) => byId.has(w.id))
  const rank = (w: Word) => { const p = byId.get(w.id)!; return !p.introduced ? 0 : !p.learned ? 1 : 2 }
  const lesson = catWords.map((w, i) => ({ w, i })).sort((a, b) => rank(a.w) - rank(b.w) || a.i - b.i).map((x) => x.w).slice(0, Math.min(6, catWords.length))
  const pool: Pool = { fresh: lesson, focus: lesson, all: catWords, introduced: catWords, prog: byId }
  const targets = pickTargets(pool, Math.min(12, lesson.length * 2), 2)
  const allowed: GameId[] = lesson.length >= 3 ? ['listen', 'bubbles', 'where', 'memory'] : ['listen', 'bubbles']
  return { newWords: lesson, rounds: makeRounds(pool, targets, allowed, learnedCount(progress)) }
}

export async function buildSession(profileId: string, settings: Settings, opts: { game?: GameId; sayOk: boolean; learn?: string }): Promise<SessionPlan> {
  if (opts.learn) return buildLesson(profileId, settings, opts.learn)
  const progress = await ensureProgress(profileId)
  const learned = learnedCount(progress)
  const newWords = opts.game ? [] : pickNewWords(progress, Math.max(1, Math.min(3, settings.newWordsPerSession)))
  const pool = buildPool(progress, newWords)
  const allowed = ALL_GAMES.filter((g) => g !== 'say' || opts.sayOk)
  const game = opts.game
  const n = game ? 6 : Math.max(settings.roundsPerSession, newWords.length * 2 + 4)
  const targets = pickTargets(pool, n, game ? 0 : 2, game ? (w) => eligible(game, w, pool) : undefined)
  return { newWords, rounds: makeRounds(pool, targets, allowed, learned, game) }
}

export const packName = (id: string) => PACK_BY_ID[id]?.name ?? id
