import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { LangProvider } from '../shell/i18n'
import { CHAPTERS } from './chapters'
import { ChapterSelect } from './ChapterSelect'
import { QuizScenarioVisual } from './QuizScenarioVisual'
import { QuizVideoScenario } from './QuizVideoScenario'
import { QuizSurprise } from './QuizSurprise'
import quizJson from '../../public/content/quiz.json'
import type { Question } from './content'

;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true

const questions = (quizJson as { questions: Question[] }).questions

let host: HTMLDivElement
let root: Root

const mount = (el: React.ReactElement) =>
  act(() => {
    if (!root) {
      root = createRoot(host)
    }
    root.render(<LangProvider>{el}</LangProvider>)
  })

beforeEach(() => {
  host = document.createElement('div')
  document.body.appendChild(host)
})

afterEach(() => {
  act(() => root?.unmount())
  root = null as any
  host.remove()
  vi.unstubAllGlobals()
})

describe('ChapterSelect UI', () => {
  it('renders all 5 chapters with chapter numbers and question counts', async () => {
    const onSelectChapter = vi.fn()
    const onSelectGrand = vi.fn()
    const onToggleMute = vi.fn()

    await mount(
      <ChapterSelect
        onSelectChapter={onSelectChapter}
        onSelectGrandQuiz={onSelectGrand}
        isMuted={false}
        onToggleMute={onToggleMute}
      />
    )

    // Check that all 5 chapter cards are rendered
    for (const ch of CHAPTERS) {
      expect(host.textContent).toContain(`Chapter ${ch.number}`)
    }

    // Check that 20 questions badge is present
    expect(host.textContent).toContain('20 Questions')

    // Click on chapter 1
    const chapterButtons = host.querySelectorAll('button')
    const startBtn = Array.from(chapterButtons).find((b) => b.textContent?.includes('Start Chapter'))
    expect(startBtn).toBeDefined()
    act(() => startBtn?.click())
    expect(onSelectChapter).toHaveBeenCalledWith(CHAPTERS[0])
  })
})

describe('QuizScenarioVisual and Video', () => {
  it('renders scenario visual without throwing for sample questions', async () => {
    const qOtp = questions.find((q) => q.topic === 'otp_pin_card')!
    await mount(<QuizScenarioVisual question={qOtp} lang="en" />)
    expect(host.textContent).toContain('OFFICIAL SMS')

    const qUpi = questions.find((q) => q.topic === 'upi_qr')!
    await mount(<QuizScenarioVisual question={qUpi} lang="en" />)
    expect(host.textContent).toContain('BHIM UPI')

    const qPolice = questions.find((q) => q.topic === 'digital_arrest')!
    await mount(<QuizScenarioVisual question={qPolice} lang="en" />)
    expect(host.textContent).toContain('Video Call')
  })

  it('renders simulated video scenario with controls', async () => {
    const q = questions[0]
    await mount(<QuizVideoScenario question={q} lang="en" />)
    expect(host.textContent).toContain('Scenario Simulation')
    expect(host.textContent).toContain('Pause')
  })
})

describe('QuizSurprise on final question', () => {
  it('calls onFinishQuiz when closing the mystery chest modal on the final question', async () => {
    const onFinishQuiz = vi.fn()
    const onOpenMysteryChest = vi.fn()
    const onToggleChestModal = vi.fn()

    await mount(
      <QuizSurprise
        streak={3}
        streakRecord={3}
        lifelines={{ fiftyFiftyAvailable: 1, clueAvailable: 1, shieldActive: false }}
        onUseFiftyFifty={vi.fn()}
        onUseClue={vi.fn()}
        hasMysteryChest={true}
        onOpenMysteryChest={onOpenMysteryChest}
        lang="en"
        chestModalOpen={true}
        onToggleChestModal={onToggleChestModal}
        isFinalQuestion={true}
        onFinishQuiz={onFinishQuiz}
      />
    )

    // Modal is open with "Open Gift"
    const openBtn = Array.from(host.querySelectorAll('button')).find((b) => b.textContent?.includes('Open Gift'))
    expect(openBtn).toBeDefined()

    // Click "Open Gift"
    act(() => {
      openBtn?.click()
    })
    expect(onOpenMysteryChest).toHaveBeenCalled()

    // Button should now be "View Results"
    const viewResultsBtn = Array.from(host.querySelectorAll('button')).find((b) => b.textContent?.includes('View Results'))
    expect(viewResultsBtn).toBeDefined()

    // Click "View Results"
    act(() => {
      viewResultsBtn?.click()
    })

    // onFinishQuiz must be called!
    expect(onFinishQuiz).toHaveBeenCalled()
    expect(onToggleChestModal).toHaveBeenCalledWith(false)
  })

  it('calls onFinishQuiz when dismissing via X button on the final question', async () => {
    const onFinishQuiz = vi.fn()
    const onToggleChestModal = vi.fn()

    await mount(
      <QuizSurprise
        streak={3}
        streakRecord={3}
        lifelines={{ fiftyFiftyAvailable: 1, clueAvailable: 1, shieldActive: false }}
        onUseFiftyFifty={vi.fn()}
        onUseClue={vi.fn()}
        hasMysteryChest={true}
        onOpenMysteryChest={vi.fn()}
        lang="en"
        chestModalOpen={true}
        onToggleChestModal={onToggleChestModal}
        isFinalQuestion={true}
        onFinishQuiz={onFinishQuiz}
      />
    )

    // Find the X close button
    const closeBtn = host.querySelector('button.absolute') as HTMLButtonElement | null
    expect(closeBtn).toBeDefined()

    act(() => {
      closeBtn?.click()
    })

    expect(onFinishQuiz).toHaveBeenCalled()
    expect(onToggleChestModal).toHaveBeenCalledWith(false)
  })
})

