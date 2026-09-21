-- Vendors never had a phone column (only salesmen did) — needed now that the
-- phone+email-OTP auth method collects a phone number during vendor signup too.
alter table vendors add column phone text;
