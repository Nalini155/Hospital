'use client'

import { useState, useEffect } from 'react'
import {
  Users,
  Database,
  Activity as ActivityIcon,
  Gauge,
  RefreshCw,
  Loader2,
  ShieldCheck,
  ShieldAlert,
  CircleAlert,
  RotateCw,
  UserCog,
} from 'lucide-react'
import {
  useSession,
  useAdminUsers,
  useUpdateUser,
  useAdminOverview,
  useAdminActivity,
  useRegenerateData,
  type AdminUser,
} from '@/hooks/use-api'
import { useUiStore } from '@/lib/store'
import { SectionCard, KpiCard } from '@/components/views/shared'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { cn } from '@/lib/utils'
import { formatDate, formatLongDate } from '@/lib/format'

export function AdminView() {
  const { data: sessionData } = useSession()
  const setView = useUiStore((s) => s.setView)
  const role = sessionData?.user?.role
  // Client-side access control: if a non-ADMIN user somehow lands on the
  // admin view (e.g. via devtools or a stale Zustand state), redirect them
  // back to the overview immediately. Reception users never mount the full
  // shell (root page routes them to ReceptionShell), so this guards Staff.
  useEffect(() => {
    if (role && role !== 'ADMIN') {
      setView('overview')
    }
  }, [role, setView])
  if (role && role !== 'ADMIN') {
    return (
      <div className="flex h-64 flex-col items-center justify-center gap-2 text-sm text-muted-foreground">
        <ShieldAlert className="h-8 w-8 text-amber-600" />
        <p>Administrator access required. Redirecting…</p>
      </div>
    )
  }
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold tracking-tight text-foreground">
          Admin Dashboard
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">
          User management, system overview, data management &amp; activity log.
        </p>
      </div>
      <SystemOverviewSection />
      <UserManagementSection />
      <DataAndActivitySection />
    </div>
  )
}

/* ---------- System Overview ---------- */
function SystemOverviewSection() {
  const { data, isLoading, isError, refetch, isFetching } = useAdminOverview()
  if (isError) {
    return (
      <div className="flex min-h-[8rem] items-center justify-center rounded-xl border border-destructive/30 bg-destructive/5 p-6 text-center text-sm text-muted-foreground">
        <CircleAlert className="mr-2 h-5 w-5 text-destructive" />
        Failed to load system overview.{' '}
        <Button variant="link" size="sm" onClick={() => refetch()} disabled={isFetching}>
          Retry
        </Button>
      </div>
    )
  }
  if (isLoading || !data) {
    return (
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-[120px] rounded-xl" />
        ))}
      </div>
    )
  }
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
      <KpiCard
        label="Total Users"
        value={data.users.total}
        icon={Users}
        accent="primary"
        hint={`${data.users.active} active · ${data.users.admin} admin · ${data.users.staff} staff · ${data.users.reception} reception`}
      />
      <KpiCard
        label="Days of History"
        value={data.data.daysOfHistory}
        icon={Database}
        accent="teal"
        hint={`${data.data.departmentRecords} department records across ${data.data.departments} departments`}
      />
      <KpiCard
        label="Forecast Runs"
        value={data.forecastRuns}
        icon={Gauge}
        accent="primary"
        hint="Dataset regenerations (retrains the forecast model)"
      />
      <KpiCard
        label="Last Data Refresh"
        value={data.data.lastRefreshDate ? formatDate(data.data.lastRefreshDate) : '—'}
        icon={RefreshCw}
        accent="teal"
        hint={data.data.lastRefresh ? formatLongDate(data.data.lastRefresh) : 'No data yet'}
      />
    </div>
  )
}

