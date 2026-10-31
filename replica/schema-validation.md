# Schema validation

Date: 2026-10-20. Isolated in-memory PGlite PostgreSQL; no remote database or payment service.

Engine: PostgreSQL 18.6 (PGlite 0.5.10) on wasm32-unknown-emscripten, compiled by emcc (Emscripten gcc/clang-like replacement + linker emulating GNU ld) 6.0.5 (1db513782be24469589d7cb8a1f1834e9a33f271), 32-bit

20 checks passed:

- Fresh migration applies with btree_gist
- 25 application tables, all with RLS enabled
- Every table has UUID ID and creation/update timestamps
- Cross-organization supplier/city link rejected
- Quote snapshots cannot be updated
- A quote cannot create two bookings
- Expired but unreleased hold still blocks overlapping inventory
- Adjacent half-open allocations accepted
- Maintenance also conflicts with booked resource time
- Confirmation without supplier approval rejected
- Confirmation without prepayment rejected
- Confirmation with only a hold rejected
- Approved paid booking with reserved resource confirms
- Pending refunds reserve funds against over-refunding
- Repeated provider webhook event rejected
- Runtime with no tenant context cannot see bookings
- Runtime sees only selected tenant
- RLS rejects writes to another organization
- Switching tenant hides other organization bookings
- Runtime cannot mutate audit history

Limits: single-session database checks do not prove simultaneous multi-connection behavior, application authorization, Supabase deployment privileges, provider signatures/delivery, tax correctness, or production readiness. Run the integration/browser checks in architecture.md during implementation. PGlite dependency lives in a temporary tool directory, outside application source.

Re-run with Node and PGLITE_MODULE_DIR set as described in validate-schema.mjs.
