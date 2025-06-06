import RewardController from "@/controller/RewardController";
import { authenticate, authenticateAdmin } from "@/middleware/auth";
import { Hono } from "hono";

const router = new Hono();

router
  .use("*", authenticate)
  .get("/", RewardController.getRewardsList)
  .post("/:rewardId/claim-payout")
  .post("/:rewardId/claim-order")

  .basePath("/admin")
  .use("*", authenticateAdmin)
  .get("/rewards/summary")
  .put("/:rewardId/toggle-status");
export default router;
