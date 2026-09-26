'use client'

import { useState } from 'react'
import { HeartPulse, Save, Loader2, CircleAlert, ShieldCheck } from 'lucide-react'
import {
  useReceptionIcu,
  useUpdateIcu,
} from '@/hooks/use-api'
import { SectionCard } from '@/components/views/shared'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Skeleton } from '@/components/ui/skeleton'
import { cn } from '@/lib/utils'

export function UpdateIcuView() {
  const { data, isLoading } = useReceptionIcu()
  const update = useUpdateIcu()

  // Local edits only. When undefined, fields show the server values.
  const [totalIcuBedsEdit, setTotalIcuBedsEdit] = useState<string | undefined>(undefined)
  const [icuBedsOccupiedEdit, setIcuBedsOccupiedEdit] = useState<string | undefined>(undefined)
  const [touched, setTouched] = useState(false)

  // Derive displayed values from server data unless the user has edited.
  const totalIcuBeds = totalIcuBedsEdit ?? (data ? String(data.totalIcuBeds ?? '') : '')
  const icuBedsOccupied = icuBedsOccupiedEdit ?? (data ? String(data.icuBedsOccupied ?? '') : '')

  const totalNum = Number(totalIcuBeds)
  const occupiedNum = Number(icuBedsOccupied)
  const available = Number.isFinite(totalNum) && Number.isFinite(occupiedNum)
    ? Math.max(0, totalNum - occupiedNum)
    : 0

  const totalErr = touched && totalIcuBeds !== '' && (!Number.isFinite(totalNum) || totalNum < 0)
    ? 'Total ICU beds must be a non-negative number'
    : undefined
  const occupiedErr = touched && icuBedsOccupied !== ''
    ? (!Number.isFinite(occupiedNum) || occupiedNum < 0
        ? 'Occupied ICU beds must be a non-negative number'
        : totalIcuBeds !== '' && Number.isFinite(totalNum) && occupiedNum > totalNum
          ? 'Occupied ICU beds cannot exceed total ICU beds'
          : undefined)
    : undefined
  const formInvalid =
    totalIcuBeds === '' || icuBedsOccupied === '' || !!totalErr || !!occupiedErr

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setTouched(true)
    if (formInvalid) return
    update.mutate({ totalIcuBeds: totalNum, icuBedsOccupied: occupiedNum })
  }

  const occPct = totalNum > 0 && Number.isFinite(totalNum) ? Math.round((occupiedNum / totalNum) * 100) : 0
  const critical = Number.isFinite(occPct) && occPct >= 90

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold tracking-tight text-foreground">Update ICU</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Update today&rsquo;s ICU bed capacity &amp; occupancy. Changes reflect across the
          main dashboard in real time.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <SectionCard title="ICU entry form" subtitle="Enter today's ICU bed values.">
          {isLoading ? (
            <div className="space-y-3">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
            </div>
          ) : (
            <form onSubmit={onSubmit} className="space-y-4" noValidate>
              <div className="space-y-1.5">
                <Label className="text-[13px] font-medium">Total ICU Beds</Label>
                <div className="relative">
                  <HeartPulse className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    type="number"
                    inputMode="numeric"
                    min={0}
                    placeholder="e.g. 32"
                    className="h-11 pl-10"
                    value={totalIcuBeds}
                    onChange={(e) => setTotalIcuBedsEdit(e.target.value)}
                    onBlur={() => setTouched(true)}
                    aria-invalid={!!totalErr}
                  />
                </div>
                {totalErr && <p className="text-xs font-medium text-destructive">{totalErr}</p>}
              </div>

              <div className="space-y-1.5">
                <Label className="text-[13px] font-medium">ICU Beds Occupied</Label>
                <Input
                  type="number"
                  inputMode="numeric"
                  min={0}
                  max={totalIcuBeds !== '' && Number.isFinite(totalNum) ? totalNum : undefined}
                  placeholder="e.g. 25"
                  className="h-11"
                  value={icuBedsOccupied}
                  onChange={(e) => setIcuBedsOccupiedEdit(e.target.value)}
                  onBlur={() => setTouched(true)}
                  aria-invalid={!!occupiedErr}
                />
                {occupiedErr && <p className="text-xs font-medium text-destructive">{occupiedErr}</p>}
              </div>

              <div className="flex items-center justify-between rounded-lg border border-border/70 bg-muted/40 px-4 py-3">
                <span className="text-sm text-muted-foreground">ICU Beds Available (auto)</span>
                <span className={cn(
                  'text-lg font-semibold tabular-nums',
                  available <= 0 ? 'text-destructive' : 'text-foreground',
                )}>
                  {available}
                </span>
              </div>

              {critical && Number.isFinite(totalNum) && totalNum > 0 && (
                <div className="flex items-start gap-2 rounded-lg border border-destructive/30 bg-destructive/5 px-3 py-2.5">
                  <CircleAlert className="mt-0.5 h-4 w-4 shrink-0 text-destructive" />
                  <p className="text-[13px] leading-snug text-destructive">
                    ICU occupancy is at {occPct}% — critical capacity. Coordinate admissions carefully.
                  </p>
                </div>
              )}

              {update.isError && (
                <div className="flex items-start gap-2 rounded-lg border border-destructive/30 bg-destructive/5 px-3 py-2.5">
                  <CircleAlert className="mt-0.5 h-4 w-4 shrink-0 text-destructive" />
                  <p className="text-[13px] leading-snug text-destructive">
                    {(update.error as Error)?.message ?? 'Failed to save ICU data.'}
                  </p>
                </div>
              )}

              <Button type="submit" className="h-11 w-full" disabled={update.isPending || formInvalid}>
                {update.isPending ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Save className="mr-2 h-4 w-4" />
                )}
                Save ICU update
              </Button>
            </form>
          )}
        </SectionCard>

        <SectionCard title="Current ICU status" subtitle="Snapshot of ICU capacity.">
          {isLoading ? (
            <div className="space-y-3">
              <Skeleton className="h-24 w-full rounded-lg" />
            </div>
          ) : (
            <div className="space-y-4">
              <div className="rounded-lg border border-border/70 p-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Total ICU Beds</span>
                  <span className="text-lg font-semibold tabular-nums">{data?.totalIcuBeds ?? 0}</span>
                </div>
                <div className="mt-2 flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">ICU Beds Occupied</span>
                  <span className="text-lg font-semibold tabular-nums">{data?.icuBedsOccupied ?? 0}</span>
                </div>
                <div className="mt-2 flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Available</span>
                  <span className={cn(
                    'inline-flex items-center gap-1 text-lg font-semibold tabular-nums',
                    (data?.totalIcuBeds ?? 0) - (data?.icuBedsOccupied ?? 0) <= 0
                      ? 'text-destructive' : 'text-success',
                  )}>
                    <ShieldCheck className="h-4 w-4" />
                    {Math.max(0, (data?.totalIcuBeds ?? 0) - (data?.icuBedsOccupied ?? 0))}
                  </span>
                </div>
              </div>
              <p className="text-xs text-muted-foreground">
                Date: <span className="font-medium text-foreground">{data?.today ?? '—'}</span>
              </p>
            </div>
          )}
        </SectionCard>
      </div>
    </div>
  )
}
