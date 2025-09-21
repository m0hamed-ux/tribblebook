export function timeAgo(input: Date | string | number | null | undefined): string {
  if (!input) return 'غير متاح'
  const d = input instanceof Date ? input : new Date(input)
  const ts = d.getTime()
  if (Number.isNaN(ts)) return 'غير متاح'
  const now = Date.now()
  let diff = Math.floor((now - ts) / 1000)
  if (diff < 0) diff = 0

  if (diff < 60) return 'الآن'

  const minutes = Math.floor(diff / 60)
  if (minutes < 60) return `منذ ${minutes} د`

  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `منذ ${hours} س`

  const days = Math.floor(hours / 24)
  if (days < 7) return `منذ ${days} يوم`

  const weeks = Math.floor(days / 7)
  if (weeks < 4) return `منذ ${weeks} أسبوع`

  const options: Intl.DateTimeFormatOptions = { day: 'numeric', month: 'long', year: 'numeric' }
  return new Intl.DateTimeFormat('ar-EG', options).format(d)
}

export function wasActiveWithin(input: Date | string | number | null | undefined, ms: number): boolean {
  if (!input) return false
  const d = input instanceof Date ? input : new Date(input)
  const ts = d.getTime()
  if (Number.isNaN(ts)) return false
  return (Date.now() - ts) <= ms
}
