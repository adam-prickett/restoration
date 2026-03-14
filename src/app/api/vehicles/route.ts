import { NextResponse } from 'next/server'
import db from '../../../../db'

export async function GET() {
  const vehicles = db.prepare(`
    SELECT
      v.*,
      COALESCE(SUM(p.actual_cost), 0) AS total_parts_cost,
      v.purchase_price + COALESCE(SUM(p.actual_cost), 0) AS total_investment,
      v.estimated_sale_price - (v.purchase_price + COALESCE(SUM(p.actual_cost), 0)) AS anticipated_profit
    FROM vehicles v
    LEFT JOIN purchases p ON p.vehicle_id = v.id
    GROUP BY v.id
    ORDER BY v.created_at DESC
  `).all()
  return NextResponse.json(vehicles)
}

export async function POST(request: Request) {
  const body = await request.json()
  const { make, model, year, vin, registration, purchase_price, estimated_sale_price, budget, status, notes } = body

  if (!make || !model || !year) {
    return NextResponse.json({ error: 'make, model, and year are required' }, { status: 400 })
  }

  const result = db.prepare(`
    INSERT INTO vehicles (make, model, year, vin, registration, purchase_price, estimated_sale_price, budget, status, notes)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    make, model, year,
    vin || null,
    registration || null,
    purchase_price || 0,
    estimated_sale_price || 0,
    budget || null,
    status || 'active',
    notes || null
  )

  const vehicle = db.prepare('SELECT * FROM vehicles WHERE id = ?').get(result.lastInsertRowid)
  return NextResponse.json(vehicle, { status: 201 })
}
