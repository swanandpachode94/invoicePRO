import { useState } from 'react'
import { useAuth } from '@/hooks/useAuth'
import { useUpdateVendorSettings } from '@/hooks/useVendorData'
import { previewInvoiceNumber } from '@/lib/invoiceNumber'
import { Button } from '@/components/common/Button'
import { Input, Select } from '@/components/common/Input'
import type { InvoiceResetRule } from '@/types'

export function InvoiceSettings() {
  const { vendor, refreshProfile } = useAuth()
  const [prefix, setPrefix] = useState(vendor?.invoice_prefix ?? 'INV')
  const [resetRule, setResetRule] = useState<InvoiceResetRule>(vendor?.invoice_reset_rule ?? 'never')
  const [saved, setSaved] = useState(false)
  const update = useUpdateVendorSettings()

  if (!vendor) return null

  const preview = previewInvoiceNumber(prefix || 'INV', resetRule, vendor.invoice_counter + 1)

  async function save() {
    setSaved(false)
    await update.mutateAsync({ vendorId: vendor!.id, invoice_prefix: prefix || 'INV', invoice_reset_rule: resetRule })
    await refreshProfile()
    setSaved(true)
  }

  return (
    <div className="max-w-lg space-y-6">
      <h1 className="text-2xl font-bold text-slate-900">Invoice number settings</h1>

      <div className="space-y-4 rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-100">
        <Input label="Invoice prefix" value={prefix} onChange={(e) => setPrefix(e.target.value.toUpperCase())} />
        <Select
          label="Reset rule"
          value={resetRule}
          onChange={(e) => setResetRule(e.target.value as InvoiceResetRule)}
        >
          <option value="never">Never reset</option>
          <option value="yearly">Reset every calendar year</option>
          <option value="financial_year">Reset every financial year (Apr–Mar)</option>
        </Select>

        <div className="rounded-xl bg-slate-50 p-4">
          <p className="text-sm text-slate-500">Next invoice number will look like</p>
          <p className="mt-1 text-xl font-bold text-primary-800">{preview}</p>
        </div>

        {saved && <p className="text-sm font-medium text-green-700">Saved!</p>}
        <Button fullWidth onClick={save} loading={update.isPending}>
          Save settings
        </Button>
      </div>
    </div>
  )
}
