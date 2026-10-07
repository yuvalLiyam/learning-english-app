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
  if (p && !p.introduced) { p.introduced = true; p.box = 0; p.dueAt = 0; await db.progress.put(p) }
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

interface Pool { fresh: Word[]; due: Word[]; learned: Word[]; all: Word[]; introduced: Word[] }
function buildPool(progress: Progress[], fresh: Word[]): Pool {
  const now = Date.now()
  const introduced = progress.filter((p) => p.introduced).map((p) => WORD_BY_ID[p.wordId]).filter(Boolean)
  const freshIds = new Set(fresh.map((w) => w.id))
  const due = progress.filter((p) => p.introduced && !p.learned && !freshIds.has(p.wordId) && p.dueAt <= now).map((p) => WORD_BY_ID[p.wordId])
  const notDue = progress.filter((p) => p.introduced && !p.learned && !freshIds.has(p.wordId) && p.dueAt > now).map((p) => WORD_BY_ID[p.wordId])
  const learned = progress.filter((p) => p.learned).map((p) => WORD_BY_ID[p.wordId])
  const all = progress.map((p) => WORD_BY_ID[p.wordId]).filter(Boolean)
  // if nothing is due, fall back to not-yet-due review words so sessions are never empty
  return { fresh, due: due.length ? shuffle(due) : shuffle(notDue), learned: shuffle(learned), all, introduced: [...introduced, ...fresh] }
}

function pickTarget(pool: Pool, ratio: number, used: Set<string>, ok: (w: Word) => boolean = () => true): Word | null {
  const r = Math.random()
  const tryList = (list: Word[]) => list.find((w) => ok(w) && !used.has(w.id)) ?? list.find(ok)
  const order: Word[][] = r < 0.5 && pool.fresh.length ? [pool.fresh, pool.due, pool.learned]
    : r < 1 - ratio || !pool.learned.length ? [pool.due, pool.fresh, pool.learned] : [pool.learned, pool.due, pool.fresh]
  for (const l of order) { if (l.length) { const w = tryList(l); if (w) return w } }
  return null
}

/** distractors: prefer same category, then anything enabled. */
function distractors(target: Word, pool: Pool, n: number, from?: Word[]): Word[] {
  const src = from ?? pool.all
  const same = shuffle(src.filter((w) => w.id !== target.id && w.category === target.category))
  const other = shuffle(src.filter((w) => w.id !== target.id && w.category !== target.category))
  return [...same, ...other].slice(0, n)
}

function roundFor(game: GameId, pool: Pool, settings: Settings, used: Set<string>, learned: number): Round | null {
  const ALL_SCENE_CATS = Object.values(SCENE_CATS).flat()
  const ok = game === 'where' ? (w: Word) => ALL_SCENE_CATS.includes(w.category)
    : game === 'sort' ? (w: Word) => SORT_CATS.includes(w.category)
    : game === 'color' ? (w: Word) => w.category === 'colors' : () => true
  const target = pickTarget(pool, settings.reviewRatio, used, ok)
  if (!target) return null
  used.add(target.id)
  switch (game) {
    case 'listen':
    case 'bubbles': {
      const opts = distractors(target, pool, 3)
      if (opts.length < 2) return null
      return { game, target, options: shuffle([target, ...opts]) }
    }
    case 'memory': {
      const pairs = Math.min(6, 3 + Math.floor(learned / 8))
      const words = [target, ...distractors(target, pool, pairs - 1, pool.introduced)]
      if (words.length < 3) return null
      return { game, words }
    }
    case 'sort': {
      const catsAvail = SORT_CATS.filter((c) => pool.introduced.filter((w) => w.category === c).length >= 2)
      if (catsAvail.length < 2) return null
      const a = catsAvail.includes(target.category) ? target.category : pick(catsAvail)
      const b = pick(catsAvail.filter((c) => c !== a))
      const items = [
        ...shuffle(pool.introduced.filter((w) => w.category === a)).slice(0, 2),
        ...shuffle(pool.introduced.filter((w) => w.category === b)).slice(0, 2),
      ]
      return { game, cats: [a, b], items: shuffle(items) }
    }
    case 'where': {
      const scene = (Object.keys(SCENE_CATS) as SceneId[]).find((s) => SCENE_CATS[s].includes(target.category))
      if (!scene) return null
      const others = distractors(target, pool, 4, pool.all.filter((w) => SCENE_CATS[scene].includes(w.category)))
      if (others.length < 2) return null
      return { game, scene, objects: shuffle([target, ...others]), target }
    }
    case 'color': {
      const colors = pool.all.filter((w) => w.category === 'colors')
      if (colors.length < 4) return null
      const t = target.category === 'colors' ? target : pick(colors)
      used.add(t.id)
      return { game, target: t, options: shuffle([t, ...shuffle(colors.filter((c) => c.id !== t.id)).slice(0, 3)]) }
    }
    case 'say':
      return { game, target }
  }
}

/** Lesson: 5-6 words from ONE category (un-introduced first), then games using only those words. */
export async function buildLesson(profileId: string, settings: Settings, category: string): Promise<SessionPlan> {
  const progress = await ensureProgress(profileId, [category])
  const byId = new Map(progress.map((p) => [p.wordId, p]))
  const catWords = (PACK_BY_ID[category]?.words ?? []).filter((w) => byId.has(w.id))
  const rank = (w: Word) => { const p = byId.get(w.id)!; return !p.introduced ? 0 : !p.learned ? 1 : 2 }
  const lesson = catWords.map((w, i) => ({ w, i })).sort((a, b) => rank(a.w) - rank(b.w) || a.i - b.i).map((x) => x.w).slice(0, Math.min(6, catWords.length))
  const pool: Pool = { fresh: shuffle(lesson), due: [], learned: [], all: catWords, introduced: catWords }
  const used = new Set<string>()
  const rounds: Round[] = []
  const games: GameId[] = lesson.length >= 3 ? ['listen', 'listen', 'bubbles', 'where', 'memory', 'listen'] : ['listen', 'listen', 'bubbles']
  for (const g of games) {
    if (used.size >= lesson.length) used.clear()
    let r = roundFor(g, pool, settings, used, learnedCount(progress))
    if (!r && g !== 'listen') r = roundFor('listen', pool, settings, used, learnedCount(progress))
    if (r) rounds.push(r)
  }
  return { newWords: lesson, rounds }
}

export async function buildSession(profileId: string, settings: Settings, opts: { game?: GameId; sayOk: boolean; learn?: string }): Promise<SessionPlan> {
  if (opts.learn) return buildLesson(profileId, settings, opts.learn)
  const progress = await ensureProgress(profileId)
  const learned = learnedCount(progress)
  const newWords = opts.game ? [] : pickNewWords(progress, Math.max(1, Math.min(3, settings.newWordsPerSession)))
  const pool = buildPool(progress, newWords)
  const used = new Set<string>()
  const rounds: Round[] = []
  const games: GameId[] = opts.game
    ? Array(6).fill(opts.game)
    : shuffle(['listen', 'bubbles', 'memory', 'where', 'sort', 'color', 'listen', 'bubbles', 'say']).filter((g) => g !== 'say' || opts.sayOk)
  for (const g of games) {
    if (rounds.length >= (opts.game ? 6 : settings.roundsPerSession)) break
    let r = roundFor(g, pool, settings, used, learned)
    if (!r && g !== 'listen') r = roundFor('listen', pool, settings, used, learned)
    if (r) rounds.push(r)
  }
  return { newWords, rounds }
}

export const packName = (id: string) => PACK_BY_ID[id]?.name ?? id
