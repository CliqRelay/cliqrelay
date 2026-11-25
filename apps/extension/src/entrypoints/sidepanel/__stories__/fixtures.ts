import type {
  ExtensionSettings,
  LocalSession,
  LocalStep,
  LocalSyncSessionSummary,
  OutboxCounts,
  StepJobProgress,
} from "@/models";

const screenshotSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="320" height="200" viewBox="0 0 320 200"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#e0e7ff"/><stop offset="1" stop-color="#fbcfe8"/></linearGradient></defs><rect width="320" height="200" fill="url(#g)"/><rect x="24" y="24" width="140" height="12" rx="6" fill="#94a3b8"/><rect x="24" y="48" width="220" height="8" rx="4" fill="#cbd5e1"/><rect x="24" y="70" width="180" height="8" rx="4" fill="#cbd5e1"/><rect x="24" y="110" width="96" height="28" rx="8" fill="#6366f1"/></svg>`;

const thumbnailSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="80" height="50" viewBox="0 0 80 50"><rect width="80" height="50" fill="#e2e8f0"/><rect x="6" y="6" width="35" height="4" rx="2" fill="#94a3b8"/><rect x="6" y="16" width="55" height="3" rx="1.5" fill="#cbd5e1"/><rect x="6" y="30" width="24" height="8" rx="3" fill="#6366f1"/></svg>`;

const toDataUrl = (svg: string) => `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;

export const screenshotDataUrl = toDataUrl(screenshotSvg);
export const thumbnailDataUrl = toDataUrl(thumbnailSvg);

const sessionId = "6c1f7f4e-5c14-4d81-9be2-58f2f3a1f0aa";

export const pendingCounts: OutboxCounts = {
  pending: 3,
  uploading: 1,
  synced: 12,
  failed: 0,
  deleted: 0,
};

export const failedCounts: OutboxCounts = {
  pending: 0,
  uploading: 0,
  synced: 10,
  failed: 2,
  deleted: 0,
};

export const syncedCounts: OutboxCounts = {
  pending: 0,
  uploading: 0,
  synced: 6,
  failed: 0,
  deleted: 0,
};

export const emptyCounts: OutboxCounts = {
  pending: 0,
  uploading: 0,
  synced: 0,
  failed: 0,
  deleted: 0,
};

export const pendingStep: StepJobProgress = {
  jobId: "step-pending",
  action: "click",
  actionText: 'Click "Save changes"',
  url: "https://app.example.com/settings",
  capturedAt: "2026-11-24T09:12:03.000Z",
  phase: "persisting",
  screenshotUrl: screenshotDataUrl,
  thumbnail: thumbnailDataUrl,
  targetElement: { clickX: 150, clickY: 120, viewportWidth: 320, viewportHeight: 200 },
};

export const uploadingStep: StepJobProgress = {
  jobId: "step-uploading",
  action: "input",
  actionText: 'Type "hello@example.com"',
  url: "https://app.example.com/signup",
  capturedAt: "2026-11-24T09:12:08.000Z",
  phase: "uploading",
  screenshotUrl: screenshotDataUrl,
  thumbnail: thumbnailDataUrl,
};

export const failedStep: StepJobProgress = {
  jobId: "step-failed",
  action: "navigation",
  url: "https://app.example.com/dashboard",
  capturedAt: "2026-11-24T09:12:14.000Z",
  phase: "failed",
  attempts: 3,
  error: "Presigned upload expired",
  screenshotUrl: screenshotDataUrl,
  thumbnail: thumbnailDataUrl,
};

export const syncedStep: StepJobProgress = {
  jobId: "step-synced",
  guideId: "guide-1",
  action: "click",
  actionText: 'Click "Create guide"',
  url: "https://app.example.com/guides/new",
  capturedAt: "2026-11-24T09:12:20.000Z",
  phase: "completed",
  screenshotUrl: screenshotDataUrl,
  thumbnail: thumbnailDataUrl,
};

const baseSession: LocalSession = {
  id: sessionId,
  userId: "user-1",
  guideId: "guide-1",
  clientGuideId: "8f0a6f0e-7d1b-4f4d-9b9e-2b0f0e4f5c11",
  startedAt: "2026-11-24T09:10:00.000Z",
  lastActivityAt: "2026-11-24T09:12:20.000Z",
  nextStepIndex: 16,
};

const baseStep: LocalStep = {
  id: "step-failed",
  sessionId,
  guideId: "guide-1",
  stepIndex: 12,
  kind: "interaction",
  action: "click",
  actionText: 'Click "Publish"',
  url: "https://app.example.com/guides/1/publish",
  capturedAt: "2026-11-24T09:12:14.000Z",
  syncStatus: "failed",
  retryCount: 3,
  lastError: "Presigned upload expired",
  lastAttemptAt: "2026-11-24T09:12:15.000Z",
  createdAt: "2026-11-24T09:12:14.000Z",
  updatedAt: "2026-11-24T09:12:15.000Z",
};

export const failedSessionSummary: LocalSyncSessionSummary = {
  session: baseSession,
  counts: failedCounts,
  failedSteps: [
    baseStep,
    { ...baseStep, id: "step-failed-2", stepIndex: 13, lastError: undefined },
  ],
};

export const syncedSessionSummary: LocalSyncSessionSummary = {
  session: baseSession,
  counts: pendingCounts,
  failedSteps: [],
};

export const otherAccountSession: LocalSession = {
  id: "other-session",
  userId: "user-2",
  guideId: null,
  clientGuideId: "0a4c2e42-1f6e-4c4e-8d0b-9e4a2f6c1d33",
  startedAt: "2026-11-23T16:40:00.000Z",
  lastActivityAt: "2026-11-23T16:42:00.000Z",
  nextStepIndex: 4,
};

export const settings: ExtensionSettings = {
  capturePreferences: {
    captureClicks: true,
    captureInput: true,
  },
};
