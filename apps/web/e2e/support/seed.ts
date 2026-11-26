import { type APIRequestContext, request } from "@playwright/test";

const API_URL = `${process.env.E2E_API_URL ?? "http://localhost:8080"}/api/v1`;
const CSRF_COOKIE = "authula_csrf_token";
const CSRF_HEADER = "X-AUTHULA-CSRF-TOKEN";

type Visibility = "private" | "team" | "public";

export type GuideOwner = {
  api: APIRequestContext;
  teamId: string;
};

export type GuideRecord = {
  id: string;
  title: string;
  description: string | null;
  metadata: Record<string, unknown> | null;
  status: "draft" | "published" | "archived" | "deleted";
  visibility: Visibility;
};

export type StepRecord = {
  id: string;
  type: "interaction" | "canvas";
};

export type AuthCookie = Awaited<ReturnType<APIRequestContext["storageState"]>>["cookies"][number];

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

const ensureOrganization = async (api: APIRequestContext) => {
  const runId = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  await send(api, "POST", "/auth/organizations", { name: `E2E Org ${runId}`, role: "admin" });
  const { teams } = await send(api, "GET", "/teams");
  return teams[0].id as string;
};

const signInExistingOwner = async (
  api: APIRequestContext,
  email: string,
  password: string,
): Promise<GuideOwner | null> => {
  try {
    await send(api, "POST", "/auth/email-password/sign-in", { email, password });
  } catch {
    return null;
  }

  const { teams } = await send(api, "GET", "/teams");
  return { api, teamId: teams[0]?.id ?? (await ensureOrganization(api)) };
};

/** Signs up a fresh user, or signs in with E2E_EMAIL/E2E_PASSWORD when provided. */
export async function createGuideOwner(): Promise<GuideOwner> {
  const api = await request.newContext();
  const runId = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

  // Any request issues the CSRF cookie that later writes must echo back.
  await api.get(`${API_URL}/auth/me`);

  if (process.env.E2E_EMAIL && process.env.E2E_PASSWORD) {
    const existing = await signInExistingOwner(
      api,
      process.env.E2E_EMAIL,
      process.env.E2E_PASSWORD,
    );
    if (existing) {
      return existing;
    }
  }

  await send(api, "POST", "/auth/email-password/sign-up", {
    name: "E2E Owner",
    email: `e2e-${runId}@example.com`,
    password: "Password123!",
  });
  return { api, teamId: await ensureOrganization(api) };
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

export type SeedStep = {
  type: "interaction" | "canvas";
  action?: string;
  action_text?: string;
  notes?: string;
  canvas_content?: {
    type: "header" | "tip" | "callout" | "alert" | "code";
    heading_text?: string;
    body_text?: string;
    language?: string;
    code?: string;
    caption?: string;
  };
};

export async function createGuideWithSteps(
  owner: GuideOwner,
  input: {
    title: string;
    description: string;
    metadata: Record<string, unknown>;
    steps: SeedStep[];
  },
): Promise<string> {
  const { guide } = await send(owner.api, "POST", "/guides", {
    team_id: owner.teamId,
    title: input.title,
    description: input.description,
    metadata: input.metadata,
  });

  for (const step of input.steps) {
    await send(owner.api, "POST", "/steps", {
      guide_id: guide.id,
      ...step,
    });
  }

  return guide.id;
}

export async function getGuide(owner: GuideOwner, guideId: string): Promise<GuideRecord> {
  const { guide } = await send(owner.api, "GET", `/guides/${guideId}`);
  return guide;
}

export async function getGuideSteps(owner: GuideOwner, guideId: string): Promise<StepRecord[]> {
  const { steps } = await send(owner.api, "GET", `/steps?guide_id=${guideId}&limit=1000`);
  return steps;
}

export async function getAuthCookies(owner: GuideOwner): Promise<AuthCookie[]> {
  return (await owner.api.storageState()).cookies;
}
