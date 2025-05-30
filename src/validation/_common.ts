import { z } from "zod";
import { MyContext } from "@/types";
import { ZodError } from "zod";

export const otpField = z.string().length(6).regex(/\d/);

export const idField = z.union([
  z.number().int().gte(1_000_000).lt(10_000_000),
  z
    .string()
    .regex(/^\d+$/)
    .transform(Number)
    .refine((n) => n >= 1_000_000 && n < 10_000_000 && Number.isInteger(n), {
      message: "ID must be an integer between 1,000,000 and 9,999,999",
    }),
]);
export const idFieldString = z
  .union([z.number().int().transform(String), z.string().regex(/^\d+$/)])
  .refine(
    (val) => {
      const num = Number(val);
      return num >= 1_000_000 && num < 10_000_000 && Number.isInteger(num);
    },
    { message: "ID must be an integer between 1,000,000 and 9,999,999" },
  );

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

export const amountField = z.number().int().gt(0);
export const descriptionFiled = z.string().min(10);

export const validationError = (error: ZodError, c: MyContext) =>
  c.json(
    {
      success: false,
      message:
        error.issues.length > 0
          ? error.issues[0].message
          : "Validation error occurred",
      errors: error.flatten().fieldErrors,
    },
    400,
  );
