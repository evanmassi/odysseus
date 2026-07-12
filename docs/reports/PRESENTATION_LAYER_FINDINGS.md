# Presentation Layer Findings — Bucket 3, Batch 4 (server/src/presentation)

**Date:** 2026-07-12 · **Branch:** `audit/fixes` · **Status: AWAITING REVIEW — nothing applied**
(One exception: the login-response regression found mid-audit was hotfixed + committed immediately, db403874.)

All 47 files audited by 7 finders; load-bearing claims coordinator-re-verified. 11 files CLEAN
(including both Donor exemplars, EquipmentController+routes, and most middleware/utils — validation
middleware wired 191×, both rate limiters distinct-by-design, no dead ResponseBuilder helpers).

## A. Security fix (recommend: apply immediately)

**A1 — Cross-lab read leak:** `GET /supplies/:id/transactions` never lab-scopes: controller skips
`extractLabId` (its only sibling to do so), service takes bare itemId, repo query unscoped. Any
authenticated user can read another lab's supply transaction history. Fix: thread labId and resolve
the item within the lab first (`getItemOrThrow(itemId, labId)` — the file's own established
pattern). Client unaffected (path/verb unchanged). Same class as the P0 holes; survived in the
un-audited supplies domain.

## B. Orphaned endpoint verticals — 18 routes with zero client callers (decision)

Every one traced end-to-end and independently deletable. Recommend **delete all except noted**:

| Group | Routes | Notes |
|-------|--------|-------|
| Storage (3) | PUT /box-position-display, PUT /lab-position-display, GET /position-display-presets | Box display stays settable via live updateBox — deletion loses nothing. Verticals span controller + commands + DI + entity methods + tests. |
| Supplies (2) | DELETE /locations/:id, PUT /:id/packaging-levels/:levelId | Client mutations were removed as dead in the earlier sweep; verticals span controller + service + repo + tests. |
| Tubes (1) | GET /tubes/stats | Whole vertical incl. TubeApplicationService.getStats, TubeRepository.getStats (+interface), AND the client's queryKeys.tubes.stats — a key that's invalidated 9× but never queried. |
| Researchers (4+1) | GET /researchers/search, GET /researchers/stats, GET /researchers/:id/tubes/count, PUT /researchers/:id, plus the DUPLICATE DELETE /researchers/:id route | The duplicate DELETE is dead AND broken (param `:id` vs handler reading `researcherId` → undefined). Admin routes carry the live traffic. KEEP GET /researchers/:id (uncalled but mirrors the exemplar's accepted resource-read surface, like GET /donors/:id). |
| Admin (5) | GET /admin/audit, GET /admin/audit/entity/:t/:id, GET /admin/audit/statistics, GET /admin/stats/users, GET /admin/users/:id | Audit viewer uses /admin/audit/search; the rest have no UI. Verticals include AuditController handlers + AuditService methods + query-handler deps/DI. |
| System (2) | GET /system/labs/:labId/invite-codes, GET /system/security-config | Client only POSTs invite codes and PUTs system security-config; reads go through the admin route. |
| Auth (2 now, 1 parked) | POST /auth/resend-verification (deprecated; public variant is live), GET /auth/verification-status → delete. **POST /auth/logout → PARK for bucket 4**: the client's logout never calls the server (cache-clear only), so no server-side session revocation happens on logout — that's a session-lifecycle question the security pass should answer (wire it vs delete it), not a mechanical deletion. |

## C. Search controller cleanup (recommend: apply)

- `groupBy` is constant-undefined (strict schema strips it; client never sends it) → `shouldGroup`
  is always true → collapse the dead false-branches (behavior-preserving: search already always
  groups; limit/offset stopped paginating tubes when the criteria fields died).
- Local `GroupedResult` interface → derive from the shared schema type (its `groupType: string` is
  already looser than the schema enum).
- `TUBE_SORT_FIELDS`: one runtime source of truth in searchCriteriaTypes; mapper derives (kills the
  third hand-maintained copy of the sort list — the exact drift class behind the sortBy bug).
- Drop the double-log + pass `req.requestId`.

## D. Validation gaps (recommend: apply the mechanical ones now)

- `POST /storage/reset`: add `ResetStorageHttpSchema` + validateBody (replaces the hand-rolled
  confirmationToken check). `/import` intentionally validates downstream — leave, note.
- 3 storage DELETE routes + `DELETE /users/me/sessions/:id`: add the validateParams their siblings have.
- `BulkMoveHttpSchema` → alias the shared `bulkMoveRequestSchema` (byte-identical today).
- **Defer to the shared-schemas batch** (need new shared schemas): `POST /auth/change-password`
  body schema; `PUT /me/profile` + `PUT /me/settings` boundary schemas (profile mixes
  updatePersonProfileSchema + currentPassword — needs a deliberate composed schema).

## E. Convention sweeps (recommend: apply)

- `req.requestId` appended to ~90 `handleControllerError` calls across 10 controllers (Storage 29,
  admin/system cluster ~40, Export/User/Person/UserSession/Search the rest) — restores error-log
  correlation the exemplar mandates.
- Route-path-restating JSDoc removed (~40 handlers: Storage 26, Audit, User/Person/UserSession);
  redundant `res.status(200)` dropped (Person/UserSession).
- PublicAuthController: extract `issueTokens(req, user)` (token triad ×4 — also hosts the hotfixed
  sessionToken response building); drop async-no-await on /health + /version; use LOGIN_PATH const
  at the login registration.
- ResearcherController: delete the 7 `logger.debug` blocks (researcher mutations already fire
  domain events audited by AuditEventHandler — presentation-layer logging is a parallel system) +
  the dead `req.body.labId` fallback in InviteCodeController.create.
- AuditController: remove blank-after-try lines; inline the lab-scope guard (single caller after B).
- eslint-disable reasons (httpValidationSchemas, rateLimitMiddleware); GLOBAL_API_LIMIT const
  (apiRateLimiter log/limit sync); LookupValueController + SearchRouteModule header fixes;
  PublicRouteModule LOGIN_PATH dedup.

---

**Scale if A + B(minus logout) + C + D + E approved:** ~35 files, another sizeable net deletion;
behavior changes: the leak fix (A1) and endpoint removals (all zero-caller-proven).
**Verification:** build:shared · tsc ×2 · lint ×3 · Jest · integration 36 · client suite + build.
