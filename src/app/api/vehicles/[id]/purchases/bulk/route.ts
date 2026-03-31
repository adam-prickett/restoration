import { NextResponse } from 'next/server'
import db from '../../../../../../../db'

interface BulkItem {
  description: string
  part_number?: string
  actual_cost?: number
  notes?: string
  category?: string
}

interface BulkBody {
  vendor?: string
  purchase_date?: string
  category?: string
  items: BulkItem[]
}

export async function POST(request: Request, { params }: { params: { id: string } }) {
  const body: BulkBody = await request.json()
  const { vendor, purchase_date, category: sharedCategory, items } = body

  if (!Array.isArray(items) || items.length === 0) {
    return NextResponse.json({ error: 'items array is required' }, { status: 400 })
  }

  for (const item of items) {
    if (!item.description?.trim()) {
      return NextResponse.json({ error: 'each item must have a description' }, { status: 400 })
    }
  }

  const insert = db.prepare(`
    INSERT INTO purchases (vehicle_id, description, part_number, actual_cost, vendor, purchase_date, category, notes)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `)

  const insertMany = db.transaction((rows: BulkItem[]) => {
    for (const item of rows) {
      insert.run(
        params.id,
        item.description.trim(),
        item.part_number?.trim() || null,
        item.actual_cost ?? 0,
        vendor?.trim() || null,
        purchase_date || null,
        item.category || sharedCategory || 'part',
        item.notes?.trim() || null,
      )
    }
  })

  insertMany(items)

  return NextResponse.json({ inserted: items.length }, { status: 201 })
}
