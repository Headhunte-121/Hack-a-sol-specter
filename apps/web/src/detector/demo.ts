import type { Tri } from '../learn/content'

// Saved demo messages (team-written, no real numbers/accounts). Used for the "try an example" chips and the demo script.
// The message texts stay in their own language (they are samples of real scam wording); the chip labels follow the app language.
export interface DemoMessage {
  id: string
  label: Tri // short chip label
  text: string
  expect: 'scam' | 'genuine'
}

export const DEMO_MESSAGES: DemoMessage[] = [
  { id: 'kyc_hinglish', label: { en: 'KYC (Hinglish)', hi: 'केवाईसी (हिंग्लिश)', cg: 'केवाईसी (हिंग्लिश)' }, expect: 'scam', text: 'Dear customer aapka SBI account aaj block ho jayega. Turant apna KYC update karein: http://sbi-kyc-update.top' },
  { id: 'arrest_hindi', label: { en: 'Digital arrest (Hindi)', hi: 'डिजिटल अरेस्ट', cg: 'डिजिटल अरेस्ट' }, expect: 'scam', text: 'मैं सीबीआई अधिकारी बोल रहा हूँ। आपके नाम के पार्सल में अवैध सामान मिला है। आप डिजिटल अरेस्ट में हैं। वीडियो कॉल पर रहें और किसी को न बताएं।' },
  { id: 'lottery_en', label: { en: 'Lottery (English)', hi: 'लॉटरी (अंग्रेज़ी)', cg: 'लॉटरी (अंगरेजी)' }, expect: 'scam', text: 'Congratulations! You have won Rs 25,00,000 in the KBC lottery. Pay Rs 3,000 processing fee to claim. Call 9876543210' },
  { id: 'debit_alert', label: { en: 'Bank debit alert', hi: 'बैंक से पैसे कटने का संदेश', cg: 'बैंक ले पइसा कटे के संदेस' }, expect: 'genuine', text: 'Rs 1,250 debited from A/c XX1234 on 12-Nov. If not you, call the number on the back of your card. - HDFC Bank' },
  { id: 'otp_en', label: { en: 'OTP message', hi: 'ओटीपी संदेश', cg: 'ओटीपी संदेस' }, expect: 'genuine', text: 'Your OTP for login is 482913. Do not share it with anyone. - SBI' },
  { id: 'otp_hinglish', label: { en: 'OTP (Hinglish)', hi: 'ओटीपी (हिंग्लिश)', cg: 'ओटीपी (हिंग्लिश)' }, expect: 'genuine', text: 'Aapke login ka OTP 482913 hai. Ise kisi ke saath share na karein. - HDFC Bank' },
  { id: 'delivery', label: { en: 'Delivery update', hi: 'डिलीवरी की सूचना', cg: 'डिलीवरी के सूचना' }, expect: 'genuine', text: 'Your Amazon order has been shipped and will arrive by 14 Dec. Track it in the app.' },
  { id: 'link', label: { en: 'Fake bank link', hi: 'नकली बैंक लिंक', cg: 'नकली बैंक लिंक' }, expect: 'scam', text: 'http://hdfc-secure-login.xyz/verify' },
]
