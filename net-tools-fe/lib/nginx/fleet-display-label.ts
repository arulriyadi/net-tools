export type NginxFleetLabelMode = "name" | "hostname" | "custom"

export interface FleetLabelSource {
  name: string
  hostname: string
  nginx_fleet_label_mode?: string | null
  nginx_fleet_label_custom?: string | null
}

export interface AssetNameSuggestion {
  value: string
  hint: string
}

export function resolveDetectedHostname(
  inventoryHostname: string,
  detectedHostname?: string | null,
): string {
  return detectedHostname?.trim() || inventoryHostname
}

export function buildAssetNameSuggestions(
  name: string,
  inventoryHostname: string,
  detectedHostname?: string | null,
): AssetNameSuggestion[] {
  const hostname = resolveDetectedHostname(inventoryHostname, detectedHostname)
  const items: AssetNameSuggestion[] = [
    { value: name, hint: "Device name" },
    { value: hostname, hint: "Hostname" },
  ]
  return items.filter((item, index, arr) => arr.findIndex((x) => x.value === item.value) === index)
}

export function resolveNginxFleetDisplayName(
  source: FleetLabelSource,
  detectedHostname?: string,
): string {
  const fallback = detectedHostname?.trim() || source.hostname
  const mode = source.nginx_fleet_label_mode as NginxFleetLabelMode | null | undefined

  switch (mode) {
    case "name":
      return source.name
    case "hostname":
      return source.hostname
    case "custom": {
      const custom = source.nginx_fleet_label_custom?.trim()
      return custom || source.name
    }
    default:
      return fallback
  }
}

export function resolveFleetLabelFromInput(
  value: string,
  name: string,
  inventoryHostname: string,
  detectedHostname?: string | null,
): { mode: NginxFleetLabelMode | null; custom: string | null } {
  const trimmed = value.trim()
  if (trimmed === name) return { mode: "name", custom: null }
  if (trimmed === inventoryHostname) return { mode: "hostname", custom: null }

  const detected = detectedHostname?.trim()
  if (detected && trimmed === detected) {
    return { mode: null, custom: null }
  }

  return { mode: "custom", custom: trimmed }
}
