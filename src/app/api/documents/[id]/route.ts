import { NextResponse } from 'next/server'
import db from '../../../../../db'
import fs from 'fs'
import path from 'path'

export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  const doc = db.prepare('SELECT * FROM vehicle_documents WHERE id = ?').get(params.id) as { stored_path: string } | undefined
  if (!doc) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const fullPath = path.join(process.cwd(), 'public', doc.stored_path)
  try { fs.unlinkSync(fullPath) } catch { /* file may not exist */ }

  db.prepare('DELETE FROM vehicle_documents WHERE id = ?').run(params.id)
  return NextResponse.json({ success: true })
}
