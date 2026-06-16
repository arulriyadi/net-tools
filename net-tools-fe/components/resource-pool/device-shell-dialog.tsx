"use client"

import { useEffect, useRef, useState } from "react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Loader2 } from "lucide-react"
import { getDeviceShellWsUrl } from "@/lib/resource-pool/servers"
import type { Device } from "./device-inventory"

interface DeviceShellDialogProps {
  device: Device | null
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function DeviceShellDialog({ device, open, onOpenChange }: DeviceShellDialogProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const wsRef = useRef<WebSocket | null>(null)
  const termRef = useRef<{ dispose: () => void } | null>(null)
  const [status, setStatus] = useState<"connecting" | "open" | "closed">("connecting")

  useEffect(() => {
    if (!open || !device) return

    let cancelled = false

    ;(async () => {
      const [{ Terminal }, { FitAddon }] = await Promise.all([
        import("@xterm/xterm"),
        import("@xterm/addon-fit"),
      ])
      await import("@xterm/xterm/css/xterm.css")

      if (cancelled || !containerRef.current) return

      const term = new Terminal({
        cursorBlink: true,
        fontSize: 13,
        fontFamily: "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace",
        theme: {
          background: "#0a0a0a",
          foreground: "#e5e5e5",
          cursor: "#22c55e",
        },
      })
      const fitAddon = new FitAddon()
      term.loadAddon(fitAddon)
      term.open(containerRef.current)
      fitAddon.fit()
      termRef.current = term

      const ws = new WebSocket(getDeviceShellWsUrl(device.id))
      wsRef.current = ws
      setStatus("connecting")

      ws.onopen = () => {
        setStatus("open")
        term.writeln("\x1b[90mEstablishing SSH session…\x1b[0m")
        fitAddon.fit()
        term.focus()
        ws.send(
          JSON.stringify({
            type: "resize",
            cols: term.cols,
            rows: term.rows,
          }),
        )
      }

      ws.onmessage = (event) => {
        term.write(typeof event.data === "string" ? event.data : "")
      }

      ws.onclose = () => {
        setStatus("closed")
        term.writeln("\r\n\x1b[90mSession closed.\x1b[0m")
      }

      ws.onerror = () => {
        term.writeln("\r\n\x1b[31mWebSocket connection failed.\x1b[0m")
        setStatus("closed")
      }

      term.onData((data) => {
        if (ws.readyState === WebSocket.OPEN) {
          ws.send(JSON.stringify({ type: "input", data }))
        }
      })

      const onResize = () => {
        fitAddon.fit()
        if (ws.readyState === WebSocket.OPEN) {
          ws.send(
            JSON.stringify({
              type: "resize",
              cols: term.cols,
              rows: term.rows,
            }),
          )
        }
      }
      window.addEventListener("resize", onResize)

      termRef.current = {
        dispose: () => {
          window.removeEventListener("resize", onResize)
          ws.close()
          term.dispose()
        },
      }
    })()

    return () => {
      cancelled = true
      termRef.current?.dispose()
      termRef.current = null
      wsRef.current = null
      setStatus("connecting")
    }
  }, [open, device])

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-4xl p-0 gap-0 overflow-hidden">
        <DialogHeader className="px-4 py-3 border-b border-border">
          <DialogTitle>Shell — {device?.name}</DialogTitle>
          <DialogDescription>
            {device?.sshUser ?? "root"}@{device?.ip} · WebSocket → SSH
            {status === "connecting" && " · connecting…"}
            {status === "open" && " · connected"}
            {status === "closed" && " · disconnected"}
          </DialogDescription>
        </DialogHeader>
        <div className="relative bg-[#0a0a0a] min-h-[420px]">
          {status === "connecting" && (
            <div className="absolute inset-0 flex items-center justify-center text-muted-foreground bg-background/80 z-10">
              <Loader2 className="h-6 w-6 animate-spin mr-2" />
              Opening terminal…
            </div>
          )}
          <div ref={containerRef} className="h-[420px] w-full p-2" />
        </div>
      </DialogContent>
    </Dialog>
  )
}
