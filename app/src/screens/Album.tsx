import { useEffect, useState } from 'react'
import { img, STICKERS } from '../content'
import { db } from '../lib/db'
import { sfx } from '../lib/audio'
import { useApp } from '../lib/state'
import { IconButton } from '../components/Common'

export default function Album() {
  const { go, profile } = useApp()
  const [have, setHave] = useState<Set<string>>(new Set())
  useEffect(() => { db.stickers.where('profileId').equals(profile!.id).toArray().then((s) => setHave(new Set(s.map((x) => x.stickerId)))) }, [profile])
  return (
    <div className="screen" style={{ paddingTop: 110, justifyContent: 'flex-start', background: '#fff3e0' }}>
      <div className="topbar"><IconButton icon="home" small onClick={() => go({ name: 'home' })} /></div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, 130px)', gap: 16, justifyContent: 'center', width: '100%', overflowY: 'auto', maxHeight: '100%', padding: 8 }}>
        {STICKERS.map((s) => (
          <div key={s} className="card" onPointerDown={() => { if (have.has(s)) sfx.sticker() }}
            style={{ width: 130, height: 130, aspectRatio: 'auto', filter: have.has(s) ? 'none' : 'grayscale(1) opacity(.25)', cursor: 'default' }}>
            <img src={img(`images/stickers/${s}.png`)} alt="" />
          </div>
        ))}
      </div>
    </div>
  )
}
