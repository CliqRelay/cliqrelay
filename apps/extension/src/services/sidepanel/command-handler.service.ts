import type {
	CommandHandler,
	ExtensionSettings,
	RecordingStateMachine,
	SessionService,
	SidePanelCommand,
	SidePanelStateUpdate,
	StateUpdateBuilder,
} from "@/models";
import type { GetSettings, UpdateSettings } from "../settings";

export const createCommandHandler = (
	buildStateUpdate: StateUpdateBuilder,
	recording: RecordingStateMachine,
	sessionService: SessionService,
	clearProgressMap: () => void,
	getSettings: GetSettings,
	updateSettings: UpdateSettings,
): CommandHandler => {
	const handleCommand = async (
		command: SidePanelCommand,
	): Promise<SidePanelStateUpdate | ExtensionSettings | undefined> => {
		switch (command.command) {
			case "start_recording": {
				await sessionService.setActiveGuideId(null);
				clearProgressMap();
				recording.start();
				void recording.flush();
				return buildStateUpdate();
			}
			case "pause_recording": {
				recording.pause();
				return buildStateUpdate();
			}
			case "resume_recording": {
				recording.resume();
				void recording.flush();
				return buildStateUpdate();
			}
			case "stop_recording": {
				recording.stop();
				return buildStateUpdate();
			}
			case "get_status": {
				return buildStateUpdate();
			}
			case "get_settings": {
				return await getSettings();
			}
			case "update_settings": {
				if (command.payload) {
					await updateSettings(command.payload);
				}
				return await getSettings();
			}
			case "retry_failed_uploads": {
				return buildStateUpdate();
			}
		}
	};

	return { handleCommand };
};

export type { CommandHandler } from "@/models";
