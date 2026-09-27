/** «27.09.2026» из момента сборки ISO 8601 — по местному времени планшета. */
export function formatBuildDate(iso: string): string {
  const date = new Date(iso)
  const two = (n: number) => String(n).padStart(2, '0')
  return `${two(date.getDate())}.${two(date.getMonth() + 1)}.${date.getFullYear()}`
}
