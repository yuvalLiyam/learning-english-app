import { useEffect } from 'react'
import { PACKS, A, wordImg, isPhoto } from '../content'
import { play, playSeq, stop, sfx } from '../lib/audio'
import { useApp } from '../lib/state'
import { IconButton } from '../components/Common'

/** Learn mode: pick a category (big picture per category, spoken name on tap) → lesson session. */
export default function Learn() {
  const { go } = useApp()
  useEffect(() => { play(A.ui('choose_category')); return () => stop() }, [])
  const pick = async (id: string) => {
    sfx.tap(); stop()
    await playSeq([A.ui('cat_' + id)])
    go({ name: 'session', learn: id })
  }
  return (
    <div className="screen" style={{ paddingTop: 110, justifyContent: 'flex-start', background: '#e8f5e9' }}>
      <div className="topbar"><IconButton icon="home" small onClick={() => go({ name: 'home' })} /></div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, 150px)', gap: 18, justifyContent: 'center', width: '100%', overflowY: 'auto', maxHeight: '100%', padding: 8 }}>
        {PACKS.map((p) => {
          const w = p.words[p.id === 'numbers' ? 2 : 0]
          return (
            <button key={p.id} className={'big-btn ' + (isPhoto(w) ? 'photo' : '')} style={{ width: 150, height: 150, padding: 0 }} onPointerDown={() => pick(p.id)}>
              <img src={wordImg(w)} alt="" style={isPhoto(w) ? { width: '100%', height: '100%', objectFit: 'cover' } : undefined} />
            </button>
          )
        })}
      </div>
    </div>
  )
}
