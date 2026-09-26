'use client'

import { useEffect, useRef, useState } from 'react'
import {
  Loader2,
  ArrowLeft,
  Mail,
  ShieldCheck,
  AlertCircle,
  RefreshCw,
} from 'lucide-react'
import {
  useGoogleInitiate,
  useGoogleSendCode,
  useGoogleVerify,
  type MockGoogleAccount,
  type AuthError,
} from '@/hooks/use-api'
import { GoogleIcon } from '@/components/google-icon'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'

type Step = 'chooser' | 'code'

/**
 * Google sign-in flow overlay:
 *   Step 1 "chooser" — pick a Google account from the mock list.
 *   Step 2 "code" — enter the 6-digit verification code "sent to" that email.
 * On verify success the parent's onSuccess fires (the user is logged in and
 * the dashboard mounts).
 *
 * In production this would be a real Google OAuth redirect + ID-token
 * verification; here we simulate it so the UI is fully functional. The
 * generated code is shown in a small "demo code" banner so the user can read
 * + enter it (since we can't send real email in the sandbox).
 */
export function GoogleSignInFlow({
  open,
  onClose,
  onSuccess,
  onError,
}: {
  open: boolean
  onClose: () => void
  onSuccess?: () => void
  onError?: (e: AuthError) => void
}) {
  const initiate = useGoogleInitiate(open)
  const sendCode = useGoogleSendCode()
  const verify = useGoogleVerify()

  const [step, setStep] = useState<Step>('chooser')
  const [selected, setSelected] = useState<MockGoogleAccount | null>(null)
  const [code, setCode] = useState('')
  const [demoCode, setDemoCode] = useState<string | null>(null)
  const [localError, setLocalError] = useState<string | null>(null)
  const dialogRef = useRef<HTMLDivElement>(null)

  const reset = () => {
    setStep('chooser')
    setSelected(null)
    setCode('')
    setDemoCode(null)
    setLocalError(null)
  }

  const close = () => {
    reset()
    onClose()
  }

  // Close on Escape
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') close()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, close])

  if (!open) return null

  const onPickAccount = (acc: MockGoogleAccount) => {
    setLocalError(null)
    setSelected(acc)
    sendCode.mutate(acc.email, {
      onSuccess: (data) => {
        setDemoCode(data.demoCode)
        setStep('code')
      },
      onError: (e: AuthError) => setLocalError(e.message),
    })
  }

  const onResendCode = () => {
    if (!selected) return
    setLocalError(null)
    sendCode.mutate(selected.email, {
      onSuccess: (data) => setDemoCode(data.demoCode),
      onError: (e: AuthError) => setLocalError(e.message),
    })
  }

  const onVerify = (e: React.FormEvent) => {
    e.preventDefault()
    if (!selected) return
    setLocalError(null)
    verify.mutate(
      { email: selected.email, code },
      {
        onSuccess: () => {
          onSuccess?.()
        },
        onError: (e: AuthError) => {
          setLocalError(e.message)
          onError?.(e)
        },
      },
    )
  }

  const busy = sendCode.isPending || verify.isPending

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-label="Sign in with Google"
      onClick={(e) => {
        if (e.target === e.currentTarget) close()
      }}
    >
      <div
        ref={dialogRef}
        className="w-full max-w-md overflow-hidden rounded-2xl bg-card shadow-2xl ring-1 ring-black/[0.04]"
      >
        {/* Google-style header bar */}
        <div className="flex items-center gap-3 border-b border-border/60 px-5 py-4">
          <GoogleIcon />
          <span className="text-sm font-medium text-foreground">Sign in with Google</span>
          <button
            type="button"
            onClick={close}
            className="ml-auto rounded-md p-1 text-muted-foreground transition hover:bg-muted hover:text-foreground"
            aria-label="Close"
          >
            <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M18 6 6 18M6 6l12 12" strokeLinecap="round" />
            </svg>
          </button>
        </div>

        <div className="p-6">
          {step === 'chooser' ? (
            <ChooserStep
              accounts={initiate.data?.accounts ?? []}
              loading={initiate.isFetching || (open && !initiate.data && !initiate.isError)}
              onPick={onPickAccount}
              sending={sendCode.isPending}
              sendingEmail={sendCode.variables}
              error={localError}
            />
          ) : (
            <CodeStep
              account={selected}
              code={code}
              setCode={setCode}
              demoCode={demoCode}
              busy={busy}
              verifying={verify.isPending}
              error={localError}
              onVerify={onVerify}
              onResend={onResendCode}
              onBack={() => {
                setStep('chooser')
                setCode('')
                setDemoCode(null)
                setLocalError(null)
              }}
            />
          )}
        </div>
      </div>
    </div>
  )
}

