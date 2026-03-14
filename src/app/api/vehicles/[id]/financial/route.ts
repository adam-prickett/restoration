import { NextResponse } from 'next/server'
import db from '../../../../../../db'

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  const financials = db.prepare(`
    SELECT
      v.purchase_price,
      v.estimated_sale_price,
      COALESCE(SUM(p.actual_cost), 0) AS total_parts_cost,
      v.purchase_price + COALESCE(SUM(p.actual_cost), 0) AS total_investment,
      v.estimated_sale_price - (v.purchase_price + COALESCE(SUM(p.actual_cost), 0)) AS anticipated_profit
    FROM vehicles v
    LEFT JOIN purchases p ON p.vehicle_id = v.id
    WHERE v.id = ?
    GROUP BY v.id
  `).get(params.id)

  if (!financials) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  return NextResponse.json(financials)
}
