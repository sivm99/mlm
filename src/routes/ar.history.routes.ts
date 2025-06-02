import ArHistoryController from "@/controller/ArHistoryController";
import { authenticate, authenticateAdmin } from "@/middleware/auth";
import { listArHistoryValidate, otherIdFromParamsValidate } from "@/validation";
import { Hono } from "hono";

const router = new Hono()
  .use("*", authenticate)
  .get("/", listArHistoryValidate, ArHistoryController.listArHistory)
  .get("/:id", otherIdFromParamsValidate, ArHistoryController.getArHistory)
  .get("/me", ArHistoryController.getUserArHistory)
  .delete(
    "/:id",
    authenticateAdmin,
    otherIdFromParamsValidate,
    ArHistoryController.deleteArHistory,
  );

export default router;
