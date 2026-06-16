export type CommandLogLevel = "success" | "info" | "warning" | "error"

export interface CommandLogEntry {
  id: string
  lineIndex: number
  timestamp: number
  level: CommandLogLevel
  section: string | null
  message: string
  raw: string
}

const SECTION_RE = /^===([A-Z0-9_]+)===$/

function classifyLine(line: string): CommandLogLevel {
  const trimmed = line.trim()
  if (!trimmed) return "info"

  const lower = trimmed.toLowerCase()

  if (
    /^error:/i.test(trimmed) ||
    /\bfailed\b/i.test(trimmed) ||
    /unable to acquire|exit 100|still broken/i.test(trimmed)
  ) {
    return "error"
  }

  if (/warning|warn:|^hint:/i.test(trimmed)) {
    return "warning"
  }

  if (SECTION_RE.test(trimmed)) {
    return "info"
  }

  if (
    /preflight=ok/i.test(trimmed) ||
    /_service=active/i.test(trimmed) ||
    /syntax is ok/i.test(trimmed) ||
    /test is successful/i.test(trimmed) ||
    /upgrade completed/i.test(trimmed) ||
    /finished successfully/i.test(trimmed) ||
    /dashboard inventory refreshed/i.test(trimmed) ||
    /\bpass\b/i.test(trimmed)
  ) {
    return "success"
  }

  if (trimmed.startsWith(">>>")) {
    return "info"
  }

  return "info"
}

function parseSection(line: string): string | null {
  const match = line.trim().match(SECTION_RE)
  return match ? match[1].replace(/_/g, " ") : null
}

function formatSectionLabel(section: string): string {
  return section
    .split(" ")
    .map((part) => part.charAt(0) + part.slice(1).toLowerCase())
    .join(" ")
}

export function parseCommandLog(
  log: string,
  timestamps: Map<number, number>,
  startedAt: number,
): CommandLogEntry[] {
  const lines = log.split("\n")
  let currentSection: string | null = null

  return lines
    .map((raw, lineIndex) => {
      const trimmed = raw.trim()
      const sectionMatch = parseSection(raw)
      if (sectionMatch) {
        currentSection = formatSectionLabel(sectionMatch)
      }

      const timestamp =
        timestamps.get(lineIndex) ?? startedAt + lineIndex * 80

      if (!trimmed) {
        return {
          id: `line-${lineIndex}`,
          lineIndex,
          timestamp,
          level: "info" as const,
          section: currentSection,
          message: "",
          raw,
        }
      }

      return {
        id: `line-${lineIndex}`,
        lineIndex,
        timestamp,
        level: classifyLine(raw),
        section: sectionMatch ? formatSectionLabel(sectionMatch) : currentSection,
        message: trimmed,
        raw,
      }
    })
    .filter((entry) => entry.message.length > 0)
}
