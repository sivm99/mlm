import { z } from "zod/v4";
import { baseListing, idField, otherIdField, validationError } from "./_common";
import { zValidator } from "@hono/zod-validator";

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
  (r, c) => {
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

  (r, c) => {
    if (!r.success) return validationError(r.error, c);
    c.set("updateAddress", r.data);
  },
);

const listAddressesSchema = baseListing.extend({
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
  (r, c) => {
    if (!r.success) return validationError(r.error, c);
    c.set("listAddresses", r.data);
  },
);

export const otherIdFromParamsValidate = zValidator(
  "param",
  z.object({
    id: otherIdField,
  }),
  (r, c) => {
    if (!r.success) return validationError(r.error, c);
    c.set("id", r.data.id);
  },
);

export const userIdFromQueryValidate = zValidator(
  "param",
  z.object({
    userId: idField.optional(),
  }),
  (r, c) => {
    if (!r.success) return validationError(r.error, c);
    c.set("id", r.data.userId || c.get("user").id);
  },
);
