import type { Lang } from '../shell/i18n'
import type { Rate } from './audio'
import { pick } from './content'
import type { VideoScene } from './videoTypes'

/** Web Audio context singleton for smooth offline sound generation. */
let sharedAudioCtx: AudioContext | null = null

function getAudioContext(): AudioContext | null {
  if (typeof window === 'undefined') return null
  const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext
  if (!AudioCtx) return null
  if (!sharedAudioCtx || sharedAudioCtx.state === 'closed') {
    sharedAudioCtx = new AudioCtx()
  }
  if (sharedAudioCtx.state === 'suspended') {
    sharedAudioCtx.resume().catch(() => {})
  }
  return sharedAudioCtx
}

/** Synthesizes rich melodic chimes for video scene transitions (works 100% offline). */
export function playSceneSound(
  kind: 'intro' | 'scenario' | 'signs' | 'todo',
  customCtx?: AudioContext,
  destination?: AudioNode
): void {
  const ctx = customCtx ?? getAudioContext()
  if (!ctx) return

  const out = destination ?? ctx.destination
  const now = ctx.currentTime

  if (kind === 'intro') {
    // Gentle uplifting chime: C5 (523Hz) -> E5 (659Hz) -> G5 (784Hz)
    const freqs = [523.25, 659.25, 783.99]
    freqs.forEach((freq, i) => {
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()
      osc.type = 'sine'
      osc.frequency.setValueAtTime(freq, now + i * 0.12)

      gain.gain.setValueAtTime(0, now + i * 0.12)
      gain.gain.linearRampToValueAtTime(0.18, now + i * 0.12 + 0.03)
      gain.gain.exponentialRampToValueAtTime(0.0001, now + i * 0.12 + 0.7)

      osc.connect(gain)
      gain.connect(out)

      osc.start(now + i * 0.12)
      osc.stop(now + i * 0.12 + 0.7)
    })
  } else if (kind === 'scenario' || kind === 'signs') {
    // Attention warning two-tone: A4 (440Hz) -> F4 (349Hz)
    const freqs = [440, 349.23]
    freqs.forEach((freq, i) => {
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()
      osc.type = 'triangle'
      osc.frequency.setValueAtTime(freq, now + i * 0.16)

      gain.gain.setValueAtTime(0, now + i * 0.16)
      gain.gain.linearRampToValueAtTime(0.15, now + i * 0.16 + 0.02)
      gain.gain.exponentialRampToValueAtTime(0.0001, now + i * 0.16 + 0.5)

      osc.connect(gain)
      gain.connect(out)

      osc.start(now + i * 0.16)
      osc.stop(now + i * 0.16 + 0.5)
    })
  } else if (kind === 'todo') {
    // Reassuring success resolution: C5 (523Hz) -> G5 (784Hz) -> C6 (1046Hz)
    const freqs = [523.25, 783.99, 1046.5]
    freqs.forEach((freq, i) => {
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()
      osc.type = 'sine'
      osc.frequency.setValueAtTime(freq, now + i * 0.14)

      gain.gain.setValueAtTime(0, now + i * 0.14)
      gain.gain.linearRampToValueAtTime(0.2, now + i * 0.14 + 0.03)
      gain.gain.exponentialRampToValueAtTime(0.0001, now + i * 0.14 + 0.9)

      osc.connect(gain)
      gain.connect(out)

      osc.start(now + i * 0.14)
      osc.stop(now + i * 0.14 + 0.9)
    })
  }
}

/** Picks the best SpeechSynthesis voice matching the app language. */
export function getBestVoice(lang: Lang): SpeechSynthesisVoice | null {
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) return null
  const voices = window.speechSynthesis.getVoices()
  if (!voices || voices.length === 0) return null

  const langTag = lang === 'hi' ? 'hi' : lang === 'cg' ? 'hne' : 'en'
  // 1. Exact or regional match
  const match = voices.find((v) => {
    const l = v.lang.toLowerCase().replace('_', '-')
    return l === langTag || l.startsWith(`${langTag}-`)
  })
  if (match) return match

  // 2. Chhattisgarhi fallback to Hindi if no hne voice
  if (lang === 'cg') {
    const hiVoice = voices.find((v) => v.lang.toLowerCase().startsWith('hi'))
    if (hiVoice) return hiVoice
  }

  // 3. Indian English fallback for English
  if (lang === 'en') {
    const enIn = voices.find((v) => v.lang.toLowerCase().includes('en-in'))
    if (enIn) return enIn
    const enAny = voices.find((v) => v.lang.toLowerCase().startsWith('en'))
    if (enAny) return enAny
  }

  return voices[0] ?? null
}

/** Speaks the scene narration in the selected language. Returns a cancel handle. */
export function narrateScene(
  scene: VideoScene,
  lang: Lang,
  rate: Rate,
  onStart?: () => void,
  onEnd?: () => void
): () => void {
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
    onStart?.()
    const timer = setTimeout(() => onEnd?.(), scene.durationSec * 1000)
    return () => clearTimeout(timer)
  }

  window.speechSynthesis.cancel()

  const textToSpeak = pick(scene.narration, lang)
  if (!textToSpeak) {
    onEnd?.()
    return () => {}
  }

  const utterance = new SpeechSynthesisUtterance(textToSpeak)
  utterance.rate = rate
  utterance.pitch = 1.0

  const voice = getBestVoice(lang)
  if (voice) {
    utterance.voice = voice
    utterance.lang = voice.lang
  } else {
    utterance.lang = lang === 'hi' ? 'hi-IN' : lang === 'cg' ? 'hi-IN' : 'en-IN'
  }

  let ended = false
  utterance.onstart = () => onStart?.()
  utterance.onend = () => {
    if (!ended) {
      ended = true
      onEnd?.()
    }
  }
  utterance.onerror = () => {
    if (!ended) {
      ended = true
      onEnd?.()
    }
  }

  window.speechSynthesis.speak(utterance)

  return () => {
    ended = true
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel()
    }
  }
}
