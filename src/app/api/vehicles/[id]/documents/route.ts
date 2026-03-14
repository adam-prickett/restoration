import { NextResponse } from 'next/server'
import db from '../../../../../../db'
import fs from 'fs'
import path from 'path'

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  const docs = db.prepare('SELECT * FROM vehicle_documents WHERE vehicle_id = ? ORDER BY uploaded_at DESC').all(params.id)
  return NextResponse.json(docs)
}

export async function POST(request: Request, { params }: { params: { id: string } }) {
  const vehicle = db.prepare('SELECT id FROM vehicles WHERE id = ?').get(params.id)
  if (!vehicle) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const formData = await request.formData()
  const file = formData.get('document') as File | null
  const title = (formData.get('title') as string | null)?.trim() || null

  if (!file || file.size === 0) {
    return NextResponse.json({ error: 'No file provided' }, { status: 400 })
  }

  const uploadsDir = path.join(process.cwd(), 'public', 'uploads', 'documents')
  fs.mkdirSync(uploadsDir, { recursive: true })

  const ext = path.extname(file.name) || ''
  const storedFilename = `${params.id}_${Date.now()}${ext}`
  const storedPath = `/uploads/documents/${storedFilename}`
  const fullPath = path.join(uploadsDir, storedFilename)

  fs.writeFileSync(fullPath, Buffer.from(await file.arrayBuffer()))

  const result = db.prepare(`
    INSERT INTO vehicle_documents (vehicle_id, title, filename, stored_path, mime_type, file_size)
    VALUES (?, ?, ?, ?, ?, ?)
  `).run(params.id, title, file.name, storedPath, file.type || null, file.size)

  const doc = db.prepare('SELECT * FROM vehicle_documents WHERE id = ?').get(result.lastInsertRowid)
  return NextResponse.json(doc, { status: 201 })
}
