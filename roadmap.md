# HYPE — roadmap

## Done
- Database schema, roles (user_roles + has_role), RLS, seed companions/pricing/settings
- Private storage buckets (ID documents, companion photos via signed URLs)
- Design system, header/footer, age gate
- Home, companions list + filters, DJ page, terms/privacy/safety/FAQ
- Companion profile + booking panel (packages, add-ons, Party Mode, DJ hourly, 5 AM limit)
- Auth (customer / companion tabs, 18+ terms checkbox, password reset)
- Profile & ID upload, cart + booking request, my bookings (cancel, review)
- Companion dashboard (requests, profile, photos, availability, AI bio draft)
- Owner dashboard (bookings, ID queue, companions + pricing, photo queue, review queue, reports, site settings)

- 24h auto-expiry of pending requests (15-min scheduled job)

## Open (needs user action)
- Stripe deposit checkout + webhook (needs Stripe setup / legal + restricted-business check)
- Transactional emails (request received/accepted/declined, reminders, review requests)

- Overlap check so a companion can't be double-booked on the same night
