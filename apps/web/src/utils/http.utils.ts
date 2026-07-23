import { getCookie } from "@tanstack/react-start/server";

import { COOKIE_CONSTANTS, HEADER_CONSTANTS } from "@repo/data-commons";

export const getCsrfTokenHeader = (): Record<string, string> => {
  return {
    [HEADER_CONSTANTS.csrfToken as string]: getCookie(COOKIE_CONSTANTS.csrf.name) ?? ""
  }
}
