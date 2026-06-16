import {
  fetchDevices,
  fetchNginxJobs,
  groupToRole,
  latestJobByServer,
  roleToGroup,
  runNginxCheck,
  updateDevice,
  type NginxJobRecord,
  type ServerRecord,
  type CreateServerPayload,
} from "@/lib/resource-pool/servers"
import {
  NGINX_MAINLINE_VERSION,
  NGINX_STABLE_VERSION,
  type NginxFleetLabelMode,
  type NginxServiceView,
  type ServiceCveView,
} from "@/lib/nginx/service-types"
import { resolveNginxFleetDisplayName } from "@/lib/nginx/fleet-display-label"
import { pickNewerNginxVersion } from "@/lib/nginx/nginx-upgrade-versions"

export interface CveFindingRecord {
  cve_id: string
  module: string
  severity: string
  description: string
  status: string
  fixed_stable: string
  fixed_mainline: string
}

export interface CveAssessmentRecord {
  id: number
  server_id: number
  server_name: string | null
  source_job_id: number | null
  status: string
  current_version: string | null
  current_package: string | null
  target_stable: string
  target_mainline: string
  overall_risk: string
  cve_findings: CveFindingRecord[] | null
  recommendation: string | null
  created_at: string
  finished_at: string | null
}

export function isNginxServiceDevice(server: ServerRecord): boolean {
  const role = groupToRole(server.group)
  return role === "nginx-ui" || role === "nginx-proxy"
}

function parseSeverity(raw: string): ServiceCveView["severity"] {
  const s = raw.toUpperCase()
  if (s.includes("CRITICAL")) return "critical"
  if (s.includes("HIGH")) return "high"
  if (s.includes("MEDIUM")) return "medium"
  return "low"
}

function mapCveFinding(f: CveFindingRecord): ServiceCveView {
  return {
    id: f.cve_id,
    severity: parseSeverity(f.severity),
    score: null,
    title: f.description,
    affectedVersions: f.module,
    fixedIn: f.fixed_stable,
    published: "—",
    status: f.status,
    module: f.module,
  }
}

export function mapServerToNginxService(
  server: ServerRecord,
  job?: NginxJobRecord,
  assessment?: CveAssessmentRecord,
): NginxServiceView {
  const result = job?.result
  const nginxActive = result?.nginx_active
  const jobVersion =
    typeof result?.nginx_version === "string" ? result.nginx_version : null
  const installedVersion =
    pickNewerNginxVersion(jobVersion, assessment?.current_version) ?? "—"
  let status: NginxServiceView["status"] = "unknown"
  if (job && job.status === "success") {
    status = nginxActive === true ? "running" : "stopped"
  }

  const openFindings =
    assessment?.cve_findings?.filter((f) => f.status === "open").map(mapCveFinding) ?? []

  const role = groupToRole(server.group)
  const detectedHostname = (result?.hostname as string)?.trim() || server.hostname
  return {
    id: String(server.id),
    displayName: resolveNginxFleetDisplayName(server, detectedHostname),
    name: server.name,
    role: role === "nginx-proxy" ? "nginx-proxy" : "nginx-ui",
    inventoryHostname: server.hostname,
    hostname: detectedHostname,
    fleetLabelMode: (server.nginx_fleet_label_mode as NginxFleetLabelMode | null) ?? null,
    fleetLabelCustom: server.nginx_fleet_label_custom ?? null,
    ip: server.ip,
    os: (result?.os_version as string) ?? "—",
    version: installedVersion,
    latestVersion: assessment?.target_stable ?? NGINX_STABLE_VERSION,
    latestMainlineVersion: assessment?.target_mainline ?? NGINX_MAINLINE_VERSION,
    status,
    lastChecked: job?.finished_at
      ? new Date(job.finished_at).toLocaleString("id-ID")
      : "Never checked",
    sshConfigured: Boolean(server.ssh_key_path),
    overallRisk: assessment?.overall_risk ?? (result?.risk_level as string) ?? "unknown",
    recommendation: assessment?.recommendation ?? null,
    configTestOk: typeof result?.config_test_ok === "boolean" ? result.config_test_ok : null,
    nginxUiActive: typeof result?.nginx_ui_active === "boolean" ? result.nginx_ui_active : null,
    sourceJobId: job?.id ?? assessment?.source_job_id ?? null,
    assessmentId: assessment?.id ?? null,
    cves: openFindings,
  }
}

