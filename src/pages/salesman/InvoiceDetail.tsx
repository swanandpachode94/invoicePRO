import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { Link, useParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { MessageCircle, Download, Eye, Wallet, XCircle } from 'lucide-react'
import { useAuth } from '@/hooks/useAuth'
import { useLocalInvoice } from '@/hooks/useSalesmanData'
import { useOnlineStatus } from '@/hooks/useOnlineStatus'
import { useServerInvoiceId, useInvoicePayments, useRecordPayment } from '@/hooks/usePayments'
import { supabase } from '@/lib/supabase'
import { calculateInvoiceTotals, formatInr } from '@/lib/gst'
import { confirmSuccess } from '@/lib/feedback'
import { Badge } from '@/components/common/Badge'
import { Button } from '@/components/common/Button'
import { Input } from '@/components/common/Input'
import { Modal } from '@/components/common/Modal'
import { ErrorState } from '@/components/common/States'
import { ListSkeleton } from '@/components/common/Skeleton'

export function InvoiceDetail() {
  const { t } = useTranslation()
  const { id } = useParams<{ id: string }>()
  const { employerVendor: vendor, salesman } = useAuth()
  const { invoice, loading } = useLocalInvoice(id)
  const online = useOnlineStatus()
  const [sharing, setSharing] = useState(false)
  const [previewing, setPreviewing] = useState(false)
  const [shareError, setShareError] = useState<string | null>(null)
  const [showCancelModal, setShowCancelModal] = useState(false)
  const [showPaymentModal, setShowPaymentModal] = useState(false)

  const isSynced = invoice?.status === 'synced'
  const serverInvoiceId = useServerInvoiceId(invoice?.client_generated_id, isSynced && online)
  const payments = useInvoicePayments(serverInvoiceId.data)

  if (loading) return <ListSkeleton rows={4} />
  if (!invoice || !vendor) return <ErrorState message={t('salesman.invoiceNotFound')} />

  const totals = calculateInvoiceTotals(invoice.lines, invoice.is_interstate)
  const received = (payments.data ?? []).reduce((sum, p) => sum + Number(p.amount), 0)
  const pending = Math.max(0, invoice.total_amount - received)

  // @react-pdf/renderer is a large dependency (~600kB gzipped) that most sessions
  // never touch (viewing history doesn't need it) — load it only when a share/
  // download is actually requested, instead of in the main bundle every phone downloads.
  async function buildPdf(): Promise<File> {
    const { generateInvoicePdfBlob, invoicePdfFilename } = await import('@/lib/pdf')
    const blob = await generateInvoicePdfBlob(invoice!, vendor!, online)
    return new File([blob], invoicePdfFilename(invoice!), { type: 'application/pdf' })
  }

  // Opens the rendered PDF in a new tab for viewing — distinct from Download
  // (forces a save-to-disk) and Share (WhatsApp). The invoice document itself
  // never shows payment status — see lib/pdf.tsx — only totals/GST breakdown.
  async function handlePreview() {
    setShareError(null)
    setPreviewing(true)
    try {
      const file = await buildPdf()
      window.open(URL.createObjectURL(file), '_blank')
    } catch (err) {
      setShareError(err instanceof Error ? err.message : 'Could not generate preview')
    } finally {
      setPreviewing(false)
    }
  }

  async function handleDownload() {
    setShareError(null)
    setSharing(true)
    try {
      const file = await buildPdf()
      const url = URL.createObjectURL(file)
      const link = document.createElement('a')
      link.href = url
      link.download = file.name
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      URL.revokeObjectURL(url)
    } catch (err) {
      setShareError(err instanceof Error ? err.message : 'Could not generate PDF')
    } finally {
      setSharing(false)
    }
  }

  async function handleWhatsAppShare() {
    setShareError(null)
    setSharing(true)
    try {
      const file = await buildPdf()
      const text = `Invoice ${invoice!.invoice_number ?? ''} for ${invoice!.retailer_name} — ${formatInr(invoice!.total_amount)}`.trim()

      // Native share sheet (with the PDF attached) where supported — mobile
      // Chrome/Android lets the user pick WhatsApp from it directly.
      if (navigator.canShare?.({ files: [file] })) {
        await navigator.share({ files: [file], text, title: file.name })
        return
      }

      // Fallback: wa.me can't attach a file, so open the chat with the summary
      // text and let the PDF download separately for the user to attach.
      const url = URL.createObjectURL(file)
      const link = document.createElement('a')
      link.href = url
      link.download = file.name
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      URL.revokeObjectURL(url)
      window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank')
    } catch (err) {
      if (err instanceof DOMException && err.name === 'AbortError') return
      setShareError(err instanceof Error ? err.message : 'Could not share invoice')
    } finally {
      setSharing(false)
    }
  }

  const canRequestCancellation = invoice.status === 'synced'

  return (
    <div className="space-y-6 pb-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">{invoice.invoice_number ?? t('salesman.invoiceFallbackTitle')}</h1>
          <p className="text-slate-500">{invoice.retailer_name}</p>
        </div>
        {invoice.status === 'draft' && <Badge tone="warning">{t('salesman.pendingSyncBadge')}</Badge>}
        {invoice.status === 'synced' && <Badge tone="success">{t('salesman.syncedBadge')}</Badge>}
        {invoice.status === 'cancelled' && <Badge tone="danger">{t('salesman.cancelledBadge')}</Badge>}
      </div>

      <div className="rounded-2xl bg-white shadow-sm ring-1 ring-slate-100">
        <div className="divide-y divide-slate-100">
          {invoice.lines.map((line, i) => (
            <div key={i} className="flex items-center justify-between p-4">
              <div>
                <p className="font-medium text-slate-800">{line.item_name}</p>
                <p className="text-sm text-slate-500">
                  {line.quantity} × {formatInr(line.unit_price)} · {line.gst_percent}% GST
                </p>
              </div>
              <p className="font-semibold text-slate-900">{formatInr(line.line_total)}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="space-y-1 rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-100">
        <div className="flex justify-between text-slate-600">
          <span>{t('salesman.subtotal')}</span>
          <span>{formatInr(totals.subtotal)}</span>
        </div>
        {invoice.is_interstate ? (
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
      </div>

      {/* Payment status: in-app only, deliberately never printed on the invoice document itself. */}
      {isSynced && (
        <div className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-100">
          <div className="flex items-center justify-between">
            <h2 className="font-bold text-slate-900">{t('salesman.payment')}</h2>
            <Button variant="secondary" onClick={() => setShowPaymentModal(true)} disabled={!online}>
              <Wallet className="h-4 w-4" />
              {t('salesman.recordPayment')}
            </Button>
          </div>
          <div className="mt-3 grid grid-cols-2 gap-3">
            <div className="rounded-xl bg-emerald-50 p-3">
              <p className="text-xs font-medium text-emerald-700">{t('salesman.received')}</p>
              <p className="text-lg font-bold text-emerald-700">{formatInr(received)}</p>
            </div>
            <div className="rounded-xl bg-amber-50 p-3">
              <p className="text-xs font-medium text-amber-700">{t('salesman.pending')}</p>
              <p className="text-lg font-bold text-amber-700">{formatInr(pending)}</p>
            </div>
          </div>
          {payments.data && payments.data.length > 0 && (
            <div className="mt-4 space-y-2 border-t border-slate-100 pt-3">
              {payments.data.map((p) => (
                <div key={p.id} className="flex justify-between text-sm text-slate-600">
                  <span>{new Date(p.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}{p.note ? ` · ${p.note}` : ''}</span>
                  <span className="font-medium text-slate-800">{formatInr(p.amount)}</span>
                </div>
              ))}
            </div>
          )}
          {!online && <p className="mt-3 text-sm text-amber-700">{t('salesman.reconnectForPayments')}</p>}
        </div>
      )}

      {shareError && <p className="text-sm text-red-600">{shareError}</p>}

      <div className="space-y-3">
        <Button fullWidth className="py-4 text-lg" loading={sharing} onClick={handleWhatsAppShare}>
          <MessageCircle className="h-5 w-5" />
          {t('salesman.shareWhatsApp')}
        </Button>
        <div className="grid grid-cols-2 gap-3">
          <Button variant="secondary" loading={previewing} onClick={handlePreview}>
            <Eye className="h-4 w-4" />
            {t('salesman.preview')}
          </Button>
          <Button variant="secondary" loading={sharing} onClick={handleDownload}>
            <Download className="h-4 w-4" />
            {t('salesman.downloadPdf')}
          </Button>
        </div>
        {canRequestCancellation && (
          <Button variant="ghost" fullWidth onClick={() => setShowCancelModal(true)}>
            <XCircle className="h-4 w-4" />
            {t('salesman.requestCancellation')}
          </Button>
        )}
      </div>

      <Link to="/app/history" className="block text-center text-sm font-medium text-primary-700">
        {t('salesman.backToHistory')}
      </Link>

      {showCancelModal && salesman && (
        <RequestCancellationModal
          clientGeneratedId={invoice.client_generated_id}
          salesmanId={salesman.id}
          online={online}
          onClose={() => setShowCancelModal(false)}
        />
      )}

      {showPaymentModal && serverInvoiceId.data && (
        <RecordPaymentModal
          invoiceId={serverInvoiceId.data}
          maxAmount={pending}
          onClose={() => setShowPaymentModal(false)}
        />
      )}
    </div>
  )
}

function RecordPaymentModal({
  invoiceId,
  maxAmount,
  onClose,
}: {
  invoiceId: string
  maxAmount: number
  onClose: () => void
}) {
  const { t } = useTranslation()
  const record = useRecordPayment()
  const [serverError, setServerError] = useState<string | null>(null)
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<{ amount: string; note: string }>({ defaultValues: { amount: maxAmount > 0 ? String(maxAmount) : '' } })

  async function onSubmit(values: { amount: string; note: string }) {
    setServerError(null)
    const amount = Number(values.amount)
    if (!(amount > 0)) {
      setServerError(t('salesman.enterAmountError'))
      return
    }
    try {
      await record.mutateAsync({ invoiceId, amount, note: values.note })
      confirmSuccess(t('salesman.paymentRecorded'))
      onClose()
    } catch (err) {
      setServerError(err instanceof Error ? err.message : 'Could not record payment')
    }
  }

  return (
    <Modal open title={t('salesman.recordPayment')} onClose={onClose}>
      <form className="space-y-4" onSubmit={handleSubmit(onSubmit)}>
        <Input
          label={t('salesman.amountReceived')}
          type="number"
          step="0.01"
          {...register('amount', { required: t('salesman.amountRequired') })}
          error={errors.amount?.message}
        />
        <Input label={t('salesman.noteOptional')} placeholder={t('salesman.notePlaceholder')} {...register('note')} />
        {serverError && <p className="text-sm text-red-600">{serverError}</p>}
        <Button fullWidth type="submit" loading={record.isPending}>
          {t('salesman.savePayment')}
        </Button>
      </form>
    </Modal>
  )
}

function RequestCancellationModal({
  clientGeneratedId,
  salesmanId,
  online,
  onClose,
}: {
  clientGeneratedId: string
  salesmanId: string
  online: boolean
  onClose: () => void
}) {
  const { t } = useTranslation()
  const [serverError, setServerError] = useState<string | null>(null)
  const [submitted, setSubmitted] = useState(false)
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<{ reason: string }>()

  async function onSubmit(values: { reason: string }) {
    setServerError(null)
    try {
      const { data: invoiceRow, error: lookupError } = await supabase
        .from('invoices')
        .select('id')
        .eq('client_generated_id', clientGeneratedId)
        .single()
      if (lookupError || !invoiceRow) throw lookupError ?? new Error('Invoice not found on server')

      const { error } = await supabase.from('invoice_cancellations').insert({
        invoice_id: invoiceRow.id,
        requested_by: salesmanId,
        reason: values.reason,
      })
      if (error) throw error
      setSubmitted(true)
    } catch (err) {
      setServerError(err instanceof Error ? err.message : 'Could not submit request')
    }
  }

  return (
    <Modal open title={t('salesman.requestCancellation')} onClose={onClose}>
      {submitted ? (
        <div className="space-y-4 text-center">
          <p className="text-slate-700">{t('salesman.cancellationSent')}</p>
          <Button fullWidth onClick={onClose}>
            {t('salesman.done')}
          </Button>
        </div>
      ) : (
        <form className="space-y-4" onSubmit={handleSubmit(onSubmit)}>
          {!online && <p className="text-sm text-amber-700">{t('salesman.offlineReconnectCancel')}</p>}
          <label className="block">
            <span className="mb-1.5 block text-sm font-medium text-slate-700">{t('salesman.cancellationReason')}</span>
            <textarea
              className="w-full rounded-xl border border-slate-300 px-4 py-3 text-base outline-none focus:border-primary-600 focus:ring-2 focus:ring-primary-100"
              rows={3}
              {...register('reason', { required: t('salesman.reasonRequired') })}
            />
            {errors.reason && <span className="mt-1 block text-sm text-red-600">{errors.reason.message}</span>}
          </label>
          {serverError && <p className="text-sm text-red-600">{serverError}</p>}
          <Button fullWidth type="submit" loading={isSubmitting} disabled={!online}>
            {t('salesman.submitRequest')}
          </Button>
        </form>
      )}
    </Modal>
  )
}
