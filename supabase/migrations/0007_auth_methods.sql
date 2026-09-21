-- Supports email/password and Google OAuth sign-in alongside the existing
-- phone/OTP flow. A salesman signing up via email or Google has no
-- auth.users.phone, so it's now collected as a plain form field instead of
-- being guaranteed by the auth method — the column must allow null.
-- (A plain unique constraint already treats multiple NULLs as distinct in
-- Postgres, so this doesn't weaken the "no two approved salesmen share a
-- phone" guarantee for anyone who does provide one.)

alter table salesmen alter column phone drop not null;
