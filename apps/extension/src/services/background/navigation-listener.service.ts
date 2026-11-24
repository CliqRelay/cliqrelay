import { browser } from "wxt/browser";
import { z } from "zod";

import type { RecordingStateMachine } from "@/models";
import type { OutboxWriter } from "@/services/outbox/outbox-writer.service";
import { NAVIGATION_DEDUPE_MS, NAVIGATION_TIMEOUT_MS } from "@/utils/constants";

const urlSchema = z.url();

export type NavigationListener = ReturnType<typeof createNavigationListener>;

export const createNavigationListener = (
  recording: RecordingStateMachine,
  writer: Pick<OutboxWriter, "writeNavigation">,
) => {
  const dedupeMap = new Map<number, { url: string; time: number }>();
  const pendingActivations = new Map<
    number,
    { capturedAt: string; timeoutId: ReturnType<typeof setTimeout> }
  >();
  const tabOrigins = new Map<number, string>();

  const isRecording = () => recording.getSnapshot().status === "recording";

  const getOrigin = (url: string): string | null => {
    try {
      return new URL(url).origin;
    } catch {
      return null;
    }
  };

  const isDeduped = (tabId: number, url: string): boolean => {
    const entry = dedupeMap.get(tabId);
    if (!entry) return false;
    return Date.now() - entry.time < NAVIGATION_DEDUPE_MS && url === entry.url;
  };

  const updateDedupe = (tabId: number, url: string) => {
    dedupeMap.set(tabId, { url, time: Date.now() });
  };

  const processNavigation = async (tabId: number, url: string, capturedAt: string) => {
    if (!isRecording()) {
      return;
    }
    if (isDeduped(tabId, url)) {
      return;
    }
    updateDedupe(tabId, url);

    try {
      await writer.writeNavigation({ url, capturedAt, tabId });
    } catch (error) {
      console.warn("[navigation-listener] Failed to write navigation:", error);
    }
  };

  const clearPendingActivation = (tabId: number) => {
    const pending = pendingActivations.get(tabId);
    if (pending) {
      clearTimeout(pending.timeoutId);
      pendingActivations.delete(tabId);
    }
  };

  const clearPendingActivations = () => {
    for (const [tabId] of pendingActivations) {
      clearPendingActivation(tabId);
    }
  };

  const isActiveTab = async (tabId: number): Promise<boolean> => {
    try {
      const tab = await browser.tabs.get(tabId);
      if (!tab.windowId) return false;
      const tabs = await browser.tabs.query({
        active: true,
        windowId: tab.windowId,
      });
      return tabs.some((t) => t.id === tabId);
    } catch {
      return false;
    }
  };

  const onCompleted = (details: { url: string; tabId: number; frameId: number }) => {
    if (details.frameId !== 0) return;
    void (async () => {
      const active = await isActiveTab(details.tabId);
      if (!active) return;

      const pending = pendingActivations.get(details.tabId);
      if (pending) {
        clearTimeout(pending.timeoutId);
        pendingActivations.delete(details.tabId);
        void processNavigation(details.tabId, details.url, pending.capturedAt);
        return;
      }

      const newOrigin = getOrigin(details.url);
      const previousOrigin = tabOrigins.get(details.tabId);
      tabOrigins.set(details.tabId, newOrigin ?? "");

      if (newOrigin && previousOrigin && newOrigin === previousOrigin) {
        return;
      }

      void processNavigation(details.tabId, details.url, new Date().toISOString());
    })();
  };

  const onActivated = async (activeInfo: { tabId: number; windowId: number }) => {
    if (!isRecording()) return;
    try {
      const tab = await browser.tabs.get(activeInfo.tabId);
      if (tab.status === "complete") {
        if (!tab.url) return;
        const parsed = urlSchema.safeParse(tab.url);
        if (!parsed.success) return;
        void processNavigation(activeInfo.tabId, parsed.data, new Date().toISOString());
      } else {
        const capturedAt = new Date().toISOString();
        const timeoutId = setTimeout(async () => {
          try {
            const currentTab = await browser.tabs.get(activeInfo.tabId);
            if (currentTab.url) {
              void processNavigation(activeInfo.tabId, currentTab.url, capturedAt);
            }
          } catch {
            // Tab may have been closed
          }
          pendingActivations.delete(activeInfo.tabId);
        }, NAVIGATION_TIMEOUT_MS);
        pendingActivations.set(activeInfo.tabId, { capturedAt, timeoutId });
      }
    } catch {
      // Tab may have been closed
    }
  };

  const onErrorOccurred = (details: { tabId: number; frameId: number; error: string }) => {
    if (details.frameId !== 0) return;
    clearPendingActivation(details.tabId);
  };

  const onRemoved = (tabId: number) => {
    clearPendingActivation(tabId);
    tabOrigins.delete(tabId);
  };

  const start = () => {
    browser.webNavigation.onCompleted.addListener(onCompleted);
    browser.tabs.onActivated.addListener(onActivated);
    browser.webNavigation.onErrorOccurred.addListener(onErrorOccurred);
    browser.tabs.onRemoved.addListener(onRemoved);

    return {
      stop: () => {
        browser.webNavigation.onCompleted.removeListener(onCompleted);
        browser.tabs.onActivated.removeListener(onActivated);
        browser.webNavigation.onErrorOccurred.removeListener(onErrorOccurred);
        browser.tabs.onRemoved.removeListener(onRemoved);
        clearPendingActivations();
      },
      clearDedupe: () => {
        dedupeMap.clear();
        tabOrigins.clear();
      },
      clearPendingActivations: () => {
        clearPendingActivations();
      },
    };
  };

  return { start };
};
