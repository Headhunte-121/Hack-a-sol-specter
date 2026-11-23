import { useEffect, useRef, useState } from 'react'
import {
  AlertTriangle,
  CheckCircle,
  FastForward,
  Film,
  Maximize2,
  Minimize2,
  Pause,
  Phone,
  PhoneOff,
  Play,
  RotateCcw,
  Shield,
  Volume2,
  VolumeX,
} from 'lucide-react'
import type { Lang } from '../shell/i18n'
import type { Question } from './content'
import { pick } from './content'
import { playQuizSound } from './quizAudio'

interface QuizVideoScenarioProps {
  question: Question
  lang: Lang
}

interface StepScene {
  time: number
  title: string
  detail: string
  iconType: 'incoming' | 'threat' | 'trap' | 'defense'
}

export function QuizVideoScenario({ question, lang }: QuizVideoScenarioProps) {
  const [isPlaying, setIsPlaying] = useState(true)
  const [currentTime, setCurrentTime] = useState(0)
  const [isMuted, setIsMuted] = useState(false)
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [userActionTaken, setUserActionTaken] = useState(false)
  const duration = 12
  const timerRef = useRef<number | null>(null)

  const qText = pick(question.question, lang)
  const explanation = pick(question.explanation, lang)

  // 3 Richly Defined Animated Stages
  const scenes: StepScene[] = [
    {
      time: 0,
      title:
        lang === 'hi'
          ? 'दृश्य 1: संदिग्ध कॉल / संदेश का आगमन'
          : lang === 'cg'
          ? 'दृश्य 1: संदेहास्पद काल / संदेसा के आवई'
          : 'Scene 1: Incident Triggered',
      detail: qText.slice(0, 95) + '...',
      iconType: 'incoming',
    },
    {
      time: 4,
      title:
        lang === 'hi'
          ? 'दृश्य 2: ठग का झूठा दबाव एवं लालच'
          : lang === 'cg'
          ? 'दृश्य 2: ठग के झूठा दबाव अउ लालच'
          : 'Scene 2: Scammer Deception & Urgency',
      detail:
        question.topic === 'digital_arrest'
          ? lang === 'hi'
            ? 'धमकी: "कॉल चालू रखें, पुलिस आपको अरेस्ट करने आ रही है, पैसे तुरंत भेजो!"'
            : lang === 'cg'
            ? 'धमकी: "काल चालू रखव, पुलिस तुंहला अरेस्ट करे बर आवत हे, पइसा तुरते भेजव!"'
            : 'Threat: "Stay on video call! Digital arrest warrant issued. Transfer penalty immediately!"'
          : question.topic === 'upi_qr' || question.topic === 'upi_pin'
          ? lang === 'hi'
            ? 'झांसा: "बधाई हो! आपको ₹5,000 कैशबैक मिला है, पिन डालकर तुरंत प्राप्त करें!"'
            : lang === 'cg'
            ? 'झांसा: "बधाई हो! तुंहला ₹5,000 कैशबैक मिले हे, पिन डालके तुरते पावव!"'
            : 'Trick: "Congratulations! You won Rs 5,000 cashback! Enter UPI PIN to claim!"'
          : question.topic === 'links_apps'
          ? lang === 'hi'
            ? 'धोखा: "बैंक खाता तुरंत बंद होने वाला है, इस लिंक से ऐप इंस्टॉल करें!"'
            : lang === 'cg'
            ? 'धोखा: "बैंक खाता तुरते बंद होए वाला हे, ए लिंक ले ऐप डाउनलोड करव!"'
            : 'Trick: "Bank account freezing in 1 hour! Download this APK file to update!"'
          : lang === 'hi'
          ? 'दबाव: "मैं बैंक का मैनेजर बोल रहा हूँ, अपना गुप्त ओटीपी बताइए!"'
          : lang === 'cg'
          ? 'दबाव: "मैं बैंक के मैनेजर बोलत हंव, अपन गुप्त ओटीपी बतावव!"'
          : 'Pressure: "Calling from Bank Security Department. Share your OTP to verify account!"',
      iconType: 'trap',
    },
    {
      time: 8,
      title:
        lang === 'hi'
          ? 'दृश्य 3: सुरक्षा नियम एवं रक्षा कार्रवाई'
          : lang === 'cg'
          ? 'दृश्य 3: सुरक्षा नियम अउ रक्षा कार्रवाई'
          : 'Scene 3: Suraksha Golden Defense',
      detail: explanation.slice(0, 110) + '...',
      iconType: 'defense',
    },
  ]

  const activeSceneIndex = currentTime < 4 ? 0 : currentTime < 8 ? 1 : 2
  const activeScene = scenes[activeSceneIndex]

  // Playhead timer
  useEffect(() => {
    if (!isPlaying) {
      if (timerRef.current) clearInterval(timerRef.current)
      return
    }

    timerRef.current = window.setInterval(() => {
      setCurrentTime((prev) => {
        if (prev >= duration) {
          setIsPlaying(false)
          return duration
        }
        return +(prev + 0.25).toFixed(2)
      })
    }, 250)

    return () => {
      if (timerRef.current) clearInterval(timerRef.current)
    }
  }, [isPlaying, duration])

  const togglePlay = () => {
    if (currentTime >= duration) {
      setCurrentTime(0)
      setUserActionTaken(false)
    }
    setIsPlaying((p) => !p)
  }

  const restart = () => {
    setCurrentTime(0)
    setIsPlaying(true)
    setUserActionTaken(false)
    playQuizSound('mystery', isMuted)
  }

  const seekTo = (sec: number) => {
    setCurrentTime(sec)
    setIsPlaying(true)
  }

  const handleSimulatedDefense = () => {
    setUserActionTaken(true)
    playQuizSound('correct', isMuted)
  }

  return (
    <div
      className={`overflow-hidden rounded-3xl border-2 border-indigo-500/60 bg-slate-950 text-white shadow-2xl transition-all ${
        isFullscreen ? 'fixed inset-4 z-50 flex flex-col justify-between' : 'relative'
      }`}
      data-testid="interactive-video-scenario"
    >
      {/* Top Header Bar */}
      <div className="flex items-center justify-between border-b border-indigo-900/80 bg-indigo-950/90 px-4 py-2.5">
        <div className="flex items-center gap-2.5">
          <span className="relative flex h-3 w-3">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-red-400 opacity-75" />
            <span className="relative inline-flex h-3 w-3 rounded-full bg-red-500" />
          </span>
          <span className="text-[13px] font-black tracking-wider uppercase text-indigo-200">
            {lang === 'hi' ? 'लाइव सिमुलेशन वीडियो' : lang === 'cg' ? 'लाइव सिमुलेशन वीडियो' : 'Live Scenario Simulation'}
          </span>
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => setIsMuted((m) => !m)}
            className="text-indigo-300 hover:text-white transition-colors"
            aria-label={isMuted ? 'Unmute' : 'Mute'}
          >
            {isMuted ? <VolumeX size={18} /> : <Volume2 size={18} />}
          </button>
          <button
            type="button"
            onClick={() => setIsFullscreen((f) => !f)}
            className="text-indigo-300 hover:text-white transition-colors"
            aria-label="Toggle Fullscreen"
          >
            {isFullscreen ? <Minimize2 size={18} /> : <Maximize2 size={18} />}
          </button>
          <span className="font-mono text-[13px] font-bold text-indigo-300">
            00:{Math.floor(currentTime).toString().padStart(2, '0')} / 00:{duration}
          </span>
        </div>
      </div>

      {/* Main Video Stage Viewport */}
      <div className="relative flex min-h-[220px] flex-col justify-between p-5 bg-gradient-to-b from-slate-900 via-indigo-950/90 to-slate-950">
        {/* Animated Visual Screen */}
        <div className="flex flex-col gap-3">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-3.5">
              <div
                className={`flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl shadow-lg transition-all duration-300 ${
                  activeScene.iconType === 'incoming'
                    ? 'bg-blue-600/30 text-blue-300 ring-2 ring-blue-400 animate-pulse'
                    : activeScene.iconType === 'trap'
                    ? 'bg-red-600/30 text-red-300 ring-4 ring-red-500 animate-bounce'
                    : 'bg-emerald-600/30 text-emerald-300 ring-4 ring-emerald-400'
                }`}
              >
                <span className="text-[28px]">
                  {activeScene.iconType === 'incoming' ? '📱' : activeScene.iconType === 'trap' ? '⚠️' : '🛡️'}
                </span>
              </div>

              <div>
                <span className="rounded-md bg-indigo-900 px-2 py-0.5 text-[11px] font-black uppercase tracking-wider text-indigo-300">
                  {activeScene.title}
                </span>
                <p className="mt-1 text-[16px] font-bold text-white leading-snug">
                  {activeScene.detail}
                </p>
              </div>
            </div>
          </div>

          {/* Interactive Action Prompt in Stage 3 */}
          {activeSceneIndex === 2 && (
            <div className="mt-2 flex flex-col gap-2 rounded-2xl bg-indigo-900/60 border border-indigo-400/50 p-3.5 shadow-inner">
              <span className="text-[13px] font-bold text-amber-300 uppercase tracking-wider">
                {lang === 'hi' ? '⚡ सिमुलेशन कार्रवाई: अब आप क्या करेंगे?' : lang === 'cg' ? '⚡ सिमुलेशन कार्रवाई: अब तुमन का करहू?' : '⚡ Defense Action: What will you do right now?'}
              </span>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={handleSimulatedDefense}
                  className="flex items-center gap-2 rounded-xl bg-red-600 px-4 py-2 text-[14px] font-black text-white hover:bg-red-500 shadow-md transition-all"
                >
                  <PhoneOff size={16} />
                  <span>{lang === 'hi' ? 'कॉल काटें और 1930 पर रिपोर्ट करें' : lang === 'cg' ? 'काल काटव अउ 1930 म रपट करव' : 'Hang Up & Dial 1930'}</span>
                </button>
                {userActionTaken && (
                  <span className="flex items-center gap-1.5 rounded-xl bg-emerald-500/20 border border-emerald-400 px-3 py-1.5 text-[13px] font-bold text-emerald-300 animate-fadeIn">
                    <CheckCircle size={16} className="text-emerald-400" />
                    <span>{lang === 'hi' ? 'शाबाश! आपने ठगी रोक ली' : lang === 'cg' ? 'बब्बाल! तुमन ठगी रोक लेव' : 'Protected! Fraud Successfully Blocked'}</span>
                  </span>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Video Scrubber & Scene Markers */}
        <div className="mt-4 flex flex-col gap-1.5">
          <div className="relative h-2.5 w-full overflow-hidden rounded-full bg-slate-900 border border-indigo-900">
            <div
              className="h-full bg-gradient-to-r from-blue-500 via-amber-400 to-emerald-400 transition-all duration-200"
              style={{ width: `${(currentTime / duration) * 100}%` }}
            />
          </div>

          {/* Quick Scene Jump Buttons */}
          <div className="flex justify-between gap-1 pt-1">
            <button
              type="button"
              onClick={() => seekTo(0)}
              className={`rounded-lg px-2 py-0.5 text-[11px] font-bold transition-colors ${
                activeSceneIndex === 0 ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-white'
              }`}
            >
              1. {lang === 'hi' ? 'आगमन' : lang === 'cg' ? 'आवई' : 'Alert'}
            </button>
            <button
              type="button"
              onClick={() => seekTo(4)}
              className={`rounded-lg px-2 py-0.5 text-[11px] font-bold transition-colors ${
                activeSceneIndex === 1 ? 'bg-red-600 text-white' : 'text-slate-400 hover:text-white'
              }`}
            >
              2. {lang === 'hi' ? 'ठग का दबाव' : lang === 'cg' ? 'दबाव' : 'Deception'}
            </button>
            <button
              type="button"
              onClick={() => seekTo(8)}
              className={`rounded-lg px-2 py-0.5 text-[11px] font-bold transition-colors ${
                activeSceneIndex === 2 ? 'bg-emerald-600 text-white' : 'text-slate-400 hover:text-white'
              }`}
            >
              3. {lang === 'hi' ? 'सुरक्षा नियम' : lang === 'cg' ? 'सुरक्षा' : 'Suraksha'}
            </button>
          </div>
        </div>

        {/* Video Bottom Controls */}
        <div className="mt-3.5 flex items-center justify-between border-t border-indigo-900/60 pt-3">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={togglePlay}
              className="flex items-center gap-1.5 rounded-xl bg-brand px-3.5 py-1.5 text-[14px] font-black text-white hover:bg-brand/90 transition-all shadow-sm"
            >
              {isPlaying ? <Pause size={16} /> : <Play size={16} />}
              <span>
                {isPlaying
                  ? lang === 'hi'
                    ? 'रोकें'
                    : lang === 'cg'
                    ? 'रोकव'
                    : 'Pause'
                  : lang === 'hi'
                  ? 'चलाएँ'
                  : lang === 'cg'
                  ? 'चलावव'
                  : 'Play'}
              </span>
            </button>

            <button
              type="button"
              onClick={restart}
              className="flex items-center gap-1 rounded-xl bg-white/10 px-3 py-1.5 text-[13px] font-bold text-indigo-200 hover:bg-white/20 transition-all"
              title="Replay from start"
            >
              <RotateCcw size={15} />
              <span>{lang === 'hi' ? 'दोबारा' : lang === 'cg' ? 'दोबारा' : 'Replay'}</span>
            </button>
          </div>

          <span className="flex items-center gap-1 text-[12px] font-black text-emerald-400">
            <Shield size={14} />
            <span>Interactive Security Lab</span>
          </span>
        </div>
      </div>
    </div>
  )
}
