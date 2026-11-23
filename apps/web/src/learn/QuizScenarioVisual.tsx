import { useState } from 'react'
import {
  AlertTriangle,
  CheckCircle,
  Lock,
  Maximize2,
  Mic,
  PhoneOff,
  Shield,
  ShieldAlert,
  Sparkles,
  Video,
  Wifi,
  X,
} from 'lucide-react'
import type { Lang } from '../shell/i18n'
import type { Question } from './content'
import { pick } from './content'
import { QUIZ_ARTWORKS, getArtworkForQuestion } from './quizArtworks'

interface QuizScenarioVisualProps {
  question: Question
  lang: Lang
  questionIndex?: number
}

// Dedicated unique pure painted artwork for each of the 20 questions
export function getUniqueQuestionArtwork(index: number): string {
  const num = (index % 20) + 1
  return `images/quiz/clean/clean_art_${String(num).padStart(2, '0')}.jpg`
}

export function QuizScenarioVisual({ question, lang, questionIndex = 0 }: QuizScenarioVisualProps) {
  const [fullscreenImage, setFullscreenImage] = useState(false)
  const qText = pick(question.question, lang)
  const topic = question.topic

  // Get matching artwork and metadata for this question
  const artwork = getArtworkForQuestion(question, questionIndex)
  const artworkSrc = artwork.src
  const artTitle = artwork.title[lang] || artwork.title.en
  const artSubtitle = artwork.subtitle[lang] || artwork.subtitle.en
  const artTag = artwork.tag[lang] || artwork.tag.en
  const strikingBadge = artwork.strikingBadge
    ? artwork.strikingBadge[lang] || artwork.strikingBadge.en
    : null

  // Realistic Smartphone Status Bar
  const renderPhoneStatusBar = () => (
    <div className="flex items-center justify-between px-4 py-1.5 text-[12px] font-bold text-slate-400 bg-slate-900 border-b border-slate-800">
      <span>10:42 AM</span>
      <div className="flex h-3.5 w-14 items-center justify-center rounded-full bg-slate-800">
        <div className="h-2 w-2 rounded-full bg-slate-950 border border-slate-700" />
      </div>
      <div className="flex items-center gap-1.5 text-slate-300">
        <Wifi size={13} />
        <span className="text-[11px] font-mono">5G</span>
        <span className="text-[11px]">88%</span>
      </div>
    </div>
  )

  return (
    <div className="flex flex-col gap-4" data-testid="quiz-scenario-visual">
      {/* 1. Large, Clear, Beautiful Painted Artwork Card with Matching Title */}
      <div className="group relative overflow-hidden rounded-3xl border-2 border-amber-400/80 bg-slate-950 shadow-2xl ring-1 ring-amber-300/30">
        {/* The Pure Painted Image */}
        <img
          src={artworkSrc}
          alt={artTitle}
          className="h-72 sm:h-88 md:h-[420px] w-full object-cover transition-transform duration-700 group-hover:scale-102"
          loading="eager"
        />

        {/* Top Floating Glassmorphism Badges Bar */}
        <div className="absolute inset-x-0 top-0 flex items-center justify-between p-3.5 sm:p-4 bg-gradient-to-b from-slate-950/80 via-slate-950/40 to-transparent">
          <div className="flex flex-wrap items-center gap-2">
            {/* Question / Art Number Pill */}
            <span className="rounded-full bg-slate-900/85 px-3 py-1 text-[12px] font-black text-amber-300 border border-amber-400/40 shadow-md backdrop-blur-xs">
              {lang === 'hi'
                ? `चित्र #${(questionIndex % 20) + 1} / 20`
                : lang === 'cg'
                ? `फोटो #${(questionIndex % 20) + 1} / 20`
                : `Artwork #${(questionIndex % 20) + 1} of 20`}
            </span>

            {/* Striking Element Badge if present */}
            {strikingBadge && (
              <span className="flex items-center gap-1.5 rounded-full bg-amber-500/90 px-3 py-1 text-[12px] font-black text-slate-950 shadow-md ring-1 ring-amber-200">
                <Sparkles size={13} className="animate-spin text-slate-950" />
                <span>{strikingBadge}</span>
              </span>
            )}
          </div>

          {/* Expand Fullscreen Button */}
          <button
            type="button"
            onClick={() => setFullscreenImage(true)}
            className="flex items-center gap-1.5 rounded-full bg-slate-900/85 px-3.5 py-1.5 text-[12px] font-bold text-white border border-white/20 backdrop-blur-xs hover:bg-slate-800 transition-all shadow-md active:scale-95"
            title="Expand Full Resolution Artwork"
          >
            <Maximize2 size={14} className="text-amber-300" />
            <span>{lang === 'hi' ? 'बड़ा देखें' : lang === 'cg' ? 'बड़ा देखव' : 'Expand View'}</span>
          </button>
        </div>

        {/* Bottom Banner Bar with Matching Title and Scenario Subtitle */}
        <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-slate-950 via-slate-950/90 to-transparent p-4 sm:p-5 pt-12">
          <div className="flex flex-col gap-1">
            <div className="flex items-center gap-2">
              <span className="rounded-lg bg-amber-400 px-2.5 py-0.5 text-[11px] font-black text-slate-950 uppercase tracking-wider shadow-sm">
                {artTag}
              </span>
              <span className="text-[12px] font-bold text-amber-300/80 uppercase tracking-wide">
                {topic.replace(/_/g, ' ')}
              </span>
            </div>

            {/* Matching Artwork Title */}
            <h3 className="text-[18px] sm:text-[22px] font-black text-white leading-tight drop-shadow-md">
              {artTitle}
            </h3>

            {/* Matching Scenario Guidance Subtitle */}
            <p className="text-[12px] sm:text-[14px] text-slate-200 font-medium leading-snug drop-shadow line-clamp-2">
              {artSubtitle}
            </p>
          </div>
        </div>
      </div>

      {/* Fullscreen Artwork Lightbox Modal */}
      {fullscreenImage && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/95 p-3 sm:p-6 backdrop-blur-md animate-fadeIn"
          onClick={() => setFullscreenImage(false)}
        >
          <div
            className="relative max-w-4xl w-full overflow-hidden rounded-3xl border-2 border-amber-400 bg-slate-950 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Lightbox Header with Matching Title and Close Button */}
            <div className="flex items-center justify-between border-b border-slate-800 bg-slate-900/90 px-5 py-3.5">
              <div>
                <span className="rounded bg-amber-400 px-2 py-0.5 text-[11px] font-black text-slate-950 uppercase mr-2">
                  {artTag}
                </span>
                <span className="text-[16px] font-black text-white">{artTitle}</span>
              </div>
              <button
                type="button"
                onClick={() => setFullscreenImage(false)}
                className="flex h-9 w-9 items-center justify-center rounded-full bg-slate-800 text-slate-300 hover:bg-slate-700 hover:text-white transition-colors"
                title="Close"
              >
                <X size={20} />
              </button>
            </div>

            {/* High Resolution Painting */}
            <img
              src={artworkSrc}
              alt={artTitle}
              className="max-h-[75vh] w-full object-contain bg-slate-950"
            />

            {/* Lightbox Footer with Subtitle */}
            <div className="border-t border-slate-800 bg-slate-900/90 px-5 py-3 text-[13px] text-amber-200/90 font-medium">
              💡 {artSubtitle}
            </div>
          </div>
        </div>
      )}

      {/* 2. Realistic Smartphone Device Mockup Below */}
      {/* CASE A: UPI & QR Code Scenarios */}
      {(topic === 'upi_qr' || topic === 'upi_pin' || qText.includes('QR') || qText.includes('UPI')) && (
        <div className="overflow-hidden rounded-[28px] border-[3.5px] border-slate-700 bg-slate-950 shadow-xl">
          {renderPhoneStatusBar()}
          <div className="bg-gradient-to-b from-amber-950/40 via-slate-900 to-slate-950 p-4 text-white">
            <div className="flex items-center justify-between border-b border-amber-500/20 pb-2">
              <div className="flex items-center gap-2">
                <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-500 text-slate-950 font-black text-[15px]">
                  ₹
                </span>
                <div>
                  <p className="text-[14px] font-bold text-amber-200">BHIM UPI Payments</p>
                  <p className="text-[11px] text-slate-400 flex items-center gap-1">
                    <Lock size={11} /> NPCI Verified Gateway
                  </p>
                </div>
              </div>
              <span className="rounded-full bg-red-500/30 border border-red-500 px-2.5 py-0.5 text-[11px] font-black text-red-300">
                SCAM ALERT
              </span>
            </div>

            <div className="my-3.5 flex items-center justify-between rounded-2xl bg-slate-800/90 p-4 border border-slate-700">
              <div>
                <span className="text-[12px] font-bold text-slate-400 uppercase">Cashback Claim</span>
                <p className="text-[26px] font-black text-amber-400">₹ 5,000</p>
                <p className="text-[12px] text-slate-300 mt-0.5">Payee: Merchant Reward Promo</p>
              </div>
              <div className="flex flex-col items-end gap-1">
                <span className="text-[11px] text-slate-400 font-semibold">Enter UPI PIN:</span>
                <div className="flex gap-1.5 rounded-lg bg-slate-900 px-3 py-1.5 border border-slate-700">
                  <span className="text-[18px] text-amber-400 font-black tracking-widest">● ● ● ●</span>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2.5 rounded-xl bg-red-950/70 border border-red-500/60 p-3 text-[13px] font-bold text-red-200">
              <AlertTriangle size={20} className="shrink-0 text-red-400" />
              <span>
                {lang === 'hi'
                  ? 'सुनहरा नियम: यूपीआई पिन डालने से पैसे कटते हैं, कभी आते नहीं!'
                  : lang === 'cg'
                  ? 'सुनता नियम: यूपीआई पिन डाले ले पइसा कटथे, कभू आवय नइ!'
                  : 'Golden Rule: Entering your UPI PIN ALWAYS transfers money out of your account!'}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* CASE B: Digital Arrest & Police Video Call Scenarios */}
      {(topic === 'digital_arrest' || topic === 'fake_kyc' || qText.includes('Police') || qText.includes('arrest') || qText.includes('customs')) && (
        <div className="overflow-hidden rounded-[28px] border-[3.5px] border-slate-700 bg-slate-950 shadow-xl">
          {renderPhoneStatusBar()}
          <div className="bg-gradient-to-b from-indigo-950 via-slate-900 to-slate-950 p-4 text-white">
            <div className="flex items-center justify-between border-b border-indigo-800/40 pb-2">
              <div className="flex items-center gap-2">
                <span className="flex h-2.5 w-2.5 rounded-full bg-red-500 animate-ping" />
                <span className="text-[13px] font-bold text-indigo-200">
                  Video Call · 00:44
                </span>
              </div>
              <span className="rounded bg-red-500/30 border border-red-500 px-2 py-0.5 text-[11px] font-black text-red-300">
                DIGITAL ARREST FRAUD
              </span>
            </div>

            <div className="my-3 flex items-center justify-between rounded-2xl bg-slate-800/90 p-3.5 border border-indigo-900">
              <div className="flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-indigo-900 text-indigo-300 font-bold text-[20px]">
                  👮‍♂️
                </div>
                <div>
                  <h4 className="text-[16px] font-black text-white">
                    {lang === 'hi' ? 'फ़र्ज़ी पुलिस / सीबीआई अधिकारी' : lang === 'cg' ? 'फ़र्ज़ी पुलिस / सीबीआई अधिकारी' : 'Fake Police Officer'}
                  </h4>
                  <p className="text-[12px] text-indigo-300">"Your Aadhaar is flagged in illegal parcel. Stay on call!"</p>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-around rounded-xl bg-slate-800/80 p-2.5 border border-slate-700">
              <button type="button" className="flex h-9 w-9 items-center justify-center rounded-full bg-slate-700 text-slate-300">
                <Mic size={17} />
              </button>
              <button
                type="button"
                className="flex items-center gap-2 rounded-full bg-red-600 px-5 py-2 text-[14px] font-black text-white shadow-lg animate-pulse"
              >
                <PhoneOff size={18} />
                <span>{lang === 'hi' ? 'तुरंत कॉल काटें (1930)' : lang === 'cg' ? 'तुरते काल काटव (1930)' : 'Decline & Dial 1930'}</span>
              </button>
              <button type="button" className="flex h-9 w-9 items-center justify-center rounded-full bg-slate-700 text-slate-300">
                <Video size={17} />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* CASE C: Harmful APK Downloads & Phishing Links Scenarios */}
      {(topic === 'links_apps' || qText.includes('.apk') || qText.includes('link') || qText.includes('लिंक')) && (
        <div className="overflow-hidden rounded-[28px] border-[3.5px] border-slate-700 bg-slate-950 shadow-xl">
          {renderPhoneStatusBar()}
          <div className="bg-gradient-to-b from-rose-950/40 via-slate-900 to-slate-950 p-4 text-white">
            <div className="flex items-center justify-between border-b border-rose-500/20 pb-2">
              <span className="flex items-center gap-1.5 text-[13px] font-bold text-rose-300">
                <ShieldAlert size={17} className="text-rose-400" />
                <span>Android Security Prompt</span>
              </span>
              <span className="rounded bg-rose-500/30 border border-rose-500 px-2 py-0.5 text-[11px] font-black text-rose-300">
                BLOCKED
              </span>
            </div>

            <div className="my-3 rounded-2xl bg-slate-800/90 p-3.5 border border-rose-900">
              <p className="font-mono text-[15px] font-bold text-rose-200">
                Bank_KYC_Update.apk
              </p>
              <p className="text-[12px] text-slate-400 mt-0.5">Unknown Publisher · Shared via WhatsApp</p>
              <div className="mt-2 flex flex-wrap gap-1.5 text-[11px] font-bold">
                <span className="rounded bg-red-950 px-2 py-0.5 text-red-300 border border-red-700">
                  ⚠️ Reads all SMS & OTPs
                </span>
                <span className="rounded bg-red-950 px-2 py-0.5 text-red-300 border border-red-700">
                  ⚠️ Full Device Control
                </span>
              </div>
            </div>

            <div className="flex items-center justify-between rounded-xl bg-emerald-950/70 border border-emerald-500/50 p-3 text-[13px] font-bold text-emerald-200">
              <span className="flex items-center gap-1.5">
                <CheckCircle size={17} className="text-emerald-400" />
                <span>{lang === 'hi' ? 'केवल गूगल प्ले स्टोर से ऐप डाउनलोड करें' : lang === 'cg' ? 'सिरिफ गूगल प्ले स्टोर ले ऐप लेवव' : 'Install ONLY from Google Play Store'}</span>
              </span>
              <span className="rounded bg-emerald-700 px-2.5 py-1 text-[11px] text-white">SAFE</span>
            </div>
          </div>
        </div>
      )}

      {/* CASE D: Default Bank SMS & Confidential OTP Thread */}
      {topic !== 'upi_qr' && topic !== 'upi_pin' && topic !== 'digital_arrest' && topic !== 'links_apps' && (
        <div className="overflow-hidden rounded-[28px] border-[3.5px] border-slate-700 bg-slate-950 shadow-xl">
          {renderPhoneStatusBar()}
          <div className="bg-gradient-to-b from-blue-950/40 via-slate-900 to-slate-950 p-4 text-white">
            <div className="flex items-center justify-between border-b border-blue-500/20 pb-2">
              <div className="flex items-center gap-2">
                <div className="flex h-7 w-7 items-center justify-center rounded-full bg-blue-600 text-white font-bold text-[12px]">
                  🏦
                </div>
                <div>
                  <p className="text-[13px] font-bold text-blue-200">AD-HDFCBK (Verified)</p>
                  <p className="text-[10px] text-slate-400 flex items-center gap-1">
                    <Lock size={10} /> SIM 1 · End-to-end encrypted
                  </p>
                </div>
              </div>
              <span className="rounded bg-blue-500/30 border border-blue-500 px-2 py-0.5 text-[11px] font-black text-blue-300">
                OFFICIAL SMS
              </span>
            </div>

            <div className="my-3 rounded-2xl bg-slate-800/90 p-3.5 border border-blue-900">
              <div className="mb-1.5 flex items-center justify-between text-[11px] text-slate-400 font-bold">
                <span>SECURITY CODE ALERT</span>
                <span>Just now</span>
              </div>
              <p className="font-mono text-[14px] font-bold text-white bg-slate-900 p-2.5 rounded-xl border border-slate-800">
                OTP: <span className="text-amber-400 font-black">482913</span> for transaction Rs 5,000. Do NOT share OTP or PIN with anyone.
              </p>
            </div>

            <div className="flex items-center gap-2 rounded-xl bg-blue-950/70 border border-blue-500/50 p-2.5 text-[13px] font-bold text-blue-200">
              <Shield size={18} className="shrink-0 text-blue-400" />
              <span>
                {lang === 'hi'
                  ? 'बैंक अधिकारी या पुलिस कभी आपका गुप्त ओटीपी नहीं माँगते।'
                  : lang === 'cg'
                  ? 'बैंक अधिकारी या पुलिस कभू तुंहर गुप्त ओटीपी नइ मांगंय।'
                  : 'Banks, police, and government officials NEVER ask for your secret OTP.'}
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
