import { NextRequest, NextResponse } from "next/server"
import { getNettoolsApiUrl } from "@/lib/nettools-api"

export async function GET(
  _request: NextRequest,
  context: { params: Promise<{ jobId: string }> },
) {
  try {
    const { jobId } = await context.params
    const url = `${getNettoolsApiUrl()}/api/nginx/report-log/report/${jobId}`
    const res = await fetch(url, { cache: "no-store" })

    if (!res.ok) {
      let detail = res.statusText
      try {
        const body = (await res.json()) as { detail?: string }
        detail = body.detail ?? detail
      } catch {
        // ignore
      }
      return NextResponse.json({ error: detail }, { status: res.status })
    }

    const buffer = await res.arrayBuffer()
    const disposition = res.headers.get("content-disposition")
    const filenameMatch = disposition?.match(/filename="?([^";\n]+)"?/)
    const filename = filenameMatch?.[1] ?? `nginx-report-job-${jobId}.pdf`

    return new NextResponse(buffer, {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${filename}"`,
      },
    })
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to download report" },
      { status: 500 },
    )
  }
}
