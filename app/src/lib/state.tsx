import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react'
import { db, getGlobalSettings, DEFAULT_SETTINGS, type Profile, type Settings } from './db'
import { ensureProgress, learnedCount, type GameId } from './learning'
import { speechSupported } from './speech'

export type Screen =
  | { name: 'splash' } | { name: 'profiles' } | { name: 'home' } | { name: 'session'; game?: GameId; learn?: string } | { name: 'learn' }
  | { name: 'album' } | { name: 'gate' } | { name: 'parent' }

interface Ctx {
  screen: Screen; go: (s: Screen) => void
  profile: Profile | null; setProfile: (p: Profile | null) => void
  settings: Settings; reloadSettings: () => Promise<void>
  learned: number; refreshLearned: () => Promise<void>
  sayOk: boolean
}
const C = createContext<Ctx>(null!)
export const useApp = () => useContext(C)

export function AppProvider({ children }: { children: ReactNode }) {
  const [screen, go] = useState<Screen>({ name: 'splash' })
  const [profile, setProfileState] = useState<Profile | null>(null)
  const [settings, setSettings] = useState<Settings>(DEFAULT_SETTINGS)
  const [learned, setLearned] = useState(0)
  const [sayOk] = useState(() => speechSupported())

  const reloadSettings = useCallback(async () => setSettings(await getGlobalSettings()), [])
  const refreshLearned = useCallback(async () => {
    if (!profile) return
    setLearned(learnedCount(await ensureProgress(profile.id)))
  }, [profile])
  const setProfile = useCallback((p: Profile | null) => {
    setProfileState(p)
    if (p) localStorage.setItem('lastProfile', p.id)
  }, [])

  useEffect(() => { reloadSettings() }, [reloadSettings])
  useEffect(() => { refreshLearned() }, [refreshLearned, screen])
  useEffect(() => {
    // restore last profile
    const last = localStorage.getItem('lastProfile')
    if (last) db.profiles.get(last).then((p) => { if (p) setProfileState(p) })
  }, [])

  return <C.Provider value={{ screen, go, profile, setProfile, settings, reloadSettings, learned, refreshLearned, sayOk }}>{children}</C.Provider>
}