/* ---------- Step 1: account chooser ---------- */
function ChooserStep({
  accounts,
  loading,
  onPick,
  sending,
  sendingEmail,
  error,
}: {
  accounts: MockGoogleAccount[]
  loading: boolean
  onPick: (a: MockGoogleAccount) => void
  sending: boolean
  sendingEmail?: string
  error: string | null
}) {
  return (
    <div>
      <h2 className="text-base font-semibold text-foreground">Choose an account</h2>
      <p className="mt-1 text-xs text-muted-foreground">
        to continue to <span className="font-medium text-foreground">CareFlow Intelligence</span>
      </p>

      {loading ? (
        <div className="mt-5 flex items-center justify-center py-8 text-muted-foreground">
          <Loader2 className="mr-2 h-5 w-5 animate-spin" /> Loading accounts…
        </div>
      ) : (
        <div className="mt-4 space-y-2">
          {accounts.map((a) => {
            const isSending = sending && sendingEmail === a.email
            return (
              <button
                key={a.email}
                type="button"
                onClick={() => onPick(a)}
                disabled={sending}
                className={cn(
                  'flex w-full items-center gap-3 rounded-lg border border-border/70 px-3 py-3 text-left transition hover:border-primary/40 hover:bg-primary/5 disabled:opacity-60',
                )}
              >
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-blue-500 to-teal-500 text-xs font-semibold text-white">
                  {a.initials}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-foreground">{a.name}</p>
                  <p className="truncate text-xs text-muted-foreground">{a.email}</p>
                </div>
                {isSending && <Loader2 className="h-4 w-4 animate-spin text-primary" />}
              </button>
            )
          })}
        </div>
      )}

      <div className="mt-4 flex items-center gap-2 rounded-lg bg-muted/40 px-3 py-2 text-[11px] text-muted-foreground">
        <ShieldCheck className="h-3.5 w-3.5 shrink-0" />
        CareFlow uses Google sign-in to verify your identity. A 6-digit code will be sent to your email.
      </div>

      {error && (
        <div className="mt-3 flex items-start gap-2 rounded-lg border border-destructive/30 bg-destructive/5 px-3 py-2.5">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-destructive" />
          <p className="text-[13px] leading-snug text-destructive">{error}</p>
        </div>
      )}
    </div>
  )
}

/* ---------- Step 2: verification code ---------- */
function CodeStep({
  account,
  code,
  setCode,
  demoCode,
  busy,
  verifying,
  error,
  onVerify,
  onResend,
  onBack,
}: {
  account: MockGoogleAccount | null
  code: string
  setCode: (v: string) => void
  demoCode: string | null
  busy: boolean
  verifying: boolean
  error: string | null
  onVerify: (e: React.FormEvent) => void
  onResend: () => void
  onBack: () => void
}) {
  // Format the code as the user types: digits only, max 6.
  const handleChange = (v: string) => {
    const digits = v.replace(/\D/g, '').slice(0, 6)
    setCode(digits)
  }

  return (
    <div>
      <button
        type="button"
        onClick={onBack}
        className="mb-3 inline-flex items-center gap-1 text-xs font-medium text-muted-foreground transition hover:text-foreground"
      >
        <ArrowLeft className="h-3.5 w-3.5" />
        Use another account
      </button>

      <h2 className="text-base font-semibold text-foreground">Enter the verification code</h2>
      <p className="mt-1 text-xs text-muted-foreground">
        We sent a 6-digit code to{' '}
        <span className="font-medium text-foreground">{account?.email}</span>. Enter it below to
        sign in.
      </p>

      {/* Demo banner: shows the generated code so the user can enter it.
          In production this would be a real email and this banner would not exist. */}
      {demoCode && (
        <div className="mt-4 rounded-lg border border-dashed border-primary/40 bg-primary/5 px-3 py-2.5">
          <p className="text-[11px] font-medium uppercase tracking-wide text-primary">
            Demo verification code
          </p>
          <p className="mt-1 font-mono text-lg font-semibold tracking-[0.3em] text-foreground">
            {demoCode}
          </p>
          <p className="mt-1 text-[11px] text-muted-foreground">
            (Shown here because this sandbox can&rsquo;t send real email. Enter it above to sign in.)
          </p>
        </div>
      )}

      <form onSubmit={onVerify} className="mt-4 space-y-3">
        <div className="space-y-1.5">
          <label className="text-[13px] font-medium text-foreground" htmlFor="g-code">
            Verification code
          </label>
          <div className="relative">
            <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              id="g-code"
              type="text"
              inputMode="numeric"
              autoComplete="one-time-code"
              placeholder="••••••"
              className="h-12 pl-10 text-center font-mono text-lg tracking-[0.4em]"
              value={code}
              onChange={(e) => handleChange(e.target.value)}
              autoFocus
              disabled={busy}
              aria-invalid={!!error}
            />
          </div>
        </div>

        {error && (
          <div className="flex items-start gap-2 rounded-lg border border-destructive/30 bg-destructive/5 px-3 py-2.5">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-destructive" />
            <p className="text-[13px] leading-snug text-destructive">{error}</p>
          </div>
        )}

        <Button
          type="submit"
          className="h-11 w-full"
          disabled={busy || code.length < 4}
        >
          {verifying ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <ShieldCheck className="mr-2 h-4 w-4" />
          )}
          Verify &amp; sign in
        </Button>

        <div className="flex items-center justify-between pt-1">
          <button
            type="button"
            onClick={onResend}
            disabled={busy}
            className="inline-flex items-center gap-1 text-xs font-medium text-muted-foreground transition hover:text-primary disabled:opacity-60"
          >
            <RefreshCw className="h-3.5 w-3.5" />
            Resend code
          </button>
          <span className="text-[11px] text-muted-foreground">Code expires in 10 minutes</span>
        </div>
      </form>
    </div>
  )
}
