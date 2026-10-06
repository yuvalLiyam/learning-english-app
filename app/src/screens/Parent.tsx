import { useEffect, useState, useCallback } from 'react'
import { PACKS, WORD_BY_ID, AVATARS, img } from '../content'
import { db, getGlobalSettings, saveGlobalSettings, getEnabledCategories, setEnabledCategories, exportBackup, importBackup, resetProfile, deleteProfile, uid, DEFAULT_SETTINGS, type Profile, type Progress, type Settings } from '../lib/db'
import { useApp } from '../lib/state'

export default function Parent() {
  const { go, profile, setProfile, reloadSettings } = useApp()
  const [profiles, setProfiles] = useState<Profile[]>([])
  const [sel, setSel] = useState<Profile | null>(profile)
  const [progress, setProgress] = useState<Progress[]>([])
  const [cats, setCats] = useState<string[]>([])
  const [s, setS] = useState<Settings>(DEFAULT_SETTINGS)
  const [msg, setMsg] = useState('')
  const [sessions, setSessions] = useState(0)

  const load = useCallback(async () => {
    const ps = await db.profiles.orderBy('createdAt').toArray()
    setProfiles(ps)
    const cur = sel ?? ps[0] ?? null
    setSel(cur)
    setS(await getGlobalSettings())
    if (cur) {
      setProgress(await db.progress.where('profileId').equals(cur.id).toArray())
      setCats(await getEnabledCategories(cur.id))
      setSessions(await db.sessions.where('profileId').equals(cur.id).count())
    }
  }, [sel])
  useEffect(() => { load() }, [load])

  const learned = progress.filter((p) => p.learned)
  const struggling = progress.filter((p) => !p.learned && p.introduced && p.wrong >= 2 && p.wrong >= p.correct)
  const learning = progress.filter((p) => !p.learned && p.introduced && !struggling.includes(p))
  const notYet = progress.filter((p) => !p.introduced)

  const saveSettings = async (patch: Partial<Settings>) => { const n = { ...s, ...patch }; setS(n); await saveGlobalSettings(n); await reloadSettings(); flash('נשמר') }
  const flash = (t: string) => { setMsg(t); setTimeout(() => setMsg(''), 1500) }
  const toggleCat = async (id: string) => {
    if (!sel) return
    const n = cats.includes(id) ? cats.filter((c) => c !== id) : [...cats, id]
    setCats(n); await setEnabledCategories(sel.id, n); flash('נשמר')
  }
  const doExport = async () => {
    const json = await exportBackup()
    const blob = new Blob([json], { type: 'application/json' })
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = `dino-english-backup-${new Date().toISOString().slice(0, 10)}.json`; a.click()
  }
  const doImport = async (f: File | undefined) => {
    if (!f) return
    if (!confirm('ייבוא יחליף את כל הנתונים הקיימים. להמשיך?')) return
    try { await importBackup(await f.text()); setSel(null); await load(); flash('יובא בהצלחה') } catch { alert('קובץ גיבוי לא תקין') }
  }
  const rename = async () => {
    if (!sel) return
    const n = prompt('שם הילד:', sel.name); if (!n) return
    await db.profiles.put({ ...sel, name: n }); setSel({ ...sel, name: n }); load()
  }
  const addProfile = async () => {
    const n = prompt('שם הילד:'); if (!n) return
    const p: Profile = { id: uid(), name: n, avatar: AVATARS[profiles.length % AVATARS.length], createdAt: Date.now() }
    await db.profiles.put(p); setSel(p); load()
  }
  const Num = ({ label, k, step = 1000, unit = 'מ"ש' }: { label: string; k: keyof Settings; step?: number; unit?: string }) => (
    <label>{label}: <input type="number" step={step} value={s[k] as number} onChange={(e) => saveSettings({ [k]: Number(e.target.value) })} /> {unit}</label>
  )
  const pills = (list: Progress[], cls: string) => list.length ? list.map((p) => <span key={p.wordId} className={'pill ' + cls} title={`נכון ${p.correct} / שגוי ${p.wrong}`}>{WORD_BY_ID[p.wordId]?.en} ({WORD_BY_ID[p.wordId]?.he})</span>) : <span className="pill">—</span>

  return (
    <div className="screen parent">
      <div className="row" style={{ justifyContent: 'space-between' }}>
        <h1>אזור הורים</h1>
        <div className="row">{msg && <span style={{ color: 'green' }}>{msg}</span>}<button className="secondary" onClick={() => go({ name: 'home' })}>חזרה למשחק</button></div>
      </div>

      <div className="box">
        <h2>פרופיל</h2>
        <div className="row">
          {profiles.map((p) => (
            <button key={p.id} onClick={() => { setSel(p); setProfile(p) }} style={{ background: sel?.id === p.id ? 'var(--accent)' : '#bbb', display: 'flex', alignItems: 'center', gap: 8 }}>
              <img src={img(`images/avatars/${p.avatar}.png`)} alt="" style={{ width: 36 }} />{p.name}
            </button>
          ))}
          <button className="secondary" onClick={addProfile}>+ פרופיל חדש</button>
          {sel && <button className="secondary" onClick={rename}>שינוי שם</button>}
        </div>
      </div>

      {sel && (
        <div className="box">
          <h2>התקדמות – {sel.name} <small style={{ fontWeight: 400 }}>({sessions} סשנים)</small></h2>
          <p><b>נלמדו ({learned.length}):</b><br />{pills(learned, 'learned')}</p>
          <p><b>בלמידה ({learning.length}):</b><br />{pills(learning, 'learning')}</p>
          <p><b>מתקשה ({struggling.length}):</b><br />{pills(struggling, 'struggling')}</p>
          <p><b>עדיין לא הוצגו:</b> {notYet.length} מילים</p>
        </div>
      )}

      {sel && (
        <div className="box">
          <h2>קטגוריות פעילות</h2>
          <div className="row">
            {PACKS.map((p) => (
              <label key={p.id} style={{ background: '#f5f5f5', padding: '8px 12px', borderRadius: 10 }}>
                <input type="checkbox" checked={cats.includes(p.id)} onChange={() => toggleCat(p.id)} style={{ width: 24, height: 24 }} />
                {p.name_he} <small>({p.words.length})</small>
              </label>
            ))}
          </div>
        </div>
      )}

      <div className="box">
        <h2>תזמונים (כל הפרופילים)</h2>
        <div className="row" style={{ flexDirection: 'column', alignItems: 'flex-start', gap: 10 }}>
          <Num label="חזרה על ההוראה באנגלית אחרי" k="repeatEnMs" />
          <Num label="הוראה בעברית אחרי עוד" k="hebrewMs" />
          <Num label="חזרה על המילה כל" k="wordRepeatMs" />
          <Num label="מילים חדשות בכל סשן" k="newWordsPerSession" step={1} unit="" />
          <Num label="סבבים בסשן" k="roundsPerSession" step={1} unit="" />
          <Num label="ימים שונים עם תשובה נכונה כדי להיחשב 'נלמדה'" k="learnedDays" step={1} unit="" />
          <label>אחוז מילים שנלמדו שחוזרות לבדיקה: <input type="number" step={5} min={0} max={50} value={Math.round(s.reviewRatio * 100)} onChange={(e) => saveSettings({ reviewRatio: Number(e.target.value) / 100 })} /> %</label>
        </div>
      </div>

      <div className="box">
        <h2>גיבוי</h2>
        <div className="row">
          <button onClick={doExport}>ייצוא גיבוי (JSON)</button>
          <label style={{ background: 'var(--blue)', color: '#fff', padding: '14px 22px', borderRadius: 14, cursor: 'pointer' }}>ייבוא גיבוי
            <input type="file" accept="application/json" style={{ display: 'none' }} onChange={(e) => doImport(e.target.files?.[0])} /></label>
        </div>
      </div>

      {sel && (
        <div className="box">
          <h2>איפוס</h2>
          <div className="row">
            <button className="danger" onClick={async () => { if (confirm(`לאפס את כל ההתקדמות של ${sel.name}?`)) { await resetProfile(sel.id); load(); flash('אופס') } }}>איפוס התקדמות</button>
            <button className="danger" onClick={async () => { if (confirm(`למחוק את הפרופיל ${sel.name} לגמרי?`)) { await deleteProfile(sel.id); setSel(null); if (profile?.id === sel.id) setProfile(null); load() } }}>מחיקת פרופיל</button>
          </div>
        </div>
      )}
      <div style={{ fontSize: 14, color: '#777' }}>תמונות: OpenMoji (CC BY-SA 4.0) ותמונות חופשיות מ-Wikimedia Commons – ראו CREDITS.md</div>
    </div>
  )
}
