import { useEffect } from "react";

import { browser } from "wxt/browser";

import { useSidePanelStore } from "../stores/sidepanel-store";
import type { ExtensionSettings, SidePanelPushMessage, SidePanelStateUpdate } from "@/models";
import { SIDEPANEL_PORT_NAME, sidePanelCommandType } from "@/models";

const applyStateUpdate = (update: SidePanelStateUpdate) => {
  const store = useSidePanelStore.getState();
  store.setStatus(update.status);
  store.setBufferedCount(update.bufferedCount);
  if (update.isDraining !== undefined) {
    store.setIsDraining(update.isDraining);
  }
  if (update.uploadQueue) {
    store.setUploadQueue(update.uploadQueue);
  }
  if (update.jobProgress) {
    store.setJobProgress(update.jobProgress);
  }
  store.setActiveGuideId(update.activeGuideId ?? null);
  if (update.status === "stopped" && update.activeGuideId === null) {
    store.clear();
  }
  store.setIsSignedOut(update.isSignedOut ?? false);
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

const dismissJob = async (jobId: string) => {
  try {
    await browser.runtime.sendMessage({
      type: sidePanelCommandType,
      command: "dismiss_job",
      jobId,
    });
  } catch (error) {
    console.error("Failed to dismiss job:", error);
  }
};

const getSettings = async () => {
  try {
    const settings = (await browser.runtime.sendMessage({
      type: sidePanelCommandType,
      command: "get_settings",
    })) as ExtensionSettings;
    if (settings) {
      useSidePanelStore.getState().setSettings(settings);
    }
  } catch (error) {
    console.error("Failed to send command:", error);
  }
};

const updateSettings = (payload: Partial<ExtensionSettings>) =>
  sendCommand("update_settings", payload);

const handleMessage = (message: SidePanelPushMessage) => {
  const store = useSidePanelStore.getState();
  switch (message.type) {
    case "state_update":
      applyStateUpdate(message.state);
      break;
    case "upload_progress":
      store.setUploadQueue(message.queue);
      break;
    case "job_progress":
      store.updateJobProgress(message.progress.jobId, message.progress);
      break;
  }
};

export const useSidePanelBridge = () => {
  useEffect(() => {
    let port: ReturnType<typeof browser.runtime.connect> | null = null;
    let isDisposed = false;

    const connect = () => {
      if (isDisposed) {
        return;
      }

      try {
        port = browser.runtime.connect({ name: SIDEPANEL_PORT_NAME });
      } catch (error) {
        // The extension context is gone (reload/update); reconnecting cannot help.
        console.warn("[sidepanel] Failed to connect to background:", error);
        return;
      }

      port.onMessage.addListener(handleMessage);
      port.onDisconnect.addListener(() => {
        port = null;
        if (isDisposed) {
          return;
        }
        // The worker was stopped while the port was open. Reconnecting wakes it
        // and restores the state; PR 6 replaces the port with storage events.
        void getStatus();
        connect();
      });
    };

    connect();
    void getStatus();
    void getSettings();

    return () => {
      isDisposed = true;
      port?.disconnect();
      port = null;
    };
  }, []);

  return {
    startRecording,
    pauseRecording,
    resumeRecording,
    stopRecording,
    dismissJob,
    getStatus,
    getSettings,
    updateSettings,
  };
};
