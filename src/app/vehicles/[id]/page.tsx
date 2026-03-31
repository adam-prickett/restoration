'use client'

import { useEffect, useRef, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { Vehicle, VehicleFinancials, Purchase, PartRequired, Receipt, VehicleDocument } from '@/types'
import { formatCurrency, formatDate, formatFileSize, getCurrencySymbol } from '@/lib/formatters'
import { useCurrency } from '@/lib/currency-context'

const CATEGORY_COLORS: Record<string, string> = {
  part: 'bg-blue-900 text-blue-300',
  service: 'bg-purple-900 text-purple-300',
  labor: 'bg-orange-900 text-orange-300',
  other: 'bg-gray-700 text-gray-300',
}

const STATUS_COLORS: Record<string, string> = {
  needed: 'bg-yellow-900 text-yellow-300',
  ordered: 'bg-blue-900 text-blue-300',
  received: 'bg-green-900 text-green-300',
}

type Tab = 'purchases' | 'parts' | 'documents'

export default function VehicleDetail() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const { currency } = useCurrency()
  const [vehicle, setVehicle] = useState<Vehicle | null>(null)
  const [financials, setFinancials] = useState<VehicleFinancials | null>(null)
  const [purchases, setPurchases] = useState<(Purchase & { receipts: Receipt[] })[]>([])
  const [parts, setParts] = useState<PartRequired[]>([])
  const [documents, setDocuments] = useState<VehicleDocument[]>([])
  const [tab, setTab] = useState<Tab>('purchases')
  const [loading, setLoading] = useState(true)

  // Modals
  const [confirm, setConfirm] = useState<{ title: string; message: string; onConfirm: () => void } | null>(null)
  const [showAddPart, setShowAddPart] = useState(false)
  const [showAddPurchase, setShowAddPurchase] = useState(false)
  const [editingPart, setEditingPart] = useState<PartRequired | null>(null)
  const [editingPurchase, setEditingPurchase] = useState<(Purchase & { receipts: Receipt[] }) | null>(null)
  const [movingPartToPurchased, setMovingPartToPurchased] = useState<PartRequired | null>(null)
  const [showPdfModal, setShowPdfModal] = useState(false)
  const [showSellModal, setShowSellModal] = useState(false)
  const [showMenu, setShowMenu] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setShowMenu(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  async function load() {
    const [vRes, fRes, purRes, parRes, docRes] = await Promise.all([
      fetch(`/api/vehicles/${id}`),
      fetch(`/api/vehicles/${id}/financial`),
      fetch(`/api/vehicles/${id}/purchases`),
      fetch(`/api/vehicles/${id}/parts-required`),
      fetch(`/api/vehicles/${id}/documents`),
    ])
    setVehicle(await vRes.json())
    setFinancials(await fRes.json())
    setPurchases(await purRes.json())
    setParts(await parRes.json())
    setDocuments(await docRes.json())
    setLoading(false)
  }

  useEffect(() => { load() }, [id]) // eslint-disable-line react-hooks/exhaustive-deps

  function confirmDeleteVehicle() {
    setConfirm({
      title: 'Delete Vehicle?',
      message: `This will permanently delete ${vehicle?.year} ${vehicle?.make} ${vehicle?.model} and all associated purchases, parts, and receipts.`,
      onConfirm: async () => {
        await fetch(`/api/vehicles/${id}`, { method: 'DELETE' })
        router.push('/')
      },
    })
  }

  async function deletePurchase(purchaseId: number) {
    await fetch(`/api/purchases/${purchaseId}`, { method: 'DELETE' })
    load()
  }

  async function deletePart(partId: number) {
    await fetch(`/api/parts-required/${partId}`, { method: 'DELETE' })
    load()
  }

  async function deleteReceipt(receiptId: number) {
    await fetch(`/api/receipts/${receiptId}`, { method: 'DELETE' })
    load()
  }

  async function deleteDocument(docId: number) {
    await fetch(`/api/documents/${docId}`, { method: 'DELETE' })
    load()
  }

  async function updatePartStatus(part: PartRequired, status: string) {
    await fetch(`/api/parts-required/${part.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...part, status }),
    })
    load()
  }

  if (loading) return <div className="text-gray-500 text-center py-20">Loading...</div>
  if (!vehicle) return <div className="text-center py-20">Vehicle not found</div>

  return (
    <div>
      {/* Breadcrumb */}
      <div className="flex items-center gap-3 mb-6 text-sm">
        <Link href="/" className="text-gray-500 hover:text-gray-300">Vehicles</Link>
        <span className="text-gray-700">/</span>
        <span className="text-gray-300">{vehicle.year} {vehicle.make} {vehicle.model}</span>
      </div>

      {/* Header */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">{vehicle.year} {vehicle.make} {vehicle.model}</h1>
          <div className="flex gap-3 mt-0.5">
            {vehicle.registration && <p className="text-sm text-gray-400">Reg: <span className="font-medium text-gray-200 uppercase">{vehicle.registration}</span></p>}
            {vehicle.vin && <p className="text-sm text-gray-500">VIN: {vehicle.vin}</p>}
          </div>
          {vehicle.notes && <p className="text-sm text-gray-400 mt-1">{vehicle.notes}</p>}
        </div>
        {/* Desktop buttons */}
        <div className="hidden md:flex gap-2 flex-shrink-0">
          {vehicle.status !== 'sold' && (
            <button
              onClick={() => setShowSellModal(true)}
              className="text-sm px-3 py-1.5 border border-green-800 hover:border-green-600 rounded-lg text-green-400 hover:text-green-300"
            >
              Mark as Sold
            </button>
          )}
          <a
            href={`/api/vehicles/${id}/export`}
            download
            className="text-sm px-3 py-1.5 border border-gray-700 hover:border-gray-500 rounded-lg text-gray-300 hover:text-white"
          >
            Export JSON
          </a>
          <button
            onClick={() => setShowPdfModal(true)}
            className="text-sm px-3 py-1.5 border border-gray-700 hover:border-gray-500 rounded-lg text-gray-300 hover:text-white"
          >
            Export PDF
          </button>
          <Link
            href={`/vehicles/${id}/edit`}
            className="text-sm px-3 py-1.5 border border-gray-700 hover:border-gray-500 rounded-lg text-gray-300 hover:text-white"
          >
            Edit
          </Link>
          <button
            onClick={confirmDeleteVehicle}
            className="text-sm px-3 py-1.5 border border-red-900 hover:border-red-700 rounded-lg text-red-400 hover:text-red-300"
          >
            Delete
          </button>
        </div>

        {/* Mobile burger menu */}
        <div className="md:hidden relative flex-shrink-0" ref={menuRef}>
          <button
            onClick={() => setShowMenu((v) => !v)}
            className="p-2 rounded-lg border border-gray-700 hover:border-gray-500 text-gray-400 hover:text-white"
            aria-label="Actions menu"
          >
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
              <circle cx="10" cy="4" r="1.5" />
              <circle cx="10" cy="10" r="1.5" />
              <circle cx="10" cy="16" r="1.5" />
            </svg>
          </button>
          {showMenu && (
            <div className="absolute right-0 top-full mt-1 bg-gray-900 border border-gray-700 rounded-xl shadow-xl z-50 min-w-44 py-1 overflow-hidden">
              {vehicle.status !== 'sold' && (
                <button
                  onClick={() => { setShowMenu(false); setShowSellModal(true) }}
                  className="w-full text-left px-4 py-2.5 text-sm text-green-400 hover:bg-gray-800"
                >
                  Mark as Sold
                </button>
              )}
              <a
                href={`/api/vehicles/${id}/export`}
                download
                onClick={() => setShowMenu(false)}
                className="block px-4 py-2.5 text-sm text-gray-300 hover:bg-gray-800"
              >
                Export JSON
              </a>
              <button
                onClick={() => { setShowMenu(false); setShowPdfModal(true) }}
                className="w-full text-left px-4 py-2.5 text-sm text-gray-300 hover:bg-gray-800"
              >
                Export PDF
              </button>
              <Link
                href={`/vehicles/${id}/edit`}
                onClick={() => setShowMenu(false)}
                className="block px-4 py-2.5 text-sm text-gray-300 hover:bg-gray-800"
              >
                Edit
              </Link>
              <div className="border-t border-gray-800 my-1" />
              <button
                onClick={() => { setShowMenu(false); confirmDeleteVehicle() }}
                className="w-full text-left px-4 py-2.5 text-sm text-red-400 hover:bg-gray-800"
              >
                Delete
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Financial Summary */}
      {financials && (
        <div className={`bg-gray-900 border rounded-xl p-5 mb-6 ${vehicle.status === 'sold' ? 'border-green-900' : 'border-gray-800'}`}>
          {vehicle.status === 'sold' && vehicle.actual_sale_price != null && (
            <div className="flex items-center justify-between mb-4 pb-4 border-b border-green-900">
              <div className="flex items-center gap-2">
                <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-green-900 text-green-300">Sold</span>
                {vehicle.sold_date && <span className="text-sm text-gray-400">{formatDate(vehicle.sold_date)}</span>}
              </div>
              <div className="text-right">
                <p className="text-xs text-gray-500 mb-0.5">Actual Profit</p>
                {(() => {
                  const profit = vehicle.actual_sale_price! - financials.total_investment
                  return <p className={`font-bold text-2xl ${profit >= 0 ? 'text-green-400' : 'text-red-400'}`}>{formatCurrency(profit, currency)}</p>
                })()}
              </div>
            </div>
          )}
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            <div>
              <p className="text-xs text-gray-500 mb-1">Purchase Price</p>
              <p className="font-semibold">{formatCurrency(financials.purchase_price, currency)}</p>
            </div>
            <div>
              <p className="text-xs text-gray-500 mb-1">Parts &amp; Services</p>
              <p className="font-semibold">{formatCurrency(financials.total_parts_cost, currency)}</p>
            </div>
            <div>
              <p className="text-xs text-gray-500 mb-1">Total Investment</p>
              <p className="font-semibold">{formatCurrency(financials.total_investment, currency)}</p>
            </div>
            {vehicle.status === 'sold' && vehicle.actual_sale_price != null ? (
              <div>
                <p className="text-xs text-gray-500 mb-1">Sale Price</p>
                <p className="font-semibold">{formatCurrency(vehicle.actual_sale_price, currency)}</p>
              </div>
            ) : (
              <div>
                <p className="text-xs text-gray-500 mb-1">Est. Sale Price</p>
                <p className="font-semibold">{formatCurrency(financials.estimated_sale_price, currency)}</p>
              </div>
            )}
            <div>
              {vehicle.status === 'sold' && vehicle.actual_sale_price != null ? (
                <>
                  <p className="text-xs text-gray-500 mb-1">Est. Sale Price</p>
                  <p className="font-semibold text-gray-400">{formatCurrency(financials.estimated_sale_price, currency)}</p>
                </>
              ) : (
                <>
                  <p className="text-xs text-gray-500 mb-1">Anticipated Profit</p>
                  <p className={`font-bold text-lg ${financials.anticipated_profit >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                    {formatCurrency(financials.anticipated_profit, currency)}
                  </p>
                </>
              )}
            </div>
          </div>
          {vehicle.budget != null && (
            <div className="mt-4 pt-4 border-t border-gray-800">
              {(() => {
                const spent = financials.total_investment
                const budget = vehicle.budget!
                const pct = Math.min((spent / budget) * 100, 100)
                const over = spent > budget
                const warn = !over && pct >= 80
                const barColor = over ? 'bg-red-500' : warn ? 'bg-amber-500' : 'bg-green-500'
                const textColor = over ? 'text-red-400' : warn ? 'text-amber-400' : 'text-gray-400'
                return (
                  <>
                    <div className="flex justify-between items-center mb-2">
                      <p className="text-xs text-gray-500">Budget</p>
                      <p className={`text-sm font-medium ${textColor}`}>
                        {formatCurrency(spent, currency)} / {formatCurrency(budget, currency)}
                        {over && <span className="ml-2 text-xs text-red-400">({formatCurrency(spent - budget, currency)} over)</span>}
                      </p>
                    </div>
                    <div className="h-2 bg-gray-800 rounded-full overflow-hidden">
                      <div className={`h-full rounded-full transition-all ${barColor}`} style={{ width: `${pct}%` }} />
                    </div>
                    <p className="text-xs text-gray-600 mt-1">{pct.toFixed(0)}% of budget used</p>
                  </>
                )
              })()}
            </div>
          )}
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-1 mb-4 border-b border-gray-800">
        <button
          onClick={() => setTab('purchases')}
          className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors ${
            tab === 'purchases' ? 'border-amber-500 text-amber-400' : 'border-transparent text-gray-500 hover:text-gray-300'
          }`}
        >
          Purchases ({purchases.length})
        </button>
        <button
          onClick={() => setTab('parts')}
          className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors ${
            tab === 'parts' ? 'border-amber-500 text-amber-400' : 'border-transparent text-gray-500 hover:text-gray-300'
          }`}
        >
          Parts Wishlist ({parts.length})
        </button>
        <button
          onClick={() => setTab('documents')}
          className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors ${
            tab === 'documents' ? 'border-amber-500 text-amber-400' : 'border-transparent text-gray-500 hover:text-gray-300'
          }`}
        >
          Documents ({documents.length})
        </button>
      </div>

      {/* Purchases Tab */}
      {tab === 'purchases' && (
        <div>
          <div className="flex justify-end mb-3">
            <button
              onClick={() => setShowAddPurchase(true)}
              className="bg-amber-500 hover:bg-amber-400 text-black font-semibold px-4 py-2 rounded-lg text-sm"
            >
              + Add Purchase
            </button>
          </div>
          {purchases.length === 0 ? (
            <p className="text-gray-500 text-center py-10">No purchases yet.</p>
          ) : (
            <div className="space-y-3">
              {purchases.map((p) => (
                <div key={p.id} className="bg-gray-900 border border-gray-800 rounded-xl p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-medium">{p.description}</span>
                        <span className={`text-xs px-2 py-0.5 rounded-full ${CATEGORY_COLORS[p.category]}`}>
                          {p.category}
                        </span>
                      </div>
                      <div className="flex flex-wrap gap-x-4 gap-y-1 mt-1 text-sm text-gray-400">
                        {p.part_number && <span>P/N: {p.part_number}</span>}
                        {p.vendor && <span>Vendor: {p.vendor}</span>}
                        {p.purchase_date && <span>{formatDate(p.purchase_date)}</span>}
                      </div>
                      {p.notes && <p className="text-sm text-gray-500 mt-1">{p.notes}</p>}
                      {p.receipts.length > 0 && (
                        <div className="flex flex-wrap gap-2 mt-2">
                          {p.receipts.map((r) => (
                            <div key={r.id} className="flex items-center gap-1 bg-gray-800 rounded px-2 py-1 text-xs">
                              <a
                                href={r.stored_path}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-amber-400 hover:text-amber-300 truncate max-w-32"
                              >
                                {r.filename}
                              </a>
                              {r.file_size && <span className="text-gray-500">{formatFileSize(r.file_size)}</span>}
                              <button
                                onClick={() => setConfirm({ title: 'Remove Receipt?', message: `Remove "${r.filename}" from this purchase?`, onConfirm: () => deleteReceipt(r.id) })}
                                className="text-gray-600 hover:text-red-400 ml-1"
                                title="Remove receipt"
                              >
                                ×
                              </button>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                    <div className="text-right flex-shrink-0">
                      <p className="font-semibold text-lg">{formatCurrency(p.actual_cost, currency)}</p>
                      <div className="flex gap-2 mt-1 justify-end">
                        <button
                          onClick={() => setEditingPurchase(p)}
                          className="text-xs text-gray-500 hover:text-gray-300"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => setConfirm({ title: 'Delete Purchase?', message: `Delete "${p.description}"? This will also remove any attached receipts.`, onConfirm: () => deletePurchase(p.id) })}
                          className="text-xs text-red-700 hover:text-red-400"
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Parts Tab */}
      {tab === 'parts' && (
        <div>
          <div className="flex justify-end mb-3">
            <button
              onClick={() => setShowAddPart(true)}
              className="bg-amber-500 hover:bg-amber-400 text-black font-semibold px-4 py-2 rounded-lg text-sm"
            >
              + Add Part
            </button>
          </div>
          {parts.length === 0 ? (
            <p className="text-gray-500 text-center py-10">No parts on wishlist.</p>
          ) : (
            <div className="space-y-2">
              {parts.map((p) => (
                <div key={p.id} className="bg-gray-900 border border-gray-800 rounded-xl p-4 flex items-start gap-3">
                  <div className="flex-1 min-w-0">
                    <span className="font-medium">{p.description}</span>
                    <div className="flex flex-wrap gap-x-4 gap-y-1 mt-1 text-sm text-gray-400">
                      {p.part_number && <span>P/N: {p.part_number}</span>}
                      {p.estimated_cost > 0 && <span>Est: {formatCurrency(p.estimated_cost, currency)}</span>}
                    </div>
                    {p.notes && <p className="text-sm text-gray-500 mt-1">{p.notes}</p>}
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <select
                      value={p.status}
                      onChange={(e) => updatePartStatus(p, e.target.value)}
                      className={`text-xs px-2 py-1 rounded-full border-0 font-medium cursor-pointer focus:outline-none ${STATUS_COLORS[p.status]}`}
                    >
                      <option value="needed">Needed</option>
                      <option value="ordered">Ordered</option>
                      <option value="received">Received</option>
                    </select>
                    <button onClick={() => setMovingPartToPurchased(p)} className="text-xs text-green-600 hover:text-green-400">
                      Purchased
                    </button>
                    <button onClick={() => setEditingPart(p)} className="text-xs text-gray-500 hover:text-gray-300">
                      Edit
                    </button>
                    <button onClick={() => setConfirm({ title: 'Delete Part?', message: `Delete "${p.description}" from the wishlist?`, onConfirm: () => deletePart(p.id) })} className="text-xs text-red-700 hover:text-red-400">
                      Delete
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Documents Tab */}
      {tab === 'documents' && (
        <DocumentsTab
          vehicleId={id}
          documents={documents}
          onDelete={(doc) => setConfirm({ title: 'Delete Document?', message: `Delete "${doc.title || doc.filename}"?`, onConfirm: () => deleteDocument(doc.id) })}
          onUploaded={load}
        />
      )}

      {/* PDF Export Modal */}
      {showPdfModal && (
        <PdfModal vehicleId={id} currency={currency} onClose={() => setShowPdfModal(false)} />
      )}

      {/* Confirm Modal */}
      {confirm && (
        <ConfirmModal
          title={confirm.title}
          message={confirm.message}
          onConfirm={() => { confirm.onConfirm(); setConfirm(null) }}
          onClose={() => setConfirm(null)}
        />
      )}

      {/* Add/Edit Part Modal */}
      {(showAddPart || editingPart) && (
        <PartModal
          vehicleId={id}
          part={editingPart}
          onClose={() => { setShowAddPart(false); setEditingPart(null) }}
          onSave={() => { setShowAddPart(false); setEditingPart(null); load() }}
        />
      )}

      {/* Add/Edit Purchase Modal */}
      {(showAddPurchase || editingPurchase) && (
        <PurchaseModal
          vehicleId={id}
          purchase={editingPurchase}
          onClose={() => { setShowAddPurchase(false); setEditingPurchase(null) }}
          onSave={() => { setShowAddPurchase(false); setEditingPurchase(null); load() }}
        />
      )}

      {/* Move Part to Purchased Modal */}
      {movingPartToPurchased && (
        <MoveToPurchasedModal
          vehicleId={id}
          part={movingPartToPurchased}
          onClose={() => setMovingPartToPurchased(null)}
          onSave={() => { setMovingPartToPurchased(null); load() }}
        />
      )}

      {/* Sell Modal */}
      {showSellModal && (
        <SellModal
          vehicle={vehicle}
          onClose={() => setShowSellModal(false)}
          onSave={() => { setShowSellModal(false); load() }}
        />
      )}
    </div>
  )
}

function Modal({ children, onClose }: { children: React.ReactNode; onClose: () => void }) {
  const ref = useRef<HTMLDialogElement>(null)

  useEffect(() => {
    ref.current?.showModal()
  }, [])

  return (
    <dialog
      ref={ref}
      onClose={onClose}
      onClick={(e) => { if (e.target === ref.current) onClose() }}
      className="m-auto rounded-xl p-6 w-full max-w-lg max-h-[90vh] overflow-y-auto bg-gray-900 border border-gray-700 text-gray-100 backdrop:bg-black/60"
    >
      {children}
    </dialog>
  )
}

function ConfirmModal({ title, message, onConfirm, onClose }: { title: string; message: string; onConfirm: () => void; onClose: () => void }) {
  return (
    <Modal onClose={onClose}>
      <h2 className="text-lg font-bold mb-2">{title}</h2>
      <p className="text-gray-400 text-sm mb-5">{message}</p>
      <div className="flex gap-3">
        <button
          onClick={onConfirm}
          className="bg-red-600 hover:bg-red-500 text-white font-semibold px-4 py-2 rounded-lg text-sm"
        >
          Confirm
        </button>
        <button
          onClick={onClose}
          className="px-4 py-2 rounded-lg text-sm text-gray-400 hover:text-gray-200 border border-gray-700"
        >
          Cancel
        </button>
      </div>
    </Modal>
  )
}

function PartModal({
  vehicleId,
  part,
  onClose,
  onSave,
}: {
  vehicleId: string
  part: PartRequired | null
  onClose: () => void
  onSave: () => void
}) {
  const [form, setForm] = useState({
    description: part?.description || '',
    part_number: part?.part_number || '',
    estimated_cost: part?.estimated_cost?.toString() || '',
    notes: part?.notes || '',
    status: part?.status || 'needed',
  })
  const [saving, setSaving] = useState(false)
  const { currency } = useCurrency()

  function handleChange(e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) {
    setForm({ ...form, [e.target.name]: e.target.value })
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    const payload = { ...form, estimated_cost: parseFloat(form.estimated_cost) || 0 }
    if (part) {
      await fetch(`/api/parts-required/${part.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
    } else {
      await fetch(`/api/vehicles/${vehicleId}/parts-required`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
    }
    onSave()
  }

  return (
    <Modal onClose={onClose}>
      <h2 className="text-lg font-bold mb-4">{part ? 'Edit Part' : 'Add Part'}</h2>
      <form onSubmit={handleSubmit} className="space-y-3">
        <div>
          <label className="block text-sm text-gray-400 mb-1">Description *</label>
          <input name="description" value={form.description} onChange={handleChange} required autoFocus
            className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-amber-500" />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-sm text-gray-400 mb-1">Part Number</label>
            <input name="part_number" value={form.part_number} onChange={handleChange}
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-amber-500" />
          </div>
          <div>
            <label className="block text-sm text-gray-400 mb-1">Est. Cost ({getCurrencySymbol(currency)})</label>
            <input name="estimated_cost" type="number" step="0.01" value={form.estimated_cost} onChange={handleChange}
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-amber-500" />
          </div>
        </div>
        <div>
          <label className="block text-sm text-gray-400 mb-1">Status</label>
          <select name="status" value={form.status} onChange={handleChange}
            className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-amber-500">
            <option value="needed">Needed</option>
            <option value="ordered">Ordered</option>
            <option value="received">Received</option>
          </select>
        </div>
        <div>
          <label className="block text-sm text-gray-400 mb-1">Notes</label>
          <textarea name="notes" value={form.notes} onChange={handleChange} rows={2}
            className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-amber-500 resize-none" />
        </div>
        <div className="flex gap-3 pt-1">
          <button type="submit" disabled={saving}
            className="bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-black font-semibold px-4 py-2 rounded-lg text-sm">
            {saving ? 'Saving...' : 'Save'}
          </button>
          <button type="button" onClick={onClose}
            className="px-4 py-2 rounded-lg text-sm text-gray-400 hover:text-gray-200 border border-gray-700">
            Cancel
          </button>
        </div>
      </form>
    </Modal>
  )
}

function PurchaseModal({
  vehicleId,
  purchase,
  onClose,
  onSave,
}: {
  vehicleId: string
  purchase: (Purchase & { receipts: Receipt[] }) | null
  onClose: () => void
  onSave: () => void
}) {
  const [form, setForm] = useState({
    description: purchase?.description || '',
    part_number: purchase?.part_number || '',
    actual_cost: purchase?.actual_cost?.toString() || '',
    vendor: purchase?.vendor || '',
    purchase_date: purchase?.purchase_date || '',
    category: purchase?.category || 'part',
    notes: purchase?.notes || '',
  })
  const [file, setFile] = useState<File | null>(null)
  const [saving, setSaving] = useState(false)
  const { currency } = useCurrency()

  function handleChange(e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) {
    setForm({ ...form, [e.target.name]: e.target.value })
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)

    if (purchase) {
      await fetch(`/api/purchases/${purchase.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, actual_cost: parseFloat(form.actual_cost) || 0 }),
      })
      if (file) {
        const fd = new FormData()
        fd.append('receipt', file)
        await fetch(`/api/purchases/${purchase.id}/receipts`, { method: 'POST', body: fd })
      }
    } else {
      const fd = new FormData()
      Object.entries(form).forEach(([k, v]) => fd.append(k, v))
      fd.set('actual_cost', (parseFloat(form.actual_cost) || 0).toString())
      if (file) fd.append('receipt', file)
      await fetch(`/api/vehicles/${vehicleId}/purchases`, { method: 'POST', body: fd })
    }
    onSave()
  }

  return (
    <Modal onClose={onClose}>
      <h2 className="text-lg font-bold mb-4">{purchase ? 'Edit Purchase' : 'Add Purchase'}</h2>
      <form onSubmit={handleSubmit} className="space-y-3">
        <div>
          <label className="block text-sm text-gray-400 mb-1">Description *</label>
          <input name="description" value={form.description} onChange={handleChange} required
            className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-amber-500" />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-sm text-gray-400 mb-1">Part Number</label>
            <input name="part_number" value={form.part_number} onChange={handleChange}
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-amber-500" />
          </div>
          <div>
            <label className="block text-sm text-gray-400 mb-1">Actual Cost ({getCurrencySymbol(currency)}) *</label>
            <input name="actual_cost" type="number" step="0.01" value={form.actual_cost} onChange={handleChange} required
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-amber-500" />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-sm text-gray-400 mb-1">Vendor</label>
            <input name="vendor" value={form.vendor} onChange={handleChange}
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-amber-500" />
          </div>
          <div>
            <label className="block text-sm text-gray-400 mb-1">Date</label>
            <input name="purchase_date" type="date" value={form.purchase_date} onChange={handleChange}
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-amber-500" />
          </div>
        </div>
        <div>
          <label className="block text-sm text-gray-400 mb-1">Category</label>
          <select name="category" value={form.category} onChange={handleChange}
            className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-amber-500">
            <option value="part">Part</option>
            <option value="service">Service</option>
            <option value="labor">Labor</option>
            <option value="other">Other</option>
          </select>
        </div>
        <div>
          <label className="block text-sm text-gray-400 mb-1">Notes</label>
          <textarea name="notes" value={form.notes} onChange={handleChange} rows={2}
            className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-amber-500 resize-none" />
        </div>
        <div>
          <label className="block text-sm text-gray-400 mb-1">
            {purchase ? 'Add Receipt' : 'Receipt'}
          </label>
          <input
            type="file"
            accept="image/*,.pdf"
            onChange={(e) => setFile(e.target.files?.[0] || null)}
            className="w-full text-sm text-gray-400 file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-sm file:font-medium file:bg-gray-700 file:text-gray-200 hover:file:bg-gray-600 cursor-pointer"
          />
          {file && <p className="text-xs text-gray-500 mt-1">{file.name} ({formatFileSize(file.size)})</p>}
        </div>
        <div className="flex gap-3 pt-1">
          <button type="submit" disabled={saving}
            className="bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-black font-semibold px-4 py-2 rounded-lg text-sm">
            {saving ? 'Saving...' : 'Save'}
          </button>
          <button type="button" onClick={onClose}
            className="px-4 py-2 rounded-lg text-sm text-gray-400 hover:text-gray-200 border border-gray-700">
            Cancel
          </button>
        </div>
      </form>
    </Modal>
  )
}

function MoveToPurchasedModal({
  vehicleId,
  part,
  onClose,
  onSave,
}: {
  vehicleId: string
  part: PartRequired
  onClose: () => void
  onSave: () => void
}) {
  const [form, setForm] = useState({
    description: part.description,
    part_number: part.part_number || '',
    actual_cost: part.estimated_cost?.toString() || '',
    vendor: '',
    purchase_date: '',
    category: 'part',
    notes: part.notes || '',
  })
  const [saving, setSaving] = useState(false)
  const { currency } = useCurrency()

  function handleChange(e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) {
    setForm({ ...form, [e.target.name]: e.target.value })
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    const fd = new FormData()
    Object.entries(form).forEach(([k, v]) => fd.append(k, v))
    fd.set('actual_cost', (parseFloat(form.actual_cost) || 0).toString())
    await fetch(`/api/vehicles/${vehicleId}/purchases`, { method: 'POST', body: fd })
    await fetch(`/api/parts-required/${part.id}`, { method: 'DELETE' })
    onSave()
  }

  return (
    <Modal onClose={onClose}>
      <h2 className="text-lg font-bold mb-1">Move to Purchased</h2>
      <p className="text-sm text-gray-400 mb-4">This will create a purchase record and remove the part from your wishlist.</p>
      <form onSubmit={handleSubmit} className="space-y-3">
        <div>
          <label className="block text-sm text-gray-400 mb-1">Description *</label>
          <input name="description" value={form.description} onChange={handleChange} required autoFocus
            className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-amber-500" />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-sm text-gray-400 mb-1">Part Number</label>
            <input name="part_number" value={form.part_number} onChange={handleChange}
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-amber-500" />
          </div>
          <div>
            <label className="block text-sm text-gray-400 mb-1">Actual Cost ({getCurrencySymbol(currency)}) *</label>
            <input name="actual_cost" type="number" step="0.01" value={form.actual_cost} onChange={handleChange} required
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-amber-500" />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-sm text-gray-400 mb-1">Vendor</label>
            <input name="vendor" value={form.vendor} onChange={handleChange}
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-amber-500" />
          </div>
          <div>
            <label className="block text-sm text-gray-400 mb-1">Date</label>
            <input name="purchase_date" type="date" value={form.purchase_date} onChange={handleChange}
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-amber-500" />
          </div>
        </div>
        <div>
          <label className="block text-sm text-gray-400 mb-1">Category</label>
          <select name="category" value={form.category} onChange={handleChange}
            className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-amber-500">
            <option value="part">Part</option>
            <option value="service">Service</option>
            <option value="labor">Labor</option>
            <option value="other">Other</option>
          </select>
        </div>
        <div>
          <label className="block text-sm text-gray-400 mb-1">Notes</label>
          <textarea name="notes" value={form.notes} onChange={handleChange} rows={2}
            className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-amber-500 resize-none" />
        </div>
        <div className="flex gap-3 pt-1">
          <button type="submit" disabled={saving}
            className="bg-green-600 hover:bg-green-500 disabled:opacity-50 text-white font-semibold px-4 py-2 rounded-lg text-sm">
            {saving ? 'Moving...' : 'Move to Purchased'}
          </button>
          <button type="button" onClick={onClose}
            className="px-4 py-2 rounded-lg text-sm text-gray-400 hover:text-gray-200 border border-gray-700">
            Cancel
          </button>
        </div>
      </form>
    </Modal>
  )
}

function DocumentsTab({
  vehicleId,
  documents,
  onDelete,
  onUploaded,
}: {
  vehicleId: string
  documents: VehicleDocument[]
  onDelete: (doc: VehicleDocument) => void
  onUploaded: () => void
}) {
  const [showUpload, setShowUpload] = useState(false)

  return (
    <div>
      <div className="flex justify-end mb-3">
        <button
          onClick={() => setShowUpload(true)}
          className="bg-amber-500 hover:bg-amber-400 text-black font-semibold px-4 py-2 rounded-lg text-sm"
        >
          + Upload Document
        </button>
      </div>
      {documents.length === 0 ? (
        <p className="text-gray-500 text-center py-10">No documents uploaded yet.</p>
      ) : (
        <div className="space-y-2">
          {documents.map((doc) => (
            <div key={doc.id} className="bg-gray-900 border border-gray-800 rounded-xl px-4 py-3 flex items-center justify-between gap-3">
              <div className="min-w-0">
                <a
                  href={doc.stored_path}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm text-amber-400 hover:text-amber-300 truncate block"
                >
                  {doc.title || doc.filename}
                </a>
                <p className="text-xs text-gray-500 mt-0.5">
                  {[doc.title ? doc.filename : null, doc.mime_type, doc.file_size ? formatFileSize(doc.file_size) : null].filter(Boolean).join(' · ')}
                </p>
              </div>
              <button
                onClick={() => onDelete(doc)}
                className="text-xs text-red-700 hover:text-red-400 flex-shrink-0"
              >
                Delete
              </button>
            </div>
          ))}
        </div>
      )}
      {showUpload && (
        <UploadDocumentModal
          vehicleId={vehicleId}
          onClose={() => setShowUpload(false)}
          onSave={() => { setShowUpload(false); onUploaded() }}
        />
      )}
    </div>
  )
}

function UploadDocumentModal({
  vehicleId,
  onClose,
  onSave,
}: {
  vehicleId: string
  onClose: () => void
  onSave: () => void
}) {
  const [title, setTitle] = useState('')
  const [file, setFile] = useState<File | null>(null)
  const [saving, setSaving] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!file) return
    setSaving(true)
    const fd = new FormData()
    fd.append('document', file)
    if (title.trim()) fd.append('title', title.trim())
    await fetch(`/api/vehicles/${vehicleId}/documents`, { method: 'POST', body: fd })
    onSave()
  }

  return (
    <Modal onClose={onClose}>
      <h2 className="text-lg font-bold mb-4">Upload Document</h2>
      <form onSubmit={handleSubmit} className="space-y-3">
        <div>
          <label className="block text-sm text-gray-400 mb-1">Title</label>
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g. Service manual, MOT certificate"
            autoFocus
            className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-amber-500"
          />
        </div>
        <div>
          <label className="block text-sm text-gray-400 mb-1">File *</label>
          <input
            type="file"
            required
            onChange={(e) => setFile(e.target.files?.[0] || null)}
            className="w-full text-sm text-gray-400 file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-sm file:font-medium file:bg-gray-700 file:text-gray-200 hover:file:bg-gray-600 cursor-pointer"
          />
          {file && <p className="text-xs text-gray-500 mt-1">{file.name} ({formatFileSize(file.size)})</p>}
        </div>
        <div className="flex gap-3 pt-1">
          <button type="submit" disabled={saving || !file}
            className="bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-black font-semibold px-4 py-2 rounded-lg text-sm">
            {saving ? 'Uploading...' : 'Upload'}
          </button>
          <button type="button" onClick={onClose}
            className="px-4 py-2 rounded-lg text-sm text-gray-400 hover:text-gray-200 border border-gray-700">
            Cancel
          </button>
        </div>
      </form>
    </Modal>
  )
}

function SellModal({ vehicle, onClose, onSave }: { vehicle: Vehicle; onClose: () => void; onSave: () => void }) {
  const { currency } = useCurrency()
  const [actualSalePrice, setActualSalePrice] = useState(
    vehicle.estimated_sale_price ? vehicle.estimated_sale_price.toString() : ''
  )
  const [soldDate, setSoldDate] = useState(new Date().toISOString().split('T')[0])
  const [saving, setSaving] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    await fetch(`/api/vehicles/${vehicle.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...vehicle,
        status: 'sold',
        actual_sale_price: parseFloat(actualSalePrice) || 0,
        sold_date: soldDate || null,
      }),
    })
    onSave()
  }

  return (
    <Modal onClose={onClose}>
      <h2 className="text-lg font-bold mb-1">Mark as Sold</h2>
      <p className="text-sm text-gray-400 mb-4">{vehicle.year} {vehicle.make} {vehicle.model}</p>
      <form onSubmit={handleSubmit} className="space-y-3">
        <div>
          <label className="block text-sm text-gray-400 mb-1">Sale Price ({getCurrencySymbol(currency)}) *</label>
          <input
            type="number"
            step="0.01"
            value={actualSalePrice}
            onChange={(e) => setActualSalePrice(e.target.value)}
            required
            autoFocus
            className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-amber-500"
          />
        </div>
        <div>
          <label className="block text-sm text-gray-400 mb-1">Date Sold</label>
          <input
            type="date"
            value={soldDate}
            onChange={(e) => setSoldDate(e.target.value)}
            className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-amber-500"
          />
        </div>
        <div className="flex gap-3 pt-1">
          <button type="submit" disabled={saving}
            className="bg-green-600 hover:bg-green-500 disabled:opacity-50 text-white font-semibold px-4 py-2 rounded-lg text-sm">
            {saving ? 'Saving...' : 'Confirm Sale'}
          </button>
          <button type="button" onClick={onClose}
            className="px-4 py-2 rounded-lg text-sm text-gray-400 hover:text-gray-200 border border-gray-700">
            Cancel
          </button>
        </div>
      </form>
    </Modal>
  )
}

