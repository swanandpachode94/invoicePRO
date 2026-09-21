import { openDB, type DBSchema, type IDBPDatabase } from 'idb'
import type { DraftInvoice, Item, Retailer } from '@/types'

interface InvoiceProDB extends DBSchema {
  items: {
    key: string
    value: Item
    indexes: { 'by-vendor': string }
  }
  retailers: {
    key: string
    value: Retailer
    indexes: { 'by-vendor': string }
  }
  invoices: {
    key: string // client_generated_id
    value: DraftInvoice
    indexes: { 'by-status': string; 'by-created': string }
  }
  meta: {
    key: string
    value: { key: string; value: unknown }
  }
}

let dbPromise: Promise<IDBPDatabase<InvoiceProDB>> | null = null

export function getDb() {
  if (!dbPromise) {
    dbPromise = openDB<InvoiceProDB>('invoicepro-db', 1, {
      upgrade(db) {
        const items = db.createObjectStore('items', { keyPath: 'id' })
        items.createIndex('by-vendor', 'vendor_id')

        const retailers = db.createObjectStore('retailers', { keyPath: 'id' })
        retailers.createIndex('by-vendor', 'vendor_id')

        const invoices = db.createObjectStore('invoices', { keyPath: 'client_generated_id' })
        invoices.createIndex('by-status', 'status')
        invoices.createIndex('by-created', 'created_at')
      },
    })
  }
  return dbPromise
}

// --- Catalog cache (items + retailers), refreshed on login/online sync ---

export async function cacheItems(items: Item[]) {
  const db = await getDb()
  const tx = db.transaction('items', 'readwrite')
  await Promise.all([...items.map((item) => tx.store.put(item)), tx.done])
}

export async function getCachedItems(vendorId: string): Promise<Item[]> {
  const db = await getDb()
  return db.getAllFromIndex('items', 'by-vendor', vendorId)
}

export async function cacheRetailers(retailers: Retailer[]) {
  const db = await getDb()
  const tx = db.transaction('retailers', 'readwrite')
  await Promise.all([...retailers.map((r) => tx.store.put(r)), tx.done])
}

export async function getCachedRetailers(vendorId: string): Promise<Retailer[]> {
  const db = await getDb()
  return db.getAllFromIndex('retailers', 'by-vendor', vendorId)
}

export async function addCachedRetailer(retailer: Retailer) {
  const db = await getDb()
  await db.put('retailers', retailer)
}

// --- Local invoice queue: every invoice created on-device lives here first,
// whether or not the network is up, and is mirrored here after a successful sync
// too, so the offline "past invoices" list always reads from one source. ---

export async function saveLocalInvoice(invoice: DraftInvoice) {
  const db = await getDb()
  await db.put('invoices', invoice)
}

export async function getLocalInvoices(): Promise<DraftInvoice[]> {
  const db = await getDb()
  const all = await db.getAll('invoices')
  return all.sort((a, b) => b.created_at.localeCompare(a.created_at))
}

export async function getLocalInvoiceById(clientGeneratedId: string): Promise<DraftInvoice | undefined> {
  const db = await getDb()
  return db.get('invoices', clientGeneratedId)
}

export async function getPendingInvoices(): Promise<DraftInvoice[]> {
  const db = await getDb()
  return db.getAllFromIndex('invoices', 'by-status', 'draft')
}

export async function markInvoiceSynced(
  clientGeneratedId: string,
  invoiceNumber: string,
  syncedAt: string
) {
  const db = await getDb()
  const existing = await db.get('invoices', clientGeneratedId)
  if (!existing) return
  await db.put('invoices', {
    ...existing,
    status: 'synced',
    invoice_number: invoiceNumber,
    synced_at: syncedAt,
  })
}
