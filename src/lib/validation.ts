import { z } from 'zod'
import { GST_SLABS } from '@/lib/gst'

export const phoneSchema = z
  .string()
  .trim()
  .regex(/^[6-9]\d{9}$/, 'Enter a valid 10-digit Indian mobile number')

export const otpSchema = z
  .string()
  .trim()
  .regex(/^\d{4,8}$/, 'Enter the code you received')

const emailSchema = z.string().trim().email('Enter a valid email address')

// Signup: phone gets attached to the account being created. Login: the phone
// is already on file from signup, so only the email (used to find the account
// and receive the verification link) is asked for.
export const signupEmailSchema = z.object({
  phone: phoneSchema,
  email: emailSchema,
})

export const loginEmailSchema = z.object({
  email: emailSchema,
})

export const indianStates = [
  'Andhra Pradesh', 'Arunachal Pradesh', 'Assam', 'Bihar', 'Chhattisgarh', 'Goa', 'Gujarat',
  'Haryana', 'Himachal Pradesh', 'Jharkhand', 'Karnataka', 'Kerala', 'Madhya Pradesh',
  'Maharashtra', 'Manipur', 'Meghalaya', 'Mizoram', 'Nagaland', 'Odisha', 'Punjab', 'Rajasthan',
  'Sikkim', 'Tamil Nadu', 'Telangana', 'Tripura', 'Uttar Pradesh', 'Uttarakhand', 'West Bengal',
  'Delhi', 'Jammu and Kashmir', 'Ladakh', 'Chandigarh', 'Puducherry',
] as const

export const vendorSignupSchema = z.object({
  business_name: z.string().trim().min(2, 'Business name is required'),
  phone: phoneSchema,
  gstin: z.string().trim().optional().or(z.literal('')),
  state: z.string().min(1, 'Select a state'),
  address: z.string().trim().optional().or(z.literal('')),
})
export type VendorSignupInput = z.infer<typeof vendorSignupSchema>

export const salesmanSignupSchema = z.object({
  name: z.string().trim().min(2, 'Name is required'),
  vendor_code: z.string().trim().min(4, 'Enter the vendor code your distributor gave you'),
  phone: phoneSchema,
})
export type SalesmanSignupInput = z.infer<typeof salesmanSignupSchema>

export const itemSchema = z.object({
  name: z.string().trim().min(1, 'Item name is required'),
  sku: z.string().trim().optional().or(z.literal('')),
  hsn_code: z.string().trim().optional().or(z.literal('')),
  unit: z.string().trim().min(1, 'Unit is required'),
  sale_price: z.coerce.number().nonnegative('Must be 0 or more'),
  gst_percent: z.coerce.number().refine((v) => (GST_SLABS as number[]).includes(v), 'Invalid GST slab'),
})
export type ItemInput = z.infer<typeof itemSchema>

export const retailerSchema = z.object({
  name: z.string().trim().min(1, 'Retailer name is required'),
  gstin: z.string().trim().optional().or(z.literal('')),
  state: z.string().min(1, 'Select a state'),
  phone: z.string().trim().optional().or(z.literal('')),
})
export type RetailerInput = z.infer<typeof retailerSchema>
