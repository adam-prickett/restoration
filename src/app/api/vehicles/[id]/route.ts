import { NextResponse } from 'next/server'
import db from '../../../../../db'

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  const vehicle = db.prepare('SELECT * FROM vehicles WHERE id = ?').get(params.id)
  if (!vehicle) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  return NextResponse.json(vehicle)
}

export async function PUT(request: Request, { params }: { params: { id: string } }) {
  const body = await request.json()
  const { make, model, year, vin, registration, purchase_price, estimated_sale_price, budget, actual_sale_price, sold_date, status, notes } = body

  db.prepare(`
    UPDATE vehicles
    SET make = ?, model = ?, year = ?, vin = ?, registration = ?, purchase_price = ?,
        estimated_sale_price = ?, budget = ?, actual_sale_price = ?, sold_date = ?,
        status = ?, notes = ?, updated_at = datetime('now')
    WHERE id = ?
  `).run(
    make, model, year,
    vin || null,
    registration || null,
    purchase_price || 0,
    estimated_sale_price || 0,
    budget || null,
    actual_sale_price ?? null,
    sold_date || null,
    status || 'active',
    notes || null,
    params.id
  )

  const vehicle = db.prepare('SELECT * FROM vehicles WHERE id = ?').get(params.id)
  if (!vehicle) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  return NextResponse.json(vehicle)
}

export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  const vehicle = db.prepare('SELECT id FROM vehicles WHERE id = ?').get(params.id)
  if (!vehicle) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  db.prepare('DELETE FROM vehicles WHERE id = ?').run(params.id)
  return NextResponse.json({ success: true })
}
