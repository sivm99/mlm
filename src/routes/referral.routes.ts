import { authenticate } from "@/middleware/auth";
import { createReferralValidate } from "@/validation/referral.validations";
import { Hono } from "hono";
import ReferralController from "@/controller/ReferralController";

const referralRoutes = new Hono()
  .post(
    "/",
    authenticate,
    createReferralValidate,
    ReferralController.createReferralLink,
  ) // create a referal link
  .get("/", authenticate, ReferralController.getAllReferralLinks)
  .get("/:slug", ReferralController.getReferralLinkDetails)
  .patch(
    "/:slug",
    authenticate,
    createReferralValidate,
    ReferralController.updateReferralLinkDetail,
  )
  .delete("/:slug", authenticate, ReferralController.deleteReferralLink);
export default referralRoutes;
