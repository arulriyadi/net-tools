/** Stable number formatting for SSR/client (avoids locale hydration mismatch). */
export function formatNumber(value: number): string {
  return new Intl.NumberFormat("en-US").format(value)
}
