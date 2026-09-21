import { useMemo, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { v4 as uuidv4 } from 'uuid'
import { Search, Minus, Plus, Eye } from 'lucide-react'
import { useAuth } from '@/hooks/useAuth'
import { useCatalog } from '@/hooks/useSalesmanData'
import { saveLocalInvoice } from '@/lib/db'
import { runSync } from '@/lib/syncManager'
import { calculateInvoiceTotals, calculateLine, formatInr } from '@/lib/gst'
import { confirmSuccess } from '@/lib/feedback'
import { retailerSchema, indianStates, type RetailerInput } from '@/lib/validation'
import { Button } from '@/components/common/Button'
import { Input, Select } from '@/components/common/Input'
import { Modal } from '@/components/common/Modal'
import { EmptyState } from '@/components/common/States'
import { ListSkeleton } from '@/components/common/Skeleton'
import type { DraftInvoice, DraftInvoiceLine, Item } from '@/types'

export function CreateInvoice() {
  const { t } = useTranslation()
  const { employerVendor: vendor, salesman } = useAuth()
  const navigate = useNavigate()
  const { items, retailers, loading, quickAddRetailer } = useCatalog(vendor?.id)

  const [retailerId, setRetailerId] = useState('')
  const [showAddRetailer, setShowAddRetailer] = useState(false)
  const [search, setSearch] = useState('')
  const [lines, setLines] = useState<DraftInvoiceLine[]>([])
  const [saving, setSaving] = useState(false)
  const [previewing, setPreviewing] = useState(false)

  const retailer = retailers.find((r) => r.id === retailerId)
  const isInterstate = !!retailer?.state && !!vendor?.state && retailer.state !== vendor.state

  const filteredItems = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return items
    return items.filter((i) => i.name.toLowerCase().includes(q) || i.sku?.toLowerCase().includes(q))
  }, [items, search])

  const totals = useMemo(() => calculateInvoiceTotals(lines, isInterstate), [lines, isInterstate])

  function addItem(item: Item) {
    setLines((prev) => {
      const existing = prev.find((l) => l.item_id === item.id)
      if (existing) return setQty(prev, item.id, existing.quantity + 1)
      const { lineTotal } = calculateLine(item.sale_price, 1, item.gst_percent)
      return [
        ...prev,
        { item_id: item.id, item_name: item.name, quantity: 1, unit_price: item.sale_price, gst_percent: item.gst_percent, line_total: lineTotal },
      ]
    })
  }

  function setQty(list: DraftInvoiceLine[], itemId: string, quantity: number): DraftInvoiceLine[] {
    if (quantity <= 0) return list.filter((l) => l.item_id !== itemId)
    return list.map((l) =>
      l.item_id === itemId
        ? { ...l, quantity, line_total: calculateLine(l.unit_price, quantity, l.gst_percent).lineTotal }
        : l
    )
  }

  function changeQty(itemId: string, delta: number) {
    setLines((prev) => {
      const line = prev.find((l) => l.item_id === itemId)
      if (!line) return prev
      return setQty(prev, itemId, line.quantity + delta)
    })
  }

  function buildDraft(): DraftInvoice | null {
    if (!vendor || !salesman || !retailer || lines.length === 0) return null
    return {
      client_generated_id: uuidv4(),
      vendor_id: vendor.id,
      salesman_id: salesman.id,
      retailer_id: retailer.id,
      retailer_name: retailer.name,
      lines,
      subtotal: totals.subtotal,
      total_gst: totals.totalGst,
      total_amount: totals.totalAmount,
      is_interstate: isInterstate,
      status: 'draft',
      invoice_number: null,
      created_at: new Date().toISOString(),
      synced_at: null,
    }
  }

  async function handlePreview() {
    const draft = buildDraft()
    if (!draft || !vendor) return
    setPreviewing(true)
    try {
      // Not-yet-saved preview, so it never had a synced invoice_number — the
      // PDF just shows "Pending sync" there, same as any unsynced invoice would.
      const { generateInvoicePdfBlob } = await import('@/lib/pdf')
      const blob = await generateInvoicePdfBlob(draft, vendor, navigator.onLine)
      window.open(URL.createObjectURL(blob), '_blank')
    } finally {
      setPreviewing(false)
    }
  }

  async function handleSave() {
    const draft = buildDraft()
    if (!draft) return
    setSaving(true)
    try {
      await saveLocalInvoice(draft)
      void runSync()
      confirmSuccess(t('salesman.invoiceSaved'))
      navigate(`/app/invoice/${draft.client_generated_id}`, { replace: true })
    } finally {
      setSaving(false)
    }
  }

  if (loading) return <ListSkeleton rows={3} />

  return (
    <div className="space-y-6 pb-4">
      <h1 className="text-2xl font-bold text-slate-900">{t('salesman.newInvoiceTitle')}</h1>

      <section className="space-y-2">
        <label className="block text-sm font-medium text-slate-700">{t('salesman.retailer')}</label>
        {retailers.length === 0 ? (
          <EmptyState title="No retailers yet" description="Add the shop you're billing." />
        ) : (
          <Select value={retailerId} onChange={(e) => setRetailerId(e.target.value)}>
            <option value="">{t('salesman.selectRetailer')}</option>
            {retailers.map((r) => (
              <option key={r.id} value={r.id}>
                {r.name}
                {r.state ? ` · ${r.state}` : ''}
              </option>
            ))}
          </Select>
        )}
        <Button variant="secondary" fullWidth onClick={() => setShowAddRetailer(true)}>
          {t('salesman.quickAddRetailer')}
        </Button>
      </section>

      <section className="space-y-3">
        <label className="block text-sm font-medium text-slate-700">{t('salesman.addItems')}</label>
        <div className="relative">
          <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <Input
            placeholder={t('salesman.searchCatalog')}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-11"
          />
        </div>
        {filteredItems.length === 0 ? (
          <EmptyState title="No matching items" />
        ) : (
          <div className="grid grid-cols-2 gap-2">
            {filteredItems.map((item) => (
              <button
                key={item.id}
                onClick={() => addItem(item)}
                className="rounded-xl bg-white p-3 text-left shadow-sm ring-1 ring-slate-100 active:bg-primary-50 min-h-[44px]"
              >
                <p className="font-semibold text-slate-800">{item.name}</p>
                {item.sku && <p className="text-xs text-slate-400">SKU: {item.sku}</p>}
                <p className="text-sm text-slate-500">
                  {formatInr(item.sale_price)} / {item.unit} · {item.gst_percent}% GST
                </p>
              </button>
            ))}
          </div>
        )}
      </section>

      {lines.length > 0 && (
        <section className="space-y-2">
          <label className="block text-sm font-medium text-slate-700">{t('salesman.invoiceItems')}</label>
          <div className="divide-y divide-slate-100 rounded-2xl bg-white shadow-sm ring-1 ring-slate-100">
            {lines.map((line) => (
              <div key={line.item_id} className="flex items-center justify-between gap-3 p-3">
                <div className="min-w-0">
                  <p className="truncate font-medium text-slate-800">{line.item_name}</p>
                  <p className="text-sm text-slate-500">{formatInr(line.line_total)}</p>
                </div>
                <div className="flex shrink-0 items-center gap-3">
                  <button
                    onClick={() => changeQty(line.item_id!, -1)}
                    aria-label="Decrease quantity"
                    className="flex h-tap w-tap items-center justify-center rounded-full bg-slate-100 text-slate-700"
                  >
                    <Minus className="h-4 w-4" />
                  </button>
                  <span className="w-6 text-center font-semibold">{line.quantity}</span>
                  <button
                    onClick={() => changeQty(line.item_id!, 1)}
                    aria-label="Increase quantity"
                    className="flex h-tap w-tap items-center justify-center rounded-full bg-primary-100 text-primary-800"
                  >
                    <Plus className="h-4 w-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      <section className="space-y-1 rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-100">
        <div className="flex justify-between text-slate-600">
          <span>{t('salesman.subtotal')}</span>
          <span>{formatInr(totals.subtotal)}</span>
        </div>
        {isInterstate ? (
          <div className="flex justify-between text-slate-600">
            <span>IGST</span>
            <span>{formatInr(totals.igst)}</span>
          </div>
        ) : (
          <>
            <div className="flex justify-between text-slate-600">
              <span>CGST</span>
              <span>{formatInr(totals.cgst)}</span>
            </div>
            <div className="flex justify-between text-slate-600">
              <span>SGST</span>
              <span>{formatInr(totals.sgst)}</span>
            </div>
          </>
        )}
        <div className="mt-2 flex justify-between border-t border-slate-100 pt-2 text-lg font-bold text-slate-900">
          <span>{t('salesman.total')}</span>
          <span>{formatInr(totals.totalAmount)}</span>
        </div>
      </section>

      <div className="space-y-3">
        <Button
          fullWidth
          className="py-4 text-lg"
          disabled={!retailer || lines.length === 0}
          loading={saving}
          onClick={handleSave}
        >
          {t('salesman.saveInvoice')}
        </Button>
        <Button
          variant="secondary"
          fullWidth
          disabled={!retailer || lines.length === 0}
          loading={previewing}
          onClick={handlePreview}
        >
          <Eye className="h-4 w-4" />
          {t('salesman.preview')}
        </Button>
      </div>

      {showAddRetailer && (
        <QuickAddRetailerModal
          onClose={() => setShowAddRetailer(false)}
          onAdded={(r) => {
            setRetailerId(r.id)
            setShowAddRetailer(false)
          }}
          quickAddRetailer={quickAddRetailer}
        />
      )}
    </div>
  )
}

function QuickAddRetailerModal({
  onClose,
  onAdded,
  quickAddRetailer,
}: {
  onClose: () => void
  onAdded: (r: { id: string }) => void
  quickAddRetailer: (input: { name: string; gstin: string | null; state: string; phone: string | null }) => Promise<{ id: string }>
}) {
  const { t } = useTranslation()
  const [serverError, setServerError] = useState<string | null>(null)
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<RetailerInput>({ resolver: zodResolver(retailerSchema) })

  async function onSubmit(values: RetailerInput) {
    setServerError(null)
    try {
      const r = await quickAddRetailer({
        name: values.name,
        gstin: values.gstin || null,
        state: values.state,
        phone: values.phone || null,
      })
      onAdded(r)
    } catch (err) {
      setServerError(err instanceof Error ? err.message : 'Could not add retailer')
    }
  }

  return (
    <Modal open title={t('salesman.quickAddRetailerTitle')} onClose={onClose}>
      <form className="space-y-4" onSubmit={handleSubmit(onSubmit)}>
        <Input label={t('salesman.retailerName')} {...register('name')} error={errors.name?.message} />
        <Select label={t('salesman.state')} defaultValue="" {...register('state')} error={errors.state?.message}>
          <option value="" disabled>
            {t('salesman.selectState')}
          </option>
          {indianStates.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </Select>
        <Input label={t('salesman.gstinOptional')} {...register('gstin')} error={errors.gstin?.message} />
        <Input label={t('salesman.phoneOptional')} {...register('phone')} error={errors.phone?.message} />
        {serverError && <p className="text-sm text-red-600">{serverError}</p>}
        <Button fullWidth type="submit" loading={isSubmitting}>
          {t('salesman.addRetailer')}
        </Button>
      </form>
    </Modal>
  )
}
