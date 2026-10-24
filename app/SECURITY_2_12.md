# SYU AUTO 2.12 — Production Security Checklist

## Implemented preparation
- Stripe secret keys are server-side only.
- Stripe webhook signature verification remains required.
- Admin access must be enforced server-side, never only by hiding UI.
- Supabase RLS must be enabled on every production table.
- Public listing reads should expose only active listings.
- User-owned writes must be restricted by auth.uid().
- Service-role keys must never be placed in NEXT_PUBLIC_* variables.
- File uploads should be restricted by authenticated user and reasonable file size/type limits.
- Production errors should not expose secrets or database details.

## Before launch
1. Create production Supabase project.
2. Apply schema and RLS policies.
3. Create the `car-photos` bucket and verify policies.
4. Create the first admin account and enforce admin authorization server-side.
5. Add Vercel environment variables.
6. Configure Stripe webhook in production.
7. Test registration, login, publish, moderation, search, photos and payment.
8. Add rate limiting / abuse protection before public launch.
9. Add privacy policy, terms, cookie notice where legally required.
10. Make regular database backups.

## Important
The prototype is not a security-audited production system yet. Do not put real payment credentials or sensitive customer data into a public deployment until the above checks are completed.
