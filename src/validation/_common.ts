import { z } from "zod";
import { MyContext } from "@/types";
import { ZodError } from "zod";

export const otpField = z.string().length(6).regex(/\d/);

export const idField = z
  .string()
  .length(9)
  .transform((i) => i.toUpperCase());
export const emailField = z
  .string()
  .email()
  .transform((e) => e.toLowerCase());

export const limitField = (n: number = 50) =>
  z
    .number()
    .lte(n, `Max limit is set to ${n}`)
    .default(30)
    .refine((r) => Math.floor(r));
export const offsetField = z
  .number()
  .gte(0)
  .default(0)
  .refine((r) => Math.floor(r)); // r could be real number

export const amountField = z.number().gt(0);
export const descriptionFiled = z.string().min(10);

export const validationError = (error: ZodError, c: MyContext) =>
  c.json(
    {
      success: false,
      message: JSON.stringify(error.flatten().fieldErrors, null, 2),
      errors: error.flatten().fieldErrors,
    },
    400,
  );
