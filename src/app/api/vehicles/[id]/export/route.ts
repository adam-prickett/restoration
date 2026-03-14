import { NextResponse } from 'next/server'
import db from '../../../../../../db'

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  const vehicle = db.prepare('SELECT * FROM vehicles WHERE id = ?').get(params.id) as Record<string, unknown> | undefined
  if (!vehicle) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const purchases = db.prepare('SELECT * FROM purchases WHERE vehicle_id = ? ORDER BY id').all(params.id)
  const parts = db.prepare('SELECT * FROM parts_required WHERE vehicle_id = ? ORDER BY id').all(params.id)
  const documents = db.prepare('SELECT id, title, filename, mime_type, file_size, uploaded_at FROM vehicle_documents WHERE vehicle_id = ? ORDER BY id').all(params.id)

  const payload = {
    version: 1,
    exported_at: new Date().toISOString(),
    vehicle: {
      make: vehicle.make,
      model: vehicle.model,
      year: vehicle.year,
      vin: vehicle.vin,
      purchase_price: vehicle.purchase_price,
      estimated_sale_price: vehicle.estimated_sale_price,
      budget: vehicle.budget,
      status: vehicle.status,
      notes: vehicle.notes,
    },
    purchases,
    parts,
    documents,
  }

  const filename = `${vehicle.year}-${vehicle.make}-${vehicle.model}.json`.replace(/\s+/g, '-')

  return new NextResponse(JSON.stringify(payload, null, 2), {
    headers: {
      'Content-Type': 'application/json',
      'Content-Disposition': `attachment; filename="${filename}"`,
    },
  })
}
