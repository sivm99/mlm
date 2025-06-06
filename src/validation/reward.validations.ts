import { z } from "zod/v4";
import { otherIdField, validationError } from "./_common";
import { zValidator } from "@hono/zod-validator";
import { MyContext } from "@/types";
import { salesRewardService } from "@/lib/services";

const redeemSaleRewardSchema = z.discriminatedUnion("claim", [
  z.object({
    rewardId: otherIdField,
    claim: z.literal("payout"),
  }),
  z
    .object({
      rewardId: otherIdField,
      claim: z.literal("product"),
      deliveryMethod: z.enum(["self_collect", "shipping"]),
      address: otherIdField.optional(),
    })
    .check((ctx) => {
      if (
        ctx.value.deliveryMethod === "shipping" &&
        ctx.value.address === undefined
      ) {
        ctx.issues.push({
          code: "invalid_type",
          expected: "number",
          message: "Address is required when delivery method is shipping",
          path: ["address"],
          input: ctx.value.address,
        });
      }

      if (
        ctx.value.deliveryMethod === "self_collect" &&
        ctx.value.address !== undefined
      ) {
        ctx.issues.push({
          code: "custom",
          message:
            "Address must not be provided when delivery method is self_collect",
          path: ["address"],
          input: ctx.value.address,
        });
      }
    }),
]);

export type RedeemSaleReward = z.infer<typeof redeemSaleRewardSchema>;

export const redeemSaleRewardValidate = zValidator(
  "json",
  redeemSaleRewardSchema,
  async (r, c: MyContext) => {
    if (!r.success) return validationError(r.error, c);
    // first of all we will check for the user whether its their own
    const user = c.get("user");
    const rewardId = r.data.rewardId;
    const reward = await salesRewardService.getRewardById(rewardId);
    if (!reward || reward.userId !== user.id)
      return c.json(
        {
          success: false,
          message: "Reward Not Found",
        },
        404,
      );

    c.set("redeemReward", r.data);
  },
);