/* ---------- User Management ---------- */
function UserManagementSection() {
  const { data, isLoading, isError, error, refetch, isFetching } = useAdminUsers()
  const updateUser = useUpdateUser()
  const [pendingId, setPendingId] = useState<string | null>(null)

  if (isError) {
    const reason = error instanceof Error ? error.message : 'Unknown error.'
    return (
      <div className="flex min-h-[10rem] flex-col items-center justify-center gap-2 rounded-xl border border-destructive/30 bg-destructive/5 p-6 text-center">
        <CircleAlert className="h-8 w-8 text-destructive" />
        <p className="text-sm font-medium text-foreground">Failed to load users</p>
        <p className="max-w-md text-xs text-muted-foreground">{reason}</p>
        <Button variant="outline" size="sm" onClick={() => refetch()} disabled={isFetching}>
          <RotateCw className="mr-2 h-3.5 w-3.5" /> Retry
        </Button>
      </div>
    )
  }

  return (
    <SectionCard
      title="User Management"
      subtitle="All registered accounts — change role or activate/deactivate."
      action={<Badge variant="outline">{data?.users.length ?? 0} users</Badge>}
      bodyClassName="p-0"
    >
      {isLoading || !data ? (
        <div className="space-y-2 p-5">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-12 w-full rounded-lg" />
          ))}
        </div>
      ) : (
        <div className="max-h-[28rem] overflow-y-auto scroll-thin">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/40 hover:bg-muted/40">
                <TableHead className="text-xs font-semibold uppercase tracking-wide">Name</TableHead>
                <TableHead className="text-xs font-semibold uppercase tracking-wide">Email</TableHead>
                <TableHead className="text-xs font-semibold uppercase tracking-wide">Role</TableHead>
                <TableHead className="text-xs font-semibold uppercase tracking-wide">Joined</TableHead>
                <TableHead className="text-xs font-semibold uppercase tracking-wide">Status</TableHead>
                <TableHead className="text-right text-xs font-semibold uppercase tracking-wide">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.users.map((u) => (
                <UserRow
                  key={u.id}
                  user={u}
                  pending={pendingId === u.id || (updateUser.isPending && updateUser.variables?.userId === u.id)}
                  onRoleChange={(role) => {
                    setPendingId(u.id)
                    updateUser.mutate(
                      { userId: u.id, role },
                      { onSettled: () => setPendingId(null) },
                    )
                  }}
                  onToggleActive={() => {
                    setPendingId(u.id)
                    updateUser.mutate(
                      { userId: u.id, active: !u.active },
                      { onSettled: () => setPendingId(null) },
                    )
                  }}
                />
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </SectionCard>
  )
}

function UserRow({
  user,
  pending,
  onRoleChange,
  onToggleActive,
}: {
  user: AdminUser
  pending: boolean
  onRoleChange: (role: 'ADMIN' | 'STAFF' | 'RECEPTION') => void
  onToggleActive: () => void
}) {
  return (
    <TableRow className="text-sm">
      <TableCell className="font-medium">
        <div className="flex items-center gap-2">
          {pending && <Loader2 className="h-3.5 w-3.5 animate-spin text-muted-foreground" />}
          {user.name}
        </div>
      </TableCell>
      <TableCell className="text-muted-foreground">{user.email}</TableCell>
      <TableCell>
        <Select
          value={user.role}
          onValueChange={(v) => onRoleChange(v as 'ADMIN' | 'STAFF' | 'RECEPTION')}
          disabled={pending}
        >
          <SelectTrigger className="h-8 w-[140px] text-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ADMIN">Administrator</SelectItem>
            <SelectItem value="STAFF">Hospital Staff</SelectItem>
            <SelectItem value="RECEPTION">Reception</SelectItem>
          </SelectContent>
        </Select>
      </TableCell>
      <TableCell className="text-muted-foreground">{formatDate(user.joinedDate)}</TableCell>
      <TableCell>
        {user.active ? (
          <Badge variant="outline" className="border-success/40 text-success">
            <ShieldCheck className="mr-1 h-3 w-3" /> Active
          </Badge>
        ) : (
          <Badge variant="outline" className="border-destructive/40 text-destructive">
            <ShieldAlert className="mr-1 h-3 w-3" /> Deactivated
          </Badge>
        )}
      </TableCell>
      <TableCell className="text-right">
        <Button
          variant="outline"
          size="sm"
          onClick={onToggleActive}
          disabled={pending}
          className={cn('h-8', user.active ? 'text-destructive' : 'text-success')}
        >
          {user.active ? 'Deactivate' : 'Reactivate'}
        </Button>
      </TableCell>
    </TableRow>
  )
}

/* ---------- Data Management + Activity Log ---------- */
function DataAndActivitySection() {
  const regenerate = useRegenerateData()
  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
      {/* Data Management */}
      <SectionCard
        title="Data Management"
        subtitle="Regenerate / reseed the synthetic hospital dataset (365 days)."
      >
        <div className="flex flex-col gap-4">
          <p className="text-sm text-muted-foreground">
            Regenerating wipes the current daily hospital &amp; department records and creates
            a fresh 365-day synthetic dataset (weekly seasonality, trend, ICU ratio). The
            forecast model recomputes on the next dashboard load.
          </p>
          <Button
            onClick={() => regenerate.mutate()}
            disabled={regenerate.isPending}
            className="w-full sm:w-auto"
          >
            {regenerate.isPending ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <RefreshCw className="mr-2 h-4 w-4" />
            )}
            Regenerate dataset
          </Button>
        </div>
      </SectionCard>

      {/* Activity Log */}
      <SectionCard
        title="Activity Log"
        subtitle="Recent system actions (newest first)."
        action={<ActivityIcon className="h-4 w-4 text-muted-foreground" />}
        bodyClassName="p-0"
      >
        <ActivityTable />
      </SectionCard>
    </div>
  )
}

