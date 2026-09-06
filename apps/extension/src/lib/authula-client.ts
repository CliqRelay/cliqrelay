import { createClient } from "authula";
import { CorePlugin, CSRFPlugin } from "authula/plugins";

import { COOKIE_CONSTANTS, HEADER_CONSTANTS } from "@repo/data-commons";

import { createExtensionCookieStore } from "./extension-cookie-store";
import { env } from "@/constants/env";

export const authulaClient = createClient({
  url: env.VITE_AUTHULA_URL,
  cookies: createExtensionCookieStore,
  plugins: [
    new CSRFPlugin({
      cookieName: COOKIE_CONSTANTS.csrf.name,
      headerName: HEADER_CONSTANTS.csrfToken,
    }),
    new CorePlugin(),
  ],
});
