import { CliqRelayEvents } from "@repo/data-commons";

export const handleOnMessageExternalEvents = async (
	message: any,
	sender: Browser.runtime.MessageSender,
	sendResponse: (response?: any) => void,
) => {
	switch (message.action) {
		case CliqRelayEvents.PING: {
			sendResponse({ success: true });
			break;
		}
		case CliqRelayEvents.OPEN_SIDE_PANEL: {
			if (sender.tab?.id) {
				try {
					await browser.sidePanel.open({ tabId: sender.tab.id });
					sendResponse({ success: true });
				} catch (error: any) {
					console.error("Failed to open side panel:", error);
					sendResponse({ success: false, error: error.message });
				}
			}
			break;
		}
		default: {
			console.error(
				"Encountered unknown onMessageExternal event:",
				message.action,
			);
			break;
		}
	}
};
