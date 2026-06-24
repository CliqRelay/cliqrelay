import { defineConfig } from "orval";

import { openApiTransformer } from "./orval-utils";

export default defineConfig({
  // Tanstack Query client generation
  cliqrelay: {
    input: {
      target: "./openapi.json",
      override: {
        transformer: openApiTransformer,
      }
    },
    output: {
      mode: "tags-split",
      namingConvention: "kebab-case",
      baseUrl: {
        runtime: 'import.meta.env.VITE_API_URL',
      },
      target: './src/gen/endpoints',
      schemas: './src/gen/models',
      client: "react-query",
      clean: true,
      headers: false,
      mock: true,
      urlEncodeParameters: false,
      formatter: 'biome',
      tsconfig: './tsconfig.json',
      override: {
        enumGenerationType: "const",
        namingConvention: {
          enum: 'camelCase'
        },
        useTypeOverInterfaces: true,
        mutator: {
          path: './src/mutators/custom-fetch.ts',
          name: 'customFetch',
        },
        fetch: {
          includeHttpResponseReturnType: false,
        }
      },
    },
    hooks: {
      afterAllFilesWrite: "pnpm run format",
    },
  },
  // Zod schema generation
  cliqrelayZod: {
    input: {
      target: './openapi.json',
      override: {
        transformer: openApiTransformer,
      }
    },
    output: {
      mode: 'tags-split',
      namingConvention: "kebab-case",
      target: './src/gen/endpoints',
      client: 'zod',
      fileExtension: '.zod.ts',
      allParamsOptional: false,
      packageJson: "./package.json",
      override: {
        enumGenerationType: "union",
        zod: {
          generateReusableSchemas: true,
        },
        namingConvention: {
          enum: 'camelCase',
        },
        useTypeOverInterfaces: true,
      },
    },
    hooks: {
      afterAllFilesWrite: "pnpm run format",
    },
  },
});
