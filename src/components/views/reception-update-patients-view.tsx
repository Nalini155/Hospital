'use client'

import { useState } from 'react'
import { Users, Save, Loader2, CircleAlert, ArrowDownToLine, ArrowUpFromLine } from 'lucide-react'
import { useReceptionPatients, useUpdatePatients } from '@/hooks/use-api'
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

export function UpdatePatientsView() {
  const { data, isLoading } = useReceptionPatients()
  const update = useUpdatePatients()

  const [admissionsEdit, setAdmissionsEdit] = useState<string | undefined>(undefined)
  const [dischargesEdit, setDischargesEdit] = useState<string | undefined>(undefined)
  const [department, setDepartment] = useState<Dept | 'all'>('all')
  const [touched, setTouched] = useState(false)

  const admissions = admissionsEdit ?? (data ? String(data.admissions ?? '') : '')
  const discharges = dischargesEdit ?? (data ? String(data.discharges ?? '') : '')

  const admissionsNum = Number(admissions)
  const dischargesNum = Number(discharges)

  const admissionsErr = touched && admissions !== '' && (!Number.isFinite(admissionsNum) || admissionsNum < 0)
    ? 'Admissions must be a non-negative number'
    : undefined
  const dischargesErr = touched && discharges !== '' && (!Number.isFinite(dischargesNum) || dischargesNum < 0)
    ? 'Discharges must be a non-negative number'
    : undefined
  const formInvalid = admissions === '' || discharges === '' || !!admissionsErr || !!dischargesErr

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setTouched(true)
    if (formInvalid) return
    update.mutate({
      admissions: admissionsNum,
      discharges: dischargesNum,
      department: department === 'all' ? undefined : department,
    })
  }

  const netChange = Number.isFinite(admissionsNum) && Number.isFinite(dischargesNum)
    ? admissionsNum - dischargesNum
    : 0

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold tracking-tight text-foreground">Update Patients</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Enter today&rsquo;s admissions &amp; discharges. Numbers reflect across the dashboard in real time.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <SectionCard title="Patient entry form" subtitle="Enter today's admissions & discharges.">
          {isLoading ? (
            <div className="space-y-3">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
            </div>
          ) : (
            <form onSubmit={onSubmit} className="space-y-4" noValidate>
              <div className="space-y-1.5">
                <Label className="text-[13px] font-medium">Department (optional)</Label>
                <Select value={department} onValueChange={(v) => setDepartment(v as Dept | 'all')}>
                  <SelectTrigger className="h-11 w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All departments (aggregate)</SelectItem>
                    {DEPTS.map((d) => (
                      <SelectItem key={d} value={d}>{d}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label className="text-[13px] font-medium">Admissions (today)</Label>
                <div className="relative">
                  <ArrowDownToLine className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    type="number"
                    inputMode="numeric"
                    min={0}
                    placeholder="e.g. 140"
                    className="h-11 pl-10"
                    value={admissions}
                    onChange={(e) => setAdmissionsEdit(e.target.value)}
                    onBlur={() => setTouched(true)}
                    aria-invalid={!!admissionsErr}
                  />
                </div>
                {admissionsErr && <p className="text-xs font-medium text-destructive">{admissionsErr}</p>}
              </div>

              <div className="space-y-1.5">
                <Label className="text-[13px] font-medium">Discharges (today)</Label>
                <div className="relative">
                  <ArrowUpFromLine className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    type="number"
                    inputMode="numeric"
                    min={0}
                    placeholder="e.g. 132"
                    className="h-11 pl-10"
                    value={discharges}
                    onChange={(e) => setDischargesEdit(e.target.value)}
                    onBlur={() => setTouched(true)}
                    aria-invalid={!!dischargesErr}
                  />
                </div>
                {dischargesErr && <p className="text-xs font-medium text-destructive">{dischargesErr}</p>}
              </div>

              <div className="flex items-center justify-between rounded-lg border border-border/70 bg-muted/40 px-4 py-3">
                <span className="text-sm text-muted-foreground">Net change (auto)</span>
                <span className={cn(
                  'text-lg font-semibold tabular-nums',
                  netChange > 0 ? 'text-amber-600' : netChange < 0 ? 'text-success' : 'text-foreground',
                )}>
                  {netChange > 0 ? '+' : ''}{netChange}
                </span>
              </div>

              {update.isError && (
                <div className="flex items-start gap-2 rounded-lg border border-destructive/30 bg-destructive/5 px-3 py-2.5">
                  <CircleAlert className="mt-0.5 h-4 w-4 shrink-0 text-destructive" />
                  <p className="text-[13px] leading-snug text-destructive">
                    {(update.error as Error)?.message ?? 'Failed to save patient data.'}
                  </p>
                </div>
              )}

              <Button type="submit" className="h-11 w-full" disabled={update.isPending || formInvalid}>
                {update.isPending ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Save className="mr-2 h-4 w-4" />
                )}
                Save patient update
              </Button>
            </form>
          )}
        </SectionCard>

        <SectionCard title="Current patient flow" subtitle="Today's admissions & discharges.">
          {isLoading ? (
            <Skeleton className="h-32 w-full rounded-lg" />
          ) : (
            <div className="space-y-4">
              <div className="rounded-lg border border-border/70 p-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Admissions today</span>
                  <span className="inline-flex items-center gap-1 text-lg font-semibold tabular-nums">
                    <ArrowDownToLine className="h-4 w-4 text-amber-600" />
                    {data?.admissions ?? 0}
                  </span>
                </div>
                <div className="mt-2 flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Discharges today</span>
                  <span className="inline-flex items-center gap-1 text-lg font-semibold tabular-nums">
                    <ArrowUpFromLine className="h-4 w-4 text-success" />
                    {data?.discharges ?? 0}
                  </span>
                </div>
                <div className="mt-2 flex items-center justify-between border-t border-border/60 pt-2">
                  <span className="text-sm text-muted-foreground">Net change</span>
                  <span className={cn(
                    'text-lg font-semibold tabular-nums',
                    (data?.admissions ?? 0) - (data?.discharges ?? 0) > 0 ? 'text-amber-600' : 'text-success',
                  )}>
                    {((data?.admissions ?? 0) - (data?.discharges ?? 0)) > 0 ? '+' : ''}
                    {(data?.admissions ?? 0) - (data?.discharges ?? 0)}
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
