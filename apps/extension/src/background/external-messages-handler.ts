import { CliqRelayEvents } from "@repo/data-commons";

export const handleOnMessageExternalEvents = (
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
			const isChrome = "sidePanel" in browser;

			if (isChrome) {
				browser.sidePanel
					.open({ tabId: sender.tab!.id! })
					.then(() => {
						sendResponse({ success: true });
					})
					.catch((error: any) => {
						console.error("Failed to open side panel:", error);
						sendResponse({ success: false, error: error.message });
					});
			} else {
				sendResponse({ success: true, requiresToolbarClick: true });
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

	return true;
};
