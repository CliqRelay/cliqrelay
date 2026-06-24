import * as z from "zod";
import { createErrorMap, fromError } from "zod-validation-error";

z.config({
  customError: createErrorMap({})
});

export type ValidationResult<T> =
  | { success: true; value: T }
  | { success: false; error: string };

export const getValidationResult = <T>(
  input: unknown,
  schema: z.ZodType<T>
): ValidationResult<T> => {
  const result = schema.safeParse(input);

  if (result.success) {
    return { success: true, value: result.data };
  }

  return {
    success: false,
    error: fromError(result.error).toString()
  };
};

export const getKeyFromType = <T>(name: keyof T) => {
  return name;
};

export function getErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }

  return String(error);
}
