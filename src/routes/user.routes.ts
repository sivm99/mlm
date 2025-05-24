import UserController from "@/controller/UserController";
import { authenticate, authenticateAdmin } from "@/middleware/auth";
import {
  bulkAddValidate,
  getTreeListValidate,
  updateUserByAdminValidate,
  updateUserValidate,
} from "@/validation/user.validation";
import { Hono } from "hono";

const router = new Hono()
  .use("*", authenticate)
  .get("/", UserController.getUser)
  .patch("/", updateUserValidate, UserController.updateUser)
  .get("/tree-list", getTreeListValidate, UserController.getUserTree)
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
  )
  .get("/admin/active", authenticateAdmin, UserController.getActiveUsers);

export default router;
