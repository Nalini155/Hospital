'use client'

import { useState } from 'react'
import { BedDouble, Save, Loader2, CircleAlert, ShieldCheck } from 'lucide-react'
import {
  useReceptionBeds,
  useUpdateBeds,
} from '@/hooks/use-api'
import { SectionCard } from '@/components/views/shared'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Skeleton } from '@/components/ui/skeleton'
import { cn } from '@/lib/utils'

type Dept = 'Emergency' | 'ICU' | 'General Ward' | 'Pediatrics'
const DEPTS: Dept[] = ['Emergency', 'ICU', 'General Ward', 'Pediatrics']

export function UpdateBedsView() {
  const { data, isLoading } = useReceptionBeds()
  const update = useUpdateBeds()

  const [department, setDepartment] = useState<Dept>('Emergency')
  // Local edits only. When undefined, the field shows the server value.
  const [totalBedsEdit, setTotalBedsEdit] = useState<string | undefined>(undefined)
  const [bedsOccupiedEdit, setBedsOccupiedEdit] = useState<string | undefined>(undefined)
  const [touched, setTouched] = useState(false)

  // Derive displayed values from server data unless the user has edited.
  const serverRow = data?.departments.find((d) => d.department === department)
  const totalBeds = totalBedsEdit ?? (serverRow ? String(serverRow.totalBeds) : '')
  const bedsOccupied = bedsOccupiedEdit ?? (serverRow ? String(serverRow.bedsOccupied) : '')

  const totalNum = Number(totalBeds)
  const occupiedNum = Number(bedsOccupied)
  const available = Number.isFinite(totalNum) && Number.isFinite(occupiedNum)
    ? Math.max(0, totalNum - occupiedNum)
    : 0

  const totalErr = touched && totalBeds !== '' && (!Number.isFinite(totalNum) || totalNum < 0)
    ? 'Total beds must be a non-negative number'
    : undefined
  const occupiedErr = touched && bedsOccupied !== ''
    ? (!Number.isFinite(occupiedNum) || occupiedNum < 0
        ? 'Occupied beds must be a non-negative number'
        : totalBeds !== '' && Number.isFinite(totalNum) && occupiedNum > totalNum
          ? 'Occupied beds cannot exceed total beds'
          : undefined)
    : undefined
  const formInvalid =
    totalBeds === '' || bedsOccupied === '' || !!totalErr || !!occupiedErr

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setTouched(true)
    if (formInvalid) return
    update.mutate({ totalBeds: totalNum, bedsOccupied: occupiedNum, department })
  }

  // When the department changes, clear local edits so the form prefills from
  // the server values for the new department (no setState-in-effect needed).
  const onDepartmentChange = (v: string) => {
    setDepartment(v as Dept)
    setTotalBedsEdit(undefined)
    setBedsOccupiedEdit(undefined)
    setTouched(false)
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold tracking-tight text-foreground">Update Beds</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Update today&rsquo;s bed capacity &amp; occupancy for a department. Changes reflect
          across the main dashboard in real time.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <SectionCard title="Bed entry form" subtitle="Select a department and enter today's values.">
          {isLoading ? (
            <div className="space-y-3">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
            </div>
          ) : (
            <form onSubmit={onSubmit} className="space-y-4" noValidate>
              <div className="space-y-1.5">
                <Label className="text-[13px] font-medium">Department</Label>
                <Select value={department} onValueChange={onDepartmentChange}>
                  <SelectTrigger className="h-11 w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {DEPTS.map((d) => (
                      <SelectItem key={d} value={d}>{d}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label className="text-[13px] font-medium">Total Beds</Label>
                <div className="relative">
                  <BedDouble className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    type="number"
                    inputMode="numeric"
                    min={0}
                    placeholder="e.g. 60"
                    className="h-11 pl-10"
                    value={totalBeds}
                    onChange={(e) => setTotalBedsEdit(e.target.value)}
                    onBlur={() => setTouched(true)}
                    aria-invalid={!!totalErr}
                  />
                </div>
                {totalErr && <p className="text-xs font-medium text-destructive">{totalErr}</p>}
              </div>

              <div className="space-y-1.5">
                <Label className="text-[13px] font-medium">Beds Occupied (filled)</Label>
                <Input
                  type="number"
                  inputMode="numeric"
                  min={0}
                  max={totalBeds !== '' && Number.isFinite(totalNum) ? totalNum : undefined}
                  placeholder="e.g. 48"
                  className="h-11"
                  value={bedsOccupied}
                  onChange={(e) => setBedsOccupiedEdit(e.target.value)}
                  onBlur={() => setTouched(true)}
                  aria-invalid={!!occupiedErr}
                />
                {occupiedErr && <p className="text-xs font-medium text-destructive">{occupiedErr}</p>}
              </div>

              <div className="flex items-center justify-between rounded-lg border border-border/70 bg-muted/40 px-4 py-3">
                <span className="text-sm text-muted-foreground">Beds Available (auto)</span>
                <span className={cn(
                  'text-lg font-semibold tabular-nums',
                  available <= 0 ? 'text-destructive' : 'text-foreground',
                )}>
                  {available}
                </span>
              </div>

              {update.isError && (
                <div className="flex items-start gap-2 rounded-lg border border-destructive/30 bg-destructive/5 px-3 py-2.5">
                  <CircleAlert className="mt-0.5 h-4 w-4 shrink-0 text-destructive" />
                  <p className="text-[13px] leading-snug text-destructive">
                    {(update.error as Error)?.message ?? 'Failed to save bed data.'}
                  </p>
                </div>
              )}

              <Button type="submit" className="h-11 w-full" disabled={update.isPending || formInvalid}>
                {update.isPending ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Save className="mr-2 h-4 w-4" />
                )}
                Save bed update
              </Button>
            </form>
          )}
        </SectionCard>

        <SectionCard title="Quick reference" subtitle="Current bed status by department.">
          <div className="space-y-3">
            {data?.departments.map((d) => {
              const avail = Math.max(0, d.totalBeds - d.bedsOccupied)
              const occPct = d.totalBeds > 0 ? Math.round((d.bedsOccupied / d.totalBeds) * 100) : 0
              const isCurrent = d.department === department
              return (
                <div
                  key={d.department}
                  className={cn(
                    'rounded-lg border px-4 py-3 transition',
                    isCurrent ? 'border-primary/40 bg-primary/5' : 'border-border/70',
                  )}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">{d.department}</span>
                    <span className="text-xs text-muted-foreground">{occPct}% occupied</span>
                  </div>
                  <div className="mt-1 flex items-baseline gap-3 text-sm">
                    <span className="tabular-nums">{d.bedsOccupied}/{d.totalBeds} beds</span>
                    <span className="ml-auto inline-flex items-center gap-1 text-xs font-medium text-muted-foreground">
                      <ShieldCheck className="h-3.5 w-3.5 text-success" /> {avail} available
                    </span>
                  </div>
                </div>
              )
            })}
          </div>
        </SectionCard>
      </div>
    </div>
  )
}
