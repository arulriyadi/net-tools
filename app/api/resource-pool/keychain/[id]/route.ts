import { NextRequest, NextResponse } from "next/server"
import { deleteSshKey } from "@/lib/resource-pool/keychain-storage"

export async function DELETE(
  _request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await context.params
    const ok = await deleteSshKey(id)
    if (!ok) {
      return NextResponse.json({ error: "Key not found" }, { status: 404 })
    }
    return NextResponse.json({ ok: true })
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to delete key" },
      { status: 500 },
    )
  }
}
