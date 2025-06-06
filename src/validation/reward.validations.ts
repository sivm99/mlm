import { z } from "zod/v4";
import { otherIdField, validationError } from "./_common";
import { zValidator } from "@hono/zod-validator";
import { MyContext } from "@/types";
const redeemSaleRewardSchema = z.object({
  id: otherIdField,
});

export type RedeemSaleReward = z.infer<typeof redeemSaleRewardSchema>;

export const redeemSaleRewardValidate = zValidator(
  "json",
  redeemSaleRewardSchema,
  (r, c: MyContext) => {
    if (!r.success) return validationError(r.error, c);
  },
);
