// normalizeTranscript: make matching robust to speech-recognition spelling.
// Works on TOKENS (not on the string) so every token keeps its span in the original transcript for highlighting.

/** English words that speech recognition (and people) write in Devanagari, mapped back to a canonical Latin form. */
export const CANON: Record<string, string> = {
  बैंक: 'bank', अकाउंट: 'account', ओटीपी: 'otp', केवाईसी: 'kyc', पुलिस: 'police', सीबीआई: 'cbi', पार्सल: 'parcel', कस्टम: 'customs', कस्टम्स: 'customs', कूरियर: 'courier',
  ड्रग्स: 'drugs', अरेस्ट: 'arrest', वीडियो: 'video', कॉल: 'call', कोल: 'call', ट्रांसफर: 'transfer', ट्रांसफ़र: 'transfer', सेफ: 'safe', लिंक: 'link', क्लिक: 'click', ब्लॉक: 'block',
  सिम: 'sim', नंबर: 'number', डिजिटल: 'digital', वारंट: 'warrant', मनी: 'money', लॉन्ड्रिंग: 'laundering', इंस्पेक्टर: 'inspector', ऑफिसर: 'officer', मैनेजर: 'manager',
  केस: 'case', कोर्ट: 'court', पासपोर्ट: 'passport', आधार: 'aadhaar', पैन: 'pan', फेडेक्स: 'fedex', अपडेट: 'update', वेरिफिकेशन: 'verification', सस्पेंड: 'suspend',
  डाउनलोड: 'download', इंस्टॉल: 'install', एनीडेस्क: 'anydesk', सीवीवी: 'cvv', यूपीआई: 'upi', फाइन: 'fine', पेमेंट: 'payment', कनेक्शन: 'connection', कार्ड: 'card',
  कोड: 'code', पिन: 'pin', ऐप: 'app', एप: 'app', एपीके: 'apk', ऑफिस: 'office', हेड: 'head', कस्टमर: 'customer', केयर: 'care', ट्राई: 'trai', नारकोटिक्स: 'narcotics',
  क्राइम: 'crime', ब्रांच: 'branch', साइबर: 'cyber', सेल: 'cell', एनफोर्समेंट: 'enforcement', डायरेक्टरेट: 'directorate', लॉटरी: 'lottery', केबीसी: 'kbc', प्राइज: 'prize',
  इमीडिएटली: 'immediately', कन्फर्म: 'confirm', वेरिफाई: 'verify', कॉन्फिडेंशियल: 'confidential', रिफंड: 'refund', डीएचएल: 'dhl', फीस: 'fee', टैक्स: 'tax', जीएसटी: 'gst',
}

/** canonToken: Unicode NFC, drop nukta, unify chandrabindu to anusvara, map Devanagari loanwords to Latin. */
export function canonToken(t: string): string {
  const x = t.normalize('NFC').replace(/़/g, '').replace(/ँ/g, 'ं')
  return CANON[x] ?? x
}

export function levenshtein(a: string, b: string, max = 2): number {
  if (Math.abs(a.length - b.length) > max) return max + 1
  const dp = Array.from({ length: a.length + 1 }, (_, i) => [i, ...new Array(b.length).fill(0)])
  for (let j = 1; j <= b.length; j++) dp[0][j] = j
  for (let i = 1; i <= a.length; i++) for (let j = 1; j <= b.length; j++) dp[i][j] = Math.min(dp[i - 1][j] + 1, dp[i][j - 1] + 1, dp[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1))
  return dp[a.length][b.length]
}

/** Token equality with small spelling tolerance: exact, or edit distance 1 for longer words (Hinglish has no standard spelling). */
export function tokenMatches(word: string, want: string): boolean {
  if (word === want) return true
  if (want.length < 5 || word.length < 5) return false
  return levenshtein(word, want, 1) <= 1
}

/** postProcessTranscript: collapse words repeated by speech recognition ("आप आप आप"), keep the original script, no translation. */
export function postProcessTranscript(text: string): string {
  return text.replace(/(^|\s)(\S+)(\s+\2)+(?=\s|$)/gu, '$1$2').replace(/\s+/g, ' ').trim()
}
