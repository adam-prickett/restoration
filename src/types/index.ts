export interface Vehicle {
  id: number
  make: string
  model: string
  year: number
  vin: string | null
  registration: string | null
  purchase_price: number
  estimated_sale_price: number
  budget: number | null
  actual_sale_price: number | null
  sold_date: string | null
  status: 'active' | 'sold' | 'paused'
  notes: string | null
  created_at: string
  updated_at: string
}

export interface PartRequired {
  id: number
  vehicle_id: number
  description: string
  part_number: string | null
  estimated_cost: number
  notes: string | null
  status: 'needed' | 'ordered' | 'received'
  created_at: string
  updated_at: string
}

export interface Purchase {
  id: number
  vehicle_id: number
  description: string
  part_number: string | null
  actual_cost: number
  vendor: string | null
  purchase_date: string | null
  category: 'part' | 'service' | 'labor' | 'other'
  notes: string | null
  receipts?: Receipt[]
  created_at: string
  updated_at: string
}

export interface Receipt {
  id: number
  purchase_id: number
  filename: string
  stored_path: string
  mime_type: string | null
  file_size: number | null
  uploaded_at: string
}

export interface VehicleDocument {
  id: number
  vehicle_id: number
  title: string | null
  filename: string
  stored_path: string
  mime_type: string | null
  file_size: number | null
  uploaded_at: string
}

export interface VehicleFinancials {
  purchase_price: number
  total_parts_cost: number
  total_investment: number
  estimated_sale_price: number
  anticipated_profit: number
}

export interface VehicleWithFinancials extends Vehicle {
  total_parts_cost: number
  total_investment: number
  anticipated_profit: number
  budget: number | null
}
