'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { Vehicle } from '@/types'
import { getCurrencySymbol } from '@/lib/formatters'
import { useCurrency } from '@/lib/currency-context'

export default function EditVehicle() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const { currency } = useCurrency()
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({
    year: '',
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

  useEffect(() => {
    fetch(`/api/vehicles/${id}`)
      .then((r) => r.json())
      .then((v: Vehicle) => {
        setForm({
          year: v.year.toString(),
          make: v.make,
          model: v.model,
          vin: v.vin || '',
          registration: v.registration || '',
          purchase_price: v.purchase_price.toString(),
          estimated_sale_price: v.estimated_sale_price.toString(),
          budget: v.budget?.toString() || '',
          status: v.status,
          notes: v.notes || '',
        })
      })
  }, [id])

  function handleChange(e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) {
    setForm({ ...form, [e.target.name]: e.target.value })
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    await fetch(`/api/vehicles/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...form,
        year: parseInt(form.year),
        purchase_price: parseFloat(form.purchase_price) || 0,
        estimated_sale_price: parseFloat(form.estimated_sale_price) || 0,
        budget: parseFloat(form.budget) || null,
      }),
    })
    router.push(`/vehicles/${id}`)
  }

  return (
    <div className="max-w-lg">
      <div className="flex items-center gap-3 mb-6 text-sm">
        <Link href="/" className="text-gray-500 hover:text-gray-300">Vehicles</Link>
        <span className="text-gray-700">/</span>
        <Link href={`/vehicles/${id}`} className="text-gray-500 hover:text-gray-300">
          {form.year} {form.make} {form.model}
        </Link>
        <span className="text-gray-700">/</span>
        <span className="text-gray-300">Edit</span>
      </div>

      <h1 className="text-2xl font-bold mb-6">Edit Vehicle</h1>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-3 gap-3">
          <div>
            <label className="block text-sm text-gray-400 mb-1">Year *</label>
            <input name="year" type="number" value={form.year} onChange={handleChange} required
              className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-amber-500" />
          </div>
          <div>
            <label className="block text-sm text-gray-400 mb-1">Make *</label>
            <input name="make" value={form.make} onChange={handleChange} required
              className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-amber-500" />
          </div>
          <div>
            <label className="block text-sm text-gray-400 mb-1">Model *</label>
            <input name="model" value={form.model} onChange={handleChange} required
              className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-amber-500" />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-sm text-gray-400 mb-1">Registration</label>
            <input name="registration" value={form.registration} onChange={handleChange}
              className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-amber-500" />
          </div>
          <div>
            <label className="block text-sm text-gray-400 mb-1">VIN</label>
            <input name="vin" value={form.vin} onChange={handleChange}
              className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-amber-500" />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-sm text-gray-400 mb-1">Purchase Price ({getCurrencySymbol(currency)})</label>
            <input name="purchase_price" type="number" step="0.01" value={form.purchase_price} onChange={handleChange}
              className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-amber-500" />
          </div>
          <div>
            <label className="block text-sm text-gray-400 mb-1">Est. Sale Price ({getCurrencySymbol(currency)})</label>
            <input name="estimated_sale_price" type="number" step="0.01" value={form.estimated_sale_price} onChange={handleChange}
              className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-amber-500" />
          </div>
        </div>

        <div>
          <label className="block text-sm text-gray-400 mb-1">Restoration Budget ({getCurrencySymbol(currency)})</label>
          <input name="budget" type="number" step="0.01" value={form.budget} onChange={handleChange}
            placeholder="Optional spend limit"
            className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-amber-500" />
        </div>

        <div>
          <label className="block text-sm text-gray-400 mb-1">Status</label>
          <select name="status" value={form.status} onChange={handleChange}
            className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-amber-500">
            <option value="active">Active</option>
            <option value="paused">Paused</option>
            <option value="sold">Sold</option>
          </select>
        </div>

        <div>
          <label className="block text-sm text-gray-400 mb-1">Notes</label>
          <textarea name="notes" value={form.notes} onChange={handleChange} rows={3}
            className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-amber-500 resize-none" />
        </div>

        <div className="flex gap-3 pt-2">
          <button type="submit" disabled={saving}
            className="bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-black font-semibold px-5 py-2 rounded-lg text-sm">
            {saving ? 'Saving...' : 'Save Changes'}
          </button>
          <Link href={`/vehicles/${id}`}
            className="px-5 py-2 rounded-lg text-sm text-gray-400 hover:text-gray-200 border border-gray-700 hover:border-gray-500">
            Cancel
          </Link>
        </div>
      </form>
    </div>
  )
}
