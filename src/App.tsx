import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider } from '@/hooks/useAuth'
import { RequireAuth, RequireRole } from '@/components/layout/ProtectedRoute'
import { VendorLayout } from '@/components/layout/VendorLayout'
import { SalesmanLayout } from '@/components/layout/SalesmanLayout'
import { Toast } from '@/components/common/Toast'

import { Login } from '@/pages/auth/Login'
import { ChooseSignup } from '@/pages/auth/ChooseSignup'
import { VendorSignup } from '@/pages/auth/VendorSignup'
import { SalesmanSignup } from '@/pages/auth/SalesmanSignup'
import { PendingApproval } from '@/pages/auth/PendingApproval'

import { VendorDashboard } from '@/pages/vendor/VendorDashboard'
import { SalesmenManagement } from '@/pages/vendor/SalesmenManagement'
import { ItemCatalog } from '@/pages/vendor/ItemCatalog'
import { InvoiceSettings } from '@/pages/vendor/InvoiceSettings'
import { CancellationApprovals } from '@/pages/vendor/CancellationApprovals'
import { InvoiceExport } from '@/pages/vendor/InvoiceExport'

import { SalesmanDashboard } from '@/pages/salesman/SalesmanDashboard'
import { CreateInvoice } from '@/pages/salesman/CreateInvoice'
import { InvoiceHistory } from '@/pages/salesman/InvoiceHistory'
import { InvoiceDetail } from '@/pages/salesman/InvoiceDetail'

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Toast />
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/signup" element={<ChooseSignup />} />
          <Route path="/signup/vendor" element={<VendorSignup />} />
          <Route path="/signup/salesman" element={<SalesmanSignup />} />

          <Route element={<RequireAuth />}>
            <Route path="/pending-approval" element={<PendingApproval />} />

            <Route element={<RequireRole role="vendor" />}>
              <Route path="/vendor" element={<VendorLayout />}>
                <Route index element={<VendorDashboard />} />
                <Route path="salesmen" element={<SalesmenManagement />} />
                <Route path="items" element={<ItemCatalog />} />
                <Route path="cancellations" element={<CancellationApprovals />} />
                <Route path="settings" element={<InvoiceSettings />} />
                <Route path="export" element={<InvoiceExport />} />
              </Route>
            </Route>

            <Route element={<RequireRole role="salesman" />}>
              <Route path="/app" element={<SalesmanLayout />}>
                <Route index element={<SalesmanDashboard />} />
                <Route path="new-invoice" element={<CreateInvoice />} />
                <Route path="history" element={<InvoiceHistory />} />
                <Route path="invoice/:id" element={<InvoiceDetail />} />
              </Route>
            </Route>
          </Route>

          <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  )
}
