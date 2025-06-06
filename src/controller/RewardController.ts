import { salesRewardService } from "@/lib/services";
import { MyContext } from "@/types";

export default class RewardController {
  static async getRewardsList(c: MyContext) {
    const { id } = c.get("user");
    const data = await salesRewardService.getUserRewardHistory(id);
    return c.json({
      sucess: true,
      message: "Rewards reterived",
      data,
    });
  }

  static async claimPayout(c: MyContext) {
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

  // static async fetchPayouts(c: MyContext) {
  //   const data = await payoutService.listPayouts({
  //     pagination: {
  //       limit: 40,
  //       offset: 0,
  //     },
  //     filter: {},
  //   });
  // }
}
