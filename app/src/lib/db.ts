import Dexie, { type Table } from 'dexie'
import { PACKS } from '../content'

export interface Profile { id: string; name: string; avatar: string; createdAt: number }
export interface Progress {
  id: string // `${profileId}:${wordId}`
  profileId: string
  wordId: string
  introduced: boolean
  box: number // Leitner box 0..4
  correct: number
  wrong: number
  correctDays: string[] // distinct YYYY-MM-DD with a correct answer
  dueAt: number
  lastSeen: number
  learned: boolean
}
export interface Sticker { id: string; profileId: string; stickerId: string; earnedAt: number }
export interface Session { id?: number; profileId: string; date: string; startedAt: number; introduced: string[]; correct: number; wrong: number }
export interface Settings {
  id: string // 'global' or profileId
  repeatEnMs: number
  hebrewMs: number
  wordRepeatMs: number
  learnedDays: number
  reviewRatio: number
  newWordsPerSession: number
  roundsPerSession: number
  enabledCategories?: string[]
}

export const DEFAULT_SETTINGS: Settings = {
  id: 'global', repeatEnMs: 5000, hebrewMs: 7000, wordRepeatMs: 10000,
  learnedDays: 3, reviewRatio: 0.15, newWordsPerSession: 2, roundsPerSession: 8,
}

class GameDB extends Dexie {
  profiles!: Table<Profile, string>
  progress!: Table<Progress, string>
  stickers!: Table<Sticker, string>
  sessions!: Table<Session, number>
  settings!: Table<Settings, string>
  constructor() {
    super('dino-english')
    this.version(1).stores({
      profiles: 'id, createdAt',
      progress: 'id, profileId, wordId, [profileId+learned], dueAt',
      stickers: 'id, profileId',
      sessions: '++id, profileId, date',
      settings: 'id',
    })
  }
}
export const db = new GameDB()

export const today = () => new Date().toISOString().slice(0, 10)
export const uid = () => Math.random().toString(36).slice(2, 10)

export async function getGlobalSettings(): Promise<Settings> {
  const s = await db.settings.get('global')
  return { ...DEFAULT_SETTINGS, ...(s ?? {}) }
}
export async function saveGlobalSettings(s: Partial<Settings>) {
  const cur = await getGlobalSettings()
  await db.settings.put({ ...cur, ...s, id: 'global' })
}
export async function getEnabledCategories(profileId: string): Promise<string[]> {
  const s = await db.settings.get(profileId)
  return s?.enabledCategories ?? PACKS.map((p) => p.id)
}
export async function setEnabledCategories(profileId: string, cats: string[]) {
  const cur = (await db.settings.get(profileId)) ?? { ...DEFAULT_SETTINGS, id: profileId }
  await db.settings.put({ ...cur, id: profileId, enabledCategories: cats })
}

export async function exportBackup(): Promise<string> {
  const data = {
    version: 1, exportedAt: new Date().toISOString(),
    profiles: await db.profiles.toArray(), progress: await db.progress.toArray(),
    stickers: await db.stickers.toArray(), sessions: await db.sessions.toArray(), settings: await db.settings.toArray(),
  }
  return JSON.stringify(data, null, 1)
}
export async function importBackup(json: string) {
  const d = JSON.parse(json)
  if (!d.profiles || !d.progress) throw new Error('bad backup')
  await db.transaction('rw', db.profiles, db.progress, db.stickers, db.sessions, db.settings, async () => {
    await Promise.all([db.profiles.clear(), db.progress.clear(), db.stickers.clear(), db.sessions.clear(), db.settings.clear()])
    await db.profiles.bulkPut(d.profiles)
    await db.progress.bulkPut(d.progress)
    await db.stickers.bulkPut(d.stickers ?? [])
    await db.sessions.bulkPut(d.sessions ?? [])
    await db.settings.bulkPut(d.settings ?? [])
  })
}
export async function resetProfile(profileId: string) {
  await db.progress.where('profileId').equals(profileId).delete()
  await db.stickers.where('profileId').equals(profileId).delete()
  await db.sessions.where('profileId').equals(profileId).delete()
}
export async function deleteProfile(profileId: string) {
  await resetProfile(profileId)
  await db.settings.delete(profileId)
  await db.profiles.delete(profileId)
}
