import { Document, Page, Text, View, StyleSheet, Image, pdf } from '@react-pdf/renderer'
import type { DraftInvoice, Vendor } from '@/types'
import { calculateInvoiceTotals, formatInr } from '@/lib/gst'

const styles = StyleSheet.create({
  page: { padding: 32, fontSize: 10, color: '#1e293b' },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  logo: { width: 56, height: 56, marginBottom: 6, objectFit: 'contain' },
  businessName: { fontSize: 16, fontWeight: 700 },
  muted: { color: '#64748b' },
  title: { fontSize: 18, fontWeight: 700, textAlign: 'right' },
  section: { marginTop: 20 },
  row: { flexDirection: 'row', justifyContent: 'space-between' },
  card: { backgroundColor: '#f8fafc', padding: 10, borderRadius: 4, marginTop: 12, width: '48%' },
  table: { marginTop: 16, borderTop: '1 solid #e2e8f0' },
  tr: { flexDirection: 'row', borderBottom: '1 solid #e2e8f0', paddingVertical: 6 },
  th: { fontWeight: 700, color: '#64748b' },
  colName: { width: '34%' },
  colQty: { width: '12%', textAlign: 'right' },
  colPrice: { width: '18%', textAlign: 'right' },
  colGst: { width: '12%', textAlign: 'right' },
  colTotal: { width: '24%', textAlign: 'right' },
  totals: { marginTop: 16, alignSelf: 'flex-end', width: '55%' },
  totalRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 3 },
  grandTotal: { flexDirection: 'row', justifyContent: 'space-between', paddingTop: 8, marginTop: 4, borderTop: '1 solid #1e293b' },
  grandTotalText: { fontSize: 13, fontWeight: 700 },
})

function InvoicePdfDocument({
  invoice,
  vendor,
  includeLogo,
}: {
  invoice: DraftInvoice
  vendor: Vendor
  includeLogo: boolean
}) {
  const totals = calculateInvoiceTotals(invoice.lines, invoice.is_interstate)

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <View style={styles.headerRow}>
          <View>
            {includeLogo && vendor.logo_url && <Image src={vendor.logo_url} style={styles.logo} />}
            <Text style={styles.businessName}>{vendor.business_name}</Text>
            {vendor.gstin && <Text style={styles.muted}>GSTIN: {vendor.gstin}</Text>}
            {vendor.state && <Text style={styles.muted}>{vendor.state}</Text>}
          </View>
          <View>
            <Text style={styles.title}>INVOICE</Text>
            <Text style={{ marginTop: 4 }}>{invoice.invoice_number ?? 'Pending sync'}</Text>
            <Text style={styles.muted}>{new Date(invoice.created_at).toLocaleDateString('en-IN')}</Text>
          </View>
        </View>

        <View style={styles.card}>
          <Text style={{ ...styles.muted, marginBottom: 2 }}>Billed to</Text>
          <Text style={{ fontWeight: 700 }}>{invoice.retailer_name}</Text>
        </View>

        <View style={styles.table}>
          <View style={[styles.tr, styles.th]}>
            <Text style={styles.colName}>Item</Text>
            <Text style={styles.colQty}>Qty</Text>
            <Text style={styles.colPrice}>Rate</Text>
            <Text style={styles.colGst}>GST%</Text>
            <Text style={styles.colTotal}>Amount</Text>
          </View>
          {invoice.lines.map((line, i) => (
            <View style={styles.tr} key={i}>
              <Text style={styles.colName}>{line.item_name}</Text>
              <Text style={styles.colQty}>{line.quantity}</Text>
              <Text style={styles.colPrice}>{formatInr(line.unit_price)}</Text>
              <Text style={styles.colGst}>{line.gst_percent}%</Text>
              <Text style={styles.colTotal}>{formatInr(line.line_total)}</Text>
            </View>
          ))}
        </View>

        <View style={styles.totals}>
          <View style={styles.totalRow}>
            <Text>Subtotal</Text>
            <Text>{formatInr(totals.subtotal)}</Text>
          </View>
          {invoice.is_interstate ? (
            <View style={styles.totalRow}>
              <Text>IGST</Text>
              <Text>{formatInr(totals.igst)}</Text>
            </View>
          ) : (
            <>
              <View style={styles.totalRow}>
                <Text>CGST</Text>
                <Text>{formatInr(totals.cgst)}</Text>
              </View>
              <View style={styles.totalRow}>
                <Text>SGST</Text>
                <Text>{formatInr(totals.sgst)}</Text>
              </View>
            </>
          )}
          <View style={styles.grandTotal}>
            <Text style={styles.grandTotalText}>Total</Text>
            <Text style={styles.grandTotalText}>{formatInr(totals.totalAmount)}</Text>
          </View>
        </View>
      </Page>
    </Document>
  )
}

/**
 * Renders client-side via @react-pdf/renderer. The vendor logo is a remote
 * image fetch, which fails silently when offline — callers pass `includeLogo:
 * navigator.onLine` so an offline share/download still succeeds, just without
 * the logo image.
 */
export async function generateInvoicePdfBlob(
  invoice: DraftInvoice,
  vendor: Vendor,
  includeLogo: boolean
): Promise<Blob> {
  return pdf(<InvoicePdfDocument invoice={invoice} vendor={vendor} includeLogo={includeLogo} />).toBlob()
}

export function invoicePdfFilename(invoice: DraftInvoice): string {
  const label = invoice.invoice_number ?? invoice.client_generated_id.slice(0, 8)
  return `invoice-${label}.pdf`
}
