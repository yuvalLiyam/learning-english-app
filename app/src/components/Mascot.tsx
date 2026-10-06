/** Original baby-dino mascot ("Dino"). Grows and gets accessories with level 0..5. */
export type Mood = 'idle' | 'happy' | 'sad' | 'talk' | 'sleep'

export default function Mascot({ mood = 'idle', level = 0, size = 220, onClick }: { mood?: Mood; level?: number; size?: number; onClick?: () => void }) {
  const scale = 1 + level * 0.06
  const body = '#7ed957', belly = '#d9f7c4', dark = '#4caf50', spots = '#5cbf3c'
  const eyeOpen = mood !== 'sleep'
  const mouth = mood === 'happy' ? 'M70 118 q20 22 40 0' : mood === 'sad' ? 'M72 128 q18 -16 36 0' : mood === 'talk' ? 'M78 118 q12 16 24 0 q-12 8 -24 0' : 'M74 120 q16 12 32 0'
  const anim = mood === 'happy' ? 'bounce 0.6s infinite' : mood === 'sad' ? 'wiggle 0.5s 3' : mood === 'talk' ? 'wiggle 0.4s infinite' : 'bounce 2.4s ease-in-out infinite'
  return (
    <svg width={size * scale} height={size * scale} viewBox="0 0 180 200" onClick={onClick}
      style={{ animation: anim, cursor: onClick ? 'pointer' : 'default', overflow: 'visible', pointerEvents: onClick ? 'auto' : 'none' }}>
      {/* tail */}
      <path d="M40 150 q-40 10 -30 -30 q10 20 32 12z" fill={body} stroke={dark} strokeWidth="3" />
      {/* legs */}
      <ellipse cx="60" cy="178" rx="18" ry="14" fill={body} stroke={dark} strokeWidth="3" />
      <ellipse cx="118" cy="178" rx="18" ry="14" fill={body} stroke={dark} strokeWidth="3" />
      {/* body */}
      <ellipse cx="90" cy="135" rx="52" ry="48" fill={body} stroke={dark} strokeWidth="3" />
      <ellipse cx="90" cy="145" rx="30" ry="30" fill={belly} />
      {/* arms */}
      <ellipse cx="46" cy="130" rx="11" ry="18" fill={body} stroke={dark} strokeWidth="3" transform="rotate(20 46 130)" />
      <ellipse cx="134" cy="130" rx="11" ry="18" fill={body} stroke={dark} strokeWidth="3" transform="rotate(-20 134 130)" />
      {/* head */}
      <circle cx="90" cy="80" r="52" fill={body} stroke={dark} strokeWidth="3" />
      <circle cx="58" cy="60" r="6" fill={spots} /><circle cx="122" cy="52" r="5" fill={spots} /><circle cx="112" cy="40" r="3" fill={spots} />
      {/* back spikes */}
      <path d="M62 40 l8 -16 l6 14z M78 32 l6 -18 l8 16z M96 30 l6 -18 l8 16z M114 36 l8 -14 l6 14z" fill="#ffd54f" stroke={dark} strokeWidth="2" />
      {/* eyes */}
      {eyeOpen ? (<>
        <circle cx="72" cy="80" r="12" fill="#fff" /><circle cx="108" cy="80" r="12" fill="#fff" />
        <circle cx={mood === 'sad' ? 74 : 75} cy="82" r="6" fill="#222" /><circle cx={mood === 'sad' ? 106 : 111} cy="82" r="6" fill="#222" />
        <circle cx="77" cy="79" r="2" fill="#fff" /><circle cx="113" cy="79" r="2" fill="#fff" />
      </>) : (<>
        <path d="M62 82 q10 8 20 0" stroke="#222" strokeWidth="3" fill="none" /><path d="M98 82 q10 8 20 0" stroke="#222" strokeWidth="3" fill="none" />
      </>)}
      {mood === 'sad' && <ellipse cx="66" cy="96" rx="3" ry="5" fill="#64b5f6" />}
      {mood === 'happy' && (<><circle cx="60" cy="98" r="6" fill="#ff8a80" opacity=".7" /><circle cx="120" cy="98" r="6" fill="#ff8a80" opacity=".7" /></>)}
      {/* mouth + nostrils */}
      <path d={mouth} stroke="#222" strokeWidth="3" fill={mood === 'happy' ? '#e57373' : 'none'} strokeLinecap="round" />
      <circle cx="84" cy="104" r="2" fill="#222" /><circle cx="96" cy="104" r="2" fill="#222" />
      {/* accessories by level */}
      {level >= 1 && <g><path d="M118 30 l24 -14 l-4 22z" fill="#ff5252" /><path d="M118 30 l-20 -16 l24 -2z" fill="#ff5252" /><circle cx="118" cy="30" r="5" fill="#d32f2f" /></g>}
      {level >= 2 && <path d="M42 118 q48 24 96 0 l0 14 q-48 22 -96 0z" fill="#42a5f5" stroke="#1e88e5" strokeWidth="2" />}
      {level >= 3 && <g fill="none" stroke="#333" strokeWidth="3"><circle cx="72" cy="80" r="16" /><circle cx="108" cy="80" r="16" /><path d="M88 80 h4" /></g>}
      {level >= 4 && <path d="M60 36 l10 -22 l12 14 l8 -20 l8 20 l12 -14 l10 22z" fill="#ffd600" stroke="#f9a825" strokeWidth="2" />}
      {level >= 5 && <path d="M46 120 q-30 40 -10 70 l20 -30 q-10 -20 0 -36z" fill="#ab47bc" stroke="#8e24aa" strokeWidth="2" />}
    </svg>
  )
}
