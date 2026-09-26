export function CareFlowLogo({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 40 40"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden="true"
    >
      <rect width="40" height="40" rx="10" fill="oklch(0.46 0.11 210)" />
      {/* Pulse / flow line */}
      <path
        d="M7 22.5 H13 L16 14 L20 28 L23 18.5 L25.5 22.5 H33"
        stroke="white"
        strokeWidth="2.4"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
      <circle cx="33" cy="22.5" r="2.4" fill="oklch(0.78 0.16 70)" />
    </svg>
  )
}

export function CareFlowWordmark({ className }: { className?: string }) {
  return (
    <div className={`flex items-center gap-2.5 ${className ?? ''}`}>
      <CareFlowLogo className="h-8 w-8 shrink-0" />
      <div className="flex flex-col leading-tight">
        <span className="text-[15px] font-semibold tracking-tight text-foreground">
          CareFlow
        </span>
        <span className="text-[10px] font-medium uppercase tracking-[0.18em] text-muted-foreground">
          Intelligence
        </span>
      </div>
    </div>
  )
}
