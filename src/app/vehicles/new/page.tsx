'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { getCurrencySymbol } from '@/lib/formatters'
import { useCurrency } from '@/lib/currency-context'

export default function NewVehicle() {
  const router = useRouter()
  const { currency } = useCurrency()
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({
    year: new Date().getFullYear().toString(),
    make: '',
    model: '',
    vin: '',
    registration: '',
    purchase_price: '',
    estimated_sale_price: '',
    budget: '',
    status: 'active',
    notes: '',
  })

  function handleChange(e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) {
    setForm({ ...form, [e.target.name]: e.target.value })
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    const res = await fetch('/api/vehicles', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...form,
        year: parseInt(form.year),
        purchase_price: parseFloat(form.purchase_price) || 0,
        estimated_sale_price: parseFloat(form.estimated_sale_price) || 0,
        budget: parseFloat(form.budget) || null,
      }),
    })
    const data = await res.json()
    router.push(`/vehicles/${data.id}`)
  }

  return (
    <div className="max-w-lg">
      <div className="flex items-center gap-3 mb-6">
        <Link href="/" className="text-gray-500 hover:text-gray-300 text-sm">Vehicles</Link>
        <span className="text-gray-700">/</span>
        <span className="text-sm text-gray-300">New Vehicle</span>
      </div>

      <h1 className="text-2xl font-bold mb-6">Add Vehicle</h1>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-3 gap-3">
          <div>
            <label className="block text-sm text-gray-400 mb-1">Year *</label>
            <input
              name="year"
              type="number"
              value={form.year}
              onChange={handleChange}
              required
              className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-amber-500"
            />
          </div>
          <div>
            <label className="block text-sm text-gray-400 mb-1">Make *</label>
            <input
              name="make"
              value={form.make}
              onChange={handleChange}
              required
              placeholder="Ford"
              className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-amber-500"
            />
          </div>
          <div>
            <label className="block text-sm text-gray-400 mb-1">Model *</label>
            <input
              name="model"
              value={form.model}
              onChange={handleChange}
              required
              placeholder="Mustang"
              className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-amber-500"
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-sm text-gray-400 mb-1">Registration</label>
            <input
              name="registration"
              value={form.registration}
              onChange={handleChange}
              placeholder="Optional"
              className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-amber-500"
            />
          </div>
          <div>
            <label className="block text-sm text-gray-400 mb-1">VIN</label>
            <input
              name="vin"
              value={form.vin}
              onChange={handleChange}
              placeholder="Optional"
              className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-amber-500"
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-sm text-gray-400 mb-1">Purchase Price ({getCurrencySymbol(currency)})</label>
            <input
              name="purchase_price"
              type="number"
              step="0.01"
              value={form.purchase_price}
              onChange={handleChange}
              placeholder="0.00"
              className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-amber-500"
            />
          </div>
          <div>
            <label className="block text-sm text-gray-400 mb-1">Est. Sale Price ({getCurrencySymbol(currency)})</label>
            <input
              name="estimated_sale_price"
              type="number"
              step="0.01"
              value={form.estimated_sale_price}
              onChange={handleChange}
              placeholder="0.00"
              className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-amber-500"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm text-gray-400 mb-1">Restoration Budget ({getCurrencySymbol(currency)})</label>
          <input
            name="budget"
            type="number"
            step="0.01"
            value={form.budget}
            onChange={handleChange}
            placeholder="Optional spend limit"
            className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-amber-500"
          />
        </div>

        <div>
          <label className="block text-sm text-gray-400 mb-1">Status</label>
          <select
            name="status"
            value={form.status}
            onChange={handleChange}
            className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-amber-500"
          >
            <option value="active">Active</option>
            <option value="paused">Paused</option>
            <option value="sold">Sold</option>
          </select>
        </div>

        <div>
          <label className="block text-sm text-gray-400 mb-1">Notes</label>
          <textarea
            name="notes"
            value={form.notes}
            onChange={handleChange}
            rows={3}
            className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-amber-500 resize-none"
          />
        </div>

        <div className="flex gap-3 pt-2">
          <button
            type="submit"
            disabled={saving}
            className="bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-black font-semibold px-5 py-2 rounded-lg text-sm"
          >
            {saving ? 'Saving...' : 'Add Vehicle'}
          </button>
          <Link
            href="/"
            className="px-5 py-2 rounded-lg text-sm text-gray-400 hover:text-gray-200 border border-gray-700 hover:border-gray-500"
          >
            Cancel
          </Link>
        </div>
      </form>
    </div>
  )
}
