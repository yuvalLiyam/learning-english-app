import { useState } from 'react'
import { useApp } from '../lib/state'
import { sfx } from '../lib/audio'

/** Parent gate: a multiplication question with a big keypad (Hebrew, RTL). */
export default function ParentGate() {
  const { go } = useApp()
  const [q] = useState(() => ({ a: 3 + Math.floor(Math.random() * 7), b: 3 + Math.floor(Math.random() * 7) }))
  const [ans, setAns] = useState('')
  const [shake, setShake] = useState(false)
  const press = (k: string) => {
    sfx.tap()
    if (k === 'ok') {
      if (Number(ans) === q.a * q.b) go({ name: 'parent' })
      else { setShake(true); setAns(''); setTimeout(() => setShake(false), 600) }
    } else if (k === 'del') setAns((a) => a.slice(0, -1))
    else if (ans.length < 3) setAns((a) => a + k)
  }
  return (
    <div className="screen" style={{ direction: 'rtl', gap: 20, background: '#eceff1' }}>
      <div style={{ fontSize: 30 }}>אזור הורים – כמה זה {q.a} × {q.b}?</div>
      <div style={{ fontSize: 56, fontWeight: 700, minHeight: 70, animation: shake ? 'shake .5s' : 'none', color: shake ? 'var(--red)' : '#333' }}>{ans || '…'}</div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 110px)', gap: 12, direction: 'ltr' }}>
        {['1', '2', '3', '4', '5', '6', '7', '8', '9', 'del', '0', 'ok'].map((k) => (
          <button key={k} className="big-btn" style={{ width: 110, height: 90, minHeight: 90, fontSize: 34, fontWeight: 700, background: k === 'ok' ? '#a5d6a7' : k === 'del' ? '#ffcdd2' : '#fff' }} onPointerDown={() => press(k)}>
            {k === 'del' ? '⌫' : k === 'ok' ? '✓' : k}
          </button>
        ))}
      </div>
      <button className="big-btn" style={{ minHeight: 70, padding: '0 30px', fontSize: 24 }} onPointerDown={() => go({ name: 'home' })}>חזרה למשחק</button>
    </div>
  )
}
