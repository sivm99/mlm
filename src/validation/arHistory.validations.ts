import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import { idField, limitField, pageField, validationError } from "./_common";
import { arEnumValues } from "@/db/schema";
import { MyContext } from "@/types";

const arHistoryListingSchema = z.object({
  page: pageField.optional(),
  limit: limitField(30).optional(),
  fromUserId: idField.optional(),
  toUserId: idField.optional(),
  activityType: z.enum(arEnumValues).optional(),
});

export type ListArHistory = z.infer<typeof arHistoryListingSchema>;
export const listArHistoryValidate = zValidator(
  "query",
  arHistoryListingSchema,
  (r, c: MyContext) => {
    if (!r.success) return validationError(r.error, c);
    c.set("listArHistory", r.data);
  },
);
