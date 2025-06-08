import { userController } from "@/controller";
import { authenticate, authenticateAdmin } from "@/middleware/auth";
import { multiIdsVaildate } from "@/validation";
import {
  bulkAddValidate,
  getTreeListValidate,
  idActivateValidate,
  updateUserByAdminValidate,
  updateUserValidate,
} from "@/validation/user.validation";
import { Hono } from "hono";

const router = new Hono()
  .use("*", authenticate)
  .get("/", userController.getUser)
  .patch("/", updateUserValidate, userController.updateUser)
  .get("/tree-list", getTreeListValidate, userController.getUserTree)
  .get("/direct-partners", userController.getDirectPartners)
  .post("/activate-id", idActivateValidate, userController.activateUserId)
  .post("/activate-ids", multiIdsVaildate, userController.bulkActivateIds)
  .post(
    "/admin/bulk-add",
    authenticateAdmin,
    bulkAddValidate,
    userController.bulkAdd,
  )
  .patch(
    "/admin/update",
    authenticateAdmin,
    updateUserByAdminValidate,
    userController.updateUser,
  );

export default router;
