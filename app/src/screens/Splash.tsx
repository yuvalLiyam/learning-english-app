import { useEffect, useState } from 'react'
import Mascot from '../components/Mascot'
import { img, A } from '../content'
import { unlock, play, preload } from '../lib/audio'
import { useApp } from '../lib/state'
import { db } from '../lib/db'
import { mascotLevel } from '../lib/learning'

export default function Splash() {
  const { go, profile, learned } = useApp()
  const [count, setCount] = useState(0)
  useEffect(() => { db.profiles.count().then(setCount) }, [])
  useEffect(() => { preload([A.ui('lets_play'), A.ui('who_are_you'), A.ui('choose_game')]) }, [])

  const start = async () => {
    await unlock()
    play(A.ui('lets_play'))
    go(count > 0 && profile ? { name: 'home' } : { name: 'profiles' })
  }
  return (
    <div className="screen" onPointerDown={start} style={{ background: 'linear-gradient(#fff8e1, #ffe0b2)', cursor: 'pointer' }}>
      <Mascot mood="happy" level={mascotLevel(learned)} size={Math.min(window.innerHeight * 0.55, 380)} onClick={start} />
      <img src={img('images/icons/hand.png')} alt="" className="bounce" style={{ width: 110, marginTop: -30 }} />
    </div>
  )
}
