import Link from 'next/link'

export default function NotFound() {
  return (
    <main className="mx-auto max-w-3xl px-4 py-20">
      <h1 className="text-2xl font-semibold">Page not found</h1>
      <p className="mt-4">
        <Link href="/" className="underline">
          Back to the portfolio
        </Link>
      </p>
    </main>
  )
}
