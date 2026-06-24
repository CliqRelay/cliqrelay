export const CliqRelayEvents = {
	PING: "cliqrelay:ping",
	CAPTURE_EVENT: "cliqrelay:capture-event",
	OPEN_SIDE_PANEL: "cliqrelay:open-side-panel",
} as const;

export type CliqRelayEvent =
	(typeof CliqRelayEvents)[keyof typeof CliqRelayEvents];