function ActivityTable() {
  const { data, isLoading, isError, refetch, isFetching } = useAdminActivity(20)
  if (isError) {
    return (
      <div className="flex min-h-[8rem] items-center justify-center p-6 text-center text-sm text-muted-foreground">
        <CircleAlert className="mr-2 h-5 w-5 text-destructive" />
        Failed to load activity log.{' '}
        <Button variant="link" size="sm" onClick={() => refetch()} disabled={isFetching}>
          Retry
        </Button>
      </div>
    )
  }
  if (isLoading || !data) {
    return (
      <div className="space-y-2 p-5">
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} className="h-10 w-full rounded-lg" />
        ))}
      </div>
    )
  }
  if (data.activities.length === 0) {
    return (
      <div className="flex min-h-[8rem] items-center justify-center p-6 text-center text-sm text-muted-foreground">
        No activity recorded yet.
      </div>
    )
  }
  return (
    <div className="max-h-[24rem] overflow-y-auto scroll-thin">
      <Table>
        <TableHeader>
          <TableRow className="bg-muted/40 hover:bg-muted/40">
            <TableHead className="text-xs font-semibold uppercase tracking-wide">Action</TableHead>
            <TableHead className="text-xs font-semibold uppercase tracking-wide">User</TableHead>
            <TableHead className="text-xs font-semibold uppercase tracking-wide">Detail</TableHead>
            <TableHead className="text-xs font-semibold uppercase tracking-wide">Time</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {data.activities.map((a) => (
            <TableRow key={a.id} className="text-sm">
              <TableCell>
                <ActionBadge action={a.action} />
              </TableCell>
              <TableCell>
                <div className="font-medium">{a.userName}</div>
                <div className="text-xs text-muted-foreground">{a.userEmail}</div>
              </TableCell>
              <TableCell className="max-w-[16rem] text-muted-foreground">{a.detail}</TableCell>
              <TableCell className="whitespace-nowrap text-xs text-muted-foreground">
                {formatLongDate(a.timestamp)}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}

function ActionBadge({ action }: { action: string }) {
  const styles: Record<string, string> = {
    login: 'border-primary/30 text-primary',
    signup: 'border-teal-500/40 text-teal-600',
    role_change: 'border-amber-500/40 text-amber-600',
    deactivate: 'border-destructive/40 text-destructive',
    reactivate: 'border-success/40 text-success',
    regenerate_data: 'border-primary/30 text-primary',
  }
  const labels: Record<string, string> = {
    login: 'Login',
    signup: 'Signup',
    role_change: 'Role change',
    deactivate: 'Deactivate',
    reactivate: 'Reactivate',
    regenerate_data: 'Regenerate',
  }
  return (
    <Badge variant="outline" className={cn('text-[10px] font-semibold uppercase', styles[action] ?? '')}>
      <UserCog className="mr-1 h-3 w-3" />
      {labels[action] ?? action}
    </Badge>
  )
}
