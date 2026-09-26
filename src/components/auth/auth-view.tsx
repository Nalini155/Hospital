'use client'

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import {
  Loader2,
  Mail,
  Lock,
  User,
  Eye,
  EyeOff,
  AlertCircle,
  HeartPulse,
  ArrowRight,
  Activity,
  ShieldCheck,
  TrendingUp,
  CalendarClock,
  Layers,
  LineChart,
  Lock as LockIcon,
  CheckCircle2,
} from 'lucide-react'
import { CareFlowLogo } from '@/components/careflow-logo'
import { GoogleIcon } from '@/components/google-icon'
import { GoogleSignInFlow } from '@/components/auth/google-sign-in-flow'
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
import { useLogin, useSignup, type AuthError } from '@/hooks/use-api'

const loginSchema = z.object({
  email: z.string().min(1, 'Email is required').email('Enter a valid email address'),
  password: z.string().min(1, 'Password is required'),
})

const signupSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  email: z.string().min(1, 'Email is required').email('Enter a valid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  role: z.enum(['ADMIN', 'STAFF', 'RECEPTION']),
})

type LoginValues = z.infer<typeof loginSchema>
type SignupValues = z.infer<typeof signupSchema>

export function AuthView() {
  // 'hero' = landing page with Get Started; 'auth' = the sign in / sign up card
  const [stage, setStage] = useState<'hero' | 'auth'>('hero')
  const [mode, setMode] = useState<'login' | 'signup'>('login')
  const [showPassword, setShowPassword] = useState(false)
  const [role, setRole] = useState<'ADMIN' | 'STAFF' | 'RECEPTION'>('STAFF')
  // Inline error shown directly above the submit button (not a toast).
  const [authError, setAuthError] = useState<string | null>(null)
  // Google multi-step flow overlay (account chooser → email code → login)
  const [googleOpen, setGoogleOpen] = useState(false)

  const loginForm = useForm<LoginValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: '', password: '' },
  })
  const signupForm = useForm<SignupValues>({
    resolver: zodResolver(signupSchema),
    defaultValues: { name: '', email: '', password: '', role: 'STAFF' },
  })

  const login = useLogin()
  const signup = useSignup()

  const submitting = login.isPending || signup.isPending

  const onLogin = (values: LoginValues) => {
    setAuthError(null)
    login.mutate(values, {
      onError: (e: AuthError) => setAuthError(e.message),
    })
  }

  const onSignup = (values: SignupValues) => {
    setAuthError(null)
    signup.mutate({ ...values, role }, {
      onError: (e: AuthError) => setAuthError(e.message),
    })
  }

  const onGoogle = () => {
    setAuthError(null)
    setGoogleOpen(true)
  }

  const switchMode = (m: 'login' | 'signup') => {
    setMode(m)
    setAuthError(null)
    loginForm.clearErrors()
    signupForm.clearErrors()
  }

  const goAuth = (m: 'login' | 'signup') => {
    setMode(m)
    setAuthError(null)
    setStage('auth')
  }

  return (
    <div className="relative min-h-screen w-full overflow-hidden bg-background">
      {/* Subtle medical-themed teal/blue gradient background */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            'radial-gradient(900px 500px at 50% -10%, oklch(0.9 0.06 200 / 0.7), transparent 60%), radial-gradient(700px 400px at 110% 110%, oklch(0.88 0.05 185 / 0.45), transparent 55%), linear-gradient(180deg, oklch(0.985 0.004 220), oklch(0.965 0.012 215))',
        }}
      />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-30"
        style={{
          backgroundImage:
            'linear-gradient(oklch(0.46 0.11 210 / 0.05) 1px, transparent 1px), linear-gradient(90deg, oklch(0.46 0.11 210 / 0.05) 1px, transparent 1px)',
          backgroundSize: '42px 42px',
          maskImage:
            'radial-gradient(ellipse 65% 55% at 50% 38%, black, transparent 72%)',
        }}
      />

      <div className="relative z-10 flex min-h-screen items-center justify-center px-4 py-10">
        {stage === 'hero' ? (
          <HeroLanding onGetStarted={() => goAuth('login')} />
        ) : (
          <div className="w-full max-w-[420px]">
            {/* Back to hero link */}
            <button
              type="button"
              onClick={() => setStage('hero')}
              className="mb-4 inline-flex items-center gap-1 text-xs font-medium text-muted-foreground transition hover:text-foreground"
            >
              <ArrowRight className="h-3.5 w-3.5 rotate-180" />
              Back to home
            </button>

            {/* Logo + app name + tagline */}
            <div className="mb-7 flex flex-col items-center text-center">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl shadow-sm ring-1 ring-black/[0.04]">
                <CareFlowLogo className="h-14 w-14" />
              </div>
              <h1 className="mt-4 text-[22px] font-semibold tracking-tight text-foreground">
                CareFlow Intelligence
              </h1>
              <p className="mt-1 text-[13px] leading-snug text-muted-foreground">
                Hospital Resource Forecasting &amp; Operations Intelligence
              </p>
            </div>

            {/* Card */}
            <div className="rounded-2xl border border-border/70 bg-card p-6 shadow-xl ring-1 ring-black/[0.02] sm:p-8">
              {/* Continue with Google */}
              <Button
                type="button"
                variant="outline"
                onClick={onGoogle}
                className="h-11 w-full bg-card text-foreground shadow-sm transition hover:bg-muted"
              >
                <GoogleIcon className="mr-2.5" />
                Continue with Google
              </Button>

              {/* Divider */}
              <div className="my-5 flex items-center gap-3">
                <div className="h-px flex-1 bg-border/70" />
                <span className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
                  or continue with email
                </span>
                <div className="h-px flex-1 bg-border/70" />
              </div>

              {/* Sign in / Sign up tabs */}
              <div
                role="tablist"
                aria-label="Authentication mode"
                className="mb-6 grid grid-cols-2 gap-1 rounded-xl bg-muted p-1 text-sm"
              >
                <button
                  role="tab"
                  aria-selected={mode === 'login'}
                  type="button"
                  onClick={() => switchMode('login')}
                  className={`rounded-lg px-3 py-2 font-medium transition ${
                    mode === 'login'
                      ? 'bg-card text-foreground shadow-sm ring-1 ring-border/60'
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  Sign in
                </button>
                <button
                  role="tab"
                  aria-selected={mode === 'signup'}
                  type="button"
                  onClick={() => switchMode('signup')}
                  className={`rounded-lg px-3 py-2 font-medium transition ${
                    mode === 'signup'
                      ? 'bg-card text-foreground shadow-sm ring-1 ring-border/60'
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  Sign up
                </button>
              </div>

              {mode === 'login' ? (
                <form
                  onSubmit={loginForm.handleSubmit(onLogin)}
                  className="space-y-4"
                  noValidate
                >
                  <Field label="Email" error={loginForm.formState.errors.email?.message}>
                    <div className="relative">
                      <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                      <Input
                        type="email"
                        autoComplete="email"
                        placeholder="you@hospital.org"
                        className="h-11 pl-10"
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
                        className="h-11 pl-10 pr-11"
                        {...loginForm.register('password')}
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword((s) => !s)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                        tabIndex={-1}
                        aria-label={showPassword ? 'Hide password' : 'Show password'}
                      >
                        {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                  </Field>

                  <div className="flex items-center justify-between">
                    <label className="flex items-center gap-2 text-xs text-muted-foreground">
                      <input
                        type="checkbox"
                        className="h-3.5 w-3.5 accent-[oklch(0.46_0.11_210)]"
                        defaultChecked
                      />
                      Remember me
                    </label>
                    <button
                      type="button"
                      className="text-xs font-medium text-muted-foreground hover:text-primary hover:underline"
                    >
                      Forgot password?
                    </button>
                  </div>

                  <ErrorBanner message={authError} />

                  <Button
                    type="submit"
                    disabled={submitting}
                    className="h-11 w-full bg-primary text-primary-foreground shadow-sm transition hover:bg-primary/90"
                  >
                    {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Sign in
                  </Button>

                  <DemoHint
                    onFill={() => {
                      loginForm.setValue('email', 'admin@careflow.health')
                      loginForm.setValue('password', 'careflow123')
                      setAuthError(null)
                      loginForm.trigger()
                    }}
                  />
                </form>
              ) : (
                <form
                  onSubmit={signupForm.handleSubmit(onSignup)}
                  className="space-y-4"
                  noValidate
                >
                  <Field label="Full name" error={signupForm.formState.errors.name?.message}>
                    <div className="relative">
                      <User className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                      <Input
                        placeholder="Dr. Jane Doe"
                        autoComplete="name"
                        className="h-11 pl-10"
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
                        className="h-11 pl-10"
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
                        className="h-11 pl-10 pr-11"
                        {...signupForm.register('password')}
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword((s) => !s)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
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
                        const r = v as 'ADMIN' | 'STAFF' | 'RECEPTION'
                        setRole(r)
                        signupForm.setValue('role', r)
                      }}
                    >
                      <SelectTrigger className="h-11 w-full">
                        <SelectValue placeholder="Select role" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="ADMIN">Administrator</SelectItem>
                        <SelectItem value="STAFF">Hospital Staff</SelectItem>
                        <SelectItem value="RECEPTION">Reception</SelectItem>
                      </SelectContent>
                    </Select>
                  </Field>

                  <ErrorBanner message={authError} />

                  <Button
                    type="submit"
                    disabled={submitting}
                    className="h-11 w-full bg-primary text-primary-foreground shadow-sm transition hover:bg-primary/90"
                  >
                    {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Create account
                  </Button>
                </form>
              )}
            </div>

            {/* Footer disclaimer */}
            <p className="mt-5 flex items-center justify-center gap-1.5 text-center text-[11px] leading-relaxed text-muted-foreground">
              <HeartPulse className="h-3 w-3 shrink-0 opacity-60" aria-hidden="true" />
              <span>
                This system provides capacity &amp; operations risk signals only, not
                medical diagnosis or emergency predictions.
              </span>
            </p>
          </div>
        )}
      </div>

      {/* Google multi-step sign-in flow overlay (account chooser → email code → login) */}
      <GoogleSignInFlow
        open={googleOpen}
        onClose={() => setGoogleOpen(false)}
        onSuccess={() => setGoogleOpen(false)}
        onError={(e) => setAuthError(e.message)}
      />
    </div>
  )
}

/* ---------- Hero landing (Get Started) ---------- */
function HeroLanding({ onGetStarted }: { onGetStarted: () => void }) {
  return (
    <div className="w-full max-w-[860px] text-center">
      {/* Logo + app name */}
      <div className="mb-7 flex flex-col items-center">
        <div className="flex h-16 w-16 items-center justify-center rounded-2xl shadow-md ring-1 ring-black/[0.04]">
          <CareFlowLogo className="h-16 w-16" />
        </div>
        <h1 className="mt-5 text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
          CareFlow Intelligence
        </h1>
        <p className="mt-2 max-w-xl text-sm leading-relaxed text-muted-foreground sm:text-base">
          Hospital Resource Forecasting &amp; Operations Intelligence — predict demand,
          anticipate bed &amp; ICU gaps, and prepare resources in advance.
        </p>
      </div>

      {/* Stats row */}
      <div className="mx-auto mb-9 grid max-w-2xl grid-cols-2 gap-3 sm:grid-cols-4">
        <HeroStat value="7-day" label="Forecast horizon" />
        <HeroStat value="4" label="Departments" />
        <HeroStat value="365" label="Days of history" />
        <HeroStat value="95%" label="CI coverage" />
      </div>

      {/* Feature highlights */}
      <div className="mx-auto mb-10 grid max-w-2xl grid-cols-1 gap-3 sm:grid-cols-3">
        <HeroFeature icon={<Activity className="h-4 w-4" />} title="7-day forecasting" desc="Time-series model with confidence intervals" />
        <HeroFeature icon={<ShieldCheck className="h-4 w-4" />} title="Capacity alerts" desc="Threshold warnings across wards &amp; ICU" />
        <HeroFeature icon={<TrendingUp className="h-4 w-4" />} title="What-if simulation" desc="Model scenarios &amp; department impact" />
      </div>

      {/* Primary + secondary CTAs */}
      <div className="flex flex-col items-center justify-center gap-3 sm:flex-row">
        <Button
          type="button"
          onClick={onGetStarted}
          size="lg"
          className="h-12 px-8 text-base bg-primary text-primary-foreground shadow-md transition hover:bg-primary/90"
        >
          Get Started
          <ArrowRight className="ml-2 h-4 w-4" />
        </Button>
        <button
          type="button"
          onClick={onGetStarted}
          className="h-12 px-5 text-sm font-medium text-foreground transition hover:text-primary"
        >
          I already have an account →
        </button>
      </div>

      {/* How it works */}
      <div className="mx-auto mt-14 max-w-3xl">
        <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          How it works
        </h2>
        <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-3">
          <HowItStep
            n="1"
            icon={<LineChart className="h-4 w-4" />}
            title="Load historical data"
            desc="365 days of daily admissions, bed &amp; ICU occupancy feed the model."
          />
          <HowItStep
            n="2"
            icon={<CalendarClock className="h-4 w-4" />}
            title="Forecast &amp; detect gaps"
            desc="7-day projections with 95% CI highlight bed/ICU shortages early."
          />
          <HowItStep
            n="3"
            icon={<ShieldCheck className="h-4 w-4" />}
            title="Act before overload"
            desc="Threshold alerts &amp; what-if simulation help you plan capacity."
          />
        </div>
      </div>

      {/* Trust badges */}
      <div className="mx-auto mt-10 flex max-w-2xl flex-wrap items-center justify-center gap-x-6 gap-y-2 text-[11px] font-medium text-muted-foreground">
        <span className="inline-flex items-center gap-1.5">
          <LockIcon className="h-3.5 w-3.5 text-primary" /> JWT-secured sessions
        </span>
        <span className="inline-flex items-center gap-1.5">
          <Layers className="h-3.5 w-3.5 text-primary" /> Role-based access (Admin · Staff · Reception)
        </span>
        <span className="inline-flex items-center gap-1.5">
          <CheckCircle2 className="h-3.5 w-3.5 text-primary" /> Real-time data sync
        </span>
      </div>

      {/* Footer disclaimer */}
      <p className="mx-auto mt-10 flex max-w-md items-center justify-center gap-1.5 text-center text-[11px] leading-relaxed text-muted-foreground">
        <HeartPulse className="h-3 w-3 shrink-0 opacity-60" aria-hidden="true" />
        <span>
          This system provides capacity &amp; operations risk signals only, not medical
          diagnosis or emergency predictions.
        </span>
      </p>
    </div>
  )
}

function HeroStat({ value, label }: { value: string; label: string }) {
  return (
    <div className="rounded-xl border border-border/60 bg-card/80 px-3 py-3 text-center shadow-sm backdrop-blur-sm">
      <p className="text-lg font-semibold tracking-tight text-foreground sm:text-xl">{value}</p>
      <p className="mt-0.5 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">{label}</p>
    </div>
  )
}

function HowItStep({
  n,
  icon,
  title,
  desc,
}: {
  n: string
  icon: React.ReactNode
  title: string
  desc: string
}) {
  return (
    <div className="relative rounded-xl border border-border/60 bg-card/80 p-4 text-left shadow-sm backdrop-blur-sm">
      <div className="flex items-center gap-2">
        <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary text-[11px] font-semibold text-primary-foreground">
          {n}
        </span>
        <span className="text-primary">{icon}</span>
      </div>
      <p className="mt-2 text-sm font-medium text-foreground">{title}</p>
      <p className="mt-1 text-xs leading-relaxed text-muted-foreground" dangerouslySetInnerHTML={{ __html: desc }} />
    </div>
  )
}

function HeroFeature({
  icon,
  title,
  desc,
}: {
  icon: React.ReactNode
  title: string
  desc: string
}) {
  return (
    <div className="flex items-start gap-3 rounded-xl border border-border/60 bg-card/80 p-4 text-left shadow-sm backdrop-blur-sm">
      <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
        {icon}
      </div>
      <div>
        <p className="text-sm font-medium text-foreground">{title}</p>
        <p className="mt-0.5 text-xs text-muted-foreground">{desc}</p>
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
      <Label className="text-[13px] font-medium text-foreground">{label}</Label>
      {children}
      {error && <p className="text-xs font-medium text-destructive">{error}</p>}
    </div>
  )
}

/** Inline red banner shown directly above the submit button. */
function ErrorBanner({ message }: { message: string | null }) {
  if (!message) return null
  return (
    <div
      role="alert"
      className="flex items-start gap-2 rounded-lg border border-destructive/30 bg-destructive/5 px-3 py-2.5"
    >
      <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-destructive" />
      <p className="text-[13px] leading-snug text-destructive">{message}</p>
    </div>
  )
}

function DemoHint({ onFill }: { onFill: () => void }) {
  return (
    <div className="rounded-lg border border-dashed border-border bg-muted/40 px-3 py-2.5 text-xs text-muted-foreground">
      <span className="font-medium text-foreground">Demo account</span> ·{' '}
      <span className="font-mono text-[11px]">admin@careflow.health</span> /{' '}
      <span className="font-mono text-[11px]">careflow123</span>{' '}
      <button type="button" onClick={onFill} className="font-medium text-primary hover:underline">
        autofill
      </button>
    </div>
  )
}
