# Security review — 6 October 2026

Implemented and deployed:
- Next.js 16.3.8, browser security headers, strict assistant request parsing, database moderation/ownership checks and weekly Dependabot updates.
- Verified-email accounts only for new listings, inquiries, photo uploads and assistant quota consumption. Durable atomic database quotas: 5 listings/day, 20 inquiries/hour, 30 photo uploads/hour and 5 assistant calls/hour, per account. Limits fail closed.
- Secure photo Edge Function checks account and listing ownership, limits streamed input to 5 MiB, verifies JPEG/PNG/WebP signatures and decodes with pinned ImageMagick WASM. Only the first frame is read; dimensions, pixels and decoder resources are bounded. Output is a newly encoded JPEG with metadata removed and longest side at most 2400px. Browser resizing improves upload usability but is not trusted for validation.
- Direct authenticated INSERT into the car-photos bucket is denied by a restrictive policy after the frontend deployment. The server uses its runtime-only service role. Existing referenced photos are not rewritten.
- Daily private backups at 01:00 UTC include listings, inquiries, account identifiers/email/roles and all referenced photo bytes. Password hashes, sessions and signing keys are excluded. Immutable photo copies are deduplicated by SHA-256; daily metadata archives are retained for 14 days. Photo copies are retained. Each run reads back photos and compares checksums, decompresses the metadata archive and verifies exact equality before recording success.
- Backup scheduling credentials live in Supabase Vault. Public backup endpoint rejects unauthenticated calls; its service-only snapshot RPC validates the internal token. No browser access to backup objects or RPCs.

Validation:
- Production npm audit: zero runtime advisories at review time. TypeScript and production build pass; four request parsing tests pass.
- Four decoder/body tests pass: PNG/JPEG/WebP acceptance, appended payload removal, spoofed/corrupt images rejected, oversized streamed bodies rejected and excessive pixel count rejected.
- Database quota tested in a rolled-back authenticated transaction: requests 1–5 accepted, request 6 denied. Five listing inserts succeed and the sixth is blocked in a rolled-back transaction. Listing transition and namespace checks were tested previously.
- First complete backup succeeded; subsequent readback/checksum/archive restoration verification succeeded.
- Deployed decoder smoke test returned HTTP 200 with a freshly encoded JPEG using a fixed public fixture and no administrative operations; temporary test function was disabled afterward.
- Positive authenticated upload through the deployed function has not been verified with an owner session. An administrative production integration-test route was rejected by automatic approval review and was never deployed.

Remaining owner actions and limitations:
- Independent off-provider backup export remains pending explicit authorization to transfer private contact/account data. Current automated backups remain inside the same Supabase project and do not protect against loss of the whole provider account.
- Administrator/provider MFA requires owner enrollment. Administrator step-up enforcement is not enabled.
- Account quotas reduce abuse but do not replace CAPTCHA, a hosting firewall or protection against attackers creating many accounts. These have not been configured.
- Image normalization is not a signature-based antivirus scanner. Existing photos predate this processing pipeline.
- [Supabase leaked-password protection](https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection) requires a paid plan; no plan change purchased.
- Tailwind 3 development-tool advisories remain; a forced incompatible major upgrade was not applied.
- Storage capacity must be monitored as immutable photo backups accumulate. Inspect private.backup_runs and cron.job_run_details for failures. Scheduled jobs failing at runtime do not currently notify the owner automatically.

## Recovery

Use a successful dated gzip metadata archive plus every object referenced by its photos[].backup_path manifest. Verify each SHA-256 before restoring bytes to car-photos at its original photos[].path. Restore account identities/roles first, then listings and inquiries under a controlled service account in a separate project. Account email sign-in must be re-established: password hashes and sessions are deliberately not archived. Reapply the versioned migrations and redeploy both Edge Functions. An independent full-project restore rehearsal has not been performed.

Never commit a service-role key or put it in NEXT_PUBLIC variables.
