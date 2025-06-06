import { z } from "zod/v4";
import { MyContext } from "@/types";
import { $ZodError } from "zod/v4/core";

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

export const otherIdField = z
  .union([z.number().int().gt(0), z.string().regex(/^\d+$/).transform(Number)])
  .transform(Number);

export const idFieldString = z
  .union([z.number().int().transform(String), z.string().regex(/^\d+$/)])
  .refine(
    (val) => {
      const num = Number(val);
      return num >= 1_000_000 && num < 10_000_000 && Number.isInteger(num);
    },
    { message: "ID must be an integer between 1,000,000 and 9,999,999" },
  );

export const emailField = z.email().transform((e) => e.toLowerCase());

export const limitField = (n: number = 50) =>
  z
    .union([
      z.number().lte(n, `Max limit is set to ${n}`),
      z.string().regex(/^\d+$/).transform(Number),
    ])
    .transform(Number)
    .default(30)
    .transform((r) => Math.floor(r));

export const offsetField = z
  .union([z.number().gte(0), z.string().regex(/^\d+$/).transform(Number)])
  .transform(Number)
  .default(0)
  .transform((r: number) => Math.floor(r)); // r could be real number

export const amountField = z.number().gt(0);
export const descriptionFiled = z.string().min(10);

export const validationError = (error: $ZodError, c: MyContext) =>
  c.json(
    {
      success: false,
      message:
        error.issues.length > 0
          ? error.issues[0].message
          : "Validation error occurred",
      errors: z.prettifyError(error),
    },
    400,
  );

export const pageField = z.coerce.number().int().positive().default(1);

export const baseListing = z.object({
  limit: limitField(50).optional(),
  offset: offsetField.optional(),
  page: pageField,
  sortDirection: z.enum(["asc", "desc"]).optional(),
});
