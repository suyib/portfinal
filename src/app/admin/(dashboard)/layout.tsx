import type { Metadata } from 'next'
import Link from 'next/link'
import { Suspense } from 'react'
import { signOut } from '../actions'

export const metadata: Metadata = {
  title: 'Admin',
  robots: { index: false, follow: false },
}

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="admin mx-auto max-w-5xl px-4 py-6">
      <header className="mb-8 flex flex-wrap items-center gap-4 border-b pb-4">
        <Link href="/admin" className="font-semibold">
          Portfolio admin
        </Link>
        <nav className="flex gap-4 text-sm">
          <Link href="/admin">Projects</Link>
          <Link href="/admin/settings">Site settings</Link>
          <Link href="/" target="_blank">
            View site ↗
          </Link>
        </nav>
        <form action={signOut} className="ml-auto">
          <button className="btn-sm">Sign out</button>
        </form>
      </header>
      {/* Admin pages read the session cookie, so they render at request time. */}
      <Suspense fallback={<p className="text-sm text-neutral-500">Loading…</p>}>{children}</Suspense>
    </div>
  )
}
