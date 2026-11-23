import { useState } from 'react'
import { Flame, Gift, Lightbulb, Scissors, Shield, Sparkles, X } from 'lucide-react'
import type { Lang } from '../shell/i18n'
import { playQuizSound } from './quizAudio'

export interface LifelineState {
  fiftyFiftyAvailable: number
  clueAvailable: number
  shieldActive: boolean
}

interface QuizSurpriseProps {
  streak: number
  streakRecord: number
  lifelines: LifelineState
  onUseFiftyFifty: () => void
  onUseClue: () => void
  hasMysteryChest: boolean
  onOpenMysteryChest: (reward: 'fiftyFifty' | 'clue' | 'shield') => void
  lang: Lang
  isMuted?: boolean
}

export function QuizSurprise({
  streak,
  lifelines,
  onUseFiftyFifty,
  onUseClue,
  hasMysteryChest,
  onOpenMysteryChest,
  lang,
  isMuted = false,
}: QuizSurpriseProps) {
  const [chestModalOpen, setChestModalOpen] = useState(false)
  const [unlockedReward, setUnlockedReward] = useState<'fiftyFifty' | 'clue' | 'shield' | null>(null)

  const handleOpenChest = () => {
    playQuizSound('mystery', isMuted)
    const rewards: ('fiftyFifty' | 'clue' | 'shield')[] = ['fiftyFifty', 'clue', 'shield']
    const picked = rewards[Math.floor(Math.random() * rewards.length)]
    setUnlockedReward(picked)
    onOpenMysteryChest(picked)
  }

  const closeChestModal = () => {
    setChestModalOpen(false)
    setUnlockedReward(null)
  }

  return (
    <div className="flex flex-wrap items-center justify-between gap-2.5 rounded-2xl border-2 border-line bg-soft/70 px-3.5 py-2">
      {/* Streak Combo Counter */}
      <div className="flex items-center gap-1.5">
        <div
          className={`flex h-9 items-center gap-1 rounded-xl px-2.5 font-bold transition-all ${
            streak >= 5
              ? 'bg-gradient-to-r from-amber-500 to-red-500 text-white shadow-sm animate-pulse'
              : streak >= 2
              ? 'bg-amber-100 text-amber-800 border border-amber-300'
              : 'bg-white text-muted border border-line'
          }`}
        >
          <Flame size={18} className={streak >= 2 ? 'text-orange-500 animate-bounce' : 'text-muted'} />
          <span className="text-[15px]">
            {lang === 'hi' ? `लगातार: ${streak}` : lang === 'cg' ? `लगातार: ${streak}` : `Streak: ${streak}`}
          </span>
          {streak >= 3 && <span className="text-[13px] font-black">🔥 {streak}x</span>}
        </div>

        {lifelines.shieldActive && (
          <div className="flex items-center gap-1 rounded-xl bg-teal-100 border border-teal-300 px-2 py-1 text-[13px] font-bold text-teal-800">
            <Shield size={14} className="text-teal-700" />
            <span>{lang === 'hi' ? 'सुरक्षा कवच' : lang === 'cg' ? 'सुरक्षा कवच' : 'Shield ON'}</span>
          </div>
        )}
      </div>

      {/* Lifelines Action Bar & Mystery Gift */}
      <div className="flex items-center gap-2">
        {/* Surprise Mystery Chest Trigger */}
        {hasMysteryChest && (
          <button
            type="button"
            onClick={() => setChestModalOpen(true)}
            className="flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-amber-400 via-orange-400 to-amber-500 px-3 py-1.5 text-[14px] font-black text-amber-950 shadow-md animate-bounce hover:brightness-105"
          >
            <Gift size={18} className="text-amber-950" />
            <span>{lang === 'hi' ? 'सरप्राइज़ ईनाम!' : lang === 'cg' ? 'अचानक ईनाम!' : 'Mystery Gift!'}</span>
          </button>
        )}

        {/* 50:50 Lifeline Button */}
        <button
          type="button"
          onClick={onUseFiftyFifty}
          disabled={lifelines.fiftyFiftyAvailable <= 0}
          className={`flex items-center gap-1 rounded-xl px-2.5 py-1 text-[13px] font-bold transition-all border ${
            lifelines.fiftyFiftyAvailable > 0
              ? 'bg-white border-brand text-brand hover:bg-blue-50 shadow-xs'
              : 'bg-transparent border-line text-muted/50 cursor-not-allowed opacity-60'
          }`}
          title="Eliminate 2 wrong answers"
        >
          <Scissors size={15} />
          <span>50:50</span>
          {lifelines.fiftyFiftyAvailable > 0 && (
            <span className="rounded-full bg-brand px-1.5 py-0.2 text-[10px] text-white">
              {lifelines.fiftyFiftyAvailable}
            </span>
          )}
        </button>

        {/* Clue Lifeline Button */}
        <button
          type="button"
          onClick={onUseClue}
          disabled={lifelines.clueAvailable <= 0}
          className={`flex items-center gap-1 rounded-xl px-2.5 py-1 text-[13px] font-bold transition-all border ${
            lifelines.clueAvailable > 0
              ? 'bg-white border-amber-500 text-amber-700 hover:bg-amber-50 shadow-xs'
              : 'bg-transparent border-line text-muted/50 cursor-not-allowed opacity-60'
          }`}
          title="Get a hint"
        >
          <Lightbulb size={15} />
          <span>{lang === 'hi' ? 'संकेत' : lang === 'cg' ? 'संकेत' : 'Clue'}</span>
          {lifelines.clueAvailable > 0 && (
            <span className="rounded-full bg-amber-500 px-1.5 py-0.2 text-[10px] text-white">
              {lifelines.clueAvailable}
            </span>
          )}
        </button>
      </div>

      {/* Mystery Gift Reveal Modal */}
      {chestModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs">
          <div className="relative w-full max-w-sm rounded-3xl border-2 border-amber-300 bg-white p-6 text-center shadow-2xl">
            <button
              type="button"
              onClick={closeChestModal}
              className="absolute right-4 top-4 text-muted hover:text-ink"
            >
              <X size={20} />
            </button>

            {!unlockedReward ? (
              <div className="flex flex-col items-center gap-4 py-2">
                <div className="flex h-20 w-20 items-center justify-center rounded-3xl bg-gradient-to-tr from-amber-400 to-orange-500 text-white shadow-lg animate-bounce">
                  <Gift size={44} />
                </div>
                <div>
                  <h3 className="text-[22px] font-black text-ink">
                    {lang === 'hi' ? '🎁 गुप्त सरप्राइज़ उपहार!' : lang === 'cg' ? '🎁 गुप्त अचानक ईनाम!' : '🎁 Mystery Power-Up!'}
                  </h3>
                  <p className="mt-1 text-[15px] text-muted">
                    {lang === 'hi'
                      ? 'शानदार खेल के लिए आपको विशेष सुरक्षा उपहार मिला है!'
                      : lang === 'cg'
                      ? 'बढ़िया खेल बर तुंहला खास सुरक्षा ईनाम मिले हे!'
                      : 'You unlocked a secret power-up for your sharp spotting skills!'}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleOpenChest}
                  className="btn btn-primary w-full !min-h-[54px] !text-[18px]"
                >
                  <Sparkles size={18} />
                  <span>{lang === 'hi' ? 'उपहार खोलें' : lang === 'cg' ? 'ईनाम खोलव' : 'Open Gift'}</span>
                </button>
              </div>
            ) : (
              <div className="flex flex-col items-center gap-4 py-2">
                <div className="flex h-20 w-20 items-center justify-center rounded-3xl bg-emerald-100 text-emerald-600 shadow-md">
                  {unlockedReward === 'fiftyFifty' ? (
                    <Scissors size={44} />
                  ) : unlockedReward === 'clue' ? (
                    <Lightbulb size={44} />
                  ) : (
                    <Shield size={44} />
                  )}
                </div>
                <div>
                  <h3 className="text-[22px] font-black text-emerald-800">
                    {unlockedReward === 'fiftyFifty'
                      ? (lang === 'hi' ? '✂️ 50:50 लाइफ़लाइन अनलॉक्ड!' : lang === 'cg' ? '✂️ 50:50 मदद अनलॉक्ड!' : '✂️ 50:50 Lifeline Unlocked!')
                      : unlockedReward === 'clue'
                      ? (lang === 'hi' ? '💡 गुप्त संकेत अनलॉक्ड!' : lang === 'cg' ? '💡 गुप्त संकेत अनलॉक्ड!' : '💡 Secret Clue Unlocked!')
                      : (lang === 'hi' ? '🛡️ सुरक्षा कवच अनलॉक्ड!' : lang === 'cg' ? '🛡️ सुरक्षा कवच अनलॉक्ड!' : '🛡️ Suraksha Shield Unlocked!')}
                  </h3>
                  <p className="mt-1 text-[15px] text-muted">
                    {unlockedReward === 'fiftyFifty'
                      ? (lang === 'hi' ? 'यह प्रश्न में से 2 गलत विकल्प हटा देगा।' : lang === 'cg' ? 'एहा सवाल म ले 2 गलत विकल्प हटा दिही।' : 'Instantly removes 2 incorrect options from this question.')
                      : unlockedReward === 'clue'
                      ? (lang === 'hi' ? 'यह ठगी को पकड़ने का अचूक संकेत देगा।' : lang === 'cg' ? 'एहा ठगी ला धरे के सटीक इशारा दिही।' : 'Reveals an insider clue pointing out the scam red flag.')
                      : (lang === 'hi' ? 'यह आपकी एक गलती से स्ट्रीक टूटने से बचाएगा।' : lang === 'cg' ? 'एहा तुंहर एक गलती म स्ट्रीक टूटे ले बचाहि।' : 'Protects your streak from your next mistake.')}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={closeChestModal}
                  className="btn btn-primary w-full !min-h-[50px] !text-[17px]"
                >
                  {lang === 'hi' ? 'उपयोग करने चलें' : lang === 'cg' ? 'उपयोग करे बर चलव' : 'Continue Quiz'}
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
