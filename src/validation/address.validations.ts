import { z } from "zod";
import { idField, limitField, otherIdField, validationError } from "./_common";
import { zValidator } from "@hono/zod-validator";
import { MyContext } from "@/types";

const addressBaseSchema = z.object({
  title: z.string().min(3).max(100),
  mobile: z.string().min(9).max(15),
  address1: z.string().min(5).max(200),
  address2: z.string().optional(),
  address3: z.string().optional(),
  city: z.string().min(2).max(100),
  state: z.string().min(2).max(100),
  zip: z.string().min(4).max(10),
  country: z.string().min(2).max(100),
});

const createAddressSchema = addressBaseSchema.extend({
  userId: idField.optional(),
  addedBy: idField.optional(),
});

export type CreateAddress = z.infer<typeof createAddressSchema>;

export const createAddressValidate = zValidator(
  "json",
  createAddressSchema,
  (r, c: MyContext) => {
    if (!r.success) return validationError(r.error, c);
    const { id: selfId } = c.get("user");
    const validatedData = r.data;
    if (!validatedData.userId)
      c.set("createAddress", {
        ...validatedData,
        userId: selfId,
        addedBy: selfId,
      });
    else c.set("createAddress", { ...validatedData, addedBy: selfId });
  },
);

const updateAddressSchema = addressBaseSchema.partial();

export type UpdateAddress = z.infer<typeof updateAddressSchema>;

export const updateAddressValidate = zValidator(
  "json",
  updateAddressSchema,

  (r, c: MyContext) => {
    if (!r.success) return validationError(r.error, c);
    c.set("updateAddress", r.data);
  },
);

const listAddressesSchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: limitField(50).default(10),
  title: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  country: z.string().optional(),
  includeDeleted: z.coerce.boolean().default(false),
});

export type ListAddresses = z.infer<typeof listAddressesSchema>;

export const listAddressesValidate = zValidator(
  "query",
  listAddressesSchema,
  (r, c: MyContext) => {
    if (!r.success) return validationError(r.error, c);
    c.set("listAddresses", r.data);
  },
);

export const otherIdFromParamsValidate = zValidator(
  "param",
  z.object({
    id: otherIdField,
  }),
  (r, c: MyContext) => {
    if (!r.success) return validationError(r.error, c);
    c.set("id", r.data.id);
  },
);

export const userIdFromQueryValidate = zValidator(
  "query",
  z.object({
    id: idField.optional(),
  }),
  (r, c: MyContext) => {
    if (!r.success) return validationError(r.error, c);
    c.set("id", r.data.id || c.get("user").id);
  },
);
