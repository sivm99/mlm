import UserController from "@/controller/UserController";
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
  .get("/", UserController.getUser)
  .patch("/", updateUserValidate, UserController.updateUser)
  .get("/tree-list", getTreeListValidate, UserController.getUserTree)
  .get("/direct-partners", UserController.getDirectPartners)
  .post("/activate-id", idActivateValidate, UserController.activateUserId)
  .post("/activate-ids", multiIdsVaildate, UserController.bulkActivateIds)
  .post(
    "/admin/bulk-add",
    authenticateAdmin,
    bulkAddValidate,
    UserController.bulkAdd,
  )
  .patch(
    "/admin/update",
    authenticateAdmin,
    updateUserByAdminValidate,
    UserController.updateUser,
  );

export default router;
