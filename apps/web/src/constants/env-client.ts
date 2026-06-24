import { createEnv } from "@t3-oss/env-core";
import { z } from "zod";

const validatedEnv = createEnv({
	clientPrefix: "VITE_",
	client: {
		VITE_EXTENSION_ID: z.string().nonempty(),
		VITE_AUTHULA_URL: z.string().nonempty(),
		VITE_BASE_URL: z.string().nonempty(),
		VITE_APP_NAME: z.string().nonempty(),
	},
	runtimeEnv: import.meta.env,
	skipValidation: import.meta.env.PROD,
	emptyStringAsUndefined: true,
});

export const envClient = {
	mode: import.meta.env.MODE,
	extensionId: validatedEnv.VITE_EXTENSION_ID,
	authulaUrl: validatedEnv.VITE_AUTHULA_URL,
	baseUrl: validatedEnv.VITE_BASE_URL,
	appName: validatedEnv.VITE_APP_NAME,
} as const;
