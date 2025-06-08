import { arHistoryController } from "@/controller";
import { authenticate } from "@/middleware/auth";
import { listArHistoryValidate, otherIdFromParamsValidate } from "@/validation";
import { Hono } from "hono";

const router = new Hono()
  .use("*", authenticate)
  .get("/", listArHistoryValidate, arHistoryController.listArHistory)
  .get("/:id", otherIdFromParamsValidate, arHistoryController.getArHistoryById)
  .get("/me", arHistoryController.getUserArHistory);

export default router;
