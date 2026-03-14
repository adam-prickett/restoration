import { NextResponse } from 'next/server'
import db from '../../../../../../db'
import fs from 'fs'
import path from 'path'

export async function POST(request: Request, { params }: { params: { id: string } }) {
  const purchase = db.prepare('SELECT id FROM purchases WHERE id = ?').get(params.id)
  if (!purchase) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const formData = await request.formData()
  const file = formData.get('receipt') as File | null

  if (!file || file.size === 0) {
    return NextResponse.json({ error: 'No file provided' }, { status: 400 })
  }

  const uploadsDir = path.join(process.cwd(), 'public', 'uploads', 'receipts')
  fs.mkdirSync(uploadsDir, { recursive: true })

  const ext = path.extname(file.name) || ''
  const storedFilename = `${params.id}_${Date.now()}${ext}`
  const storedPath = `/uploads/receipts/${storedFilename}`
  const fullPath = path.join(uploadsDir, storedFilename)

  const buffer = Buffer.from(await file.arrayBuffer())
  fs.writeFileSync(fullPath, buffer)

  const result = db.prepare(`
    INSERT INTO receipts (purchase_id, filename, stored_path, mime_type, file_size)
    VALUES (?, ?, ?, ?, ?)
  `).run(params.id, file.name, storedPath, file.type || null, file.size)

  const receipt = db.prepare('SELECT * FROM receipts WHERE id = ?').get(result.lastInsertRowid)
  return NextResponse.json(receipt, { status: 201 })
}
