export interface SshKeyEntry {
  id: string
  name: string
  path: string
  fingerprint?: string
  comment?: string
  addedAt: string
  keyType?: string
}

export async function fetchSshKeys(): Promise<SshKeyEntry[]> {
  const res = await fetch("/api/resource-pool/keychain", { cache: "no-store" })
  if (!res.ok) throw new Error("Failed to load keychain")
  const data = (await res.json()) as { keys: SshKeyEntry[] }
  return data.keys
}

export async function importSshKeyApi(form: FormData): Promise<SshKeyEntry> {
  const res = await fetch("/api/resource-pool/keychain", {
    method: "POST",
    body: form,
  })
  const data = await res.json()
  if (!res.ok) throw new Error(data.error ?? "Import failed")
  return data.key as SshKeyEntry
}

export async function deleteSshKeyApi(id: string): Promise<void> {
  const res = await fetch(`/api/resource-pool/keychain/${id}`, { method: "DELETE" })
  if (!res.ok) {
    const data = await res.json()
    throw new Error(data.error ?? "Delete failed")
  }
}

/** @deprecated use fetchSshKeys — kept for sync lookup after keys loaded */
export function findSshKeyInList(id: string, keys: SshKeyEntry[]): SshKeyEntry | undefined {
  return keys.find((k) => k.id === id)
}
