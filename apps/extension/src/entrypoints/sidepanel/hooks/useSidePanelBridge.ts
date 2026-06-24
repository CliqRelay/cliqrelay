import { useEffect } from "react";

import { browser } from "wxt/browser";

import type {
	ExtensionSettings,
	SidePanelPushMessage,
	SidePanelStateUpdate,
} from "@/models";
import {
	SIDEPANEL_PORT_NAME,
	sidePanelCommandType,
} from "@/models";
import { useSidePanelStore } from "../stores/sidepanel-store";

export const useSidePanelBridge = () => {
	const setStatus = useSidePanelStore((s) => s.setStatus);
	const setBufferedCount = useSidePanelStore((s) => s.setBufferedCount);
	const setIsDraining = useSidePanelStore((s) => s.setIsDraining);
	const setSettings = useSidePanelStore((s) => s.setSettings);
	const setUploadQueue = useSidePanelStore((s) => s.setUploadQueue);
	const setActiveGuideId = useSidePanelStore((s) => s.setActiveGuideId);
	const setJobProgress = useSidePanelStore((s) => s.setJobProgress);
	const updateJobProgress = useSidePanelStore((s) => s.updateJobProgress);
	const clear = useSidePanelStore((s) => s.clear);

	const applyStateUpdate = (update: SidePanelStateUpdate) => {
		setStatus(update.status);
		setBufferedCount(update.bufferedCount);
		if (update.isDraining !== undefined) {
			setIsDraining(update.isDraining);
		}
		if (update.uploadQueue) {
			setUploadQueue(update.uploadQueue);
		}
		if (update.jobProgress) {
			setJobProgress(update.jobProgress);
		}
		setActiveGuideId(update.activeGuideId ?? null);
		if (update.status === "stopped" && update.activeGuideId === null) {
			clear();
		}
	};

	const sendCommand = async (
		command: string,
		payload?: Partial<ExtensionSettings>,
	): Promise<void> => {
		try {
			await browser.runtime.sendMessage({
				type: sidePanelCommandType,
				command,
				...(payload ? { payload } : {}),
			});
		} catch (error) {
			console.error("Failed to send command:", error);
		}
	};

	const startRecording = () => sendCommand("start_recording");
	const pauseRecording = () => sendCommand("pause_recording");
	const resumeRecording = () => sendCommand("resume_recording");
	const stopRecording = () => sendCommand("stop_recording");
	const getStatus = () => sendCommand("get_status");

	const getSettings = async () => {
		try {
			const settings = (await browser.runtime.sendMessage({
				type: sidePanelCommandType,
				command: "get_settings",
			})) as ExtensionSettings;
			if (settings) {
				setSettings(settings);
			}
		} catch (error) {
			console.error("Failed to send command:", error);
		}
	};

	const updateSettings = (payload: Partial<ExtensionSettings>) =>
		sendCommand("update_settings", payload);

	useEffect(() => {
		void getStatus();
		void getSettings();

		const port = browser.runtime.connect({ name: SIDEPANEL_PORT_NAME });

		const handleMessage = (message: SidePanelPushMessage) => {
			switch (message.type) {
				case "state_update":
					applyStateUpdate(message.state);
					break;
				case "upload_progress":
					setUploadQueue(message.queue);
					break;
				case "job_progress":
					updateJobProgress(message.progress.jobId, message.progress);
					break;
			}
		};

		port.onMessage.addListener(handleMessage);

		return () => {
			port.disconnect();
		};
	}, []);

	return {
		startRecording,
		pauseRecording,
		resumeRecording,
		stopRecording,
		getStatus,
		getSettings,
		updateSettings,
	};
};
