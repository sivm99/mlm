import {
  createReferralLink,
  deleteReferralLink,
  getReferralLinkDetails,
  updateReferralLinkDetail,
} from "@/controller/referral.controller";
import { authenticate } from "@/middleware/auth";
import { createReferralValidate } from "@/validation/referral.validations";
import { Hono } from "hono";

const referralRoutes = new Hono()
  .post("/", authenticate, createReferralValidate, createReferralLink) // create a referal link
  .get("/:slug", getReferralLinkDetails)
  .patch(
    "/:slug",
    authenticate,
    createReferralValidate,
    updateReferralLinkDetail,
  )
  .delete("/:slug", authenticate, deleteReferralLink);
export default referralRoutes;
