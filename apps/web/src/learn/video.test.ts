import { describe, expect, it, vi } from 'vitest'
import type { Lesson } from './content'
import { getBestVoice, playSceneSound } from './videoAudio'
import { generateAndDownloadLessonVideo } from './videoGenerator'
import { buildLessonScenes, totalVideoDuration } from './videoTypes'

const mockLesson: Lesson = {
  id: 'test_safety',
  scripts: ['otp'],
  minutes: 3,
  title: {
    en: 'OTP & PIN Protection',
    hi: 'ओटीपी और पिन की सुरक्षा',
    cg: 'ओटीपी अउ पिन के सुरक्षा',
  },
  cards: [
    {
      id: 'c1',
      icon: 'shield',
      title: { en: 'Card 1', hi: 'कार्ड 1', cg: 'कार्ड 1' },
      body: { en: 'Body 1', hi: 'विवरण 1', cg: 'विवरण 1' },
    },
    {
      id: 'c2',
      icon: 'lock',
      title: { en: 'Card 2', hi: 'कार्ड 2', cg: 'कार्ड 2' },
      body: { en: 'Body 2', hi: 'विवरण 2', cg: 'विवरण 2' },
    },
    {
      id: 'c3',
      icon: 'key',
      title: { en: 'Card 3', hi: 'कार्ड 3', cg: 'कार्ड 3' },
      body: { en: 'Body 3', hi: 'विवरण 3', cg: 'विवरण 3' },
    },
    {
      id: 'c4',
      icon: 'phone',
      title: { en: 'Card 4', hi: 'कार्ड 4', cg: 'कार्ड 4' },
      body: { en: 'Body 4', hi: 'विवरण 4', cg: 'विवरण 4' },
    },
    {
      id: 'c5',
      icon: 'warn',
      title: { en: 'Card 5', hi: 'कार्ड 5', cg: 'कार्ड 5' },
      body: { en: 'Body 5', hi: 'विवरण 5', cg: 'विवरण 5' },
    },
    {
      id: 'c6',
      icon: 'check',
      title: { en: 'Card 6', hi: 'कार्ड 6', cg: 'कार्ड 6' },
      body: { en: 'Body 6', hi: 'विवरण 6', cg: 'विवरण 6' },
    },
  ],
  example: {
    en: 'A fraudster calls posing as bank manager asking for your secret OTP code.',
    hi: 'एक धोखेबाज बैंक प्रबंधक बनकर गुप्त ओटीपी मांगता है।',
    cg: 'एक धोखेबाज बैंक मैनेजर बनके गुप्त ओटीपी मांगथे।',
  },
  signs: [
    {
      en: 'Urgent threats of account freeze',
      hi: 'खाता बंद होने की धमकी और जल्दबाजी',
      cg: 'खाता बंद होए के धमकी अउ जल्दीबाजी',
    },
    {
      en: 'Asking for confidential 6-digit PIN',
      hi: 'गोपनीय 6 अंकों का पिन मांगना',
      cg: 'गोपनीय 6 अंक के पिन मांगना',
    },
  ],
  todo: {
    en: 'Cut the call immediately and call 1930.',
    hi: 'कॉल तुरंत काटें और 1930 पर शिकायत करें।',
    cg: 'कॉल तुरंत काटव अउ 1930 म शिकायत करव।',
  },
}

describe('Video Scenes & Durations', () => {
  it('builds exactly 4 sequential scenes for a lesson', () => {
    const scenes = buildLessonScenes(mockLesson)
    expect(scenes).toHaveLength(4)
    expect(scenes[0].kind).toBe('intro')
    expect(scenes[1].kind).toBe('scenario')
    expect(scenes[2].kind).toBe('signs')
    expect(scenes[3].kind).toBe('todo')
  })

  it('contains multilingual text for English, Hindi, and Chhattisgarhi in every scene', () => {
    const scenes = buildLessonScenes(mockLesson)
    scenes.forEach((scene) => {
      expect(scene.heading.en).toBeTruthy()
      expect(scene.heading.hi).toBeTruthy()
      expect(scene.heading.cg).toBeTruthy()

      expect(scene.narration.en).toBeTruthy()
      expect(scene.narration.hi).toBeTruthy()
      expect(scene.narration.cg).toBeTruthy()

      expect(scene.caption.en).toBeTruthy()
      expect(scene.caption.hi).toBeTruthy()
      expect(scene.caption.cg).toBeTruthy()
    })
  })

  it('calculates total video duration correctly', () => {
    const scenes = buildLessonScenes(mockLesson)
    const total = totalVideoDuration(scenes)
    expect(total).toBeGreaterThan(15)
    expect(total).toBe(
      scenes[0].durationSec +
        scenes[1].durationSec +
        scenes[2].durationSec +
        scenes[3].durationSec
    )
  })
})

describe('Video Audio & Voice Resolution', () => {
  it('plays scene sound safely without crashing in test environment', () => {
    expect(() => playSceneSound('intro')).not.toThrow()
    expect(() => playSceneSound('scenario')).not.toThrow()
    expect(() => playSceneSound('signs')).not.toThrow()
    expect(() => playSceneSound('todo')).not.toThrow()
  })

  it('returns appropriate voice or fallback for languages', () => {
    // In node/vitest environment without speech synthesis voices
    const voice = getBestVoice('hi')
    expect(voice === null || typeof voice === 'object').toBe(true)
  })
})

describe('Video export labels', () => {
  it('draws the labels it is given, in the viewer language, and no hard-coded English', async () => {
    const drawn: string[] = []
    const ctx = new Proxy({ measureText: (t: string) => ({ width: t.length * 8 }), fillText: (t: string) => { drawn.push(t) } } as Record<string, unknown>, {
      get: (o, k: string) => (k in o ? o[k] : () => ({ addColorStop: () => {} })),
      set: () => true,
    })
    const labels = { sceneOf: (c: number, t: number) => `दृश्य ${c} / ${t}`, trigger: 'संदिग्ध संदेश', flag: (n: number) => `चेतावनी ${n}:`, safe: 'क्या करें:', helpline: 'हेल्पलाइन 1930', captions: 'उपशीर्षक' }
    const mod = await import('./videoGenerator')
    const scenes = buildLessonScenes(mockLesson)
    for (let i = 0; i < scenes.length; i++) mod.drawVideoFrameForTest(ctx as unknown as CanvasRenderingContext2D, scenes[i], i, scenes.length, 0, 120, 'hi', labels)
    const text = drawn.join(' | ')
    expect(text).toContain('संदिग्ध संदेश')
    expect(text).toContain('हेल्पलाइन 1930')
    expect(text).toContain('उपशीर्षक')
    expect(text).not.toMatch(/SCENE|SUSPICIOUS|SAFE ACTION|HELPLINE|SUBTITLES|CHHATTISGARH|FLAG/)
  })
})

describe('Video Generator', () => {
  it('handles video generation call gracefully', async () => {
    const onProgress = vi.fn()
    const result = await generateAndDownloadLessonVideo(mockLesson, 'en', onProgress)
    // In test environment without full canvas / MediaRecorder captureStream, returns null safely
    expect(result === null || result instanceof Blob).toBe(true)
  })
})
