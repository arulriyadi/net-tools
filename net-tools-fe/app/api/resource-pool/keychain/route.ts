import { NextResponse } from "next/server"
import { importSshKey, listSshKeys } from "@/lib/resource-pool/keychain-storage"

export async function GET() {
  try {
    const keys = await listSshKeys()
    return NextResponse.json({ keys })
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to list keys" },
      { status: 500 },
    )
  }
}

export async function POST(request: Request) {
  try {
    const contentType = request.headers.get("content-type") || ""

    if (contentType.includes("multipart/form-data")) {
      const form = await request.formData()
      const name = String(form.get("name") || "").trim()
      const comment = String(form.get("comment") || "").trim()
      const paste = String(form.get("keyContent") || "").trim()
      const file = form.get("file")

      if (!name) {
        return NextResponse.json({ error: "Display name is required" }, { status: 400 })
      }

      let keyContent = paste
      let originalFilename: string | undefined

      if (file instanceof File && file.size > 0) {
        keyContent = await file.text()
        originalFilename = file.name
      }

      if (!keyContent) {
        return NextResponse.json({ error: "Import a key file or paste key content" }, { status: 400 })
      }

      const record = await importSshKey({ name, comment, content: keyContent, originalFilename })
      return NextResponse.json({ key: record }, { status: 201 })
    }

    const body = (await request.json()) as {
      name?: string
      comment?: string
      keyContent?: string
    }

    if (!body.name?.trim() || !body.keyContent?.trim()) {
      return NextResponse.json({ error: "Name and key content are required" }, { status: 400 })
    }

    const record = await importSshKey({
      name: body.name,
      comment: body.comment,
      content: body.keyContent,
    })
    return NextResponse.json({ key: record }, { status: 201 })
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to import key" },
      { status: 400 },
    )
  }
}
