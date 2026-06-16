import Link from "next/link"

function NetToolsMark() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" fill="none" aria-hidden="true" className="h-full w-full">
      <rect width="48" height="48" rx="11" fill="#ffffff" />
      <path d="M11 35C11 35 18 30 24 24C30 18 37 13 37 13" stroke="#1B8755" strokeWidth="3.2" strokeLinecap="round" />
      <path d="M11 13C11 13 18 18 24 24C30 30 37 35 37 35" stroke="#00A3E0" strokeWidth="3.2" strokeLinecap="round" />
      <path d="M24 10V24" stroke="#FDB913" strokeWidth="3.2" strokeLinecap="round" />
      <path d="M24 24L34 30" stroke="#FDB913" strokeWidth="3.2" strokeLinecap="round" />
      <circle cx="11" cy="13" r="4.2" fill="#00A3E0" />
      <circle cx="11" cy="35" r="4.2" fill="#1B8755" />
      <circle cx="37" cy="35" r="4.2" fill="#FDB913" />
      <circle cx="24" cy="10" r="3.6" fill="#FDB913" />
      <circle cx="24" cy="24" r="5.2" fill="#1565c0" />
      <circle cx="24" cy="24" r="2.2" fill="#ffffff" />
    </svg>
  )
}

export function BrandLogo({ compact = false }: { compact?: boolean }) {
  return (
    <Link href="/" className="flex items-center gap-2.5 shrink-0">
      <div className="flex h-[42px] w-[42px] items-center justify-center overflow-hidden rounded-[10px] border border-border bg-white p-0.5 shadow-sm dark:bg-white">
        <NetToolsMark />
      </div>
      {!compact && (
        <span className="font-semibold text-foreground tracking-tight">Net-Tools</span>
      )}
    </Link>
  )
}
