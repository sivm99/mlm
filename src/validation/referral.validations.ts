import { MyContext } from "@/types";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod/v4";
import { validationError } from "./_common";
const createReferralSchema = z.object({
  position: z.enum(["LEFT", "RIGHT"]),
});

export const createReferralValidate = zValidator(
  "json",
  createReferralSchema,
  (r, c: MyContext) => {
    if (!r.success) return validationError(r.error, c);
    c.set("side", r.data.position);
  },
);
