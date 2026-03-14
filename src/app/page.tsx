'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { VehicleWithFinancials } from '@/types'
import { formatCurrency } from '@/lib/formatters'
import { useCurrency } from '@/lib/currency-context'

const STATUS_LABELS: Record<string, string> = {
  active: 'Active',
  paused: 'Paused',
  sold: 'Sold',
}

const STATUS_COLORS: Record<string, string> = {
  active: 'bg-green-900 text-green-300',
  paused: 'bg-yellow-900 text-yellow-300',
  sold: 'bg-blue-900 text-blue-300',
}

function BudgetBar({ spent, budget, currency }: { spent: number; budget: number; currency: string }) {
  const pct = Math.min((spent / budget) * 100, 100)
  const over = spent > budget
  const warn = !over && pct >= 80
  const barColor = over ? 'bg-red-500' : warn ? 'bg-amber-500' : 'bg-green-500'
  return (
    <div className="mt-3 pt-3 border-t border-gray-800">
      <div className="flex justify-between text-xs text-gray-400 mb-1">
        <span>Budget</span>
        <span className={over ? 'text-red-400' : warn ? 'text-amber-400' : 'text-gray-400'}>
          {formatCurrency(spent, currency)} / {formatCurrency(budget, currency)}
        </span>
      </div>
      <div className="h-1.5 bg-gray-800 rounded-full overflow-hidden">
        <div className={`h-full rounded-full ${barColor}`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  )
}

export default function Dashboard() {
  const { currency } = useCurrency()
  const router = useRouter()
  const [vehicles, setVehicles] = useState<VehicleWithFinancials[]>([])
  const [loading, setLoading] = useState(true)
  const importRef = useRef<HTMLInputElement>(null)
  const [importing, setImporting] = useState(false)

  useEffect(() => {
    fetch('/api/vehicles')
      .then((r) => r.json())
      .then((data) => { setVehicles(data); setLoading(false) })
  }, [])

  async function handleImport(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setImporting(true)
    try {
      const text = await file.text()
      const json = JSON.parse(text)
      const res = await fetch('/api/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(json),
      })
      if (!res.ok) throw new Error('Import failed')
      const vehicle = await res.json()
      router.push(`/vehicles/${vehicle.id}`)
    } catch {
      alert('Failed to import — make sure the file is a valid Restoration Tracker export.')
      setImporting(false)
    }
    if (importRef.current) importRef.current.value = ''
  }

  if (loading) {
    return <div className="text-gray-500 text-center py-20">Loading...</div>
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-2xl font-bold">Vehicles</h1>
        <div className="flex gap-2 flex-shrink-0">
          <label className={`px-3 py-2 rounded-lg text-sm border border-gray-700 hover:border-gray-500 text-gray-300 hover:text-white cursor-pointer ${importing ? 'opacity-50 pointer-events-none' : ''}`}>
            <span className="hidden sm:inline">{importing ? 'Importing...' : 'Import JSON'}</span>
            <span className="sm:hidden">{importing ? '...' : 'Import'}</span>
            <input ref={importRef} type="file" accept=".json" className="hidden" onChange={handleImport} />
          </label>
          <Link
            href="/vehicles/new"
            className="bg-amber-500 hover:bg-amber-400 text-black font-semibold px-3 py-2 rounded-lg text-sm"
          >
            <span className="hidden sm:inline">+ Add Vehicle</span>
            <span className="sm:hidden">+ Add</span>
          </Link>
        </div>
      </div>

      {vehicles.length === 0 ? (
        <div className="text-center py-20 text-gray-500">
          <p className="text-xl mb-2">No vehicles yet</p>
          <p className="text-sm">Add your first vehicle to get started.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {vehicles.map((v) => (
            <Link
              key={v.id}
              href={`/vehicles/${v.id}`}
              className="block bg-gray-900 border border-gray-800 rounded-xl p-5 hover:border-gray-600 transition-colors"
            >
              <div className="flex items-start justify-between mb-3">
                <div>
                  <h2 className="font-bold text-lg leading-tight">
                    {v.year} {v.make} {v.model}
                  </h2>
                  {(v.registration || v.vin) && (
                    <p className="text-xs text-gray-500 mt-0.5">
                      {v.registration && <span className="text-gray-400 uppercase mr-2">{v.registration}</span>}
                      {v.vin && <span>VIN: {v.vin}</span>}
                    </p>
                  )}
                </div>
                <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${STATUS_COLORS[v.status]}`}>
                  {STATUS_LABELS[v.status]}
                </span>
              </div>

              <div className="space-y-1.5 text-sm">
                <div className="flex justify-between text-gray-400">
                  <span>Purchase Price</span>
                  <span className="text-gray-200">{formatCurrency(v.purchase_price, currency)}</span>
                </div>
                <div className="flex justify-between text-gray-400">
                  <span>Parts &amp; Services</span>
                  <span className="text-gray-200">{formatCurrency(v.total_parts_cost, currency)}</span>
                </div>
                <div className="flex justify-between text-gray-400 border-t border-gray-800 pt-1.5">
                  <span>Total Investment</span>
                  <span className="font-medium text-white">{formatCurrency(v.total_investment, currency)}</span>
                </div>
                <div className="flex justify-between text-gray-400">
                  <span>Est. Sale Price</span>
                  <span className="text-gray-200">{formatCurrency(v.estimated_sale_price, currency)}</span>
                </div>
              </div>

              {v.budget ? (
                <BudgetBar spent={v.total_investment} budget={v.budget} currency={currency} />
              ) : (
                <div className="mt-3 pt-3 border-t border-gray-800 flex justify-between items-center">
                  {v.status === 'sold' && v.actual_sale_price != null ? (
                    <>
                      <span className="text-sm text-gray-400">Actual Profit</span>
                      {(() => {
                        const profit = v.actual_sale_price! - v.total_investment
                        return (
                          <span className={`font-bold text-base ${profit >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                            {formatCurrency(profit, currency)}
                          </span>
                        )
                      })()}
                    </>
                  ) : (
                    <>
                      <span className="text-sm text-gray-400">Anticipated Profit</span>
                      <span className={`font-bold text-base ${v.anticipated_profit >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                        {formatCurrency(v.anticipated_profit, currency)}
                      </span>
                    </>
                  )}
                </div>
              )}
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
