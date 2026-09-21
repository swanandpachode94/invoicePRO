export type InvoiceResetRule = 'never' | 'yearly' | 'financial_year'
export type SalesmanStatus = 'pending' | 'approved' | 'deactivated'
export type InvoiceStatus = 'draft' | 'synced' | 'cancelled'
export type CancellationStatus = 'pending' | 'approved' | 'rejected'
export type GstSlab = 0 | 5 | 12 | 18 | 28

export interface Vendor {
  id: string
  auth_user_id: string | null
  vendor_code: string
  business_name: string
  phone: string | null
  gstin: string | null
  state: string | null
  address: string | null
  logo_url: string | null
  invoice_prefix: string
  invoice_reset_rule: InvoiceResetRule
  invoice_counter: number
  created_at: string
}

export interface Salesman {
  id: string
  auth_user_id: string | null
  vendor_id: string
  name: string
  phone: string | null
  status: SalesmanStatus
  created_at: string
}

export interface Item {
  id: string
  vendor_id: string
  name: string
  sku: string | null
  hsn_code: string | null
  unit: string
  sale_price: number
  gst_percent: GstSlab
  active: boolean
  created_at: string
}

export interface Retailer {
  id: string
  vendor_id: string
  name: string
  gstin: string | null
  state: string | null
  phone: string | null
  created_at: string
}

export interface Invoice {
  id: string
  client_generated_id: string
  vendor_id: string
  salesman_id: string
  retailer_id: string
  invoice_number: string | null
  status: InvoiceStatus
  subtotal: number
  total_gst: number
  total_amount: number
  is_interstate: boolean
  created_at: string
  synced_at: string | null
}

export interface InvoiceItem {
  id: string
  invoice_id: string
  item_id: string | null
  item_name: string
  quantity: number
  unit_price: number
  gst_percent: GstSlab
  line_total: number
}

export interface InvoicePayment {
  id: string
  invoice_id: string
  amount: number
  recorded_by_user_id: string
  note: string | null
  created_at: string
}

export interface InvoiceCancellation {
  id: string
  invoice_id: string
  requested_by: string
  reason: string
  status: CancellationStatus
  created_at: string
}

/** A full invoice as assembled locally, before it has a server id. */
export interface DraftInvoiceLine {
  item_id: string | null
  item_name: string
  quantity: number
  unit_price: number
  gst_percent: GstSlab
  line_total: number
}

export interface DraftInvoice {
  client_generated_id: string
  vendor_id: string
  salesman_id: string
  retailer_id: string
  retailer_name: string
  lines: DraftInvoiceLine[]
  subtotal: number
  total_gst: number
  total_amount: number
  is_interstate: boolean
  status: InvoiceStatus
  invoice_number: string | null
  created_at: string
  synced_at: string | null
}
