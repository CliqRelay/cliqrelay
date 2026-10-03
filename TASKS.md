# Guide Detail Cache Follow-ups

Context: `apps/web/src/routes/dashboard/guides/$guideId.tsx` `handleUpdateGuide`
writes the update response into the `getGetGuideById` React Query cache via
`setQueryData` (no self-invalidation). Title/description persist across
navigation; list queries (`getAllGuides`, `getStarredGuides`) are invalidated.
Mutation responses from `apps/api/repositories/guides/bun_guides_repository.go`
(`Create`, `Update`, `updateOne`, `getLive`) are hydrated via `GetByID`, so
they include the joined `creator`; frontend merges with
`{ ...currentGuide, ...updatedGuide }`.

## Done
- Stale title/description after navigate-away/back (missing detail-cache sync).
- `react(set-state-in-effect)` lint error (mirrored state → derive from cache).
- `GuideMetadataCard` refetch flash (removed self-invalidation + `router.invalidate()`).
- Creator wiped from cache (backend hydration + simplified frontend merge).

## Remaining

### 1. ~~Use functional cache updater in `handleUpdateGuide`~~ (done)
- `handleUpdateGuide` now uses updater-form `setQueryData`, which also
  preserves cached `isStarred` (the update response never carries star state —
  only `GuidesUseCase.Get` enriches it).

### 2. Surface update failures instead of silent `null` (done)
- `updateGuide` in `apps/web/src/server-fns/guides.ts` rethrows instead of
  returning `null`; `handleUpdateGuide` only writes cache + invalidates on
  success, toasts on failure.
- **Verify:** failing update shows error toast and does not persist locally;
  `guides.test.ts` still passes; rejection test case added.

### 3. Confirm invalidation coverage for list variants (no change expected)
- **Note:** `getGetAllGuidesQueryKey()` / `getGetStarredGuidesQueryKey()`
  called without params rely on prefix matching to invalidate param variants.
- **Verify:** edit title, check guides list, starred list, and dashboard
  `recent-guides` reflect the change after navigation.

### 4. Ongoing: keep mutation responses hydrated
- **Note:** if a new relation is added to `Guide`, add it to the `GetByID`
  join in `bun_guides_repository.go` so mutations keep returning it; check
  `packages/api-client/src/gen/models/guide.ts`.
- **Verify:** edit title, confirm `GuideMetadataCard` keeps creator/avatar.

## Manual regression checklist
- Edit title/desc → navigate to `/dashboard/guides` → back: update persists.
- No `GuideMetadataCard` flash per keystroke; `updatedAt` updates once per save.
- Star toggle works and survives navigation.
- Publish/unpublish/archive via `GuideActionsDropdown` still refreshes detail.
- `pnpm --filter web lint` clean, `tsc --noEmit` clean.
