// Saved demo messages (team-written, no real numbers/accounts). Used for the "try an example" chips and the demo script.
export interface DemoMessage {
  id: string
  label: string // short chip label (language-neutral)
  text: string
  expect: 'scam' | 'genuine'
}

export const DEMO_MESSAGES: DemoMessage[] = [
  { id: 'kyc_hinglish', label: 'KYC (Hinglish)', expect: 'scam', text: 'Dear customer aapka SBI account aaj block ho jayega. Turant apna KYC update karein: http://sbi-kyc-update.top' },
  { id: 'arrest_hindi', label: 'डिजिटल अरेस्ट', expect: 'scam', text: 'मैं सीबीआई अधिकारी बोल रहा हूँ। आपके नाम के पार्सल में अवैध सामान मिला है। आप डिजिटल अरेस्ट में हैं। वीडियो कॉल पर रहें और किसी को न बताएं।' },
  { id: 'lottery_en', label: 'Lottery (English)', expect: 'scam', text: 'Congratulations! You have won Rs 25,00,000 in the KBC lottery. Pay Rs 3,000 processing fee to claim. Call 9876543210' },
  { id: 'debit_alert', label: 'Bank debit alert', expect: 'genuine', text: 'Rs 1,250 debited from A/c XX1234 on 12-Nov. If not you, call the number on the back of your card. - HDFC Bank' },
  { id: 'otp_en', label: 'OTP message', expect: 'genuine', text: 'Your OTP for login is 482913. Do not share it with anyone. - SBI' },
  { id: 'otp_hinglish', label: 'OTP (Hinglish)', expect: 'genuine', text: 'Aapke login ka OTP 482913 hai. Ise kisi ke saath share na karein. - HDFC Bank' },
  { id: 'delivery', label: 'Delivery update', expect: 'genuine', text: 'Your Amazon order has been shipped and will arrive by 14 Dec. Track it in the app.' },
  { id: 'link', label: 'Fake bank link', expect: 'scam', text: 'http://hdfc-secure-login.xyz/verify' },
]
