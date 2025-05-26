import z from "zod";
import { zValidator } from "@hono/zod-validator";
import { MyContext } from "@/types";
import { emailField, idField, validationError } from "./_common";

const updateUserByAdminSchema = z.object({
  id: idField.optional(),
  name: z.string().optional(),
  email: emailField.optional(),
  mobile: z.string().optional(),
  image: z.string().optional(),
  country: z.string().optional(),
  sponsor: idField.optional(),
  isBlocked: z.boolean().optional(),
  position: z.enum(["LEFT", "RIGHT"]).optional(),
  leftUser: idField.optional(),
  rightUser: idField.optional(),
});
export type UpdateUserByAdmin = z.infer<typeof updateUserByAdminSchema>;

export const updateUserByAdminValidate = zValidator(
  "json",
  updateUserByAdminSchema,
  (r, c: MyContext) => {
    const id = c.req.query("id");
    if (!id) c.set("id", c.get("user").id);
    if (!r.success) return validationError(r.error, c);
    c.set("updatedUser", {
      ...r.data,
    });
  },
);
const updateUserSchema = updateUserByAdminSchema.pick({
  name: true,
  email: true,
  mobile: true,
  image: true,
  country: true,
});

export type UpdateUser = z.infer<typeof updateUserSchema>;

export const updateUserValidate = zValidator(
  "json",
  updateUserSchema,
  (r, c: MyContext) => {
    if (!r.success) return validationError(r.error, c);
    const user = c.get("user");
    if (user.isActive)
      return c.json({
        success: false,
        message: "You can't update your profile after activation",
      });
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
    if (!r.success) return validationError(r.error, c);
    c.set("bulkAdd", {
      ...r.data,
    });
  },
);

const treeListSidesSchema = z.object({
  side: z.enum(["LEFT", "RIGHT", "FULL"]).default("FULL"),
});

export const getTreeListValidate = zValidator(
  "query",
  treeListSidesSchema,
  (r, c: MyContext) => {
    if (!r.success) return validationError(r.error, c);
    c.set("side", r.data.side);
  },
);
