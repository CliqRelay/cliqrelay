import * as health from "./gen/endpoints/health/health";
import * as guides from "./gen/endpoints/guides/guides";
import * as steps from "./gen/endpoints/steps/steps";
import * as uploads from "./gen/endpoints/uploads/uploads";
export * from "./gen/models";
export * from "./gen/endpoints/health/health.faker";
export * from "./gen/endpoints/guides/guides.faker";
export * from "./gen/endpoints/steps/steps.faker";
export * from "./gen/endpoints/uploads/uploads.faker";
export { ApiError } from "./mutators/custom-fetch";

export const api = {
	health,
	guides,
	steps,
	uploads,
};
