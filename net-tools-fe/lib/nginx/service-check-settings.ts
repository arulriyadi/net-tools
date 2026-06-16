export const CHECK_INTERVAL_OPTIONS = [
  { value: "1d", label: "Every 1 day" },
  { value: "2d", label: "Every 2 days" },
  { value: "3d", label: "Every 3 days" },
  { value: "7d", label: "Every 7 days" },
  { value: "1m", label: "Every 1 month" },
] as const

export type ServiceCheckInterval = (typeof CHECK_INTERVAL_OPTIONS)[number]["value"]

export interface NginxServiceCheckSettings {
  interval: ServiceCheckInterval
  /** Local time HH:mm (24h), e.g. 00:00 */
  checkTime: string
}

export const DEFAULT_SERVICE_CHECK_SETTINGS: NginxServiceCheckSettings = {
  interval: "1d",
  checkTime: "00:00",
}

const STORAGE_KEY = "nettools:nginx-service-check-settings"

function addInterval(date: Date, interval: ServiceCheckInterval) {
  switch (interval) {
    case "1d":
      date.setDate(date.getDate() + 1)
      break
    case "2d":
      date.setDate(date.getDate() + 2)
      break
    case "3d":
      date.setDate(date.getDate() + 3)
      break
    case "7d":
      date.setDate(date.getDate() + 7)
      break
    case "1m":
      date.setMonth(date.getMonth() + 1)
      break
  }
}

export function loadServiceCheckSettings(): NginxServiceCheckSettings {
  if (typeof window === "undefined") return DEFAULT_SERVICE_CHECK_SETTINGS
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return DEFAULT_SERVICE_CHECK_SETTINGS
    const parsed = JSON.parse(raw) as Partial<NginxServiceCheckSettings>
    const interval = CHECK_INTERVAL_OPTIONS.some((o) => o.value === parsed.interval)
      ? parsed.interval!
      : DEFAULT_SERVICE_CHECK_SETTINGS.interval
    const checkTime =
      typeof parsed.checkTime === "string" && /^\d{2}:\d{2}$/.test(parsed.checkTime)
        ? parsed.checkTime
        : DEFAULT_SERVICE_CHECK_SETTINGS.checkTime
    return { interval, checkTime }
  } catch {
    return DEFAULT_SERVICE_CHECK_SETTINGS
  }
}

export function saveServiceCheckSettings(settings: NginxServiceCheckSettings): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(settings))
}

export function formatCheckSchedule(settings: NginxServiceCheckSettings): string {
  const option = CHECK_INTERVAL_OPTIONS.find((o) => o.value === settings.interval)
  return `${option?.label ?? settings.interval} at ${settings.checkTime}`
}

export function computeNextCheckAt(
  settings: NginxServiceCheckSettings,
  from = new Date(),
): Date {
  const [h, m] = settings.checkTime.split(":").map(Number)
  const next = new Date(from)
  next.setSeconds(0, 0)
  next.setMilliseconds(0)
  next.setHours(h, m, 0, 0)
  while (next <= from) {
    addInterval(next, settings.interval)
  }
  return next
}

export function formatNextCheckAt(settings: NginxServiceCheckSettings, from = new Date()): string {
  return computeNextCheckAt(settings, from).toLocaleString("id-ID", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  })
}
