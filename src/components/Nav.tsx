'use client'

import Link from 'next/link'
import { useCurrency, CURRENCIES } from '@/lib/currency-context'

export default function Nav() {
  const { currency, setCurrency } = useCurrency()

  return (
    <nav className="border-b border-gray-800 bg-gray-900">
      <div className="max-w-6xl mx-auto px-4 h-14 flex items-center justify-between">
        <Link href="/" className="font-bold text-lg text-amber-400 hover:text-amber-300">
          Restoration Tracker
        </Link>
        <select
          value={currency}
          onChange={(e) => setCurrency(e.target.value)}
          className="bg-gray-800 border border-gray-700 rounded-lg px-2 py-1 text-sm text-gray-300 focus:outline-none focus:border-amber-500"
        >
          {CURRENCIES.map((c) => (
            <option key={c.code} value={c.code}>{c.label}</option>
          ))}
        </select>
      </div>
    </nav>
  )
}
