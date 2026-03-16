import { NextResponse } from 'next/server'
import db from '../../../../../../db'
import PDFDocument from 'pdfkit'

interface Vehicle {
  id: number; make: string; model: string; year: number
  vin: string | null; purchase_price: number; estimated_sale_price: number; notes: string | null
}
interface Purchase {
  description: string; part_number: string | null; actual_cost: number
  vendor: string | null; purchase_date: string | null; category: string; notes: string | null
}
interface Part {
  description: string; part_number: string | null; estimated_cost: number; status: string; notes: string | null
}

const AMBER = '#f59e0b'
const DARK   = '#111827'
const GRAY   = '#6b7280'
const LIGHT  = '#f3f4f6'

function formatDate(str: string | null): string {
  if (!str) return '—'
  return new Intl.DateTimeFormat('en-US', { year: 'numeric', month: 'short', day: 'numeric' }).format(new Date(str))
}

export async function GET(request: Request, { params }: { params: { id: string } }) {
  const { searchParams } = new URL(request.url)
  const hideSummary = searchParams.get('hideSummary') === 'true'
  const hideCosts   = searchParams.get('hideCosts') === 'true'
  const currency    = searchParams.get('currency') || 'USD'

  const vehicle = db.prepare('SELECT * FROM vehicles WHERE id = ?').get(params.id) as Vehicle | undefined
  if (!vehicle) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const purchases = db.prepare(
    'SELECT * FROM purchases WHERE vehicle_id = ? ORDER BY purchase_date DESC, id DESC'
  ).all(params.id) as Purchase[]

  const parts = db.prepare(
    'SELECT * FROM parts_required WHERE vehicle_id = ? ORDER BY status, id'
  ).all(params.id) as Part[]

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
  `).get(params.id) as { purchase_price: number; estimated_sale_price: number; total_parts_cost: number; total_investment: number; anticipated_profit: number }

  function fmt(amount: number) {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency }).format(amount)
  }

  const doc = new PDFDocument({ margin: 50, size: 'A4' })
  const chunks: Buffer[] = []
  doc.on('data', (chunk: Buffer) => chunks.push(chunk))

  await new Promise<void>((resolve) => {
    doc.on('end', resolve)

    // ── Header bar ──
    doc.rect(0, 0, doc.page.width, 70).fill(DARK)
    doc.fontSize(22).fillColor(AMBER).font('Helvetica-Bold')
      .text(`${vehicle.year} ${vehicle.make} ${vehicle.model}`, 50, 22, { lineBreak: false })
    doc.fontSize(10).fillColor('#9ca3af').font('Helvetica')
      .text('Restoration Report', 50, 48)
    doc.fillColor(DARK)

    let y = 90

    // ── Vehicle details ──
    const details: [string, string][] = []
    if (vehicle.vin) details.push(['VIN', vehicle.vin])
    details.push(['Status', 'Active'])
    if (vehicle.notes) details.push(['Notes', vehicle.notes])

    if (details.length) {
      details.forEach(([label, value]) => {
        doc.fontSize(9).fillColor(GRAY).font('Helvetica').text(label.toUpperCase(), 50, y)
        doc.fontSize(10).fillColor(DARK).font('Helvetica').text(value, 130, y)
        y += 16
      })
      y += 8
    }

    // ── Financial summary (unless hidden) ──
    if (!hideSummary) {
      doc.rect(50, y, doc.page.width - 100, 1).fill('#e5e7eb')
      y += 10

      doc.fontSize(13).fillColor(DARK).font('Helvetica-Bold').text('Financial Summary', 50, y)
      y += 20

      const finRows: [string, number, boolean][] = [
        ['Purchase Price',    financials.purchase_price,    false],
        ['Parts & Services',  financials.total_parts_cost,  false],
        ['Total Investment',  financials.total_investment,   true],
        ['Est. Sale Price',   financials.estimated_sale_price, false],
        ['Anticipated Profit', financials.anticipated_profit, true],
      ]

      finRows.forEach(([label, value, bold], i) => {
        if (bold) {
          doc.rect(50, y - 2, doc.page.width - 100, 18).fill(LIGHT)
        }
        const isProfit = label === 'Anticipated Profit'
        const color = isProfit ? (value >= 0 ? '#16a34a' : '#dc2626') : DARK
        doc.fontSize(10)
          .fillColor(GRAY).font('Helvetica').text(label, 55, y)
          .fillColor(color).font(bold ? 'Helvetica-Bold' : 'Helvetica').text(fmt(value), 0, y, { align: 'right', width: doc.page.width - 105 })
        y += 18
        if (i === 1) { // divider before Total Investment
          doc.rect(50, y, doc.page.width - 100, 0.5).fill('#d1d5db')
          y += 4
        }
      })
      y += 14
    }

    // ── Purchases ──
    if (purchases.length) {
      doc.rect(50, y, doc.page.width - 100, 1).fill('#e5e7eb')
      y += 10
      doc.fontSize(13).fillColor(DARK).font('Helvetica-Bold').text('Purchases', 50, y)
      y += 20

      const COL = { desc: 50, cat: 290, date: 370, cost: 450 }

      // Header row
      doc.rect(50, y - 2, doc.page.width - 100, 16).fill(DARK)
      doc.fontSize(8).fillColor('#e5e7eb').font('Helvetica-Bold')
        .text('DESCRIPTION',  COL.desc + 4, y + 2)
        .text('CATEGORY',     COL.cat,       y + 2)
        .text('DATE',         COL.date,      y + 2)
      if (!hideCosts) {
        doc.text('COST', COL.cost, y + 2, { width: doc.page.width - 105 - COL.cost + 50, align: 'right' })
      }
      y += 18

      purchases.forEach((p, i) => {
        const rowH = p.notes ? 28 : 16
        if (y + rowH > doc.page.height - 60) {
          doc.addPage()
          y = 50
        }
        if (i % 2 === 1) doc.rect(50, y - 1, doc.page.width - 100, rowH + 2).fill(LIGHT)
        doc.fillColor(DARK)

        const descWidth = COL.cat - COL.desc - 10
        doc.fontSize(9).font('Helvetica-Bold').fillColor(DARK)
          .text(p.description, COL.desc + 4, y, { width: descWidth, lineBreak: false })
        if (p.part_number) {
          doc.fontSize(7).fillColor(GRAY).font('Helvetica')
            .text(`P/N: ${p.part_number}`, COL.desc + 4, y + 10, { width: descWidth })
        }
        doc.fontSize(9).fillColor(DARK).font('Helvetica')
          .text(p.category, COL.cat, y)
          .text(formatDate(p.purchase_date), COL.date, y)
        if (!hideCosts) {
          doc.text(fmt(p.actual_cost), COL.cost, y, { width: doc.page.width - 105 - COL.cost + 50, align: 'right' })
        }
        if (p.notes) {
          doc.fontSize(8).fillColor(GRAY).font('Helvetica-Oblique')
            .text(p.notes, COL.desc + 4, y + 12, { width: descWidth + 200 })
        }
        y += rowH + 4
      })

      if (!hideCosts) {
        doc.rect(50, y, doc.page.width - 100, 0.5).fill('#d1d5db')
        y += 6
        doc.fontSize(10).fillColor(DARK).font('Helvetica-Bold')
          .text('Total', 55, y)
          .text(fmt(financials.total_parts_cost), 0, y, { align: 'right', width: doc.page.width - 105 })
        y += 20
      } else {
        y += 10
      }
    }

    // ── Parts wishlist ──
    if (parts.length) {
      if (y + 60 > doc.page.height - 60) { doc.addPage(); y = 50 }
      doc.rect(50, y, doc.page.width - 100, 1).fill('#e5e7eb')
      y += 10
      doc.fontSize(13).fillColor(DARK).font('Helvetica-Bold').text('Parts Wishlist', 50, y)
      y += 20

      const STATUS_COLORS: Record<string, string> = { needed: '#b45309', ordered: '#1d4ed8', received: '#15803d' }

      parts.forEach((p, i) => {
        const rowH = p.notes ? 28 : 16
        if (y + rowH > doc.page.height - 60) { doc.addPage(); y = 50 }
        if (i % 2 === 1) doc.rect(50, y - 1, doc.page.width - 100, rowH + 2).fill(LIGHT)

        const descWidth = hideCosts ? 380 : 280
        doc.fontSize(9).font('Helvetica-Bold').fillColor(DARK)
          .text(p.description, 55, y, { width: descWidth, lineBreak: false })
        if (p.part_number) {
          doc.fontSize(7).fillColor(GRAY).font('Helvetica')
            .text(`P/N: ${p.part_number}`, 55, y + 10, { width: descWidth })
        }

        const statusColor = STATUS_COLORS[p.status] || DARK
        doc.fontSize(8).fillColor(statusColor).font('Helvetica-Bold')
          .text(p.status.toUpperCase(), 350, y)

        if (!hideCosts && p.estimated_cost > 0) {
          doc.fontSize(9).fillColor(DARK).font('Helvetica')
            .text(fmt(p.estimated_cost), 0, y, { align: 'right', width: doc.page.width - 105 })
        }
        if (p.notes) {
          doc.fontSize(8).fillColor(GRAY).font('Helvetica-Oblique')
            .text(p.notes, 55, y + 12, { width: descWidth })
        }
        y += rowH + 4
      })
      y += 10
    }

    // ── Footer ── (disable bottom margin so text doesn't trigger a new page)
    doc.page.margins.bottom = 0
    const footerY = doc.page.height - 40
    doc.rect(0, footerY - 6, doc.page.width, 46).fill(DARK)
    doc.fontSize(8).fillColor('#6b7280').font('Helvetica')
      .text(`Generated ${new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}`, 50, footerY, { lineBreak: false })
      .text('Restoration Tracker', 0, footerY, { align: 'right', width: doc.page.width - 50 })

    doc.end()
  })

  const pdf = Buffer.concat(chunks)
  const filename = `${vehicle.year}-${vehicle.make}-${vehicle.model}.pdf`.replace(/\s+/g, '-')

  return new NextResponse(pdf, {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="${filename}"`,
    },
  })
}
