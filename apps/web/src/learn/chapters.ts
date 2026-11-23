import type { Tri, Question } from './content'
import { rng, hashSeed } from './quiz'

export interface Chapter {
  id: string
  number: number
  title: Tri
  description: Tri
  topics: [string, string]
  icon: string
  color: string
  accentColor: string
}

export const CHAPTERS: Chapter[] = [
  {
    id: 'chapter-1',
    number: 1,
    title: {
      en: 'Banking & Card Safety',
      hi: 'बैंकिंग एवं कार्ड सुरक्षा',
      cg: 'बैंकिंग अउ कार्ड सुरक्षा',
    },
    description: {
      en: 'Protect your OTP, ATM PIN, CVV, and debit/credit cards from fraudsters.',
      hi: 'अपने ओटीपी, एटीएम पिन, सीवीवी और कार्ड को ठगों से सुरक्षित रखना सीखें।',
      cg: 'अपन ओटीपी, एटीएम पिन, सीवीवी अउ कार्ड ला ठग मन ले बचाय बर सीखव।',
    },
    topics: ['otp_pin_card', 'atm_pin'],
    icon: 'shield',
    color: 'from-blue-600 to-indigo-700',
    accentColor: '#1747c4',
  },
  {
    id: 'chapter-2',
    number: 2,
    title: {
      en: 'Identity & Digital Arrest',
      hi: 'पहचान एवं डिजिटल अरेस्ट',
      cg: 'पहिचान अउ डिजिटल अरेस्ट',
    },
    description: {
      en: 'Spot fake police video calls, arrest threats, and fake KYC deactivation scams.',
      hi: 'फ़र्ज़ी पुलिस कॉल, डिजिटल अरेस्ट की धमकी और फ़र्ज़ी केवाईसी ठगी को पहचानें।',
      cg: 'फ़र्ज़ी पुलिस काल, डिजिटल अरेस्ट के धमकी अउ फ़र्ज़ी केवाईसी ठगी ला पहिचानव।',
    },
    topics: ['fake_kyc', 'digital_arrest'],
    icon: 'phone',
    color: 'from-purple-600 to-indigo-800',
    accentColor: '#582cd1',
  },
  {
    id: 'chapter-3',
    number: 3,
    title: {
      en: 'UPI & QR Code Traps',
      hi: 'यूपीआई एवं क्यूआर कोड धोखे',
      cg: 'यूपीआई अउ क्यूआर कोड धोखे',
    },
    description: {
      en: 'Master the Golden Rule: UPI PIN is only to send money, never to receive money.',
      hi: 'सुनहरा नियम याद रखें: यूपीआई पिन केवल पैसे भेजने के लिए होता है, पाने के लिए नहीं।',
      cg: 'सुनता नियम याद रखव: यूपीआई पिन सिरिफ पइसा भेजे बर होथे, पाए बर कभू नइ।',
    },
    topics: ['upi_pin', 'upi_qr'],
    icon: 'qr',
    color: 'from-amber-500 to-orange-600',
    accentColor: '#b45309',
  },
  {
    id: 'chapter-4',
    number: 4,
    title: {
      en: 'Harmful APKs, Links & Parcels',
      hi: 'फ़र्ज़ी ऐप्स, लिंक्स एवं पार्सल',
      cg: 'फ़र्ज़ी ऐप, लिंक अउ पार्सल',
    },
    description: {
      en: 'Recognize dangerous APK download links, phishing websites, and fake courier delivery calls.',
      hi: 'खतरनाक एपीके डाउनलोड लिंक, फ़िशिंग वेबसाइट और फ़र्ज़ी पार्सल कॉल से बचें।',
      cg: 'खतरनाक एपीके डाउनलोड लिंक, फ़िशिंग वेबसाइट अउ फ़र्ज़ी पार्सल काल ले बचव।',
    },
    topics: ['links_apps', 'courier_customs'],
    icon: 'message',
    color: 'from-rose-600 to-red-700',
    accentColor: '#be123c',
  },
  {
    id: 'chapter-5',
    number: 5,
    title: {
      en: 'Helpline 1930 & Cyber Hygiene',
      hi: 'हेल्पलाइन 1930 एवं सुरक्षित आदतें',
      cg: 'हेल्पलाइन 1930 अउ सुरक्षित बानी',
    },
    description: {
      en: 'Learn official helpline 1930 reporting, evidence collection, and everyday payment safety habits.',
      hi: 'आधिकारिक हेल्पलाइन 1930 पर शिकायत, सबूत सहेजना और रोज़मर्रा की सुरक्षा आदतें।',
      cg: 'सरकारी हेल्पलाइन 1930 म रपट, सबूत सम्हारना अउ रोज के सुरक्षित बानी।',
    },
    topics: ['what_to_do', 'safe_habits'],
    icon: 'lock',
    color: 'from-teal-600 to-emerald-700',
    accentColor: '#0f766e',
  },
]

export const CHAPTER_QUESTIONS_COUNT = 20

function shuffleArray<T>(arr: T[], r: () => number): T[] {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(r() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

/**
 * Selects exactly 20 questions for a given chapter, evenly drawing 10 questions
 * from each of the chapter's two topics, with difficulty balance and stable shuffle.
 */
export function selectChapterQuestions(
  bank: Question[],
  chapter: Chapter,
  count = CHAPTER_QUESTIONS_COUNT,
  seed = Date.now()
): Question[] {
  const r = rng(seed)
  const [topicA, topicB] = chapter.topics

  const poolA = bank.filter((q) => q.topic === topicA)
  const poolB = bank.filter((q) => q.topic === topicB)

  const half = Math.floor(count / 2)
  const remainder = count - half

  const shuffledA = shuffleArray(poolA, r)
  const shuffledB = shuffleArray(poolB, r)

  const pickedA = shuffledA.slice(0, half)
  const pickedB = shuffledB.slice(0, remainder)

  // Combined and shuffled so questions from both topics are interweaved nicely
  return shuffleArray([...pickedA, ...pickedB], r)
}
