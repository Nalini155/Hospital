'use client'

import { UpdateBedsView } from '@/components/views/reception-update-beds-view'
import { UpdateIcuView } from '@/components/views/reception-update-icu-view'

/**
 * Daily Entry — a combined view that renders the Update Beds and Update ICU
 * forms together, so a reception user can enter all of today's data on one
 * screen without switching tabs. Each form independently saves + invalidates
 * the shared data queries so numbers reflect across the app in real time.
 */
export function DailyEntryView() {
  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-xl font-semibold tracking-tight text-foreground">Daily Entry</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Update today&rsquo;s ward &amp; ICU bed numbers in one place. Each section saves
          independently and reflects across the main dashboard in real time.
        </p>
      </div>
      <UpdateBedsView />
      <UpdateIcuView />
    </div>
  )
}
