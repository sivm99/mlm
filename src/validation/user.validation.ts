import z from "zod";
import { emailField, idField, validationError } from ".";
import { zValidator } from "@hono/zod-validator";
import { MyContext } from "@/types";

const updateUserSchema = z.object({
  name: z.string().optional(),
  email: emailField,
});

export type UpdateUser = z.infer<typeof updateUserSchema>;

export const forgetPasswordValidate = zValidator(
  "json",
  updateUserSchema,
  (r, c: MyContext) => {
    if (!r.success) return validationError(r.error.issues, c);
    c.set("updatedUser", {
      ...r.data,
    });
  },
);
const bulkAdd = z.object({
  user: z.object({
    name: z.string().optional(),
    sponsor: idField,
    position: z.enum(["LEFT", "RIGHT"]),
    country: z.string().optional().default(""),
    dialCode: z.string().optional().default(""),
    mobile: z.string().optional().default(""),
    email: emailField,
    password: z.string().min(6).default(""),
  }),
  count: z.number().gt(1),
});
export type BulkAdd = z.infer<typeof bulkAdd>;
export const bulkAddValidate = zValidator(
  "json",
  bulkAdd,
  (r, c: MyContext) => {
    if (!r.success) return validationError(r.error.issues, c);
    c.set("bulkAdd", {
      ...r.data,
    });
  },
);
