'use client'

import {
  createContext,
  use,
  useActionState,
  useEffect,
  useRef,
  startTransition,
  type ReactNode,
} from 'react'
import { useFormStatus } from 'react-dom'
import type { ActionState } from '@/lib/action-state'

type Action = (prev: ActionState, formData: FormData) => Promise<ActionState>

const StateContext = createContext<ActionState>(null)

/**
 * Form bound to a server action. Keeps typed input on validation errors
 * (React would otherwise reset the form), shows the action's message and
 * exposes field errors to <Field>.
 */
export function ActionForm({
  action,
  children,
  className,
  confirm,
  resetOnSuccess = false,
}: {
  action: Action
  children: ReactNode
  className?: string
  confirm?: string
  resetOnSuccess?: boolean
}) {
  const [state, formAction, pending] = useActionState(action, null)
  const ref = useRef<HTMLFormElement>(null)

  useEffect(() => {
    if (resetOnSuccess && state?.ok) ref.current?.reset()
  }, [state, resetOnSuccess])

  return (
    <form
      ref={ref}
      className={className}
      aria-busy={pending}
      onSubmit={(e) => {
        e.preventDefault()
        if (confirm && !window.confirm(confirm)) return
        const formData = new FormData(e.currentTarget)
        startTransition(() => formAction(formData))
      }}
    >
      <StateContext value={state}>
        {children}
        {state?.message && (
          <p role="status" className={state.ok ? 'text-sm text-green-700' : 'text-sm text-red-700'}>
            {state.message}
          </p>
        )}
      </StateContext>
    </form>
  )
}

export function Field({
  name,
  label,
  hint,
  children,
  as: Tag = 'label',
}: {
  name: string
  label: string
  hint?: string
  children: ReactNode
  /** 'div' for composite controls (e.g. the rich text editor) that contain buttons */
  as?: 'label' | 'div'
}) {
  const errors = use(StateContext)?.fieldErrors?.[name]
  return (
    <Tag className="block space-y-1">
      <span className="block text-sm font-medium">{label}</span>
      {children}
      {hint && <span className="block text-xs text-neutral-500">{hint}</span>}
      {errors?.map((e) => (
        <span key={e} className="block text-xs text-red-700">
          {e}
        </span>
      ))}
    </Tag>
  )
}

export function Submit({ children, className }: { children: ReactNode; className?: string }) {
  const { pending } = useFormStatus()
  return (
    <button type="submit" disabled={pending} className={className ?? 'btn'}>
      {pending ? '…' : children}
    </button>
  )
}

/** One-click action (move, delete, publish) with hidden fields. */
export function ActionButton({
  action,
  fields,
  children,
  confirm,
  className,
  title,
}: {
  action: Action
  fields: Record<string, string>
  children: ReactNode
  confirm?: string
  className?: string
  title?: string
}) {
  return (
    <ActionForm action={action} confirm={confirm} className="inline">
      {Object.entries(fields).map(([k, v]) => (
        <input key={k} type="hidden" name={k} value={v} />
      ))}
      <span title={title}>
        <Submit className={className ?? 'btn-sm'}>{children}</Submit>
      </span>
    </ActionForm>
  )
}
