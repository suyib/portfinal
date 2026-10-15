'use client'

import { useSearchParams } from 'next/navigation'
import { ActionForm, Field, Submit } from '@/components/admin/action-form'
import { signIn } from '../actions'

export function LoginForm() {
  const params = useSearchParams()
  const notAdmin = params.get('error') === 'not-admin'

  return (
    <ActionForm action={signIn} className="space-y-4">
      {notAdmin && (
        <p role="alert" className="text-sm text-red-700">
          That account doesn’t have admin access.
        </p>
      )}
      <input type="hidden" name="next" value={params.get('next') ?? ''} />
      <Field name="email" label="Email">
        <input name="email" type="email" autoComplete="email" required className="input" />
      </Field>
      <Field name="password" label="Password">
        <input name="password" type="password" autoComplete="current-password" required className="input" />
      </Field>
      <Submit>Sign in</Submit>
    </ActionForm>
  )
}
