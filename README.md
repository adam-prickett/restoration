# Restoration Tracker

A personal tool for tracking vehicle restoration projects — costs, parts, documents, and profitability.

## Features

- **Vehicle management** — track make, model, year, VIN, and registration
- **Financial summary** — purchase price, parts & services cost, total investment, estimated vs actual sale price, and anticipated/actual profit
- **Budget tracking** — set a restoration budget with a visual progress bar and over-budget warnings
- **Purchases** — log parts, services, labour, and other costs with vendor, date, category, and receipt uploads
- **Parts wishlist** — track parts you still need with status (needed / ordered / received) and estimated costs
- **Document uploads** — attach files (PDFs, images, etc.) to a vehicle with an optional title
- **Sell / close-out** — mark a vehicle as sold with the actual sale price and date to see real profit
- **PDF export** — generate a printable report of a vehicle's details and costs (with optional cost hiding)
- **JSON import / export** — back up and restore vehicle data
- **Multi-currency** — switch between currencies; symbols update throughout the app
- **Mobile-friendly** — responsive layout with a burger menu on vehicle detail pages

## Stack

- [Next.js 14](https://nextjs.org) (App Router)
- [better-sqlite3](https://github.com/WiseLibs/better-sqlite3) — embedded SQLite database, no separate DB server needed
- [pdfkit](https://pdfkit.org) — server-side PDF generation
- [Tailwind CSS](https://tailwindcss.com)

## Running locally

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

The SQLite database is created automatically at `db/restoration.db` on first run. Schema migrations run at startup — no manual steps required.

## Running with Docker

```bash
docker-compose up --build
```

The app will be available at [http://localhost:3000](http://localhost:3000).

Data is persisted via bind mounts:
- `./db` — SQLite database
- `./public/uploads` — uploaded receipts and documents

## Data storage

| Path | Contents |
|------|----------|
| `db/restoration.db` | All vehicle, purchase, parts, and document metadata |
| `public/uploads/receipts/` | Purchase receipt files |
| `public/uploads/documents/` | Vehicle document files |

Back up the `db/` directory and `public/uploads/` to preserve all data.
