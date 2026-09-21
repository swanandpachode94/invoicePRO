import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useAuth } from '@/hooks/useAuth'
import { useItems, useUpsertItem, useToggleItemActive } from '@/hooks/useVendorData'
import { itemSchema, type ItemInput } from '@/lib/validation'
import { GST_SLABS, formatInr } from '@/lib/gst'
import { LoadingState, ErrorState, EmptyState } from '@/components/common/States'
import { Badge } from '@/components/common/Badge'
import { Button } from '@/components/common/Button'
import { Input, Select } from '@/components/common/Input'
import { Modal } from '@/components/common/Modal'
import type { Item } from '@/types'

export function ItemCatalog() {
  const { vendor } = useAuth()
  const items = useItems(vendor?.id)
  const toggleActive = useToggleItemActive()
  const [editing, setEditing] = useState<Item | 'new' | null>(null)

  if (items.isLoading) return <LoadingState label="Loading catalog…" />
  if (items.isError) return <ErrorState onRetry={() => items.refetch()} />

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-slate-900">Item catalog</h1>
        <Button onClick={() => setEditing('new')}>+ Add item</Button>
      </div>

      {!items.data || items.data.length === 0 ? (
        <EmptyState title="No items yet" description="Add your first item to start building invoices." />
      ) : (
        <div className="overflow-x-auto rounded-2xl bg-white shadow-sm ring-1 ring-slate-100">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-slate-100 text-slate-500">
              <tr>
                <th className="px-4 py-3">Name</th>
                <th className="px-4 py-3">SKU</th>
                <th className="px-4 py-3">HSN</th>
                <th className="px-4 py-3">Unit</th>
                <th className="px-4 py-3">Price</th>
                <th className="px-4 py-3">GST%</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody>
              {items.data.map((item) => (
                <tr key={item.id} className="border-b border-slate-50 last:border-0">
                  <td className="px-4 py-3 font-medium text-slate-800">{item.name}</td>
                  <td className="px-4 py-3">{item.sku ?? '—'}</td>
                  <td className="px-4 py-3">{item.hsn_code ?? '—'}</td>
                  <td className="px-4 py-3">{item.unit}</td>
                  <td className="px-4 py-3">{formatInr(item.sale_price)}</td>
                  <td className="px-4 py-3">{item.gst_percent}%</td>
                  <td className="px-4 py-3">
                    <Badge tone={item.active ? 'success' : 'neutral'}>{item.active ? 'Active' : 'Inactive'}</Badge>
                  </td>
                  <td className="space-x-3 px-4 py-3">
                    <button className="font-medium text-primary-700" onClick={() => setEditing(item)}>
                      Edit
                    </button>
                    <button
                      className="font-medium text-slate-500"
                      onClick={() => toggleActive.mutate({ id: item.id, active: !item.active })}
                    >
                      {item.active ? 'Deactivate' : 'Activate'}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {editing && <ItemFormModal vendorId={vendor!.id} item={editing === 'new' ? null : editing} onClose={() => setEditing(null)} />}
    </div>
  )
}

function ItemFormModal({ vendorId, item, onClose }: { vendorId: string; item: Item | null; onClose: () => void }) {
  const upsert = useUpsertItem(vendorId)
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ItemInput>({
    resolver: zodResolver(itemSchema),
    defaultValues: item
      ? {
          name: item.name,
          sku: item.sku ?? '',
          hsn_code: item.hsn_code ?? '',
          unit: item.unit,
          sale_price: item.sale_price,
          gst_percent: item.gst_percent,
        }
      : { unit: 'pcs', gst_percent: 18, sale_price: 0 },
  })

  async function onSubmit(values: ItemInput) {
    await upsert.mutateAsync({ id: item?.id, values })
    onClose()
  }

  return (
    <Modal open title={item ? 'Edit item' : 'Add item'} onClose={onClose}>
      <form className="space-y-4" onSubmit={handleSubmit(onSubmit)}>
        <Input label="Item name" {...register('name')} error={errors.name?.message} />
        <Input label="SKU (optional)" {...register('sku')} error={errors.sku?.message} />
        <Input label="HSN code (optional)" {...register('hsn_code')} error={errors.hsn_code?.message} />
        <div className="grid grid-cols-2 gap-3">
          <Input label="Unit" placeholder="pcs, box, kg…" {...register('unit')} error={errors.unit?.message} />
          <Input label="Sale price (₹)" type="number" step="0.01" {...register('sale_price')} error={errors.sale_price?.message} />
        </div>
        <Select label="GST %" {...register('gst_percent')} error={errors.gst_percent?.message}>
          {GST_SLABS.map((slab) => (
            <option key={slab} value={slab}>
              {slab}%
            </option>
          ))}
        </Select>
        <Button fullWidth type="submit" loading={upsert.isPending}>
          Save item
        </Button>
      </form>
    </Modal>
  )
}
