/** Truncates to at most `max` chars, adding an ellipsis if it had to cut. */
export function truncate(s: string, max: number): string {
  if (s.length <= max) return s
  return s.slice(0, Math.max(0, max - 1)) + '…'
}
