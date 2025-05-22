import { MyContext } from "@/types";
import { ZodError } from "zod";

export const validationError = (error: ZodError, c: MyContext) =>
  c.json(
    {
      success: false,
      message: JSON.stringify(error.flatten().fieldErrors, null, 2),
      errors: error.flatten().fieldErrors,
    },
    400,
  );

export * from "./auth.validations";
export * from "./referral.validations";
export * from "./user.validation";
