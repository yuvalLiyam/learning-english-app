/** Web Speech API wrapper – forgiving matching for kids' pronunciation. */
interface SRAlt { transcript: string }
interface SRResultEvent { results: ArrayLike<ArrayLike<SRAlt>> }
interface SRInstance {
  lang: string; interimResults: boolean; maxAlternatives: number
  onresult: ((e: SRResultEvent) => void) | null; onerror: ((e: { error: string }) => void) | null; onend: (() => void) | null
  start(): void; stop(): void
}
type SR = new () => SRInstance
const getSR = (): SR | undefined => {
  const w = window as unknown as { SpeechRecognition?: SR; webkitSpeechRecognition?: SR }
  return w.SpeechRecognition ?? w.webkitSpeechRecognition
}

export const speechSupported = () => !!getSR() && navigator.onLine

export type ListenResult = { status: 'match' | 'nomatch' | 'nospeech' | 'error'; heard: string }

export function listen(timeoutMs = 6000): Promise<{ heard: string; alts: string[]; error?: string }> {
  return new Promise((resolve) => {
    const SRc = getSR()
    if (!SRc) return resolve({ heard: '', alts: [], error: 'unsupported' })
    const r = new SRc()
    r.lang = 'en-US'
    r.interimResults = false
    r.maxAlternatives = 5
    let settled = false
    const finish = (v: { heard: string; alts: string[]; error?: string }) => { if (!settled) { settled = true; try { r.stop() } catch { /* noop */ } resolve(v) } }
    const timer = setTimeout(() => finish({ heard: '', alts: [], error: 'no-speech' }), timeoutMs)
    r.onresult = (e) => {
      clearTimeout(timer)
      const alts: string[] = []
      for (let i = 0; i < e.results[0].length; i++) alts.push(e.results[0][i].transcript)
      finish({ heard: alts[0] ?? '', alts })
    }
    r.onerror = (e) => { clearTimeout(timer); finish({ heard: '', alts: [], error: e.error }) }
    r.onend = () => { clearTimeout(timer); finish({ heard: '', alts: [], error: 'no-speech' }) }
    try { r.start() } catch { finish({ heard: '', alts: [], error: 'start-failed' }) }
  })
}

const norm = (s: string) => s.toLowerCase().replace(/[^a-z ]/g, '').replace(/\s+/g, ' ').trim()
function lev(a: string, b: string) {
  const m = a.length, n = b.length
  const d = Array.from({ length: m + 1 }, (_, i) => [i, ...Array(n).fill(0)])
  for (let j = 1; j <= n; j++) d[0][j] = j
  for (let i = 1; i <= m; i++) for (let j = 1; j <= n; j++)
    d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1))
  return d[m][n]
}
/** squash letters that kids commonly confuse so "wabbit" ≈ "rabbit", "fis" ≈ "fish" */
const squash = (s: string) => s.replace(/w/g, 'r').replace(/sh|ch|th/g, 's').replace(/ph|f|v/g, 'f').replace(/(.)\1+/g, '$1').replace(/[aeiou]/g, '')

export function matches(target: string, alts: string[]): boolean {
  const t = norm(target)
  const ts = squash(t)
  const tol = t.length <= 4 ? 1 : t.length <= 7 ? 2 : 3
  for (const raw of alts) {
    const h = norm(raw)
    if (!h) continue
    if (h === t || h.includes(t) || t.includes(h) && h.length >= 3) return true
    for (const word of h.split(' ')) {
      if (lev(word, t) <= tol) return true
      if (squash(word) === ts) return true
    }
    if (lev(h, t) <= tol) return true
  }
  return false
}
