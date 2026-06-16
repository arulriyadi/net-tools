/**
 * One-time helper: import Palo CSV exports into a network device's dataset_data.
 * Usage (from net-tools):
 *   npx tsx scripts/seed-firewall-dataset.ts <device-id>
 */
import { readFileSync } from "node:fs"
import { resolve } from "node:path"
import { parsePaloCsvImport } from "../lib/firewall/palo-csv-import"

const API_BASE = process.env.NET_TOOLS_API ?? "http://127.0.0.1:8090"

const CSV_FILES: Record<string, string> = {
  security_rules:
    "../../Network-Jabar/Palo-Alto/security-rule/export_policies_security_rulebase_06132026_005249gmt+7.csv",
  nat_rules:
    "../../Network-Jabar/Palo-Alto/nat-rule/export_policies_nat_rulebase_06132026_005343gmt+7.csv",
  address_objects:
    "../../Network-Jabar/Palo-Alto/route-vr-default/export_objects_addresses_06112026_172544gmt+7.csv",
  static_routes:
    "../../Network-Jabar/Palo-Alto/route-vr-default/latest-static-route-vr-default-757-v2.csv",
}

async function main() {
  const deviceId = process.argv[2]
  if (!deviceId) {
    console.error("Usage: npx tsx scripts/seed-firewall-dataset.ts <device-id>")
    process.exit(1)
  }

  const getRes = await fetch(`${API_BASE}/api/network-devices/${deviceId}`)
  if (!getRes.ok) throw new Error(`Device not found: ${deviceId}`)
  const device = (await getRes.json()) as {
    dataset_bindings: Array<{ capabilityKey: string; [key: string]: unknown }>
    dataset_data: Record<string, unknown>
  }

  const datasetData = { ...(device.dataset_data ?? {}) }
  const bindings = [...(device.dataset_bindings ?? [])]
  const now = new Date().toISOString()

  for (const [capabilityKey, relativePath] of Object.entries(CSV_FILES)) {
    const filePath = resolve(__dirname, relativePath)
    const csvText = readFileSync(filePath, "utf8")
    const parsed = parsePaloCsvImport(
      capabilityKey as keyof typeof CSV_FILES,
      csvText,
    )
    datasetData[capabilityKey] = parsed.rows

    const idx = bindings.findIndex((b) => b.capabilityKey === capabilityKey)
    const patch = {
      source: "import",
      importFileName: relativePath.split("/").pop(),
      rowCount: parsed.count,
      lastSyncAt: now,
      syncStatus: "ok",
      syncMessage: undefined,
    }
    if (idx >= 0) {
      bindings[idx] = { ...bindings[idx], ...patch }
    }
    console.log(`${capabilityKey}: ${parsed.count} rows`)
  }

  const patchRes = await fetch(`${API_BASE}/api/network-devices/${deviceId}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      dataset_bindings: bindings,
      dataset_data: datasetData,
    }),
  })
  if (!patchRes.ok) {
    const err = await patchRes.text()
    throw new Error(`PATCH failed: ${err}`)
  }
  console.log(`Updated device ${deviceId}`)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
