import { salesRewardService } from "@/lib/services";
import { MyContext } from "@/types";

export default class RewardController {
  static async getRewardsList(c: MyContext) {
    const { id } = c.get("user");
    const data = salesRewardService.getUserRewardHistory(id);
    return c.json({
      sucess: true,
      message: "Rewards reterived",
      data,
    });
  }
}
