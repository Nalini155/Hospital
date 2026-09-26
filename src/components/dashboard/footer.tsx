'use client'

import { ShieldAlert } from 'lucide-react'

export function DisclaimerFooter() {
  return (
    <footer className="mt-auto border-t border-border bg-background px-4 py-4 sm:px-6 lg:px-8">
      <div className="flex flex-col items-start justify-between gap-2 text-xs text-muted-foreground sm:flex-row sm:items-center">
        <p className="flex items-center gap-1.5">
          <ShieldAlert className="h-3.5 w-3.5 text-muted-foreground" />
          <span>
            <span className="font-medium text-foreground">Disclaimer:</span> This system
            provides capacity &amp; operations risk signals only, not medical diagnosis or
            emergency predictions.
          </span>
        </p>
        <p className="shrink-0">
          © {new Date().getFullYear()} CareFlow Intelligence · Forecast engine v1.0
        </p>
      </div>
    </footer>
  )
}
