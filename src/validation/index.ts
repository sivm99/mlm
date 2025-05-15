import { MyContext } from "@/types";
import z from "zod";

export const idField = z
  .string()
  .length(10)
  .transform((i) => i.toUpperCase());
export const emailField = z
  .string()
  .email()
  .transform((e) => e.toLowerCase());

export const validationError = (issues: z.ZodIssue[], c: MyContext) =>
  c.json(
    {
      success: false,
      message: "Validation Failed",
      errors: issues.map((i) => `${i.path} ${i.message}`),
    },
    400,
  );