function PdfModal({ vehicleId, currency, onClose }: { vehicleId: string; currency: string; onClose: () => void }) {
  const [costOption, setCostOption] = useState<'all' | 'hideSummary' | 'hideAll'>('all')
  const [generating, setGenerating] = useState(false)

  async function handleGenerate() {
    setGenerating(true)
    const params = new URLSearchParams({
      hideSummary: String(costOption === 'hideSummary' || costOption === 'hideAll'),
      hideCosts: String(costOption === 'hideAll'),
      currency,
    })
    const res = await fetch(`/api/vehicles/${vehicleId}/pdf?${params}`)
    const blob = await res.blob()
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = res.headers.get('Content-Disposition')?.match(/filename="(.+)"/)?.[1] ?? 'vehicle.pdf'
    a.click()
    URL.revokeObjectURL(url)
    setGenerating(false)
    onClose()
  }

  return (
    <Modal onClose={onClose}>
      <h2 className="text-lg font-bold mb-4">Export PDF</h2>
      <div className="space-y-4">
        <div className="space-y-2">
          {([
            ['all',         'Show all costs'],
            ['hideSummary', 'Hide financial summary (keep individual prices)'],
            ['hideAll',     'Hide all costs'],
          ] as const).map(([value, label]) => (
            <label key={value} className="flex items-center gap-3 cursor-pointer">
              <input
                type="radio"
                name="costOption"
                value={value}
                checked={costOption === value}
                onChange={() => setCostOption(value)}
                className="accent-amber-500"
              />
              <span className="text-sm text-gray-300">{label}</span>
            </label>
          ))}
        </div>
        <p className="text-xs text-gray-500">
          The PDF will include vehicle details, all purchases, and the parts wishlist.
        </p>
        <div className="flex gap-3 pt-1">
          <button
            onClick={handleGenerate}
            disabled={generating}
            className="bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-black font-semibold px-4 py-2 rounded-lg text-sm"
          >
            {generating ? 'Generating...' : 'Download PDF'}
          </button>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-lg text-sm text-gray-400 hover:text-gray-200 border border-gray-700"
          >
            Cancel
          </button>
        </div>
      </div>
    </Modal>
  )
}
