import { useEffect, useState } from 'react'
import { img, A, AVATARS } from '../content'
import { db, uid, type Profile } from '../lib/db'
import { play, sfx } from '../lib/audio'
import { useApp } from '../lib/state'
import { IconButton } from '../components/Common'

export default function Profiles() {
  const { go, setProfile } = useApp()
  const [profiles, setProfiles] = useState<Profile[]>([])
  const [adding, setAdding] = useState(false)
  const load = () => db.profiles.orderBy('createdAt').toArray().then(setProfiles)
  useEffect(() => { load(); play(A.ui('who_are_you')) }, [])

  const choose = (p: Profile) => { sfx.tap(); setProfile(p); go({ name: 'home' }) }
  const add = async (avatar: string) => {
    const p: Profile = { id: uid(), name: `ילד ${profiles.length + 1}`, avatar, createdAt: Date.now() }
    await db.profiles.put(p)
    choose(p)
  }
  const tile = (src: string, onTap: () => void, key: string) => (
    <button key={key} className="big-btn round" style={{ width: 190, height: 190 }} onPointerDown={onTap}><img src={src} alt="" /></button>
  )
  return (
    <div className="screen" style={{ gap: 30 }}>
      {adding && <div className="topbar"><IconButton icon="back" small onClick={() => setAdding(false)} /></div>}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 30, justifyContent: 'center', maxWidth: 1000 }}>
        {adding
          ? AVATARS.map((a) => tile(img(`images/avatars/${a}.png`), () => add(a), a))
          : [...profiles.map((p) => tile(img(`images/avatars/${p.avatar}.png`), () => choose(p), p.id)),
            tile(img('images/icons/plus.png'), () => { sfx.tap(); setAdding(true) }, '+')]}
      </div>
    </div>
  )
}
