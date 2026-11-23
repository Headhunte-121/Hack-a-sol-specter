import type { Lang } from '../shell/i18n'
import type { Question } from './content'
import { pick } from './content'

export interface ArtworkMeta {
  id: number
  src: string
  title: { en: string; hi: string; cg: string }
  subtitle: { en: string; hi: string; cg: string }
  tag: { en: string; hi: string; cg: string }
  strikingBadge?: { en: string; hi: string; cg: string }
  accentColor: string
}

export const QUIZ_ARTWORKS: ArtworkMeta[] = [
  // 01. Saffron Odhani Guardian -> Confidential Banking Secrets
  {
    id: 1,
    src: 'images/quiz/clean/clean_art_01.jpg',
    title: {
      en: 'Confidential Banking Guardian',
      hi: 'गोपनीय बैंकिंग सुरक्षा',
      cg: 'गोपनीय बैंकिंग सुरक्षा',
    },
    subtitle: {
      en: 'Never share your OTP, CVV, or passwords with anyone',
      hi: 'अपना ओटीपी, सीवीवी या पासवर्ड किसी को न बताएं',
      cg: 'अपन ओटीपी, सीवीवी या पासवर्ड ककरो संग झन बांटव',
    },
    tag: {
      en: 'CONFIDENTIAL',
      hi: 'गोपनीय',
      cg: 'गोपनीय',
    },
    accentColor: '#f59e0b',
  },
  // 02. Downward Watchful Gaze -> ATM Keypad Vigilance
  {
    id: 2,
    src: 'images/quiz/clean/clean_art_02.jpg',
    title: {
      en: 'ATM Keypad Vigilance',
      hi: 'एटीएम कीपैड सतर्कता',
      cg: 'एटीएम कीपैड सतर्कता',
    },
    subtitle: {
      en: 'Shield the keypad with your hand while entering your 4-digit PIN',
      hi: 'पिन दर्ज करते समय कीपैड को हमेशा हाथ से ढकें',
      cg: 'पिन डारत बखत कीपैड ला हाथ ले जरूर झांकव',
    },
    tag: {
      en: 'ATM DEFENSE',
      hi: 'एटीएम सुरक्षा',
      cg: 'एटीएम सुरक्षा',
    },
    accentColor: '#0d9488',
  },
  // 03. Royal Ochre Saree with Golden Radiance Halo -> UPI Golden Rule
  {
    id: 3,
    src: 'images/quiz/clean/clean_art_03.jpg',
    title: {
      en: 'The Golden Rule of UPI',
      hi: 'यूपीआई का सुनहरा नियम',
      cg: 'यूपीआई के सुनता नियम',
    },
    subtitle: {
      en: 'Entering UPI PIN is strictly to send money, never to receive',
      hi: 'यूपीआई पिन केवल पैसे भेजने के लिए होता है, पाने के लिए नहीं',
      cg: 'यूपीआई पिन सिरिफ पइसा भेजे बर होथे, पाए बर कभू नइ',
    },
    tag: {
      en: 'GOLDEN RULE',
      hi: 'सुनहरा नियम',
      cg: 'सुनता नियम',
    },
    strikingBadge: {
      en: '✨ Golden Radiance',
      hi: '✨ स्वर्णिम आभा',
      cg: '✨ सोनहा चमक',
    },
    accentColor: '#eab308',
  },
  // 04. Woman with the Lamp -> Helpline 1930 Light in Crisis
  {
    id: 4,
    src: 'images/quiz/clean/clean_art_04.jpg',
    title: {
      en: 'Helpline 1930: Light in Crisis',
      hi: 'हेल्पलाइन 1930: संकट में रोशनी',
      cg: 'हेल्पलाइन 1930: विपत म अंजोर',
    },
    subtitle: {
      en: 'Report cyber fraud within the first hour to freeze stolen money',
      hi: 'धोखाधड़ी होते ही 1930 डायल करें और अपना पैसा सुरक्षित करें',
      cg: 'धोखा होवत ही 1930 म फोन लगाके अपन पइसा रोकोव',
    },
    tag: {
      en: 'DIAL 1930',
      hi: '1930 हेल्पलाइन',
      cg: '1930 हेल्पलाइन',
    },
    accentColor: '#f97316',
  },
  // 05. Bani Thani Masterpiece with Cyber Shield Ring -> Citizen Cyber Shield
  {
    id: 5,
    src: 'images/quiz/clean/clean_art_05.jpg',
    title: {
      en: 'Citizen Cyber Shield',
      hi: 'नागरिक साइबर सुरक्षा ढाल',
      cg: 'नागरिक साइबर सुरक्षा ढाल',
    },
    subtitle: {
      en: 'Empowering families with digital vigilance and portal reporting',
      hi: 'परिवार और समाज को साइबर अपराध से सुरक्षित बनाएं',
      cg: 'अपन परिवार अउ समाज ला साइबर अपराध ले बचावत रहव',
    },
    tag: {
      en: 'CYBER SHIELD',
      hi: 'साइबर ढाल',
      cg: 'साइबर ढाल',
    },
    strikingBadge: {
      en: '🛡️ Cyber Shield',
      hi: '🛡️ सुरक्षा चक्र',
      cg: '🛡️ सुरक्षा चक्र',
    },
    accentColor: '#38bdf8',
  },
  // 06. Maharashtrian Lady -> Discerning KYC Scrutiny
  {
    id: 6,
    src: 'images/quiz/clean/clean_art_06.jpg',
    title: {
      en: 'Discerning KYC Verification',
      hi: 'फ़र्ज़ी केवाईसी की पड़ताल',
      cg: 'फ़र्ज़ी केवाईसी के जांच',
    },
    subtitle: {
      en: 'Official telecom providers never threaten disconnection via SMS',
      hi: 'सिम बंद होने की धमकी भरे मैसेज पर कभी विश्वास न करें',
      cg: 'सिम बंद होए के धमकी वाले संदेस म कभू भरोसा झन करव',
    },
    tag: {
      en: 'KYC DEFENSE',
      hi: 'केवाईसी जांच',
      cg: 'केवाईसी जांच',
    },
    accentColor: '#ef4444',
  },
  // 07. Shakuntala in Resolute Thought -> Defying Digital Arrest
  {
    id: 7,
    src: 'images/quiz/clean/clean_art_07.jpg',
    title: {
      en: 'Defying Digital Arrest',
      hi: 'डिजिटल अरेस्ट से निडर रहें',
      cg: 'डिजिटल अरेस्ट ले निडर रहव',
    },
    subtitle: {
      en: 'Police and CBI never arrest citizens over Skype or WhatsApp calls',
      hi: 'पुलिस या जांच एजेंसियां कभी वीडियो कॉल पर अरेस्ट नहीं करतीं',
      cg: 'पुलिस या सीबीआई कभू वीडियो काल म अरेस्ट नइ करय',
    },
    tag: {
      en: 'HIGH ALERT',
      hi: 'सावधान',
      cg: 'सावधान',
    },
    accentColor: '#8b5cf6',
  },
  // 08. Damayanti Talking with Swan -> Questioning QR Cashback Traps
  {
    id: 8,
    src: 'images/quiz/clean/clean_art_08.jpg',
    title: {
      en: 'Questioning QR Cashback Traps',
      hi: 'क्यूआर कोड कैशबैक का सच',
      cg: 'क्यूआर कोड कैशबैक के सच',
    },
    subtitle: {
      en: 'Scanning a QR code always sends money, never receives cashback',
      hi: 'क्यूआर कोड स्कैन करने से पैसे निकलते हैं, कैशबैक नहीं मिलता',
      cg: 'क्यूआर कोड स्कैन करे ले पइसा कटथे, कैशबैक नइ मिलय',
    },
    tag: {
      en: 'QR TRAP',
      hi: 'क्यूआर धोखा',
      cg: 'क्यूआर धोखा',
    },
    strikingBadge: {
      en: '🌅 Sunset Rim',
      hi: '🌅 स्वर्णिम किरणें',
      cg: '🌅 सोनहा किरण',
    },
    accentColor: '#f97316',
  },
  // 09. Radha Waiting in Calm Resolve -> Patience Against Bill Panic Threats
  {
    id: 9,
    src: 'images/quiz/clean/clean_art_09.jpg',
    title: {
      en: 'Patience Against Panic Threats',
      hi: 'बिजली बिल डिस्कनेक्शन का डर',
      cg: 'बिजली बिल काटे के डर',
    },
    subtitle: {
      en: 'Government utilities never cut electricity over personal SMS',
      hi: 'अज्ञात नंबरों पर कॉल करने के बजाय आधिकारिक बिजली दफ्तर जाएं',
      cg: 'अंजान नंबर म फोन करे के बदला सीधा बिजली दफ्तर जावव',
    },
    tag: {
      en: 'BILL SAFETY',
      hi: 'बिल सुरक्षा',
      cg: 'बिल सुरक्षा',
    },
    strikingBadge: {
      en: '✨ Golden Halo',
      hi: '✨ स्वर्णिम प्रभामंडल',
      cg: '✨ सोनहा घेरा',
    },
    accentColor: '#eab308',
  },
  // 10. Bani Thani in Lotus Pink & Gold -> Guarding Mobile Identity & SIM Swap
  {
    id: 10,
    src: 'images/quiz/clean/clean_art_10.jpg',
    title: {
      en: 'Guarding Mobile Identity',
      hi: 'सिम स्वैप से सुरक्षा',
      cg: 'सिम स्वैप ले सुरक्षा',
    },
    subtitle: {
      en: 'Never share your SIM card serial number or eSIM QR codes',
      hi: 'अपना सिम नंबर या ई-सिम क्यूआर कोड किसी के साथ साझा न करें',
      cg: 'अपन सिम नंबर या ई-सिम क्यूआर कोड ककरो संग झन बांटव',
    },
    tag: {
      en: 'SIM SAFETY',
      hi: 'सिम सुरक्षा',
      cg: 'सिम सुरक्षा',
    },
    accentColor: '#ec4899',
  },
  // 11. In Contemplation -> Pausing Before Downloading Unknown APKs
  {
    id: 11,
    src: 'images/quiz/clean/clean_art_11.jpg',
    title: {
      en: 'Pausing Before Downloading',
      hi: 'हानिकारक एपीके से बचाव',
      cg: 'खतरनाक एपीके ले बचाव',
    },
    subtitle: {
      en: 'Never install unknown APK files shared through WhatsApp or chats',
      hi: 'व्हाट्सएप पर मिले अज्ञात एपीके फाइलों को कभी इंस्टॉल न करें',
      cg: 'व्हाट्सएप म आए अंजान एपीके फाइल ला कभू डाउनलोड झन करव',
    },
    tag: {
      en: 'MALWARE ALERT',
      hi: 'ऐप अलर्ट',
      cg: 'ऐप अलर्ट',
    },
    accentColor: '#dc2626',
  },
  // 12. Nair Lady with Warm Golden Light -> Staying Calm Against Customs Fraud
  {
    id: 12,
    src: 'images/quiz/clean/clean_art_12.jpg',
    title: {
      en: 'Staying Calm Against Customs Fraud',
      hi: 'फ़र्ज़ी पार्सल व कस्टम्स ब्लैकमेल',
      cg: 'फ़र्ज़ी पार्सल अउ कस्टम्स धमकी',
    },
    subtitle: {
      en: 'Customs authorities never demand money transfers to personal UPI',
      hi: 'कस्टम्स अधिकारी कभी निजी खातों में जुर्माना नहीं मांगते',
      cg: 'कस्टम्स वाले कभू निजी खाता म जुर्माना नइ मांगंय',
    },
    tag: {
      en: 'CUSTOMS FRAUD',
      hi: 'कस्टम्स फ्रॉड',
      cg: 'कस्टम्स फ्रॉड',
    },
    strikingBadge: {
      en: '🌟 Warm Radiance',
      hi: '🌟 स्वर्णिम प्रभा',
      cg: '🌟 सोनहा चमक',
    },
    accentColor: '#f59e0b',
  },
  // 13. Woman Holding a Fruit -> Inspecting Phishing Links
  {
    id: 13,
    src: 'images/quiz/clean/clean_art_13.jpg',
    title: {
      en: 'Inspecting Phishing Links',
      hi: 'फ़िशिंग लिंक की सूक्ष्म जांच',
      cg: 'फ़िशिंग लिंक के बारीक जांच',
    },
    subtitle: {
      en: 'Carefully verify domain names before entering any login details',
      hi: 'किसी भी लिंक पर क्लिक करने से पहले पूरी वेबसाइट का पता जांचें',
      cg: 'कोनो लिंक ला छुए ले पहिली पूरा वेबसाइट पता ला देखव',
    },
    tag: {
      en: 'LINK DEFENSE',
      hi: 'लिंक जांच',
      cg: 'लिंक जांच',
    },
    accentColor: '#0ea5e9',
  },
  // 14. Woman Holding a Fan -> Exposing Fake Bank Callers
  {
    id: 14,
    src: 'images/quiz/clean/clean_art_14.jpg',
    title: {
      en: 'Exposing Fake Bank Callers',
      hi: 'फ़र्ज़ी बैंक अधिकारी की पहचान',
      cg: 'फ़र्ज़ी बैंक अफसर के पहिचान',
    },
    subtitle: {
      en: 'Genuine bank managers never ask for OTPs or login passwords',
      hi: 'सच्चे बैंक अधिकारी कभी ओटीपी या गोपनीय पिन नहीं मांगते',
      cg: 'असली बैंक अफसर कभू ओटीपी या पिन नइ मांगंय',
    },
    tag: {
      en: 'BANK DEFENSE',
      hi: 'बैंक सुरक्षा',
      cg: 'बैंक सुरक्षा',
    },
    accentColor: '#3b82f6',
  },
  // 15. Mother Protecting Child -> Verifying Family Distress Calls
  {
    id: 15,
    src: 'images/quiz/clean/clean_art_15.jpg',
    title: {
      en: 'Verifying Family Distress Calls',
      hi: 'आपातकालीन कॉल की पुष्टि',
      cg: 'विपत काल के परख',
    },
    subtitle: {
      en: 'Always hang up and call family members directly on their known number',
      hi: 'परिवार के नाम पर पैसे मांगने वाले कॉल की हमेशा सीधे पुष्टि करें',
      cg: 'घर के मन के नाम ले पइसा मांगे बर आए काल ला सीधा फोन लगाके जांचव',
    },
    tag: {
      en: 'FAMILY SHIELD',
      hi: 'परिवार रक्षा',
      cg: 'परिवार रक्षा',
    },
    accentColor: '#ec4899',
  },
  // 16. Madri in Royal Blue & Gold -> Rejecting Fake Lottery Prizes
  {
    id: 16,
    src: 'images/quiz/clean/clean_art_16.jpg',
    title: {
      en: 'Rejecting Fake Lottery Prizes',
      hi: 'फ़र्ज़ी लॉटरी व ईनाम का लालच',
      cg: 'फ़र्ज़ी लाटरी अउ ईनाम के लालच',
    },
    subtitle: {
      en: 'You cannot win a lottery you never entered; never pay processing fees',
      hi: 'बिना टिकट खरीदे कोई लॉटरी नहीं लगती; प्रोसेसिंग फीस कभी न दें',
      cg: 'बिन टिकट के कोनो लाटरी नइ लगे; प्रोसेसिंग फीस कभू झन देव',
    },
    tag: {
      en: 'LOTTERY FRAUD',
      hi: 'लॉटरी धोखा',
      cg: 'लाटरी धोखा',
    },
    accentColor: '#9333ea',
  },
  // 17. Lady with Swarabat -> Never Share Your Screen (Cyber Shield)
  {
    id: 17,
    src: 'images/quiz/clean/clean_art_17.jpg',
    title: {
      en: 'Never Share Your Screen',
      hi: 'स्क्रीन शेयरिंग का ख़तरा',
      cg: 'स्क्रीन शेयरिंग के खतरा',
    },
    subtitle: {
      en: 'Remote control apps let fraudsters view your bank login in real time',
      hi: 'स्क्रीन शेयरिंग ऐप ठगों को आपका फोन और बैंकिंग देखने देते हैं',
      cg: 'स्क्रीन शेयरिंग ऐप ले ठग मन तुंहर पूरा मोबाइल देख लेथें',
    },
    tag: {
      en: 'SCREEN SHARING',
      hi: 'स्क्रीन सुरक्षा',
      cg: 'स्क्रीन सुरक्षा',
    },
    strikingBadge: {
      en: '🛡️ Luminous Shield',
      hi: '🛡️ सुरक्षा कवच',
      cg: '🛡️ सुरक्षा कवच',
    },
    accentColor: '#06b6d4',
  },
  // 18. Santhal Girl -> Instant Loan App Defense
  {
    id: 18,
    src: 'images/quiz/clean/clean_art_18.jpg',
    title: {
      en: 'Instant Loan App Defense',
      hi: 'फ़र्ज़ी लोन ऐप से बचाव',
      cg: 'फ़र्ज़ी लोन ऐप ले बचाव',
    },
    subtitle: {
      en: 'Unregistered loan apps steal contact lists and photos for extortion',
      hi: 'अवैध लोन ऐप आपके कॉन्टैक्ट्स और फोटो चुराकर ब्लैकमेल करते हैं',
      cg: 'फ़र्ज़ी लोन ऐप तुंहर फोटो अउ नंबर चुराके ब्लैकमेल करथें',
    },
    tag: {
      en: 'LOAN APP SCAM',
      hi: 'लोन ऐप खतरा',
      cg: 'लोन ऐप खतरा',
    },
    accentColor: '#b91c1c',
  },
  // 19. Radha in Moonlight -> Golden Hour Swift Action
  {
    id: 19,
    src: 'images/quiz/clean/clean_art_19.jpg',
    title: {
      en: 'Golden Hour Swift Action',
      hi: 'गोल्डन ऑवर में त्वरित कार्रवाई',
      cg: 'गोल्डन ऑवर म तुरते कार्रवाई',
    },
    subtitle: {
      en: 'Dialing 1930 immediately triggers automated bank transfer freezes',
      hi: 'तुरंत शिकायत करने पर बैंक खाते में गए पैसे तुरंत फ्रीज हो जाते हैं',
      cg: 'तुरते शिकायत करे ले बैंक खाता म गे पइसा तुरते रुक जाथे',
    },
    tag: {
      en: 'GOLDEN HOUR',
      hi: 'गोल्डन ऑवर',
      cg: 'गोल्डन ऑवर',
    },
    accentColor: '#3b82f6',
  },
  // 20. Goddess Saraswati with Divine Halo -> Empowered Cyber Rakshak
  {
    id: 20,
    src: 'images/quiz/clean/clean_art_20.jpg',
    title: {
      en: 'Empowered Cyber Rakshak',
      hi: 'सशक्त साइबर रक्षक',
      cg: 'सशक्त साइबर रक्षक',
    },
    subtitle: {
      en: 'Knowledge and vigilance are the ultimate armor in the digital world',
      hi: 'जागरूकता और सतर्कता ही डिजिटल दुनिया का सबसे बड़ा सुरक्षा कवच है',
      cg: 'सचेत अउ जागरूक रहना ही डिजिटल जुग के सबले बड़े रक्षा कवच हे',
    },
    tag: {
      en: 'CYBER RAKSHAK',
      hi: 'साइबर रक्षक',
      cg: 'साइबर रक्षक',
    },
    strikingBadge: {
      en: '✨ Divine Wisdom',
      hi: '✨ ज्ञान व रक्षा',
      cg: '✨ गियान अउ रक्षा',
    },
    accentColor: '#f59e0b',
  },
]

/**
 * Returns the matching ArtworkMeta for a given question and index.
 * Guarantees that each of the 20 questions in a chapter has a unique artwork,
 * perfectly matched to the question's theme and title.
 */
export function getArtworkForQuestion(question: Question, questionIndex = 0): ArtworkMeta {
  const artworkIdx = questionIndex % QUIZ_ARTWORKS.length
  return QUIZ_ARTWORKS[artworkIdx]
}
