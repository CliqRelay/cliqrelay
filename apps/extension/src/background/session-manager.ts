import { api } from "@repo/api-client";

import { withCsrf } from "@/lib/csrf";
import type { CaptureBridgeMessage, CaptureMetadataEntry, OffscreenEvent, RecordingStateMachine, SessionService, SidePanelCommand, StepJobProgress } from "@/models";
import type { PortManager } from "@/services/sidepanel/port-manager.service";
import { createCommandHandler, createStateUpdateBuilder } from "@/services/sidepanel";
import { createOffscreenManager } from "@/services/background/offscreen-manager.service";
import type { GetSettings, UpdateSettings } from "@/services/settings";
import { buildActionText } from "@/utils/action-text";
import { generateCaptureId } from "@/utils/id";

export const createSessionManager = (
	recording: RecordingStateMachine,
	sessionService: SessionService,
	getSettings: GetSettings,
	updateSettings: UpdateSettings,
) => {
	const jobProgressMap = new Map<string, StepJobProgress>();
	const captureMetadataMap = new Map<string, CaptureMetadataEntry>();
	let isDraining = false;
	let currentPortManager: PortManager | null = null;
	let clearDedup: (() => void) | undefined;
	let clearPendingActivations: (() => void) | undefined;

	const setClearDedup = (fn: () => void) => {
		clearDedup = fn;
	};

	const setClearPendingActivations = (fn: () => void) => {
		clearPendingActivations = fn;
	};

	const getOrCreateGuideId =
		async (): Promise<{ guideId: string; isNew: boolean }> => {
			const activeGuideId = await sessionService.getActiveGuideId();
			if (activeGuideId) {
				return { guideId: activeGuideId, isNew: false };
			}
			const guideResponse = await api.guides.createGuide(
				{ title: "Untitled Guide" },
				await withCsrf(),
			);
			await sessionService.setActiveGuideId(guideResponse.guide.id);
			return { guideId: guideResponse.guide.id, isNew: true };
		};

	const setPortManager = (pm: PortManager) => {
		currentPortManager = pm;
	};

	const updateJobProgress = (jobId: string, updates: Partial<StepJobProgress>) => {
		const existing = jobProgressMap.get(jobId);
		if (existing) {
			Object.assign(existing, updates);
		}
	};

	const getUploadQueueSnapshot = () => {
		const entries = Array.from(jobProgressMap.values());
		let pending = 0;
		let inProgress = 0;
		let completed = 0;
		let failed = 0;

		for (const entry of entries) {
			switch (entry.phase) {
				case "persisting":
				case "upload_init":
					pending++;
					break;
				case "uploading":
				case "completing":
					inProgress++;
					break;
				case "completed":
					completed++;
					break;
				case "failed":
					failed++;
					break;
			}
		}

		return { pending, inProgress, completed, failed, total: entries.length };
	};

	const clearProgressMap = () => {
		jobProgressMap.clear();
		captureMetadataMap.clear();
	};

	const stateUpdateBuilder = createStateUpdateBuilder(
		() => recording.getSnapshot(),
		getUploadQueueSnapshot,
		() => sessionService.getActiveGuideId(),
		() => Array.from(jobProgressMap.values()),
		() => isDraining,
	);

	const broadcastUpdate = async () => {
		if (!currentPortManager) return;
		const stateUpdate = await stateUpdateBuilder();
		currentPortManager.broadcast({ type: "state_update", state: stateUpdate });
	};

	const handleOffscreenEvent = async (event: OffscreenEvent) => {
		switch (event.type) {
			case "upload_progress": {
				updateJobProgress(event.jobId, { phase: event.phase });
				break;
			}
			case "job_completed": {
				const meta = captureMetadataMap.get(event.jobId);
				jobProgressMap.set(event.jobId, {
					jobId: event.jobId,
					stepId: event.stepId,
					guideId: event.guideId,
					action: meta?.action ?? "",
					actionText: event.actionText,
					url: meta?.url ?? "",
					capturedAt: meta?.capturedAt ?? new Date().toISOString(),
					phase: "completed",
					screenshotUrl: event.screenshotUrl,
					thumbnail: event.thumbnail,
					...(meta?.targetElement ? { targetElement: meta.targetElement } : {}),
				});
				captureMetadataMap.delete(event.jobId);
				await sessionService.setActiveGuideId(event.guideId);

				if (event.navStepId && event.navUrl) {
					const navJobId = `nav-${event.navStepId}`;
					if (!jobProgressMap.has(navJobId)) {
						const navCapturedAt = event.navCapturedAt ?? new Date().toISOString();
						const navTime = new Date(navCapturedAt).getTime() - 1;
						jobProgressMap.set(navJobId, {
							jobId: navJobId,
							stepId: event.navStepId,
							guideId: event.guideId,
							action: "navigation",
							actionText: `Navigate to "${event.navUrl}"`,
							url: event.navUrl,
							capturedAt: new Date(navTime).toISOString(),
							phase: "completed",
							screenshotUrl: event.navScreenshotUrl,
							thumbnail: event.navThumbnail,
						});
					}
				}
				break;
			}
			case "job_failed": {
				const existing = jobProgressMap.get(event.jobId);
				if (existing) {
					existing.phase = "failed";
					existing.error = event.error;
					existing.attempts = event.attempt;
				} else {
					const meta = captureMetadataMap.get(event.jobId);
					jobProgressMap.set(event.jobId, {
						jobId: event.jobId,
						stepId: "",
						guideId: "",
						action: meta?.action ?? "",
						actionText: meta?.actionText,
						url: meta?.url ?? "",
						capturedAt: meta?.capturedAt ?? new Date().toISOString(),
						phase: "failed",
						error: event.error,
						attempts: event.attempt,
						...(meta?.targetElement ? { targetElement: meta.targetElement } : {}),
					});
					captureMetadataMap.delete(event.jobId);
				}
				break;
			}
			case "session_state":
				break;
			case "drain_complete": {
				isDraining = false;
				clearProgressMap();
				await sessionService.setActiveGuideId(null);
				await offscreenManager.closeDocument();
				break;
			}
		}

		await broadcastUpdate();
	};

	const offscreenManager = createOffscreenManager(
		handleOffscreenEvent,
		getOrCreateGuideId,
	);

	const commandHandler = createCommandHandler(
		stateUpdateBuilder,
		recording,
		sessionService,
		clearProgressMap,
		getSettings,
		updateSettings,
	);

	const handleFreeTypingCapture = async (
		captureId: string,
		message: CaptureBridgeMessage,
	) => {
		const payload = message.payload;
		const { guideId } = await getOrCreateGuideId();
		const actionText = buildActionText("input", undefined, payload.typedText);

		const stepResponse = await api.steps.createStep(
			{
				guideId,
				type: "interaction" as const,
				action: "input" as const,
				url: payload.url,
				actionText,
			},
			await withCsrf(),
		);

		jobProgressMap.set(captureId, {
			jobId: captureId,
			stepId: stepResponse.step.id,
			guideId,
			action: "input",
			actionText,
			url: payload.url ?? "",
			capturedAt: payload.capturedAt,
			phase: "completed",
		});
	};

	const handleSidePanelCommand = async (message: SidePanelCommand) => {
		if (message.command === "start_recording") {
			isDraining = false;
			jobProgressMap.clear();
			captureMetadataMap.clear();
			clearDedup?.();
			clearPendingActivations?.();
			void offscreenManager.closeDocument().then(() => offscreenManager.startSession(generateCaptureId()));
		}
		if (message.command === "stop_recording") {
			isDraining = true;
			void offscreenManager.stopSession();
		}
		if (message.command === "get_status") {
			const snapshot = recording.getSnapshot();
			if (snapshot.status !== "recording" && !isDraining) {
				await sessionService.setActiveGuideId(null);
			}
		}
		const result = await commandHandler.handleCommand(message);
		const mutationCommands = [
			"start_recording",
			"pause_recording",
			"resume_recording",
			"stop_recording",
		] as const;
		if (mutationCommands.includes(message.command as typeof mutationCommands[number])) {
			await broadcastUpdate();
		}
		return result;
	};

	return {
		offscreenManager,
		stateUpdateBuilder,
		captureMetadataMap,
		setPortManager,
		setClearDedup,
		setClearPendingActivations,
		handleSidePanelCommand,
		handleOffscreenEvent,
		handleFreeTypingCapture,
	};
};

export type SessionManager = ReturnType<typeof createSessionManager>;
