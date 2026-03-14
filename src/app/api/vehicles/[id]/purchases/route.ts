import { NextResponse } from 'next/server'
import db from '../../../../../../db'
import fs from 'fs'
import path from 'path'

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  const purchases = db.prepare(
    'SELECT * FROM purchases WHERE vehicle_id = ? ORDER BY purchase_date DESC, created_at DESC'
  ).all(params.id) as Array<Record<string, unknown>>

  const purchasesWithReceipts = purchases.map((p) => {
    const receipts = db.prepare('SELECT * FROM receipts WHERE purchase_id = ?').all(p.id as number)
    return { ...p, receipts }
  })

  return NextResponse.json(purchasesWithReceipts)
}

export async function POST(request: Request, { params }: { params: { id: string } }) {
  const formData = await request.formData()

  const description = formData.get('description') as string
  const part_number = formData.get('part_number') as string | null
  const actual_cost = parseFloat(formData.get('actual_cost') as string) || 0
  const vendor = formData.get('vendor') as string | null
  const purchase_date = formData.get('purchase_date') as string | null
  const category = (formData.get('category') as string) || 'part'
  const notes = formData.get('notes') as string | null
  const file = formData.get('receipt') as File | null

  if (!description) {
    return NextResponse.json({ error: 'description is required' }, { status: 400 })
  }

  const result = db.prepare(`
    INSERT INTO purchases (vehicle_id, description, part_number, actual_cost, vendor, purchase_date, category, notes)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    params.id,
    description,
    part_number || null,
    actual_cost,
    vendor || null,
    purchase_date || null,
    category,
    notes || null
  )

  const purchaseId = result.lastInsertRowid

  if (file && file.size > 0) {
    const uploadsDir = path.join(process.cwd(), 'public', 'uploads', 'receipts')
    fs.mkdirSync(uploadsDir, { recursive: true })

    const ext = path.extname(file.name) || ''
    const storedFilename = `${purchaseId}_${Date.now()}${ext}`
    const storedPath = `/uploads/receipts/${storedFilename}`
    const fullPath = path.join(uploadsDir, storedFilename)

    const buffer = Buffer.from(await file.arrayBuffer())
    fs.writeFileSync(fullPath, buffer)

    db.prepare(`
      INSERT INTO receipts (purchase_id, filename, stored_path, mime_type, file_size)
      VALUES (?, ?, ?, ?, ?)
    `).run(purchaseId, file.name, storedPath, file.type || null, file.size)
  }

  const purchase = db.prepare('SELECT * FROM purchases WHERE id = ?').get(purchaseId) as Record<string, unknown>
  const receipts = db.prepare('SELECT * FROM receipts WHERE purchase_id = ?').all(purchaseId)
  return NextResponse.json({ ...purchase, receipts }, { status: 201 })
}
