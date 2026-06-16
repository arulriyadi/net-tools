import type {
  ConnectorAuthMethod,
  ConnectorProtocol,
  ConnectorStatus,
  DataConnectorFormData,
  DataConnectorRecord,
  PollMode,
} from "@/lib/resource-pool/data-connectors-mock"
import { buildEndpointPattern } from "@/lib/resource-pool/connector-endpoint"

export interface DataConnectorApiRecord {
  id: string
  name: string
  vendor: string
  protocol: ConnectorProtocol
  compatible_categories: string[]
  capability_keys: string[]
  description: string
  default_port: number | null
  endpoint_pattern: string
  auth_methods: ConnectorAuthMethod[]
  poll_mode: PollMode
  default_interval_minutes: number | null
  parser_id: string
  status: ConnectorStatus
  type_count: number
  created_at: string
  updated_at: string
}

export interface DataConnectorCreatePayload {
  id?: string
  name: string
  vendor: string
  protocol: ConnectorProtocol
  compatible_categories: string[]
  capability_keys: string[]
  description?: string
  default_port?: number | null
  endpoint_pattern?: string
  auth_methods: ConnectorAuthMethod[]
  poll_mode: PollMode
  default_interval_minutes?: number | null
  parser_id?: string
  status: ConnectorStatus
}

export function mapConnectorFromApi(record: DataConnectorApiRecord): DataConnectorRecord {
  return {
    id: record.id,
    name: record.name,
    vendor: record.vendor,
    protocol: record.protocol,
    compatibleCategories: record.compatible_categories as DataConnectorRecord["compatibleCategories"],
    capabilityKeys: record.capability_keys,
    description: record.description,
    defaultPort: record.default_port,
    endpointPattern: record.endpoint_pattern,
    authMethods: record.auth_methods,
    pollMode: record.poll_mode,
    defaultIntervalMinutes: record.default_interval_minutes,
    parserId: record.parser_id,
    status: record.status,
    typeCount: record.type_count,
    createdAt: record.created_at,
    updatedAt: record.updated_at,
  }
}

export function mapConnectorFormToPayload(form: DataConnectorFormData): DataConnectorCreatePayload {
  const port = form.defaultPort.trim() ? Number(form.defaultPort) : null
  const interval = form.defaultIntervalMinutes.trim()
    ? Number(form.defaultIntervalMinutes)
    : null

  return {
    name: form.name.trim(),
    vendor: form.vendor.trim(),
    protocol: form.protocol,
    compatible_categories: form.compatibleCategories,
    capability_keys: form.capabilityKeys,
    description: form.description.trim(),
    default_port: Number.isFinite(port) ? port : null,
    endpoint_pattern: buildEndpointPattern(form).trim(),
    auth_methods: form.authMethods,
    poll_mode: form.pollMode,
    default_interval_minutes:
      form.pollMode === "interval" && Number.isFinite(interval) ? interval : null,
    parser_id: form.parserId.trim() || "custom-parser",
    status: form.status,
  }
}

export async function fetchDataConnectors(): Promise<DataConnectorRecord[]> {
  const res = await fetch("/api/resource-pool/data-connectors", { cache: "no-store" })
  if (!res.ok) throw new Error("Failed to load data connectors")
  const data = (await res.json()) as DataConnectorApiRecord[]
  return data.map(mapConnectorFromApi)
}

export async function createDataConnector(form: DataConnectorFormData): Promise<DataConnectorRecord> {
  const res = await fetch("/api/resource-pool/data-connectors", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(mapConnectorFormToPayload(form)),
  })
  const data = await res.json()
  if (!res.ok) throw new Error(data.error ?? "Failed to create data connector")
  return mapConnectorFromApi(data as DataConnectorApiRecord)
}

export async function updateDataConnector(
  id: string,
  form: DataConnectorFormData,
): Promise<DataConnectorRecord> {
  const res = await fetch(`/api/resource-pool/data-connectors/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(mapConnectorFormToPayload(form)),
  })
  const data = await res.json()
  if (!res.ok) throw new Error(data.error ?? "Failed to update data connector")
  return mapConnectorFromApi(data as DataConnectorApiRecord)
}

export async function deleteDataConnector(id: string): Promise<void> {
  const res = await fetch(`/api/resource-pool/data-connectors/${id}`, { method: "DELETE" })
  if (!res.ok) {
    const data = await res.json()
    throw new Error(data.error ?? "Failed to delete data connector")
  }
}
