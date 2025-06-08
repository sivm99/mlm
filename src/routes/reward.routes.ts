import { rewardController } from "@/controller";
import { authenticate, authenticateAdmin } from "@/middleware/auth";
import { Hono } from "hono";

const router = new Hono();

router
  .use("*", authenticate)
  .get("/", rewardController.getRewardsList)
  .post("/redeem", rewardController.claimPayout)
  .post("/:rewardId/claim-order")

  .basePath("/admin")
  .use("*", authenticateAdmin)
  .get("/rewards/summary")
  .put("/:rewardId/toggle-status");
export default router;
