import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import { CurrencyProvider } from '@/lib/currency-context'
import Nav from '@/components/Nav'
import './globals.css'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'Restoration Tracker',
  description: 'Track vehicle restoration costs and parts',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className={`${inter.className} bg-gray-950 text-gray-100 min-h-screen`}>
        <CurrencyProvider>
          <Nav />
          <main className="max-w-6xl mx-auto px-4 py-8">
            {children}
          </main>
        </CurrencyProvider>
      </body>
    </html>
  )
}
