import { mkdir, readFile, writeFile, unlink, chmod } from "fs/promises"
import path from "path"
import crypto from "crypto"

export interface SshKeyRecord {
  id: string
  name: string
  /** Relative path inside keys directory, e.g. key-abc123 */
  storagePath: string
  /** Display path for UI */
  path: string
  fingerprint?: string
  comment?: string
  addedAt: string
  keyType?: string
}

interface RegistryFile {
  keys: SshKeyRecord[]
}

const REGISTRY_FILENAME = "registry.json"

/** Default SSH key storage — outside app tree, prod-safe layout */
export const DEFAULT_SSH_KEYS_DIR = "/opt/nettools/data/keys"

export function getKeysDirectory(): string {
  return process.env.NETTOOLS_SSH_KEYS_DIR || DEFAULT_SSH_KEYS_DIR
}

function registryPath(): string {
  return path.join(getKeysDirectory(), REGISTRY_FILENAME)
}

function keyFilePath(storagePath: string): string {
  return path.join(getKeysDirectory(), storagePath)
}

export async function ensureKeysDirectory(): Promise<void> {
  const dir = getKeysDirectory()
  await mkdir(dir, { recursive: true, mode: 0o700 })
}

async function readRegistry(): Promise<RegistryFile> {
  await ensureKeysDirectory()
  try {
    const raw = await readFile(registryPath(), "utf8")
    return JSON.parse(raw) as RegistryFile
  } catch {
    return { keys: [] }
  }
}

async function writeRegistry(data: RegistryFile): Promise<void> {
  await writeFile(registryPath(), JSON.stringify(data, null, 2), { mode: 0o600 })
}

export async function listSshKeys(): Promise<SshKeyRecord[]> {
  const registry = await readRegistry()
  return registry.keys.sort((a, b) => b.addedAt.localeCompare(a.addedAt))
}

function detectKeyType(content: string): string {
  if (content.includes("OPENSSH PRIVATE KEY")) return "OpenSSH"
  if (content.includes("RSA PRIVATE KEY")) return "RSA"
  if (content.includes("EC PRIVATE KEY")) return "EC"
  if (content.includes("PRIVATE KEY")) return "PEM"
  return "unknown"
}

function validatePrivateKey(content: string): void {
  const trimmed = content.trim()
  if (!trimmed.includes("PRIVATE KEY")) {
    throw new Error("Invalid key format — expected PEM or OpenSSH private key")
  }
}

function fingerprintFromContent(content: string): string {
  const hash = crypto.createHash("sha256").update(content.trim()).digest("base64")
  return `SHA256:${hash.slice(0, 20)}…`
}

export async function importSshKey(input: {
  name: string
  comment?: string
  content: string
  originalFilename?: string
}): Promise<SshKeyRecord> {
  validatePrivateKey(input.content)
  await ensureKeysDirectory()

  const id = `key-${Date.now()}-${crypto.randomBytes(4).toString("hex")}`
  const storagePath = `${id}.key`
  const absPath = keyFilePath(storagePath)

  await writeFile(absPath, input.content.trim() + "\n", { mode: 0o600 })
  await chmod(absPath, 0o600)

  const record: SshKeyRecord = {
    id,
    name: input.name.trim(),
    storagePath,
    path: path.join(getKeysDirectory(), storagePath),
    fingerprint: fingerprintFromContent(input.content),
    comment: input.comment?.trim() || input.originalFilename,
    addedAt: new Date().toISOString().slice(0, 10),
    keyType: detectKeyType(input.content),
  }

  const registry = await readRegistry()
  registry.keys.unshift(record)
  await writeRegistry(registry)

  return record
}

export async function deleteSshKey(id: string): Promise<boolean> {
  const registry = await readRegistry()
  const index = registry.keys.findIndex((k) => k.id === id)
  if (index === -1) return false

  const [removed] = registry.keys.splice(index, 1)
  await writeRegistry(registry)

  try {
    await unlink(keyFilePath(removed.storagePath))
  } catch {
    // file may already be missing
  }
  return true
}

export async function getSshKeyPath(id: string): Promise<string | null> {
  const registry = await readRegistry()
  const record = registry.keys.find((k) => k.id === id)
  if (!record) return null
  return keyFilePath(record.storagePath)
}
