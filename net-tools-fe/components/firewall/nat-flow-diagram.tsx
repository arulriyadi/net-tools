"use client"

import { useState } from "react"
import { ArrowLeft, ArrowLeftRight, ArrowRight } from "lucide-react"
import { cn } from "@/lib/utils"
import type { NatFlow, NatFlowAddress } from "@/lib/firewall/firewall-types"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"

const LIST_PREVIEW_LIMIT = 3

function IpBlock({
  title,
  ip,
  label,
  tone,
}: {
  title: string
  ip: string
  label: string
  tone: "internal" | "external"
}) {
  return (
    <div
      className={cn(
        "min-w-[140px] rounded-lg border px-3 py-2",
        tone === "internal"
          ? "border-primary/30 bg-primary/5"
          : "border-chart-2/40 bg-chart-2/5",
      )}
    >
      <div className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
        {title}
      </div>
      <div className="mt-0.5 font-mono text-sm font-semibold">{ip}</div>
      {label ? (
        <div className="mt-0.5 max-w-[220px] truncate text-[11px] text-muted-foreground">{label}</div>
      ) : null}
    </div>
  )
}

type FlowArrowKind = NatFlow["kind"] | "inbound-only" | "outbound-only"

function FlowArrow({ kind }: { kind: FlowArrowKind }) {
  if (kind === "bidirectional") {
    return (
      <div className="flex flex-col items-center gap-0.5 text-primary">
        <ArrowLeftRight className="h-5 w-5" />
        <span className="font-mono text-xs">&lt;--&gt;</span>
      </div>
    )
  }
  if (kind === "outbound-only") {
    return (
      <div className="flex flex-col items-center gap-0.5 text-muted-foreground">
        <ArrowRight className="h-5 w-5" />
        <span className="font-mono text-xs">--&gt;</span>
      </div>
    )
  }
  return (
    <div className="flex flex-col items-center gap-0.5 text-muted-foreground">
      <ArrowLeft className="h-5 w-5" />
      <span className="font-mono text-xs">&lt;--</span>
    </div>
  )
}

function AddressPreviewList({
  title,
  items,
  dialogTitle,
  dialogDescription,
  tone = "internal",
}: {
  title?: string
  items: NatFlowAddress[]
  dialogTitle: string
  dialogDescription?: string
  tone?: "internal" | "muted"
}) {
  const [open, setOpen] = useState(false)
  const visible = items.slice(0, LIST_PREVIEW_LIMIT)
  const hiddenCount = items.length - visible.length

  if (items.length === 0) return null

  return (
    <>
      <div
        className={cn(
          "min-w-[200px] rounded-lg border px-3 py-2",
          tone === "internal"
            ? "border-primary/30 bg-primary/5"
            : "border-border bg-muted/20",
        )}
      >
        {title ? (
          <div className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
            {title}
          </div>
        ) : null}
        <ol className="mt-1 space-y-0.5">
          {visible.map((item) => (
            <li key={item.ip} className="font-mono text-xs">
              <span className="font-semibold">{item.ip}</span>
              {item.label ? (
                <span className="ml-1 text-[11px] font-normal text-muted-foreground">- {item.label}</span>
              ) : null}
            </li>
          ))}
        </ol>
        {hiddenCount > 0 && (
          <button
            type="button"
            onClick={() => setOpen(true)}
            className="mt-1.5 text-[11px] font-medium text-primary hover:underline"
          >
            View more ({hiddenCount})
          </button>
        )}
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-h-[80vh] max-w-lg overflow-hidden">
          <DialogHeader>
            <DialogTitle>{dialogTitle}</DialogTitle>
            {dialogDescription ? <DialogDescription>{dialogDescription}</DialogDescription> : null}
          </DialogHeader>
          <div className="max-h-[60vh] overflow-y-auto rounded-md border border-border bg-muted/20 p-3">
            <ol className="space-y-1.5 text-xs">
              {items.map((item, index) => (
                <li key={item.ip} className="font-mono leading-snug">
                  <span className="mr-2 text-muted-foreground tabular-nums">{index + 1}.</span>
                  <span className="font-semibold">{item.ip}</span>
                  {item.label ? (
                    <span className="ml-1 font-normal text-muted-foreground">- {item.label}</span>
                  ) : null}
                </li>
              ))}
            </ol>
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}

function SimpleFlowDiagram({ flow }: { flow: NatFlow }) {
  const left = {
    title: "Internal (private)",
    ip: flow.internalIp,
    label: flow.internalLabel,
    tone: "internal" as const,
  }

  const right = {
    title: flow.kind === "inbound-only" ? "Public (exposed on internet)" : "Public (on internet)",
    ip: flow.externalIp,
    label: flow.externalLabel,
    tone: "external" as const,
  }

  return (
    <div className="flex flex-wrap items-center gap-3">
      <IpBlock {...left} />
      <FlowArrow kind={flow.kind} />
      <IpBlock {...right} />
    </div>
  )
}

function MultipleNatDiagram({ flow }: { flow: NatFlow }) {
  const inbound = flow.inboundInternal!
  const outbound = flow.outboundInternals ?? []

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <IpBlock
          title="Internal (private)"
          ip={inbound.ip}
          label={inbound.label}
          tone="internal"
        />
        <FlowArrow kind="inbound-only" />
        <IpBlock
          title="Public (exposed on internet)"
          ip={flow.externalIp}
          label={flow.externalLabel}
          tone="external"
        />
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <AddressPreviewList
          title="Internal (private)"
          items={outbound}
          dialogTitle={`Outbound sources — ${flow.externalIp}`}
          dialogDescription={`${outbound.length} internal hosts`}
        />
        <FlowArrow kind="outbound-only" />
        <IpBlock
          title="Public (on internet)"
          ip={flow.externalIp}
          label={flow.externalLabel}
          tone="external"
        />
      </div>
    </div>
  )
}

function OutboundPoolDiagram({ flow }: { flow: NatFlow }) {
  const outbound = flow.outboundInternals ?? []
  const destinations = flow.outboundDestinations ?? []

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-3">
        <AddressPreviewList
          title="Internal (private)"
          items={outbound}
          dialogTitle={`Outbound sources — ${flow.externalIp}`}
          dialogDescription={`${outbound.length} internal hosts from ${flow.outboundRuleName ?? "NAT rule"}`}
        />
        <FlowArrow kind="outbound-only" />
        <IpBlock
          title="Public (on internet)"
          ip={flow.externalIp}
          label={flow.externalLabel}
          tone="external"
        />
      </div>

      {destinations.length > 0 && (
        <AddressPreviewList
          title="Orig Dst (when matched)"
          items={destinations}
          dialogTitle={`Orig Dst — ${flow.outboundRuleName ?? "NAT rule"}`}
          dialogDescription={`${destinations.length} destination host(s)`}
          tone="muted"
        />
      )}
    </div>
  )
}

export function NatFlowDiagram({ flow }: { flow: NatFlow }) {
  if (flow.kind === "multiple-nat" && flow.inboundInternal && flow.outboundInternals?.length) {
    return <MultipleNatDiagram flow={flow} />
  }
  if (flow.kind === "multiple-nat" && flow.outboundInternals && flow.outboundInternals.length > 1) {
    return <OutboundPoolDiagram flow={flow} />
  }
  return <SimpleFlowDiagram flow={flow} />
}
