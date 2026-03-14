import { NextResponse } from 'next/server'
import db from '../../../../db'

export async function POST(request: Request) {
  let payload: {
    version?: number
    vehicle: {
      make: string; model: string; year: number; vin?: string | null
      purchase_price?: number; estimated_sale_price?: number; budget?: number | null
      status?: string; notes?: string | null
    }
    purchases?: Array<{
      description: string; part_number?: string | null; actual_cost?: number
      vendor?: string | null; purchase_date?: string | null; category?: string; notes?: string | null
    }>
    parts?: Array<{
      description: string; part_number?: string | null; estimated_cost?: number
      status?: string; notes?: string | null
    }>
  }

  try {
    payload = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const { vehicle, purchases = [], parts = [] } = payload

  if (!vehicle?.make || !vehicle?.model || !vehicle?.year) {
    return NextResponse.json({ error: 'Vehicle must have make, model, and year' }, { status: 400 })
  }

  const importAll = db.transaction(() => {
    const result = db.prepare(`
      INSERT INTO vehicles (make, model, year, vin, purchase_price, estimated_sale_price, budget, status, notes)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      vehicle.make, vehicle.model, vehicle.year,
      vehicle.vin || null,
      vehicle.purchase_price || 0,
      vehicle.estimated_sale_price || 0,
      vehicle.budget || null,
      vehicle.status || 'active',
      vehicle.notes || null,
    )

    const vehicleId = result.lastInsertRowid

    for (const p of purchases) {
      db.prepare(`
        INSERT INTO purchases (vehicle_id, description, part_number, actual_cost, vendor, purchase_date, category, notes)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        vehicleId, p.description,
        p.part_number || null,
        p.actual_cost || 0,
        p.vendor || null,
        p.purchase_date || null,
        p.category || 'part',
        p.notes || null,
      )
    }

    for (const p of parts) {
      db.prepare(`
        INSERT INTO parts_required (vehicle_id, description, part_number, estimated_cost, status, notes)
        VALUES (?, ?, ?, ?, ?, ?)
      `).run(
        vehicleId, p.description,
        p.part_number || null,
        p.estimated_cost || 0,
        p.status || 'needed',
        p.notes || null,
      )
    }

    return db.prepare('SELECT * FROM vehicles WHERE id = ?').get(vehicleId)
  })

  const newVehicle = importAll()
  return NextResponse.json(newVehicle, { status: 201 })
}
