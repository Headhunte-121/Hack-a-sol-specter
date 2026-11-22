// Screens that must never be interrupted by an app update (quiz, report form) mark themselves busy.
const busy = new Set<string>()
export function setBusy(key: string, on: boolean) {
  if (on) busy.add(key)
  else busy.delete(key)
}
export const isBusy = () => busy.size > 0
