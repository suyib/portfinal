import type { Metadata } from 'next'
import { Suspense } from 'react'
import { LoginForm } from './login-form'

export const metadata: Metadata = {
  title: 'Sign in',
  robots: { index: false, follow: false },
}

export default function LoginPage() {
  return (
    <main className="admin mx-auto max-w-sm px-4 py-20">
      <h1 className="mb-6 text-2xl font-semibold">Sign in</h1>
      <Suspense>
        <LoginForm />
      </Suspense>
    </main>
  )
}
