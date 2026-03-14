import { NextResponse } from 'next/server'
import db from '../../../../../db'
import fs from 'fs'
import path from 'path'

export async function PUT(request: Request, { params }: { params: { id: string } }) {
  const body = await request.json()
  const { description, part_number, actual_cost, vendor, purchase_date, category, notes } = body

  db.prepare(`
    UPDATE purchases
    SET description = ?, part_number = ?, actual_cost = ?, vendor = ?,
        purchase_date = ?, category = ?, notes = ?, updated_at = datetime('now')
    WHERE id = ?
  `).run(
    description,
    part_number || null,
    actual_cost || 0,
    vendor || null,
    purchase_date || null,
    category || 'part',
    notes || null,
    params.id
  )

  const purchase = db.prepare('SELECT * FROM purchases WHERE id = ?').get(params.id) as Record<string, unknown>
  if (!purchase) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  const receipts = db.prepare('SELECT * FROM receipts WHERE purchase_id = ?').all(params.id)
  return NextResponse.json({ ...purchase, receipts })
}

export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  const purchase = db.prepare('SELECT id FROM purchases WHERE id = ?').get(params.id)
  if (!purchase) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const receipts = db.prepare('SELECT stored_path FROM receipts WHERE purchase_id = ?').all(params.id) as Array<{ stored_path: string }>
  for (const receipt of receipts) {
    const fullPath = path.join(process.cwd(), 'public', receipt.stored_path)
    try { fs.unlinkSync(fullPath) } catch { /* file may not exist */ }
  }

  db.prepare('DELETE FROM purchases WHERE id = ?').run(params.id)
  return NextResponse.json({ success: true })
}
