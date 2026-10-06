import { useEffect } from 'react'
import { img, A } from '../content'
import { play, playSeq, stop, sfx } from '../lib/audio'
import { useApp } from '../lib/state'
import { ALL_GAMES, mascotLevel, type GameId } from '../lib/learning'
import Mascot from '../components/Mascot'
import { IconButton } from '../components/Common'

export default function Home() {
  const { go, profile, learned, sayOk } = useApp()
  useEffect(() => { play(A.ui('choose_game')) }, [])

  const games = ALL_GAMES.filter((g) => g !== 'say' || sayOk)
  const startGame = async (g: GameId) => {
    sfx.tap(); stop()
    await playSeq([A.ui('game_' + g)])
    go({ name: 'session', game: g })
  }
  const playAll = async () => { sfx.tap(); stop(); await playSeq([A.ui('lets_play')]); go({ name: 'session' }) }
  const album = async () => { sfx.tap(); stop(); play(A.ui('game_album')); go({ name: 'album' }) }

  return (
    <div className="screen" style={{ paddingTop: 100 }}>
      <div className="topbar">
        <button className="icon-btn small" onPointerDown={() => { sfx.tap(); go({ name: 'profiles' }) }}>
          <img src={img(`images/avatars/${profile?.avatar ?? 'a1'}.png`)} alt="" style={{ width: '80%' }} />
        </button>
        <IconButton icon="parent" small onClick={() => go({ name: 'gate' })} style={{ opacity: .6, width: 80, height: 80 }} />
      </div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 30, width: '100%', flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10 }}>
          <Mascot mood="idle" level={mascotLevel(learned)} size={180} />
          <button className="big-btn round" onPointerDown={playAll} style={{ width: 170, height: 170, background: 'linear-gradient(135deg,#66bb6a,#43a047)' }}>
            <img src={img('images/icons/play.png')} alt="" />
          </button>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 18 }}>
          {games.map((g) => (
            <button key={g} className="big-btn" style={{ width: 150, height: 150 }} onPointerDown={() => startGame(g)}>
              <img src={img(`images/icons/${g === 'listen' ? 'listen' : g}.png`)} alt="" />
            </button>
          ))}
          <button className="big-btn" style={{ width: 150, height: 150, background: '#fff3e0' }} onPointerDown={album}>
            <img src={img('images/icons/album.png')} alt="" />
          </button>
        </div>
      </div>
    </div>
  )
}
