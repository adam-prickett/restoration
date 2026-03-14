import { NextResponse } from 'next/server'
import db from '../../../../../db'

export async function PUT(request: Request, { params }: { params: { id: string } }) {
  const body = await request.json()
  const { description, part_number, estimated_cost, notes, status } = body

  db.prepare(`
    UPDATE parts_required
    SET description = ?, part_number = ?, estimated_cost = ?, notes = ?, status = ?,
        updated_at = datetime('now')
    WHERE id = ?
  `).run(
    description,
    part_number || null,
    estimated_cost || 0,
    notes || null,
    status || 'needed',
    params.id
  )

  const part = db.prepare('SELECT * FROM parts_required WHERE id = ?').get(params.id)
  if (!part) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  return NextResponse.json(part)
}

export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  const part = db.prepare('SELECT id FROM parts_required WHERE id = ?').get(params.id)
  if (!part) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  db.prepare('DELETE FROM parts_required WHERE id = ?').run(params.id)
  return NextResponse.json({ success: true })
}
