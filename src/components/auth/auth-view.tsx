'use client'

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Loader2, Mail, Lock, User, Eye, EyeOff, Activity, ShieldCheck, Stethoscope } from 'lucide-react'
import { CareFlowWordmark } from '@/components/careflow-logo'
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
import { useLogin, useSignup } from '@/hooks/use-api'

const loginSchema = z.object({
  email: z.string().min(1, 'Email is required').email('Enter a valid email'),
  password: z.string().min(1, 'Password is required'),
})

const signupSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  email: z.string().min(1, 'Email is required').email('Enter a valid email'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  role: z.enum(['ADMIN', 'STAFF']),
})

type LoginValues = z.infer<typeof loginSchema>
type SignupValues = z.infer<typeof signupSchema>

export function AuthView() {
  const [mode, setMode] = useState<'login' | 'signup'>('login')
  const [showPassword, setShowPassword] = useState(false)
  const [role, setRole] = useState<'ADMIN' | 'STAFF'>('STAFF')

  const loginForm = useForm<LoginValues>({ resolver: zodResolver(loginSchema) })
  const signupForm = useForm<SignupValues>({
    resolver: zodResolver(signupSchema),
    defaultValues: { role: 'STAFF' },
  })

  const login = useLogin()
  const signup = useSignup()

  const onLogin = (values: LoginValues) => login.mutate(values)
  const onSignup = (values: SignupValues) => signup.mutate(values)

  const submitting = login.isPending || signup.isPending

  return (
    <div className="relative min-h-screen w-full overflow-hidden bg-background">
      {/* Medical-themed background */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            'radial-gradient(1100px 600px at 12% -8%, oklch(0.93 0.06 200 / 0.9), transparent 60%), radial-gradient(900px 500px at 100% 100%, oklch(0.9 0.08 70 / 0.5), transparent 55%), linear-gradient(180deg, oklch(0.985 0.004 220), oklch(0.97 0.01 215))',
        }}
      />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-[0.4]"
        style={{
          backgroundImage:
            'linear-gradient(oklch(0.46 0.11 210 / 0.06) 1px, transparent 1px), linear-gradient(90deg, oklch(0.46 0.11 210 / 0.06) 1px, transparent 1px)',
          backgroundSize: '38px 38px',
          maskImage:
            'radial-gradient(ellipse 70% 60% at 50% 40%, black, transparent 75%)',
        }}
      />

      <div className="relative z-10 flex min-h-screen items-center justify-center px-4 py-10">
        <div className="w-full max-w-[1000px] grid grid-cols-1 lg:grid-cols-[1.05fr_1fr] gap-0 overflow-hidden rounded-2xl border border-border/60 bg-card shadow-xl ring-1 ring-black/[0.02]">
          {/* Branding panel */}
          <div className="hidden lg:flex flex-col justify-between p-10 text-white" style={{ background: 'linear-gradient(160deg, oklch(0.42 0.12 210), oklch(0.4 0.1 200) 55%, oklch(0.36 0.09 195))' }}>
            <div>
              <CareFlowWordmark className="[&_span]:text-white" />
              <div className="mt-10">
                <h1 className="text-3xl font-semibold leading-tight tracking-tight">
                  Forecast demand.<br />Prepare resources.<br />Avoid overload.
                </h1>
                <p className="mt-4 text-sm leading-relaxed text-white/80 max-w-sm">
                  CareFlow Intelligence predicts upcoming patient admissions, bed and ICU occupancy —
                  so hospital teams can act before capacity becomes critical.
                </p>
              </div>
            </div>
            <div className="space-y-3">
              <Feature icon={<Activity className="h-4 w-4" />} title="7-day demand forecasting" desc="Time-series model with confidence intervals" />
              <Feature icon={<ShieldCheck className="h-4 w-4" />} title="Resource gap detection" desc="Compare forecast need vs available capacity" />
              <Feature icon={<Stethoscope className="h-4 w-4" />} title="Department & what-if analysis" desc="Drill into wards and simulate scenarios" />
            </div>
          </div>

          {/* Form panel */}
          <div className="flex flex-col justify-center p-6 sm:p-10">
            <div className="mx-auto w-full max-w-sm">
              <div className="lg:hidden mb-8 flex justify-center">
                <CareFlowWordmark />
              </div>

              <div className="mb-6">
                <h2 className="text-2xl font-semibold tracking-tight">
                  {mode === 'login' ? 'Welcome back' : 'Create your account'}
                </h2>
                <p className="mt-1.5 text-sm text-muted-foreground">
                  {mode === 'login'
                    ? 'Sign in to access the operations dashboard.'
                    : 'Sign up to start forecasting hospital capacity.'}
                </p>
              </div>

              {/* Mode tabs */}
              <div className="mb-6 grid grid-cols-2 gap-1 rounded-lg bg-muted p-1 text-sm">
                <button
                  type="button"
                  onClick={() => setMode('login')}
                  className={`rounded-md px-3 py-1.5 font-medium transition ${
                    mode === 'login'
                      ? 'bg-card text-foreground shadow-sm'
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  Sign in
                </button>
                <button
                  type="button"
                  onClick={() => setMode('signup')}
                  className={`rounded-md px-3 py-1.5 font-medium transition ${
                    mode === 'signup'
                      ? 'bg-card text-foreground shadow-sm'
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  Sign up
                </button>
              </div>

              {mode === 'login' ? (
                <form onSubmit={loginForm.handleSubmit(onLogin)} className="space-y-4" noValidate>
                  <Field label="Email" error={loginForm.formState.errors.email?.message}>
                    <div className="relative">
                      <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                      <Input
                        type="email"
                        autoComplete="email"
                        placeholder="you@hospital.org"
                        className="pl-9"
                        {...loginForm.register('email')}
                      />
                    </div>
                  </Field>
                  <Field label="Password" error={loginForm.formState.errors.password?.message}>
                    <div className="relative">
                      <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                      <Input
                        type={showPassword ? 'text' : 'password'}
                        autoComplete="current-password"
                        placeholder="••••••••"
                        className="pl-9 pr-10"
                        {...loginForm.register('password')}
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword((s) => !s)}
                        className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                        tabIndex={-1}
                        aria-label={showPassword ? 'Hide password' : 'Show password'}
                      >
                        {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                  </Field>

                  <div className="flex items-center justify-between">
                    <label className="flex items-center gap-2 text-xs text-muted-foreground">
                      <input type="checkbox" className="accent-[oklch(0.46_0.11_210)]" defaultChecked />
                      Remember me
                    </label>
                    <button
                      type="button"
                      className="text-xs font-medium text-primary hover:underline"
                    >
                      Forgot password?
                    </button>
                  </div>

                  <Button type="submit" disabled={submitting} className="w-full">
                    {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Sign in
                  </Button>

                  <DemoHint
                    onFill={() => {
                      loginForm.setValue('email', 'admin@careflow.health')
                      loginForm.setValue('password', 'careflow123')
                      loginForm.trigger()
                    }}
                  />
                </form>
              ) : (
                <form onSubmit={signupForm.handleSubmit(onSignup)} className="space-y-4" noValidate>
                  <Field label="Full name" error={signupForm.formState.errors.name?.message}>
                    <div className="relative">
                      <User className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                      <Input
                        placeholder="Dr. Jane Doe"
                        className="pl-9"
                        {...signupForm.register('name')}
                      />
                    </div>
                  </Field>
                  <Field label="Email" error={signupForm.formState.errors.email?.message}>
                    <div className="relative">
                      <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                      <Input
                        type="email"
                        autoComplete="email"
                        placeholder="you@hospital.org"
                        className="pl-9"
                        {...signupForm.register('email')}
                      />
                    </div>
                  </Field>
                  <Field label="Password" error={signupForm.formState.errors.password?.message}>
                    <div className="relative">
                      <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                      <Input
                        type={showPassword ? 'text' : 'password'}
                        autoComplete="new-password"
                        placeholder="At least 6 characters"
                        className="pl-9 pr-10"
                        {...signupForm.register('password')}
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword((s) => !s)}
                        className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                        tabIndex={-1}
                        aria-label={showPassword ? 'Hide password' : 'Show password'}
                      >
                        {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                  </Field>
                  <Field label="Role">
                    <Select
                      value={role}
                      onValueChange={(v) => {
                        const r = v as 'ADMIN' | 'STAFF'
                        setRole(r)
                        signupForm.setValue('role', r)
                      }}
                    >
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Select role" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="ADMIN">Admin</SelectItem>
                        <SelectItem value="STAFF">Hospital Staff</SelectItem>
                      </SelectContent>
                    </Select>
                  </Field>

                  <Button type="submit" disabled={submitting} className="w-full">
                    {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Create account
                  </Button>
                </form>
              )}

              <p className="mt-8 text-center text-[11px] leading-relaxed text-muted-foreground">
                This system provides capacity &amp; operations risk signals only,
                not medical diagnosis or emergency predictions.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

function Feature({
  icon,
  title,
  desc,
}: {
  icon: React.ReactNode
  title: string
  desc: string
}) {
  return (
    <div className="flex items-start gap-3 rounded-lg bg-white/10 p-3 backdrop-blur-sm">
      <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-white/15">
        {icon}
      </div>
      <div>
        <p className="text-sm font-medium">{title}</p>
        <p className="text-xs text-white/70">{desc}</p>
      </div>
    </div>
  )
}

function Field({
  label,
  error,
  children,
}: {
  label: string
  error?: string
  children: React.ReactNode
}) {
  return (
    <div className="space-y-1.5">
      <Label className="text-sm font-medium">{label}</Label>
      {children}
      {error && <p className="text-xs font-medium text-destructive">{error}</p>}
    </div>
  )
}

function DemoHint({ onFill }: { onFill: () => void }) {
  return (
    <div className="rounded-md border border-dashed border-border bg-muted/40 px-3 py-2 text-xs text-muted-foreground">
      <span className="font-medium text-foreground">Demo account</span> · admin@careflow.health · careflow123{' '}
      <button type="button" onClick={onFill} className="font-medium text-primary hover:underline">
        autofill
      </button>
    </div>
  )
}
