import { NextResponse } from 'next/server'
import db from '../../../../../../db'

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  const parts = db.prepare(
    'SELECT * FROM parts_required WHERE vehicle_id = ? ORDER BY created_at DESC'
  ).all(params.id)
  return NextResponse.json(parts)
}

export async function POST(request: Request, { params }: { params: { id: string } }) {
  const body = await request.json()
  const { description, part_number, estimated_cost, notes, status } = body

  if (!description) {
    return NextResponse.json({ error: 'description is required' }, { status: 400 })
  }

  const result = db.prepare(`
    INSERT INTO parts_required (vehicle_id, description, part_number, estimated_cost, notes, status)
    VALUES (?, ?, ?, ?, ?, ?)
  `).run(
    params.id,
    description,
    part_number || null,
    estimated_cost || 0,
    notes || null,
    status || 'needed'
  )

  const part = db.prepare('SELECT * FROM parts_required WHERE id = ?').get(result.lastInsertRowid)
  return NextResponse.json(part, { status: 201 })
}
