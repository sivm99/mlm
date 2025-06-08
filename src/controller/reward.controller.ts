import { salesRewardService } from "@/lib/services";
import { Context } from "hono";

export default class RewardController {
  async getRewardsList(c: Context) {
    const { id } = c.get("user");
    const data = await salesRewardService.getUserRewardHistory(id);
    return c.json({
      sucess: true,
      message: "Rewards reterived",
      data,
    });
  }

  async claimPayout(c: Context) {
    try {
      const payload = c.get("redeemReward");
      const { rewardId } = payload;
      let data;
      if (payload.claim === "payout") {
        data = await salesRewardService.claimRewardPayout(rewardId);
      }
      if (payload.claim === "product") {
        data = await salesRewardService.claimRewardOrder(rewardId, {
          deliveryMethod: payload.deliveryMethod,
          deliveryAddress: payload.address,
        });
      }

      return c.json({
        success: true,
        message: "Your Payout is now active",
        data,
      });
    } catch (error) {
      return c.json(
        {
          success: false,
          message: "Failed to process your payout request",
          error:
            error instanceof Error ? error.message : "Unknown error occurred",
        },
        500,
      );
    }
  }

  //  async fetchPayouts(c: Context) {
  //   const data = await payoutService.listPayouts({
  //     pagination: {
  //       limit: 40,
  //       offset: 0,
  //     },
  //     filter: {},
  //   });
  // }
}

export const rewardController = new RewardController();
