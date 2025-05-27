import { referralService } from "@/lib/services";
import { MyContext, Side } from "@/types";

export default class ReferralController {
  static async createReferralLink(c: MyContext) {
    const side = c.get("side") as Side;

    try {
      const { id: userId } = c.get("user");
      const data = await referralService.generateReferralLink(
        userId,
        userId,
        side,
      );

      return c.json({
        success: true,
        message: "Link generated Successfully",
        data,
      });
    } catch (error) {
      console.error("Error during referal link generation", String(error));
      return c.json(
        {
          success: false,
          message: "Failed to generate referral link",
          error: error instanceof Error ? error.message : "Unknown error",
        },
        500,
      );
    }
  }

  static async getReferralLinkDetails(c: MyContext) {
    try {
      const slug = c.req.param("slug");

      const data = await referralService.getReferralBySlug(slug);
      if (!data)
        return c.json(
          { success: false, message: "The referral link dont exist" },
          404,
        );

      referralService.recordImpression(slug);
      return c.json({
        success: true,
        message: "Link reterieved Successfully",
        data,
      });
    } catch (error) {
      return c.json(
        {
          success: false,
          message: "Failed to get referral link details",
          error: error instanceof Error ? error.message : "Unknown error",
        },
        500,
      );
    }
  }

  static async getAllReferralLinks(c: MyContext) {
    const { id: userId } = c.get("user");
    const data = await referralService.getReferralsByUserId(userId);
    return c.json({
      success: true,
      message: "Successfully Details reterieved",
      data,
    });
  }

  static async updateReferralLinkDetail(c: MyContext) {
    const side = c.get("side") as Side;
    const slug = c.req.param("slug");
    const { id: userId } = c.get("user");

    const data = await referralService.getReferralBySlug(slug);
    if (!data || data.userId !== userId)
      return c.json(
        { success: false, message: "The referral link dont exist" },
        404,
      );

    const success = await referralService.updateReferralBySlug(slug, side);
    return c.json({
      success,
      message: "The referral properties was updated",
    });
  }

  static async deleteReferralLink(c: MyContext) {
    const slug = c.req.param("slug");
    const { id: userId } = c.get("user");

    const data = await referralService.getReferralBySlug(slug);
    if (!data || data.userId !== userId)
      return c.json(
        { success: false, message: "The referral link dont exist" },
        404,
      );
    const success = await referralService.deleteReferral(slug);
    return c.json({
      success,
      message: "The referral Link was deleted",
    });
  }
}
