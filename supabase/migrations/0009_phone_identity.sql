-- Mobile number is the identity of a registered vendor/salesman: one number,
-- one account. Phones are stored in E.164 (+91XXXXXXXXXX) on both tables.

-- Vendor phones were briefly saved as bare 10-digit numbers; normalise them so
-- the uniqueness check below compares like with like.
update vendors set phone = '+91' || phone where phone ~ '^[6-9][0-9]{9}$';

create unique index idx_vendors_phone on vendors(phone) where phone is not null;

-- Lets the signup form tell someone "already registered" before sending the
-- verification email. "Registered" means a finished vendor/salesman profile,
-- not merely an auth user — someone who verified their email but abandoned
-- the details form can still come back and finish signing up.
-- Callable without a session (signup happens before one exists); it only ever
-- answers yes/no for the exact values passed in.
create or replace function public.check_registration(p_email text, p_phone text)
returns table(email_registered boolean, phone_registered boolean)
language sql
security definer
stable
set search_path = public, auth
as $$
  select
    exists (
      select 1 from auth.users u
      where lower(u.email) = lower(trim(p_email))
        and (
          exists (select 1 from vendors v where v.auth_user_id = u.id)
          or exists (select 1 from salesmen s where s.auth_user_id = u.id)
        )
    ),
    exists (select 1 from vendors where phone = p_phone)
      or exists (select 1 from salesmen where phone = p_phone);
$$;
grant execute on function public.check_registration(text, text) to anon, authenticated;
