# Security review — 6 October 2026

Implemented:
- Next.js updated from 16.3.5 to 16.3.8; affected transitive runtime dependencies updated. Production npm audit: zero known vulnerabilities at review time.
- Content Security Policy limits connections and images to this site and the configured Supabase origin; disables plugins, framing and external form targets. Inline scripts/styles remain enabled for current Next.js rendering; this is not full XSS prevention.
- Assistant API rejects cross-origin browser calls, unsupported content types, malformed/non-object JSON and bodies over 8 KiB (actual stream bytes, not just Content-Length). Expired in-memory quota entries are cleaned up and map size is bounded.
- Database trigger explicitly checks seller status transitions, prevents content edits during archiving and rejects photo paths outside the seller/listing namespace. Applied to the live Supabase database and tested in a rolled-back transaction.
- Dependabot configuration requests weekly dependency update PRs.

Verified existing controls:
- Listing and inquiry RLS; administrator role comes from trusted app_metadata.
- Private photo bucket; 5 MiB limit, JPEG/PNG/WebP only. Public access limited to referenced images on active listings.
- Four request parsing tests; TypeScript check; production build; database tests covering forbidden transitions, foreign photo references, legitimate edits and moderation.

Still requires configuration or implementation:
- Supabase reports leaked-password protection disabled; the feature requires Pro or above. No plan changes purchased.
- MFA for owner/provider accounts and administrator step-up authentication not verified.
- No server-side image decoding/re-encoding or malware scanning yet. MIME/size limits do not prove file contents are safe.
- Assistant quota remains per process and resets on restart; shared durable quotas are needed for reliable cost limits across instances.
- CAPTCHA/bot controls, hosting firewall rules, monitoring, backup retention and restoration have not been verified.
- Full npm audit still reports development-tool dependency advisories under Tailwind 3. A forced Tailwind major update was not applied because it needs a separate compatibility review.

Do not treat this review as a guarantee of complete security. Never put a service-role or secret key in NEXT_PUBLIC variables or committed files.
