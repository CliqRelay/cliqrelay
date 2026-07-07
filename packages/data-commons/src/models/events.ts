import { z } from "zod";

export const CliqRelayEvents = {
	PING: "cliqrelay:ping",
	CAPTURE_EVENT: "cliqrelay:capture-event",
	OPEN_SIDE_PANEL: "cliqrelay:open-side-panel",
} as const;

export type CliqRelayEvent =
	(typeof CliqRelayEvents)[keyof typeof CliqRelayEvents];

export const BridgeMessageTypes = {
	REQUEST: "CLIQRELAY_EXTENSION_REQUEST",
	RESPONSE: "CLIQRELAY_EXTENSION_RESPONSE",
} as const;

export const bridgeRequestSchema = z.object({
	type: z.literal(BridgeMessageTypes.REQUEST),
	messageId: z.string().min(1),
	extensionId: z.string().min(1),
	payload: z.unknown(),
});

export const bridgeResponseSchema = z.object({
	type: z.literal(BridgeMessageTypes.RESPONSE),
	messageId: z.string().min(1),
	payload: z.unknown(),
});

export type BridgeRequest = z.infer<typeof bridgeRequestSchema>;
export type BridgeResponse = z.infer<typeof bridgeResponseSchema>;
