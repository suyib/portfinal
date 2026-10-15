import type { Metadata } from 'next'
import { Geist, Geist_Mono } from 'next/font/google'
import { getSiteSettings } from '@/lib/data/public'
import './globals.css'

const geistSans = Geist({ variable: '--font-geist-sans', subsets: ['latin'] })
const geistMono = Geist_Mono({ variable: '--font-geist-mono', subsets: ['latin'] })

export async function generateMetadata(): Promise<Metadata> {
  const site = await getSiteSettings()
  const name = site?.name || 'Portfolio'
  return {
    metadataBase: process.env.NEXT_PUBLIC_SITE_URL ? new URL(process.env.NEXT_PUBLIC_SITE_URL) : undefined,
    title: { default: site?.headline ? `${name} — ${site.headline}` : name, template: `%s · ${name}` },
    description: site?.headline || undefined,
  }
}

export default function RootLayout({ children }: LayoutProps<'/'>) {
  return (
    <html lang="en" className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}>
      <body className="flex min-h-full flex-col">{children}</body>
    </html>
  )
}
