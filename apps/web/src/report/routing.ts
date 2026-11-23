// Module 3 routing. Design rule: money lost always outranks everything else. Pure functions, unit tested for every row.
export type Outcome = 'money_lost' | 'no_money' | 'other_cyber' | 'checking'
export interface Answers {
  outcome: Outcome
  shared?: boolean // only asked when outcome === 'no_money': did you share any code, PIN, card or ID detail?
}
export type ChannelId = 'helpline_1930' | 'bank_then_1930' | 'chakshu' | 'cybercrime_portal' | 'tips'
export type PayMethod = 'upi' | 'card' | 'bank' | 'other'
export const PAY_METHODS: readonly PayMethod[] = ['upi', 'card', 'bank', 'other']
export type PayStepId = 'pay_upi' | 'pay_card' | 'pay_bank' | 'pay_other'
export type StepId = 'call_1930' | 'open_cybercrime' | 'open_chakshu' | 'call_bank' | 'block_cards' | 'keep_evidence' | 'dont_delete' | 'watch_followup' | 'read_tips' | 'open_learn' | PayStepId

export const asPayMethod = (x: unknown): PayMethod | null => ((PAY_METHODS as readonly string[]).includes(x as string) ? (x as PayMethod) : null)

/** withPaymentStep: how the money left decides the first thing to do after calling 1930. It never replaces a step and never adds a question
 *  that must be answered: with no answer the steps are unchanged. */
export function withPaymentStep(steps: StepId[], method: PayMethod | null): StepId[] {
  const at = steps.indexOf('call_1930')
  if (!method || at < 0) return steps
  return [...steps.slice(0, at + 1), `pay_${method}` as PayStepId, ...steps.slice(at + 1)]
}
export interface Route {
  channel: ChannelId
  steps: StepId[]
  primary: 'call_1930' | 'open_cybercrime' | 'open_chakshu' | 'open_learn'
  secondary?: 'open_cybercrime'
}

/** chooseChannel: pure function from answers to a channel and an ordered list of steps (one test per routing-table row). */
export function chooseChannel(a: Answers): Route {
  switch (a.outcome) {
    case 'money_lost':
      return { channel: 'helpline_1930', steps: ['call_1930', 'open_cybercrime', 'block_cards', 'keep_evidence', 'dont_delete'], primary: 'call_1930', secondary: 'open_cybercrime' }
    case 'no_money':
      return a.shared
        ? { channel: 'bank_then_1930', steps: ['call_bank', 'block_cards', 'call_1930', 'keep_evidence', 'dont_delete'], primary: 'call_1930' }
        : { channel: 'chakshu', steps: ['open_chakshu', 'keep_evidence', 'dont_delete', 'watch_followup'], primary: 'open_chakshu' }
    case 'other_cyber':
      return { channel: 'cybercrime_portal', steps: ['open_cybercrime', 'keep_evidence', 'dont_delete'], primary: 'open_cybercrime' }
    default:
      return { channel: 'tips', steps: ['read_tips', 'open_learn'], primary: 'open_learn' }
  }
}

export type ChecklistId = 'screenshot_message' | 'sender_number' | 'call_time' | 'transaction' | 'bank_app' | 'payment_screenshot' | 'links_apps' | 'statement'

/** buildEvidenceChecklist: items the user ticks off, per channel. Never asks for the actual numbers: only to keep them ready. */
export function buildEvidenceChecklist(channel: ChannelId): ChecklistId[] {
  switch (channel) {
    case 'helpline_1930':
      return ['transaction', 'bank_app', 'payment_screenshot', 'statement', 'sender_number', 'screenshot_message', 'call_time', 'links_apps']
    case 'bank_then_1930':
      return ['screenshot_message', 'sender_number', 'bank_app', 'links_apps', 'call_time']
    case 'chakshu':
      return ['screenshot_message', 'sender_number', 'call_time', 'links_apps']
    case 'cybercrime_portal':
      return ['screenshot_message', 'sender_number', 'links_apps']
    default:
      return []
  }
}
