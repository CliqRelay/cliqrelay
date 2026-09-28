import { type APIRequestContext, request } from "@playwright/test";

const API_URL = `${process.env.E2E_API_URL ?? "http://localhost:8080"}/api/v1`;
const CSRF_COOKIE = "authula_csrf_token";
const CSRF_HEADER = "X-AUTHULA-CSRF-TOKEN";

type Visibility = "private" | "team" | "public";

export type GuideOwner = {
  api: APIRequestContext;
  teamId: string;
};

async function send(api: APIRequestContext, method: string, path: string, data?: unknown) {
  const { cookies } = await api.storageState();
  const csrfToken = cookies.find((cookie) => cookie.name === CSRF_COOKIE)?.value ?? "";

  const response = await api.fetch(`${API_URL}${path}`, {
    method,
    data,
    headers: { [CSRF_HEADER]: csrfToken },
  });
  if (!response.ok()) {
    throw new Error(`${method} ${path} failed: ${response.status()} ${await response.text()}`);
  }
  return response.json();
}

/** Signs up a fresh user with their own organization and team. */
export async function createGuideOwner(): Promise<GuideOwner> {
  const api = await request.newContext();
  const runId = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

  // Any request issues the CSRF cookie that later writes must echo back.
  await api.get(`${API_URL}/auth/me`);
  await send(api, "POST", "/auth/email-password/sign-up", {
    name: "E2E Owner",
    email: `e2e-${runId}@example.com`,
    password: "Password123!",
  });
  await send(api, "POST", "/auth/organizations", { name: `E2E Org ${runId}`, role: "admin" });

  const { teams } = await send(api, "GET", "/teams");
  return { api, teamId: teams[0].id };
}

export async function createDemoGuide(
  owner: GuideOwner,
  options: { visibility: Visibility; published: boolean },
): Promise<string> {
  const { guide_id: guideId } = await send(owner.api, "POST", "/guides/demo", {
    team_id: owner.teamId,
  });

  if (options.visibility !== "private") {
    await send(owner.api, "PATCH", `/guides/${guideId}`, { visibility: options.visibility });
  }
  if (options.published) {
    await send(owner.api, "POST", `/guides/${guideId}/publish`);
  }

  return guideId;
}
