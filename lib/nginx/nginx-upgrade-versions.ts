import {
  NGINX_MAINLINE_VERSION,
  NGINX_STABLE_VERSION,
} from "@/lib/nginx/service-types"

export type NginxUpgradeChannel = "stable" | "mainline"

export interface NginxUpgradeVersionOption {
  id: string
  channel: NginxUpgradeChannel
  version: string
  label: string
  hint: string
}

export function parseNginxVersion(version: string | null | undefined): [number, number, number] | null {
  if (!version) return null
  const match = version.match(/(\d+)\.(\d+)\.(\d+)/)
  if (!match) return null
  return [Number(match[1]), Number(match[2]), Number(match[3])]
}

export function nginxVersionLt(current: string | null | undefined, target: string): boolean {
  const cur = parseNginxVersion(current)
  const tgt = parseNginxVersion(target)
  if (!cur || !tgt) return false
  for (let i = 0; i < 3; i++) {
    if (cur[i] < tgt[i]) return true
    if (cur[i] > tgt[i]) return false
  }
  return false
}

export function isNginxOutdated(
  installed: string,
  targetStable: string = NGINX_STABLE_VERSION,
): boolean {
  if (!installed || installed === "—") return false
  return nginxVersionLt(installed, targetStable)
}

/** Pick the newer nginx semver from two optional version strings. */
export function pickNewerNginxVersion(
  a: string | null | undefined,
  b: string | null | undefined,
): string | null {
  if (!a) return b ?? null
  if (!b) return a
  return nginxVersionLt(a, b) ? b : a
}

export function buildNginxUpgradeOptions(
  installed: string,
  targetStable: string = NGINX_STABLE_VERSION,
  targetMainline: string = NGINX_MAINLINE_VERSION,
): NginxUpgradeVersionOption[] {
  const options: NginxUpgradeVersionOption[] = []

  if (nginxVersionLt(installed, targetStable)) {
    options.push({
      id: `stable:${targetStable}`,
      channel: "stable",
      version: targetStable,
      label: `Stable ${targetStable}`,
      hint: "nginx.org stable branch (recommended for production)",
    })
  }

  if (
    nginxVersionLt(installed, targetMainline) &&
    targetMainline !== targetStable
  ) {
    options.push({
      id: `mainline:${targetMainline}`,
      channel: "mainline",
      version: targetMainline,
      label: `Mainline ${targetMainline}`,
      hint: "nginx.org mainline — newest features, shorter support cycle",
    })
  }

  return options
}

export function defaultUpgradeOptionId(options: NginxUpgradeVersionOption[]): string | null {
  const stable = options.find((o) => o.channel === "stable")
  return stable?.id ?? options[0]?.id ?? null
}
