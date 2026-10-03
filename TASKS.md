# Guide Detail Cache Follow-ups

Context: `apps/web/src/routes/dashboard/guides/$guideId.tsx` `handleUpdateGuide`
writes the update response into the `getGetGuideById` React Query cache via
updater-form `setQueryData` (no self-invalidation), preserving cached
`isStarred` and `creator`. List queries (`getAllGuides`, `getStarredGuides`)
are invalidated via the shared helpers in
`apps/web/src/utils/guides-cache.utils.ts`
(`invalidateGuideLists` / `invalidateGuideDetail` / `invalidateGuideQueries`).
Mutation responses from `apps/api/repositories/guides/bun_guides_repository.go`
(`Create`, `Update`, `updateOne`, `getLive`) are hydrated via `GetByID`, so
they include the joined `creator`; `GuidesUseCase.Update` also enriches
`IsStarred` like `Get` does. Card actions (`useGuideActions`,
`useToggleStar`, visibility changes, trash restore/delete) invalidate the
detail key alongside the lists.

## Ongoing

### Keep mutation responses hydrated

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
