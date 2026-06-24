import { browser } from "wxt/browser";

import { createSessionService } from "./session.service";

export const sessionService = createSessionService(browser.storage.local);
export type { SessionService } from "@/models";
