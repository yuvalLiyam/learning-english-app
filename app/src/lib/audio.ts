/**
 * Audio engine: Web Audio API with decoded-buffer cache.
 * - unlock() must be called from a user gesture (iOS Safari).
 * - play() resolves when the clip finishes; stop() cancels everything in flight.
 * - Short sound effects are synthesized (no files needed).
 */
import { BASE } from '../content'

let ctx: AudioContext | null = null
const cache = new Map<string, Promise<AudioBuffer>>()
let playing: AudioBufferSourceNode[] = []
let seqToken = 0

function getCtx(): AudioContext {
  if (!ctx) {
    const AC = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext
    ctx = new AC()
  }
  return ctx
}

export async function unlock(): Promise<void> {
  const c = getCtx()
  if (c.state === 'suspended') await c.resume().catch(() => {})
  // play a silent buffer – required on iOS to fully unlock
  const buf = c.createBuffer(1, 1, 22050)
  const src = c.createBufferSource()
  src.buffer = buf
  src.connect(c.destination)
  src.start(0)
}

function load(path: string): Promise<AudioBuffer> {
  let p = cache.get(path)
  if (!p) {
    p = fetch(BASE + path)
      .then((r) => {
        if (!r.ok) throw new Error('audio 404 ' + path)
        return r.arrayBuffer()
      })
      .then((ab) => new Promise<AudioBuffer>((res, rej) => getCtx().decodeAudioData(ab, res, rej)))
    cache.set(path, p)
    p.catch(() => cache.delete(path))
  }
  return p
}

export function preload(paths: string[]) {
  for (const p of paths) load(p).catch(() => {})
}

export function stop() {
  seqToken++
  for (const s of playing) {
    try { s.stop() } catch { /* already stopped */ }
  }
  playing = []
}

/** Play one clip. Resolves when done (or immediately on error, so games never hang). */
export function play(path: string, opts: { volume?: number } = {}): Promise<void> {
  const token = seqToken
  return load(path)
    .then((buf) => new Promise<void>((resolve) => {
      if (token !== seqToken) return resolve()
      const c = getCtx()
      const src = c.createBufferSource()
      src.buffer = buf
      const gain = c.createGain()
      gain.gain.value = opts.volume ?? 1
      src.connect(gain).connect(c.destination)
      let done = false
      const finish = () => { if (done) return; done = true; playing = playing.filter((x) => x !== src); resolve() }
      src.onended = finish
      // safety net: if the context is suspended (audio not unlocked) onended never fires – never hang the game
      setTimeout(finish, buf.duration * 1000 + 600)
      playing.push(src)
      if (import.meta.env.DEV) { const w = window as unknown as { __plays?: string[] }; (w.__plays ??= []).push(path) }
      src.start(0)
    }))
    .catch((e) => { console.warn(e); })
}

/** Play clips one after another, with optional pause (ms) between. Stops if stop() was called. */
export async function playSeq(paths: string[], gapMs = 250): Promise<void> {
  const token = ++seqToken
  for (let i = 0; i < paths.length; i++) {
    if (token !== seqToken) return
    await play(paths[i])
    if (i < paths.length - 1) await wait(gapMs)
  }
}

export const wait = (ms: number) => new Promise<void>((r) => setTimeout(r, ms))

/* ---------- synthesized sound effects ---------- */
function tone(freq: number, start: number, dur: number, type: OscillatorType = 'sine', vol = 0.25) {
  const c = getCtx()
  const o = c.createOscillator()
  const g = c.createGain()
  o.type = type
  o.frequency.setValueAtTime(freq, c.currentTime + start)
  g.gain.setValueAtTime(0.0001, c.currentTime + start)
  g.gain.exponentialRampToValueAtTime(vol, c.currentTime + start + 0.02)
  g.gain.exponentialRampToValueAtTime(0.0001, c.currentTime + start + dur)
  o.connect(g).connect(c.destination)
  o.start(c.currentTime + start)
  o.stop(c.currentTime + start + dur + 0.05)
}
export const sfx = {
  happy() { tone(523, 0, 0.15); tone(659, 0.12, 0.15); tone(784, 0.24, 0.15); tone(1047, 0.36, 0.35) },
  oops() { tone(300, 0, 0.18, 'triangle'); tone(220, 0.18, 0.3, 'triangle') },
  pop() { tone(900, 0, 0.08, 'square', 0.12); tone(600, 0.04, 0.1, 'square', 0.12) },
  flip() { tone(700, 0, 0.06, 'triangle', 0.15) },
  tap() { tone(500, 0, 0.05, 'sine', 0.12) },
  sticker() { for (let i = 0; i < 6; i++) tone(523 + i * 110, i * 0.08, 0.25) },
  grow() { tone(392, 0, 0.2); tone(523, 0.2, 0.2); tone(659, 0.4, 0.2); tone(784, 0.6, 0.5) },
}
