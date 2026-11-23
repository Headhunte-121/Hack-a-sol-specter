import type { Lang } from '../shell/i18n'
import { pick, type Lesson, type Tri } from './content'

export type SceneKind = 'intro' | 'scenario' | 'signs' | 'todo'

export interface VideoScene {
  id: string
  kind: SceneKind
  sceneNumber: number
  totalScenes: number
  heading: Tri
  subheading: Tri
  narration: Tri
  caption: Tri
  details: Tri[]
  accentColor: string
  icon: string
  durationSec: number
}

/** Builds rich, synchronized animated video scenes from any lesson. */
export function buildLessonScenes(lesson: Lesson): VideoScene[] {
  const totalScenes = 4

  const introScene: VideoScene = {
    id: `${lesson.id}-intro`,
    kind: 'intro',
    sceneNumber: 1,
    totalScenes,
    heading: lesson.title,
    subheading: {
      en: 'Cyber Safety & Fraud Prevention',
      hi: 'साइबर सुरक्षा और धोखाधड़ी से बचाव',
      cg: 'साइबर सुरक्षा अउ धोखाधड़ी ले बचाव',
    },
    narration: {
      en: `${lesson.title.en}. Learn how to spot this scam and protect your hard-earned money.`,
      hi: `${lesson.title.hi}। जानें कि इस धोखाधड़ी को कैसे पहचानें और अपने पैसों की रक्षा करें।`,
      cg: `${lesson.title.cg}। जानव कि ए धोखाधड़ी ला कइसे पहचानव अउ अपन पइसा ला बचावहू।`,
    },
    caption: {
      en: 'Watch and learn how to protect yourself',
      hi: 'देखें और समझें कि खुद को कैसे सुरक्षित रखें',
      cg: 'देखव अउ समझव कि खुद ला कइसे सुरक्षित राखव',
    },
    details: [
      {
        en: 'Never share OTP, PIN or CVV with anyone',
        hi: 'ओटीपी, पिन या सीवीवी कभी किसी को न बताएं',
        cg: 'ओटीपी, पिन या सीवीवी कखरो ला झन बतावहू',
      },
      {
        en: 'A bank never asks for your password or codes',
        hi: 'बैंक कभी आपका पासवर्ड या कोड नहीं मांगता',
        cg: 'बैंक कभू तुंहर पासवर्ड या कोड नइ मांगय',
      },
    ],
    accentColor: '#1747c4',
    icon: 'shield',
    durationSec: 5,
  }

  const scenarioScene: VideoScene = {
    id: `${lesson.id}-scenario`,
    kind: 'scenario',
    sceneNumber: 2,
    totalScenes,
    heading: {
      en: 'How the Scam Happens',
      hi: 'धोखाधड़ी का तरीका',
      cg: 'धोखाधड़ी के तरीका',
    },
    subheading: {
      en: 'Real-Life Incident Simulation',
      hi: 'वास्तविक घटना का उदाहरण',
      cg: 'असली घटना के उदाहरण',
    },
    narration: lesson.example,
    caption: lesson.example,
    details: [lesson.example],
    accentColor: '#d9381e',
    icon: 'phone',
    durationSec: 7,
  }

  const signsScene: VideoScene = {
    id: `${lesson.id}-signs`,
    kind: 'signs',
    sceneNumber: 3,
    totalScenes,
    heading: {
      en: 'Warning Signs (Red Flags)',
      hi: 'चेतावनी संकेत',
      cg: 'चेतावनी संकेत',
    },
    subheading: {
      en: 'Stop immediately if you notice these',
      hi: 'यदि ये संकेत दिखें तो तुरंत रुकें',
      cg: 'अगर ए संकेत दिखय त तुरंत रुकव',
    },
    narration: {
      en: `Warning signs to remember: ${lesson.signs.map((s) => s.en).join('. ')}.`,
      hi: `ध्यान देने योग्य चेतावनी संकेत: ${lesson.signs.map((s) => s.hi).join('। ')}।`,
      cg: `सुरक्षा बर चेतावनी संकेत: ${lesson.signs.map((s) => s.cg).join('। ')}।`,
    },
    caption: {
      en: 'Recognize the scammer\'s tricks',
      hi: 'धोखेबाजों की चालाकियों को पहचानें',
      cg: 'धोखेबाज मन के चालाकी ला पहचानव',
    },
    details: lesson.signs,
    accentColor: '#e65100',
    icon: 'warn',
    durationSec: 7,
  }

  const todoScene: VideoScene = {
    id: `${lesson.id}-todo`,
    kind: 'todo',
    sceneNumber: 4,
    totalScenes,
    heading: {
      en: 'The Golden Safety Rule',
      hi: 'सुरक्षा का पक्का नियम',
      cg: 'सुरक्षा के पक्का नियम',
    },
    subheading: {
      en: 'Action you must take immediately',
      hi: 'तुरंत करने योग्य सुरक्षित कदम',
      cg: 'तुरंत करे बर सुरक्षित कदम',
    },
    narration: {
      en: `${lesson.todo.en}. In case of fraud, dial 1930 cyber helpline immediately.`,
      hi: `${lesson.todo.hi}। यदि धोखाधड़ी हो जाए, तो तुरंत 1930 साइबर हेल्पलाइन पर फोन करें।`,
      cg: `${lesson.todo.cg}। अगर धोखाधड़ी हो जाय, त तुरंत 1930 साइबर हेल्पलाइन म फोन करव।`,
    },
    caption: lesson.todo,
    details: [
      lesson.todo,
      {
        en: 'Helpline: Call 1930 or visit cybercrime.gov.in',
        hi: 'हेल्पलाइन: 1930 पर कॉल करें या cybercrime.gov.in पर जाएं',
        cg: 'हेल्पलाइन: 1930 म कॉल करव या cybercrime.gov.in म जाव',
      },
    ],
    accentColor: '#0e8a16',
    icon: 'check',
    durationSec: 6,
  }

  return [introScene, scenarioScene, signsScene, todoScene]
}

/** Computes the total video duration across all scenes in seconds. */
export function totalVideoDuration(scenes: VideoScene[]): number {
  return scenes.reduce((sum, s) => sum + s.durationSec, 0)
}
