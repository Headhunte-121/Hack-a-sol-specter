/** goBack: what the Back button does in both layouts. A screen that manages its own inner screens passes `onBack`; otherwise
 *  Back steps through the browser history (so it returns to where the user came from, for example the result after opening a
 *  lesson), and goes to `fallback` only when there is nothing to go back to. */
export function goBack(onBack?: () => void, fallback = '#/') {
  if (onBack) return onBack()
  if (typeof history !== 'undefined' && history.length > 1) history.back()
  else window.location.hash = fallback
}