export function latestAssessmentByServer(
  assessments: CveAssessmentRecord[],
): Map<number, CveAssessmentRecord> {
  const map = new Map<number, CveAssessmentRecord>()
  for (const row of assessments) {
    if (!map.has(row.server_id)) map.set(row.server_id, row)
  }
  return map
}

export async function fetchCveAssessments(limit = 100): Promise<CveAssessmentRecord[]> {
  const res = await fetch(`/api/cve/assessments?limit=${limit}`, { cache: "no-store" })
  if (!res.ok) throw new Error("Failed to load CVE assessments")
  return res.json()
}

export async function loadNginxServiceFleet(): Promise<NginxServiceView[]> {
  const [servers, jobs, assessments] = await Promise.all([
    fetchDevices(),
    fetchNginxJobs(100),
    fetchCveAssessments(100).catch(() => [] as CveAssessmentRecord[]),
  ])

  const jobMap = latestJobByServer(jobs)
  const assessmentMap = latestAssessmentByServer(assessments)

  return servers
    .filter(isNginxServiceDevice)
    .map((s) => mapServerToNginxService(s, jobMap.get(s.id), assessmentMap.get(s.id)))
}

export async function runNginxServiceCheck(serverId: string | number): Promise<void> {
  await runNginxCheck(serverId)
}

export interface NginxUpgradePayload {
  channel: "stable" | "mainline"
  target_version: string
}

export interface NginxUpgradeStartedView {
  job_id: number
  status: "running"
  message: string
}

export interface NginxUpgradeResultView {
  job_id: number | null
  server_id: number
  server_name: string
  channel: string
  target_version: string
  previous_version: string | null
  new_version: string | null
  success: boolean
  message: string
  config_test_ok?: boolean | null
  nginx_active?: boolean | null
}

export async function runNginxUpgrade(
  serverId: string | number,
  payload: NginxUpgradePayload,
): Promise<NginxUpgradeStartedView> {
  const res = await fetch(`/api/nginx/upgrade/${serverId}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  })
  const data = await res.json()
  if (!res.ok && res.status !== 202) {
    throw new Error(data.error ?? data.detail ?? "Upgrade failed")
  }
  return data as NginxUpgradeStartedView
}

async function getServerRecord(serverId: string): Promise<ServerRecord> {
  const servers = await fetchDevices()
  const server = servers.find((s) => String(s.id) === serverId)
  if (!server) throw new Error("Device not found")
  return server
}

function devicePayloadFromServer(
  server: ServerRecord,
  overrides: Partial<CreateServerPayload> = {},
): CreateServerPayload {
  return {
    name: server.name,
    hostname: server.hostname,
    ip: server.ip,
    group: server.group,
    ssh_user: server.ssh_user,
    ssh_key_path: server.ssh_key_path,
    notes: server.notes,
    nginx_fleet_label_mode: server.nginx_fleet_label_mode,
    nginx_fleet_label_custom: server.nginx_fleet_label_custom,
    ...overrides,
  }
}

export async function updateNginxServiceRole(
  serverId: string,
  role: "nginx-ui" | "nginx-proxy",
): Promise<void> {
  const server = await getServerRecord(serverId)
  await updateDevice(serverId, devicePayloadFromServer(server, { group: roleToGroup(role) }))
}

export interface UpdateNginxServiceSettingsInput {
  role?: "nginx-ui" | "nginx-proxy"
  fleetLabelMode?: NginxFleetLabelMode | null
  fleetLabelCustom?: string | null
}

export async function updateNginxServiceSettings(
  serverId: string,
  input: UpdateNginxServiceSettingsInput,
): Promise<void> {
  const server = await getServerRecord(serverId)
  const overrides: Partial<CreateServerPayload> = {}

  if (input.role) {
    overrides.group = roleToGroup(input.role)
  }
  if (input.fleetLabelMode !== undefined) {
    overrides.nginx_fleet_label_mode = input.fleetLabelMode
  }
  if (input.fleetLabelCustom !== undefined) {
    overrides.nginx_fleet_label_custom = input.fleetLabelCustom?.trim() || null
  }

  await updateDevice(serverId, devicePayloadFromServer(server, overrides))
}

export async function removeNginxServiceDevice(serverId: string): Promise<void> {
  const server = await getServerRecord(serverId)
  await updateDevice(
    serverId,
    devicePayloadFromServer(server, { group: roleToGroup("general") }),
  )
}

export { runNginxCheck, fetchDevices, fetchNginxJobs }
