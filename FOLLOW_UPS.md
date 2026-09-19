# Follow-ups: replace a step's media asset

Status of the "replace a media asset of a step" work, and what is still open. Automated checks passed at hand-off: `go test ./...` (including the Postgres integration tests), `pnpm --filter web test`, `oxlint`, and `tsc` with no errors in touched files.

## Not done in this work

### Orphaned S3 keys (known gap from the plan)

- [x] Build a cleanup job: list keys under `uploads/guides/{guideId}/steps/{stepId}/` and delete any whose path is not in `media_assets`. Done: `OrphanedUploadsService.Sweep` runs daily at 03:00 UTC from the worker cron (`worker/orphaned_uploads_cron_job.go`), scanning `uploads/guides/` page by page and skipping objects written in the last 24 h. (If the browser `PUT` to S3 succeeds but the `replace` call then fails, the new key stays in the bucket with no row pointing at it. The same happens for any presign that is never completed. No client-side compensation was added on purpose — it would race a client retry.)

### Upload progress

- [ ] Swap `putObjectWithFetch` in `apps/web/src/services/steps/step-media-replace.service.ts` for an `XMLHttpRequest` implementation to give real upload progress without touching callers (`fetch` cannot report upload progress, so the UI currently shows an indeterminate spinner and a loading toast).

### Browser extension

- [ ] Point the extension at `/uploads/replace`, or make `/uploads/complete` idempotent per step. (Out of scope by decision. The extension still uses `POST /uploads/complete`, which always inserts a new row. Capturing a step twice from the extension can still produce two `media_assets` rows and an orphaned file.)

### Component tests

- [ ] Add jsdom-based tests for `step-media.tsx`, `step-media-picker.tsx` and `step-edit-card.tsx`.
- [ ] Add tests for `image.utils.ts` (currently untested because `createImageBitmap` does not exist in Node).

(`apps/web/vitest.config.ts` runs in `environment: "node"` with no jsdom, so there are no tests for the React wiring above. The service, the layout helper and the file validation are covered.)

## Gaps in what was built

- [ ] **Bucket CORS.** Confirm once with an `OPTIONS` request against `https://<ref>.supabase.co/storage/v1/s3/<bucket>/…`. Browser uploads go straight to the presigned URL, so the storage origin must answer preflights for `CLIENT_URL` with `PUT`. With `S3_MANAGE_BUCKET_CORS=true` (dev, Rustfs) `infra.Init` applies the rule at startup and fails boot if it cannot. Production uses Supabase Storage's S3 gateway, which has no `PutBucketCors` but already returns permissive CORS headers — leave the flag unset there. The extension was never affected because extensions bypass CORS with host permissions.
- [ ] **Concurrent first uploads on an empty step.** `DeleteByStepID` row locks only protect rows that exist. Two simultaneous replaces on a step with no asset can both insert, leaving two rows. Fix options: lock the parent `steps` row (`SELECT … FOR UPDATE`) inside the transaction, or add a unique index on `media_assets(step_id)` once the data is known to be one-per-step.
- [ ] **Backend does not validate the file.** The 5 MB cap and PNG/JPEG/WebP allow-list live only in `apps/web/src/models/media.ts`. `ReplaceUploadRequest.mime_type` and `file_size` are stored as sent; the presign forces `image/webp` on the object but nothing checks the row matches. Consider enforcing `mime_type == "image/webp"` and a size ceiling server-side.
- [ ] **Storage path uniqueness across steps.** `storage_path` is globally unique. A client that sends a path already used by a different step's asset gets a Postgres unique violation, which surfaces as a 500 rather than a 4xx.
- [ ] **Silent no-op while another replace is running.** `useStepMediaReplace` early-returns when `replacingStepId` is set. Buttons on other cards stay enabled, so a click during an in-flight upload does nothing and shows nothing. Either disable all replace triggers while one runs, or show a toast.
- [ ] **Generated request type has optional fields.** `ReplaceUploadRequest` in `apps/api/types/uploads.go` copies `CompleteUploadRequest` and lacks `required:"true"` tags, so `stepId`/`storagePath` are optional in the TypeScript client. Harmless at runtime (the server validates), but the types are looser than they should be.
- [ ] **HEIC/HEIF not accepted.** iPhone photos in HEIC are rejected by the file picker allow-list. Supporting them needs a decoder; `createImageBitmap` does not handle HEIC in most browsers.
- [ ] **Other repositories still do select → write → select.** `BunMediaAssetsRepository` now uses single `INSERT/UPDATE/DELETE … RETURNING *` statements with `RowsAffected` for not-found. The guides, steps, teams and starred-guides repositories still take the multi-round-trip route and could get the same treatment. Note bun's `Exec` on a `RETURNING` query does not raise `sql.ErrNoRows` when nothing matched; it leaves the model zeroed, so check the row count.
- [ ] **Delete handler: invalid UUID still 500s.** `MediaAssetsService.Delete` only rejects an empty ID. A malformed UUID reaches Postgres and comes back as a 500 rather than the 400 the handler now maps `ErrInvalidMediaAssetID` to. Add a `uuid.Parse` check in the service like `Update` already does.

## Pre-existing issues seen but not touched

- [ ] `tsc` reports errors unrelated to this work in `calendar.tsx`, `carousel.tsx`, `command.tsx`, `input-otp.tsx`, `statistics.tsx`, the two `*-settings-general-section.tsx` files and `router.tsx`.
- [ ] Prettier flags most of `apps/web/src/components/editor/**` and other existing files (the tree mixes tabs and spaces). Only the new files from this work were formatted.
- [ ] `onRecaptureStep` is threaded through the edit-mode components but never supplied by `guide-editor.tsx`, so the "Recapture" menu item never renders. Left alone as instructed.

## Worth calling out in the PR

- [ ] `resolveMediaLayout` (`apps/web/src/utils/media.utils.ts`) changes rendering in **view mode as well as edit mode**: the container now uses the asset's own `width`/`height` and hides the click marker when that shape disagrees with the captured viewport. Existing captures with matching shapes, and rows with no dimensions, render as before.
- [ ] `useStepMediaReplace` deliberately sets no `onSuccess`/`onError` on the individual mutations, unlike `useGuideStepMutations`. Invalidating after presign would refetch mid-flow; per-mutation error handlers would double up the error toast.
- [ ] `GetByStepID` now orders by `created_at DESC, id DESC`, so `mediaAssets[0]` is always the newest row for any step that still has more than one.
- [ ] `BunMediaAssetsRepository.Create/Update/Delete` are each one statement now. Two small behaviour changes: `Update` writes only the columns present in the DTO instead of all six, and an `Update` with no fields is a plain read and no longer bumps `updated_at`.
</content>
