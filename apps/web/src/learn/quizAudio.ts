/**
 * Offline sound synthesizer for Quiz using Web Audio API.
 * Requires 0 external audio files, runs 100% offline, zero latency.
 */

let sharedCtx: AudioContext | null = null

function getAudioCtx(): AudioContext | null {
  if (typeof window === 'undefined') return null
  const CtxClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext
  if (!CtxClass) return null
  if (!sharedCtx || sharedCtx.state === 'closed') {
    sharedCtx = new CtxClass()
  }
  if (sharedCtx.state === 'suspended') {
    sharedCtx.resume().catch(() => {})
  }
  return sharedCtx
}

export type QuizSoundType = 'correct' | 'wrong' | 'streak' | 'mystery' | 'lifeline' | 'complete'

export function playQuizSound(type: QuizSoundType, isMuted = false): void {
  if (isMuted) return
  const ctx = getAudioCtx()
  if (!ctx) return

  const now = ctx.currentTime

  switch (type) {
    case 'correct': {
      // Pleasant bright two-tone chime: C5 (523Hz) -> G5 (784Hz)
      const freqs = [523.25, 783.99]
      freqs.forEach((f, idx) => {
        const osc = ctx.createOscillator()
        const gain = ctx.createGain()
        osc.type = 'sine'
        osc.frequency.setValueAtTime(f, now + idx * 0.1)

        gain.gain.setValueAtTime(0, now + idx * 0.1)
        gain.gain.linearRampToValueAtTime(0.2, now + idx * 0.1 + 0.02)
        gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.1 + 0.35)

        osc.connect(gain)
        gain.connect(ctx.destination)
        osc.start(now + idx * 0.1)
        osc.stop(now + idx * 0.1 + 0.35)
      })
      break
    }
    case 'wrong': {
      // Soft informative low tone: D3 (146Hz) -> C3 (130Hz)
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()
      osc.type = 'triangle'
      osc.frequency.setValueAtTime(146.83, now)
      osc.frequency.exponentialRampToValueAtTime(130.81, now + 0.25)

      gain.gain.setValueAtTime(0.18, now)
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.3)

      osc.connect(gain)
      gain.connect(ctx.destination)
      osc.start(now)
      osc.stop(now + 0.3)
      break
    }
    case 'streak': {
      // Ascending triumphant fanfare: C5 -> E5 -> G5 -> C6
      const freqs = [523.25, 659.25, 783.99, 1046.5]
      freqs.forEach((f, idx) => {
        const osc = ctx.createOscillator()
        const gain = ctx.createGain()
        osc.type = 'sine'
        osc.frequency.setValueAtTime(f, now + idx * 0.08)

        gain.gain.setValueAtTime(0, now + idx * 0.08)
        gain.gain.linearRampToValueAtTime(0.22, now + idx * 0.08 + 0.02)
        gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.08 + 0.4)

        osc.connect(gain)
        gain.connect(ctx.destination)
        osc.start(now + idx * 0.08)
        osc.stop(now + idx * 0.08 + 0.4)
      })
      break
    }
    case 'mystery': {
      // Shimmering twinkle: rapidly ascending sparkling notes
      const freqs = [659.25, 880, 1046.5, 1318.5, 1567.98]
      freqs.forEach((f, idx) => {
        const osc = ctx.createOscillator()
        const gain = ctx.createGain()
        osc.type = 'triangle'
        osc.frequency.setValueAtTime(f, now + idx * 0.06)

        gain.gain.setValueAtTime(0, now + idx * 0.06)
        gain.gain.linearRampToValueAtTime(0.15, now + idx * 0.06 + 0.015)
        gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.06 + 0.3)

        osc.connect(gain)
        gain.connect(ctx.destination)
        osc.start(now + idx * 0.06)
        osc.stop(now + idx * 0.06 + 0.3)
      })
      break
    }
    case 'lifeline': {
      // Futuristic swoosh
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()
      osc.type = 'sine'
      osc.frequency.setValueAtTime(300, now)
      osc.frequency.exponentialRampToValueAtTime(900, now + 0.2)

      gain.gain.setValueAtTime(0.15, now)
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.25)

      osc.connect(gain)
      gain.connect(ctx.destination)
      osc.start(now)
      osc.stop(now + 0.25)
      break
    }
    case 'complete': {
      // Grand celebratory chords
      const chord1 = [523.25, 659.25, 783.99] // C major
      const chord2 = [587.33, 739.99, 880.0] // D major
      const chord3 = [523.25, 659.25, 783.99, 1046.5] // C major oct

      const playChord = (notes: number[], offset: number, dur: number) => {
        notes.forEach((f) => {
          const osc = ctx.createOscillator()
          const gain = ctx.createGain()
          osc.type = 'sine'
          osc.frequency.setValueAtTime(f, now + offset)
          gain.gain.setValueAtTime(0, now + offset)
          gain.gain.linearRampToValueAtTime(0.16, now + offset + 0.03)
          gain.gain.exponentialRampToValueAtTime(0.001, now + offset + dur)
          osc.connect(gain)
          gain.connect(ctx.destination)
          osc.start(now + offset)
          osc.stop(now + offset + dur)
        })
      }

      playChord(chord1, 0, 0.35)
      playChord(chord2, 0.25, 0.35)
      playChord(chord3, 0.55, 0.9)
      break
    }
  }
}
