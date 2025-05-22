import { MyContext } from "@/types";
import z from "zod";

export const validationError = (issues: z.ZodIssue[], c: MyContext) =>
  c.json(
    {
      success: false,
      message: "Validation Failed",
      errors: issues.map((i) => `${i.path} ${i.message}`),
    },
    400,
  );

export * from "./auth.validations";
export * from "./referral.validations";
export * from "./user.validation";
