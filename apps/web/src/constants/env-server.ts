import { createEnv } from "@t3-oss/env-core";
import { z } from "zod";

export const validatedEnv = createEnv({
	server: {
		AUTHULA_URL: z.string().nonempty(),
		API_URL: z.string().nonempty(),
	},
	runtimeEnv: process.env,
	emptyStringAsUndefined: true,
});

export const envServer = {
	authulaUrl: validatedEnv.AUTHULA_URL,
	apiUrl: validatedEnv.API_URL,
} as const;
